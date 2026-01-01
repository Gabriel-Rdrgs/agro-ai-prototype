// backend/controllers/opportunityController.js
// ✅ REFACTOR-001: Controller para rotas de oportunidades
// ✅ REFACTOR-006: Tratamento de erros padronizado

const OpportunityService = require('../services/opportunityService');
// ✅ REFACTOR-005: Validação agora feita pelo middleware Zod (mantido para compatibilidade)
const { validateOpportunityIds, validateId } = require('../utils/validation');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { ErrorHelpers } = require('../utils/errorHandler');

class OpportunityController {
  constructor(pythonAxios, getDollarRate) {
    this.service = new OpportunityService(pythonAxios, getDollarRate);
    this.pythonAxios = pythonAxios;
  }

  /**
   * GET /api/opportunities
   * Lista todas as oportunidades
   */
  async list(req, res, next) {
    try {
      const opportunities = await this.service.listOpportunities(req.query);
      res.json(opportunities);
    } catch (error) {
      // ✅ REFACTOR-006: Delega tratamento de erro para o errorHandler
      next(error);
    }
  }

  /**
   * POST /api/opportunities/compare
   * Compara múltiplas oportunidades
   */
  async compare(req, res, next) {
    try {
      // ✅ REFACTOR-005: Validação já feita pelo middleware Zod
      // Mantém validação manual apenas para compatibilidade
      const validation = validateOpportunityIds(req.body.opportunityIds);
      
      if (!validation.valid) {
        return next(ErrorHelpers.validation(validation.error));
      }

      const result = await this.service.compareOpportunities(validation.ids);
      
      if (result.opportunities.length === 0) {
        return next(ErrorHelpers.notFound('Nenhuma oportunidade encontrada'));
      }

      res.json(result.opportunities);
    } catch (error) {
      // ✅ REFACTOR-006: Delega tratamento de erro para o errorHandler
      next(error);
    }
  }

  /**
   * GET /api/opportunities/:id/history
   * Busca histórico de preços
   * ✅ REFACTOR-005: Validação agora feita pelo middleware Zod
   */
  async getHistory(req, res, next) {
    try {
      // ✅ REFACTOR-005: req.params.id e req.query.days já validados pelo middleware Zod
      const opportunityId = req.params.id;
      const days = req.query.days || 30;
      const result = await this.service.getPriceHistory(opportunityId, days);

      if (!result) {
        return next(ErrorHelpers.notFound('Oportunidade'));
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
      // ✅ REFACTOR-006: Delega tratamento de erro para o errorHandler
      next(error);
    }
  }
}

module.exports = OpportunityController;

