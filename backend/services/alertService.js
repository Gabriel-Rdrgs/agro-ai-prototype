// backend/services/alertService.js
// ✅ FASE B - B2: Sistema de Alertas Inteligentes (WhatsApp/Telegram)

const Queue = require('bull');
const TelegramBot = require('node-telegram-bot-api');
const twilio = require('twilio');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');

// Configuração do Redis
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// Fila de alertas (Bull)
const alertQueue = new Queue('alerts', REDIS_URL);

// Inicializar Telegram Bot (se token configurado)
let telegramBot = null;
if (process.env.TELEGRAM_BOT_TOKEN) {
  telegramBot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false });
}

// Inicializar Twilio (se configurado)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

/**
 * Envia alerta via Telegram
 * @param {string} chatId - ID do chat do Telegram
 * @param {string} message - Mensagem do alerta
 * @returns {Promise<boolean>}
 */
async function sendTelegramAlert(chatId, message) {
  if (!telegramBot) {
    logger.warn('⚠️ Telegram Bot não configurado. Configure TELEGRAM_BOT_TOKEN no .env');
    return false;
  }

  try {
    await telegramBot.sendMessage(chatId, message, {
      parse_mode: 'HTML',
      disable_web_page_preview: true
    });
    logger.info(`✅ Alerta Telegram enviado para chat ${chatId}`);
    return true;
  } catch (error) {
    logger.error(`❌ Erro ao enviar alerta Telegram: ${error.message}`);
    return false;
  }
}

/**
 * Envia alerta via WhatsApp (Twilio)
 * @param {string} phone - Número de telefone (formato: +5511999999999)
 * @param {string} message - Mensagem do alerta
 * @returns {Promise<boolean>}
 */
