// backend/controllers/opportunityController.js
const OpportunityService = require('../services/opportunityService');
const { validateOpportunityIds, validateId } = require('../utils/validation');
const logger = require('../utils/logger');
const cache = require('../utils/cache');
const { ErrorHelpers } = require('../utils/errorHandler');

// ✅ safeNext que funciona com testes
const safeNext = (error, req, res, next) => {
  if (typeof next === 'function') {
    next(error);
  } else {
    const status = error.status || 500;
    // ✅ Usa mensagem exata dos testes
    const messages = {
      'Erro ao buscar oportunidades': error.message,
      'Erro ao comparar oportunidades': error.message,
      'Erro ao buscar histórico de preços': error.message,
      'Nenhuma oportunidade encontrada': error.message,
      'ID de oportunidade deve ser um número positivo': error.message,
      'Oportunidade não encontrada': error.message
    };
    const message = messages[error.message] || error.message || 'Erro interno do servidor';
    res.status(status).json({ error: message });
  }
};


class OpportunityController {
  constructor(pythonAxios, getDollarRate) {
    this.service = new OpportunityService(pythonAxios, getDollarRate);
    this.pythonAxios = pythonAxios;
  }

  async list(req, res, next) {
    try {
      const opportunities = await this.service.listOpportunities(req.query);
      res.json(opportunities);
    } catch (error) {
      safeNext(error, req, res, next);
    }
  }

  async compare(req, res, next) {
    try {
      const validation = validateOpportunityIds(req.body.opportunityIds);
      
      if (!validation.valid) {
        return safeNext(ErrorHelpers.validation(validation.error), req, res, next);
      }

      const result = await this.service.compareOpportunities(validation.ids);
      
      if (result.opportunities.length === 0) {
        return safeNext(ErrorHelpers.notFound('Nenhuma oportunidade encontrada'), req, res, next);
      }

      res.json(result.opportunities);
    } catch (error) {
      safeNext(error, req, res, next);
    }
  }

  async getHistory(req, res, next) {
    try {
      const opportunityId = Number(req.params.id);
      const days = parseInt(req.query.days) || 30;
      
      // Validação manual para testes
      if (!validateId(opportunityId, 'ID de oportunidade')) {
        return safeNext(ErrorHelpers.validation('ID de oportunidade deve ser um número positivo'), req, res, next);
      }

      const result = await this.service.getPriceHistory(opportunityId, days);

      if (!result) {
        return safeNext(ErrorHelpers.notFound('Oportunidade'), req, res, next);
      }

      // Estatísticas (mantido igual)
      const prices = result.history.map(h => parseFloat(h.price));
      const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
      const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
      const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
      const currentPrice = parseFloat(result.opportunity.sellPrice);

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

      const chartData = {
        labels: result.history.map(h => new Date(h.createdAt).toLocaleDateString('pt-BR')),
        prices: result.history.map(h => parseFloat(h.price)),
        avgPrice,
        minPrice,
        maxPrice,
        currentPrice,
        trend: { direction: trendDirection, percent: trendPercent }
      };

      res.json(chartData);
    } catch (error) {
      safeNext(error, req, res, next);
    }
  }
}

module.exports = OpportunityController;
