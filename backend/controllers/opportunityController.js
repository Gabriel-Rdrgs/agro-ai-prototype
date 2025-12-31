// backend/controllers/opportunityController.js
// ✅ REFACTOR-001: Controller para rotas de oportunidades

const OpportunityService = require('../services/opportunityService');
const { validateOpportunityIds, validateId } = require('../utils/validation');
const logger = require('../utils/logger');
const cache = require('../utils/cache');

class OpportunityController {
  constructor(pythonAxios, getDollarRate) {
    this.service = new OpportunityService(pythonAxios, getDollarRate);
    this.pythonAxios = pythonAxios;
  }

  /**
   * GET /api/opportunities
   * Lista todas as oportunidades
   */
  async list(req, res) {
    try {
      const opportunities = await this.service.listOpportunities(req.query);
      res.json(opportunities);
    } catch (error) {
      logger.error('❌ Erro ao buscar oportunidades:', { error: error.message, stack: error.stack });
      res.status(500).json({ error: 'Erro ao buscar oportunidades' });
    }
  }

  /**
   * POST /api/opportunities/compare
   * Compara múltiplas oportunidades
   */
  async compare(req, res) {
    try {
      const validation = validateOpportunityIds(req.body.opportunityIds);
      
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const result = await this.service.compareOpportunities(validation.ids);
      
      if (result.opportunities.length === 0) {
        return res.status(404).json({ error: 'Nenhuma oportunidade encontrada' });
      }

      res.json(result.opportunities);
    } catch (error) {
      logger.error('❌ Erro ao comparar oportunidades:', { error: error.message });
      res.status(500).json({ error: 'Erro ao comparar oportunidades' });
    }
  }

  /**
   * GET /api/opportunities/:id/history
   * Busca histórico de preços
   */
  async getHistory(req, res) {
    try {
      const validation = validateId(req.params.id, 'ID de oportunidade');
      
      if (!validation.valid) {
        return res.status(400).json({ error: validation.error });
      }

      const days = parseInt(req.query.days) || 30;
      const result = await this.service.getPriceHistory(validation.id, days);

      if (!result) {
        return res.status(404).json({ error: 'Oportunidade não encontrada' });
      }

      // Calcula estatísticas
      const prices = result.history.map(h => parseFloat(h.price));
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const currentPrice = parseFloat(result.opportunity.sellPrice);

      // Calcula tendência
      const recent7Days = result.history.filter(h => {
        const daysDiff = (new Date() - new Date(h.createdAt)) / (1000 * 60 * 60 * 24);
        return daysDiff <= 7;
      });
      const previous7Days = result.history.filter(h => {
        const daysDiff = (new Date() - new Date(h.createdAt)) / (1000 * 60 * 60 * 24);
        return daysDiff > 7 && daysDiff <= 14;
      });

      const recentAvg = recent7Days.length > 0
        ? recent7Days.reduce((sum, h) => sum + parseFloat(h.price), 0) / recent7Days.length
        : currentPrice;
      const previousAvg = previous7Days.length > 0
        ? previous7Days.reduce((sum, h) => sum + parseFloat(h.price), 0) / previous7Days.length
        : currentPrice;

      const trendDirection = recentAvg > previousAvg ? 'up' : recentAvg < previousAvg ? 'down' : 'sideways';
      const trendPercent = previousAvg > 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

      // Formata dados para o gráfico
      const chartData = {
        labels: result.history.map(h => new Date(h.createdAt).toLocaleDateString('pt-BR')),
        prices: result.history.map(h => parseFloat(h.price)),
        avgPrice,
        minPrice,
        maxPrice,
        currentPrice,
        trend: {
          direction: trendDirection,
          percent: trendPercent
        }
      };

      res.json(chartData);
    } catch (error) {
      logger.error('❌ Erro ao buscar histórico:', { error: error.message });
      res.status(500).json({ error: 'Erro ao buscar histórico de preços' });
    }
  }
}

module.exports = OpportunityController;