async function sendWhatsAppAlert(phone, message) {
  if (!twilioClient) {
    logger.warn('⚠️ Twilio não configurado. Configure TWILIO_ACCOUNT_SID e TWILIO_AUTH_TOKEN no .env');
    return false;
  }

  if (!process.env.TWILIO_WHATSAPP_NUMBER) {
    logger.warn('⚠️ TWILIO_WHATSAPP_NUMBER não configurado');
    return false;
  }

  try {
    await twilioClient.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${phone}`,
      body: message
    });
    logger.info(`✅ Alerta WhatsApp enviado para ${phone}`);
    return true;
  } catch (error) {
    logger.error(`❌ Erro ao enviar alerta WhatsApp: ${error.message}`);
    return false;
  }
}

/**
 * Envia alerta via Email (placeholder - implementar com serviço de email)
 * @param {string} email - Email do usuário
 * @param {string} subject - Assunto do email
 * @param {string} message - Mensagem do alerta
 * @returns {Promise<boolean>}
 */
async function sendEmailAlert(email, subject, message) {
  // TODO: Implementar com serviço de email (SendGrid, AWS SES, etc.)
  logger.info(`📧 [PLACEHOLDER] Alerta email seria enviado para ${email}: ${subject}`);
  return true;
}

/**
 * Formata mensagem de alerta de oportunidade
 * @param {Object} opportunity - Oportunidade encontrada
 * @returns {string}
 */
function formatOpportunityAlert(opportunity) {
  const roi = opportunity.roi ? `${opportunity.roi.toFixed(2)}%` : 'N/A';
  const profit = opportunity.roi && opportunity.buyPrice && opportunity.volume
    ? `R$ ${(parseFloat(opportunity.buyPrice) * parseFloat(opportunity.volume.replace(/[^0-9.]/g, '')) * (opportunity.roi / 100)).toFixed(2)}`
    : 'N/A';

  return `🚨 <b>Nova Oportunidade Encontrada!</b>

📦 <b>Produto:</b> ${opportunity.product}
📍 <b>Origem:</b> ${opportunity.city}, ${opportunity.state}
🎯 <b>Destino:</b> ${opportunity.sellLocation}
💰 <b>ROI:</b> ${roi}
💵 <b>Lucro Estimado:</b> ${profit}
📊 <b>Volume:</b> ${opportunity.volume}
⚠️ <b>Risco:</b> ${opportunity.riskLevel}/5

🔗 Acesse o dashboard para mais detalhes!`;
}

/**
 * Verifica se uma oportunidade corresponde a uma regra de alerta
 * @param {Object} opportunity - Oportunidade a verificar
 * @param {Object} alertRule - Regra de alerta
 * @returns {boolean}
 */
function matchesAlertRule(opportunity, alertRule) {
  // Verificar produto
  if (alertRule.product && opportunity.product !== alertRule.product) {
    return false;
  }

  // Verificar ROI mínimo
  if (alertRule.minRoi !== null && alertRule.minRoi !== undefined) {
    const roi = parseFloat(opportunity.roi) || 0;
    if (roi < alertRule.minRoi) {
      return false;
    }
  }

  // Verificar lucro mínimo
  if (alertRule.minProfit !== null && alertRule.minProfit !== undefined) {
    const buyPrice = parseFloat(opportunity.buyPrice) || 0;
    const volume = parseFloat(opportunity.volume?.replace(/[^0-9.]/g, '') || '0');
    const roi = parseFloat(opportunity.roi) || 0;
    const profit = buyPrice * volume * (roi / 100);
    
    if (profit < alertRule.minProfit) {
      return false;
    }
  }

  // Verificar regiões
  if (alertRule.regions) {
    try {
      const regions = JSON.parse(alertRule.regions);
      if (Array.isArray(regions) && regions.length > 0) {
        if (!regions.includes(opportunity.state)) {
          return false;
        }
      }
    } catch (error) {
      logger.warn(`⚠️ Erro ao parsear regions do alerta ${alertRule.id}: ${error.message}`);
    }
  }

  return true;
}

/**
 * Processa alertas para uma oportunidade
 * @param {Object} opportunity - Oportunidade encontrada
 */
async function processOpportunityAlerts(opportunity) {
  try {
    // Buscar todas as regras de alerta ativas do tipo "opportunity"
    const alertRules = await prisma.alert.findMany({
      where: {
        type: 'opportunity',
        isActive: true
      }
    });

    // Buscar configurações de usuários do Supabase Auth
    const { supabaseAdmin } = require('../utils/supabase');

    for (const alertRule of alertRules) {
      // Buscar informações do usuário no Supabase Auth
      let userInfo = null;
      try {
        const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(alertRule.userId);
        if (error || !user) {
          logger.warn(`⚠️ Usuário ${alertRule.userId} não encontrado no Supabase Auth`);
          continue;
        }
        userInfo = {
          id: user.id,
          email: user.email,
          alertsEnabled: user.user_metadata?.alertsEnabled ?? true, // Default true se não configurado
          telegramChatId: user.user_metadata?.telegramChatId,
          phone: user.user_metadata?.phone,
          preferredAlertChannel: user.user_metadata?.preferredAlertChannel || 'email'
        };
      } catch (error) {
        logger.error(`❌ Erro ao buscar usuário ${alertRule.userId}: ${error.message}`);
        continue;
      }

      // Verificar se o usuário tem alertas habilitados
      if (!userInfo.alertsEnabled) {
        continue;
      }

      // Verificar se a oportunidade corresponde à regra
      if (!matchesAlertRule(opportunity, alertRule)) {
        continue;
      }

      // Formatar mensagem
      const message = formatOpportunityAlert(opportunity);

      // Parsear canais
      let channels = ['email'];
      try {
        channels = JSON.parse(alertRule.channels || '["email"]');
      } catch (error) {
        logger.warn(`⚠️ Erro ao parsear channels do alerta ${alertRule.id}: ${error.message}`);
      }

      // Enviar alertas pelos canais configurados
      let sent = false;

      if (channels.includes('telegram') && userInfo.telegramChatId) {
        sent = await sendTelegramAlert(userInfo.telegramChatId, message) || sent;
      }

      if (channels.includes('whatsapp') && userInfo.phone) {
        sent = await sendWhatsAppAlert(userInfo.phone, message) || sent;
      }

      if (channels.includes('email')) {
        sent = await sendEmailAlert(userInfo.email, 'Nova Oportunidade Encontrada', message) || sent;
      }

      // Atualizar estatísticas do alerta
      if (sent) {
        await prisma.alert.update({
          where: { id: alertRule.id },
          data: {
            lastTriggered: new Date(),
            triggerCount: { increment: 1 }
          }
        });
      }
    }
  } catch (error) {
    logger.error(`❌ Erro ao processar alertas: ${error.message}`);
  }
}

/**
 * Verifica alertas para novas oportunidades (cronjob)
 * Executa a cada 30 minutos
 */
async function checkAlertRules() {
  try {
    logger.info('🔍 Verificando regras de alerta...');

    // Buscar oportunidades criadas nos últimos 30 minutos
    const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
    
    const newOpportunities = await prisma.opportunity.findMany({
      where: {
        createdAt: {
          gte: thirtyMinutesAgo
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    logger.info(`📊 Encontradas ${newOpportunities.length} novas oportunidades`);

    // Processar alertas para cada oportunidade
    for (const opportunity of newOpportunities) {
      await processOpportunityAlerts(opportunity);
    }

    logger.info('✅ Verificação de alertas concluída');
  } catch (error) {
    logger.error(`❌ Erro ao verificar regras de alerta: ${error.message}`);
  }
}

// Processar jobs da fila
alertQueue.process('send-alert', async (job) => {
  const { type, destination, message } = job.data;

  switch (type) {
    case 'telegram':
      return await sendTelegramAlert(destination, message);
    case 'whatsapp':
      return await sendWhatsAppAlert(destination, message);
    case 'email':
      return await sendEmailAlert(destination, 'Alerta Agro-AI', message);
    default:
      logger.warn(`⚠️ Tipo de alerta desconhecido: ${type}`);
      return false;
  }
});

module.exports = {
  sendTelegramAlert,
  sendWhatsAppAlert,
  sendEmailAlert,
  processOpportunityAlerts,
  checkAlertRules,
  alertQueue
};

