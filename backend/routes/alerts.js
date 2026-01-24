// routes/alerts.js
// ✅ NOVO: Sistema de Alertas Inteligentes

const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const logger = require('../utils/logger');
const { verifyToken } = require('../authMiddleware');

// GET /api/alerts - Lista alertas do usuário
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { isActive } = req.query;
    const where = { userId };
    if (isActive !== undefined) {
      where.isActive = isActive === 'true';
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    // Parse JSON strings
    const parsedAlerts = alerts.map(alert => ({
      ...alert,
      regions: alert.regions ? JSON.parse(alert.regions) : null,
      config: alert.config ? JSON.parse(alert.config) : null,
      channels: JSON.parse(alert.channels || '["email"]')
    }));

    res.json(parsedAlerts);
  } catch (error) {
    logger.error('❌ Erro ao listar alertas:', error);
    res.status(500).json({ error: 'Erro ao listar alertas' });
  }
});

// POST /api/alerts - Cria novo alerta
router.post('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // ✅ FASE B - B2: Suporta novos campos (product, minRoi, minProfit, regions)
    const { 
      type = 'opportunity', 
      product, 
      minRoi, 
      minProfit, 
      regions, 
      config, 
      channels = ['email'] 
    } = req.body;

    // Valida tipos de alerta
    const validTypes = ['opportunity', 'roi_threshold', 'price_change', 'extreme_weather', 'new_opportunity'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Tipo de alerta inválido. Tipos válidos: ${validTypes.join(', ')}` });
    }

    const alert = await prisma.alert.create({
      data: {
        userId,
        type,
        product: product || null,
        minRoi: minRoi ? parseFloat(minRoi) : null,
        minProfit: minProfit ? parseFloat(minProfit) : null,
        regions: regions ? JSON.stringify(regions) : null,
        config: config ? JSON.stringify(config) : null,
        channels: JSON.stringify(channels)
      }
    });

    logger.info(`✅ Alerta criado: ${type} para usuário ${userId}`);

    res.status(201).json({
      ...alert,
      regions: alert.regions ? JSON.parse(alert.regions) : null,
      config: alert.config ? JSON.parse(alert.config) : null,
      channels: JSON.parse(alert.channels)
    });
  } catch (error) {
    logger.error('❌ Erro ao criar alerta:', error);
    res.status(500).json({ error: 'Erro ao criar alerta' });
  }
});

// PUT /api/alerts/:id - Atualiza alerta
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const alertId = parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verifica se o alerta pertence ao usuário
    const existingAlert = await prisma.alert.findFirst({
      where: { id: alertId, userId }
    });

    if (!existingAlert) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    const { type, config, channels, isActive } = req.body;

    const updateData = {};
    if (type) updateData.type = type;
    if (config) updateData.config = JSON.stringify(config);
    if (channels) updateData.channels = JSON.stringify(channels);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedAlert = await prisma.alert.update({
      where: { id: alertId },
      data: updateData
    });

    logger.info(`✅ Alerta atualizado: ${alertId}`);

    res.json({
      ...updatedAlert,
      config: JSON.parse(updatedAlert.config),
      channels: JSON.parse(updatedAlert.channels)
    });
  } catch (error) {
    logger.error('❌ Erro ao atualizar alerta:', error);
    res.status(500).json({ error: 'Erro ao atualizar alerta' });
  }
});

// DELETE /api/alerts/:id - Remove alerta
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const alertId = parseInt(req.params.id, 10);

    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Verifica se o alerta pertence ao usuário
    const existingAlert = await prisma.alert.findFirst({
      where: { id: alertId, userId }
    });

    if (!existingAlert) {
      return res.status(404).json({ error: 'Alerta não encontrado' });
    }

    await prisma.alert.delete({
      where: { id: alertId }
    });

    logger.info(`✅ Alerta removido: ${alertId}`);

    res.json({ success: true, message: 'Alerta removido com sucesso' });
  } catch (error) {
    logger.error('❌ Erro ao remover alerta:', error);
    res.status(500).json({ error: 'Erro ao remover alerta' });
  }
});

// GET /api/alerts/check - Verifica alertas ativos (para worker/cron)
router.get('/check', async (req, res) => {
  try {
    // Verifica X-Internal-API-Key para segurança
    const internalKey = req.headers['x-internal-api-key'];
    if (internalKey !== process.env.INTERNAL_API_KEY) {
      return res.status(401).json({ error: 'Unauthorized: Invalid X-Internal-API-Key' });
    }

    const activeAlerts = await prisma.alert.findMany({
      where: { isActive: true },
      include: { user: true }
    });

    const triggeredAlerts = [];

    for (const alert of activeAlerts) {
      const config = JSON.parse(alert.config || '{}');
      const channels = JSON.parse(alert.channels || '[]');

      let shouldTrigger = false;
      let message = '';

      switch (alert.type) {
        case 'roi_threshold': {
          const threshold = config.threshold || 0;
          const direction = config.direction || 'above';
          const product = config.product;
          const state = config.state;

          // Busca oportunidades que atendem o critério
          const where = {};
          if (product) where.product = product;
          if (state) where.state = state;

          if (direction === 'above') {
            where.roi = { gte: threshold };
          } else {
            where.roi = { lte: threshold };
          }

          const opportunities = await prisma.opportunity.findMany({
            where,
            take: 10,
            orderBy: { roi: direction === 'above' ? 'desc' : 'asc' }
          });

          if (opportunities.length > 0) {
            shouldTrigger = true;
            message = `${opportunities.length} oportunidade(s) encontrada(s) com ROI ${direction === 'above' ? 'acima' : 'abaixo'} de ${threshold}%`;
          }
          break;
        }

        case 'price_change': {
          const product = config.product;
          const state = config.state;
          const thresholdPercent = config.threshold_percent || 15;
          const timeWindowHours = config.time_window_hours || 24;
          const direction = config.direction || 'both';

          if (!product || !state) break;

          // Busca histórico de preços
          const opportunities = await prisma.opportunity.findMany({
            where: { product, state },
            orderBy: { createdAt: 'desc' },
            take: 1
          });

          if (opportunities.length === 0) break;

          const currentPrice = parseFloat(opportunities[0].sellPrice);

          // Busca preço anterior (dentro da janela de tempo)
          const timeWindow = new Date();
          timeWindow.setHours(timeWindow.getHours() - timeWindowHours);

          const history = await prisma.priceHistory.findFirst({
            where: {
              opportunityId: opportunities[0].id,
              createdAt: { gte: timeWindow }
            },
            orderBy: { createdAt: 'asc' }
          });

          if (!history) break;

          const previousPrice = parseFloat(history.price);
          const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;

          if (Math.abs(changePercent) >= thresholdPercent) {
            if (direction === 'both' || 
                (direction === 'up' && changePercent > 0) ||
                (direction === 'down' && changePercent < 0)) {
              shouldTrigger = true;
              message = `Preço de ${product} em ${state} ${changePercent > 0 ? 'subiu' : 'caiu'} ${Math.abs(changePercent).toFixed(1)}% nas últimas ${timeWindowHours}h`;
            }
          }
          break;
        }

        case 'extreme_weather': {
          const severity = config.severity || ['extreme', 'high'];
          const regions = config.regions || [];
          const daysAhead = config.days_ahead || 7;

          // Busca eventos extremos (via Python API)
          // Por enquanto, apenas simula
          // TODO: Integrar com serviço de clima
          break;
        }

        case 'new_opportunity': {
          const product = config.product;
          const state = config.state;
          const minROI = config.min_roi || 0;

          // Busca oportunidades criadas nas últimas 24h
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);

          const where = {
            createdAt: { gte: yesterday },
            roi: { gte: minROI }
          };

          if (product) where.product = product;
          if (state) where.state = state;

          const newOpportunities = await prisma.opportunity.findMany({
            where,
            orderBy: { createdAt: 'desc' }
          });

          if (newOpportunities.length > 0) {
            shouldTrigger = true;
            message = `${newOpportunities.length} nova(s) oportunidade(s) encontrada(s)`;
          }
          break;
        }
      }

      if (shouldTrigger) {
        // Atualiza alerta
        await prisma.alert.update({
          where: { id: alert.id },
          data: {
            lastTriggered: new Date(),
            triggerCount: { increment: 1 }
          }
        });

        // Buscar email do usuário no Supabase Auth
        let userEmail = 'N/A';
        try {
          const supabaseAdmin = require('../utils/supabase').supabaseAdmin;
          const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(alert.userId);
          if (user) {
            userEmail = user.email;
          }
        } catch (error) {
          logger.warn(`⚠️ Erro ao buscar email do usuário ${alert.userId}: ${error.message}`);
        }

        triggeredAlerts.push({
          alertId: alert.id,
          userId: alert.userId,
          userEmail: userEmail,
          type: alert.type,
          message,
          channels
        });
      }
    }

    logger.info(`✅ Verificação de alertas: ${triggeredAlerts.length} alertas disparados`);

    res.json({
      checked: activeAlerts.length,
      triggered: triggeredAlerts.length,
      alerts: triggeredAlerts
    });
  } catch (error) {
    logger.error('❌ Erro ao verificar alertas:', error);
    res.status(500).json({ error: 'Erro ao verificar alertas' });
  }
});

// ✅ FASE B - B2: Endpoints para configuração de canais de alerta do usuário

// GET /api/alerts/user-config - Busca configuração de alertas do usuário
router.get('/user-config', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    // Buscar informações do usuário no Supabase Auth
    const { supabaseAdmin } = require('../utils/supabase');
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Serviço de autenticação não configurado' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Retornar configurações do user_metadata
    res.json({
      alertsEnabled: user.user_metadata?.alertsEnabled ?? false,
      telegramChatId: user.user_metadata?.telegramChatId || null,
      phone: user.user_metadata?.phone || null,
      preferredAlertChannel: user.user_metadata?.preferredAlertChannel || 'email'
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar configuração de alertas:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração de alertas' });
  }
});

// PUT /api/alerts/user-config - Atualiza configuração de alertas do usuário
router.put('/user-config', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { alertsEnabled, telegramChatId, phone, preferredAlertChannel } = req.body;

    // Buscar usuário atual no Supabase Auth
    const { supabaseAdmin } = require('../utils/supabase');
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Serviço de autenticação não configurado' });
    }

    const { data: { user: currentUser }, error: getUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError || !currentUser) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Atualizar user_metadata
    const currentMetadata = currentUser.user_metadata || {};
    const updatedMetadata = { ...currentMetadata };

    if (alertsEnabled !== undefined) updatedMetadata.alertsEnabled = alertsEnabled;
    if (telegramChatId !== undefined) updatedMetadata.telegramChatId = telegramChatId;
    if (phone !== undefined) updatedMetadata.phone = phone;
    if (preferredAlertChannel !== undefined) {
      const validChannels = ['email', 'telegram', 'whatsapp'];
      if (validChannels.includes(preferredAlertChannel)) {
        updatedMetadata.preferredAlertChannel = preferredAlertChannel;
      }
    }

    // Atualizar usuário no Supabase Auth
    const { data: { user: updatedUser }, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { user_metadata: updatedMetadata }
    );

    if (updateError || !updatedUser) {
      logger.error(`❌ Erro ao atualizar usuário no Supabase: ${updateError?.message}`);
      return res.status(500).json({ error: 'Erro ao atualizar configuração de alertas' });
    }

    logger.info(`✅ Configuração de alertas atualizada para usuário ${userId}`);

    res.json({
      alertsEnabled: updatedUser.user_metadata?.alertsEnabled ?? false,
      telegramChatId: updatedUser.user_metadata?.telegramChatId || null,
      phone: updatedUser.user_metadata?.phone || null,
      preferredAlertChannel: updatedUser.user_metadata?.preferredAlertChannel || 'email'
    });
  } catch (error) {
    logger.error('❌ Erro ao atualizar configuração de alertas:', error);
    res.status(500).json({ error: 'Erro ao atualizar configuração de alertas' });
  }
});

// ✅ FASE B - B2: Rotas para integração Telegram/WhatsApp

/**
 * GET /api/alerts/telegram/info
 * Retorna informações do bot Telegram (se configurado)
 */
router.get('/telegram/info', verifyToken, async (req, res) => {
  try {
    const TelegramBot = require('node-telegram-bot-api');
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      return res.json({
        configured: false,
        message: 'Telegram Bot não configurado. Configure TELEGRAM_BOT_TOKEN no .env'
      });
    }

    const bot = new TelegramBot(token, { polling: false });
    const botInfo = await bot.getMe();

    res.json({
      configured: true,
      botUsername: botInfo.username,
      botName: botInfo.first_name,
      instructions: `Para conectar seu Telegram:
1. Abra o Telegram e procure por @${botInfo.username}
2. Inicie uma conversa com o bot
3. Envie o comando /start
4. O bot retornará seu Chat ID
5. Copie o Chat ID e cole no campo abaixo`
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar info do Telegram:', error);
    res.status(500).json({ 
      configured: false,
      error: 'Erro ao buscar informações do bot Telegram' 
    });
  }
});

/**
 * POST /api/alerts/telegram/test
 * Testa envio de mensagem via Telegram
 */
router.post('/telegram/test', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { chatId } = req.body;

    if (!chatId) {
      return res.status(400).json({ error: 'chatId é obrigatório' });
    }

    const { sendTelegramAlert } = require('../services/alertService');
    
    const testMessage = `✅ <b>Teste de Alerta Telegram</b>

Este é uma mensagem de teste do sistema de alertas Agro-AI.

Se você recebeu esta mensagem, seu Telegram está configurado corretamente! 🎉

Você receberá alertas quando novas oportunidades forem encontradas.`;

    const sent = await sendTelegramAlert(chatId, testMessage);

    if (sent) {
      // Atualiza chatId no perfil do usuário
      const { supabaseAdmin } = require('../utils/supabase');
      if (supabaseAdmin) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (user) {
          const metadata = user.user_metadata || {};
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...metadata,
              telegramChatId: chatId
            }
          });
        }
      }

      res.json({ 
        success: true, 
        message: 'Mensagem de teste enviada com sucesso! Verifique seu Telegram.' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Falha ao enviar mensagem. Verifique se o bot está configurado e o chatId está correto.' 
      });
    }
  } catch (error) {
    logger.error('❌ Erro ao testar Telegram:', error);
    res.status(500).json({ error: 'Erro ao testar envio de mensagem Telegram' });
  }
});

/**
 * POST /api/alerts/whatsapp/test
 * Testa envio de mensagem via WhatsApp
 */
router.post('/whatsapp/test', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'phone é obrigatório (formato: +5511999999999)' });
    }

    // Valida formato do telefone
    const phoneRegex = /^\+[1-9]\d{10,14}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ 
        error: 'Formato de telefone inválido. Use o formato: +5511999999999 (com código do país)' 
      });
    }

    const { sendWhatsAppAlert } = require('../services/alertService');
    
    const testMessage = `✅ *Teste de Alerta WhatsApp*

Este é uma mensagem de teste do sistema de alertas Agro-AI.

Se você recebeu esta mensagem, seu WhatsApp está configurado corretamente! 🎉

Você receberá alertas quando novas oportunidades forem encontradas.`;

    const sent = await sendWhatsAppAlert(phone, testMessage);

    if (sent) {
      // Atualiza phone no perfil do usuário
      const { supabaseAdmin } = require('../utils/supabase');
      if (supabaseAdmin) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (user) {
          const metadata = user.user_metadata || {};
          await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: {
              ...metadata,
              phone: phone
            }
          });
        }
      }

      res.json({ 
        success: true, 
        message: 'Mensagem de teste enviada com sucesso! Verifique seu WhatsApp.' 
      });
    } else {
      res.status(500).json({ 
        success: false,
        error: 'Falha ao enviar mensagem. Verifique se o Twilio está configurado corretamente.' 
      });
    }
  } catch (error) {
    logger.error('❌ Erro ao testar WhatsApp:', error);
    res.status(500).json({ error: 'Erro ao testar envio de mensagem WhatsApp' });
  }
});

/**
 * POST /api/alerts/telegram/webhook
 * Webhook do Telegram para receber mensagens e obter Chat ID automaticamente
 * ⚠️ Esta rota NÃO requer autenticação (é chamada pelo Telegram)
 */
router.post('/telegram/webhook', async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Mensagem não encontrada' });
    }

    const chatId = message.chat.id;
    const text = message.text || '';
    const firstName = message.from.first_name || 'Usuário';

    const TelegramBot = require('node-telegram-bot-api');
    const token = process.env.TELEGRAM_BOT_TOKEN;

    if (!token) {
      logger.warn('⚠️ Telegram Bot não configurado');
      return res.status(503).json({ error: 'Bot não configurado' });
    }

    const bot = new TelegramBot(token, { polling: false });

    // Comando /start - retorna Chat ID
    if (text === '/start' || text.toLowerCase().includes('start')) {
      const response = `👋 Olá, ${firstName}!

✅ Seu Chat ID é: <code>${chatId}</code>

📋 <b>Como usar:</b>
1. Copie o Chat ID acima
2. Acesse o dashboard Agro-AI
3. Vá em "Alertas" > "Configurar Telegram"
4. Cole o Chat ID e clique em "Salvar"

🔔 Você receberá alertas quando novas oportunidades forem encontradas!

💡 <b>Dica:</b> Mantenha esta conversa aberta para receber os alertas.`;

      await bot.sendMessage(chatId, response, {
        parse_mode: 'HTML',
        disable_web_page_preview: true
      });

      logger.info(`✅ Chat ID ${chatId} fornecido para ${firstName}`);
    } else {
      // Resposta padrão para outros comandos
      await bot.sendMessage(chatId, `Olá! Envie /start para obter seu Chat ID.`, {
        parse_mode: 'HTML'
      });
    }

    res.json({ ok: true });
  } catch (error) {
    logger.error('❌ Erro no webhook do Telegram:', error);
    res.status(500).json({ error: 'Erro ao processar webhook' });
  }
});

/**
 * GET /api/alerts/config
 * Retorna configuração atual do usuário
 */
router.get('/config', verifyToken, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const { supabaseAdmin } = require('../utils/supabase');
    if (!supabaseAdmin) {
      return res.status(500).json({ error: 'Serviço de autenticação não configurado' });
    }

    const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (error || !user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    const metadata = user.user_metadata || {};

    res.json({
      alertsEnabled: metadata.alertsEnabled ?? true,
      telegramChatId: metadata.telegramChatId || null,
      phone: metadata.phone || null,
      preferredAlertChannel: metadata.preferredAlertChannel || 'email',
      telegramConfigured: !!process.env.TELEGRAM_BOT_TOKEN,
      whatsappConfigured: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_WHATSAPP_NUMBER)
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar configuração:', error);
    res.status(500).json({ error: 'Erro ao buscar configuração de alertas' });
  }
});

module.exports = router;

