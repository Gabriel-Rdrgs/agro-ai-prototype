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
      config: JSON.parse(alert.config || '{}'),
      channels: JSON.parse(alert.channels || '[]')
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

    const { type, config, channels } = req.body;

    if (!type || !config) {
      return res.status(400).json({ error: 'type e config são obrigatórios' });
    }

    // Valida tipos de alerta
    const validTypes = ['roi_threshold', 'price_change', 'extreme_weather', 'new_opportunity'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Tipo de alerta inválido. Tipos válidos: ${validTypes.join(', ')}` });
    }

    const alert = await prisma.alert.create({
      data: {
        userId,
        type,
        config: JSON.stringify(config),
        channels: JSON.stringify(channels || ['email'])
      }
    });

    logger.info(`✅ Alerta criado: ${type} para usuário ${userId}`);

    res.status(201).json({
      ...alert,
      config: JSON.parse(alert.config),
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

        triggeredAlerts.push({
          alertId: alert.id,
          userId: alert.userId,
          userEmail: alert.user.email,
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

module.exports = router;

