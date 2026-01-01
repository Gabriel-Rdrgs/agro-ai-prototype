// backend/services/opportunityService.js
// ✅ REFACTOR-001: Service layer para lógica de negócio de oportunidades

const prisma = require('../utils/prisma');
const cache = require('../utils/cache');
const logger = require('../utils/logger');
const { CACHE_TTL, LIMITS } = require('../config/constants');
const { validatePrice } = require('../utils/validation');
const { dbCircuitBreaker } = require('../utils/circuitBreaker');

class OpportunityService {
  constructor(pythonAxios, getDollarRate) {
    this.pythonAxios = pythonAxios;
    this.getDollarRate = getDollarRate;
  }

  /**
   * Lista todas as oportunidades com cache
   * ✅ REFACTOR-001: Extraído de server.js
   */
  async listOpportunities(filters = {}) {
    const cacheKey = 'opportunities:all';
    
    // Verifica cache
    const cached = cache.get(cacheKey);
    if (cached) {
      logger.debug('⚡ Cache HIT: /api/opportunities');
      return cached;
    }

    // Busca no banco
    const limit = Math.min(parseInt(filters.limit) || LIMITS.OPPORTUNITIES_LIST_DEFAULT, LIMITS.OPPORTUNITIES_LIST_MAX);
    
    const [opportunities, dollarRate] = await Promise.all([
      dbCircuitBreaker.execute(async () => {
        return await prisma.opportunity.findMany({
          select: {
            id: true,
            product: true,
            category: true,
            city: true,
            state: true,
            lat: true,
            lng: true,
            buyPrice: true,
            sellPrice: true,
            sellLocation: true,
            destLat: true,
            destLng: true,
            roi: true,
            freight: true,
            riskLevel: true,
            volume: true,
            season: true,
            climate: true,
            description: true,
            createdAt: true
          },
          take: limit,
          orderBy: { createdAt: 'desc' }
        });
      }),
      this.getDollarRate()
    ]);

    logger.info(`💵 Dólar Atual: R$ ${dollarRate} | Oportunidades: ${opportunities.length}`);

    // Formata oportunidades
    const formattedOpportunities = opportunities.map(opp => {
      const buyPrice = validatePrice(opp.buyPrice, 'buyPrice', opp.id);
      const sellPrice = validatePrice(opp.sellPrice, 'sellPrice', opp.id);
      
      const roi = opp.roi ? parseFloat(opp.roi) : null;
      const freight = opp.freight ? parseFloat(opp.freight) : null;

      return {
        id: opp.id,
        product: opp.product,
        dollarRate: dollarRate,
        origin: {
          city: opp.city,
          state: opp.state
        },
        destination: {
          name: opp.sellLocation,
          state: opp.sellLocation && opp.sellLocation.includes('-')
            ? opp.sellLocation.split('-').pop().trim()
            : null
        },
        coords: {
          lat: opp.lat,
          lng: opp.lng
        },
        financials: {
          buyPrice: buyPrice,
          sellPrice: sellPrice || null,
          roi: roi,
          freight: freight
        },
        details: {
          category: opp.category,
          volume: opp.volume,
          riskLevel: opp.riskLevel,
          climate: opp.climate,
          description: opp.description,
          season: opp.season
        },
        createdAt: opp.createdAt
      };
    });

    // Salva no cache
    cache.set(cacheKey, formattedOpportunities, CACHE_TTL.OPPORTUNITIES);

    return formattedOpportunities;
  }

  /**
   * Busca oportunidades para comparação
   * ✅ REFACTOR-001: Extraído de server.js
   */
  async compareOpportunities(opportunityIds) {
    // Busca oportunidades
    const opportunities = await prisma.opportunity.findMany({
      where: {
        id: { in: opportunityIds }
      },
      select: {
        id: true,
        product: true,
        category: true,
        city: true,
        state: true,
        lat: true,
        lng: true,
        buyPrice: true,
        sellPrice: true,
        sellLocation: true,
        destLat: true,
        destLng: true,
        roi: true,
        freight: true,
        riskLevel: true,
        volume: true,
        season: true,
        createdAt: true
      }
    });

    if (opportunities.length === 0) {
      return { opportunities: [], recommendations: {} };
    }

    // Busca recomendações em lote
    let recommendationsMap = {};
    try {
      const batchPayload = opportunities.map((opp) => ({
        product: opp.product,
        state: opp.state,
        roi: opp.roi ? parseFloat(opp.roi) : null,
        current_price: opp.sellPrice ? parseFloat(opp.sellPrice) : null,
        buy_price: opp.buyPrice ? parseFloat(opp.buyPrice) : null
      }));

      // ✅ MELHORADO: Timeout aumentado para 90s (pode incluir múltiplas análises)
      const batchResponse = await this.pythonAxios.post(
        '/api/v1/predict/recommendations/batch',
        { opportunities: batchPayload },
        { timeout: 90000 } // 90 segundos (TIMEOUTS.BATCH_OPERATIONS aumentado)
      );

      if (batchResponse.data && batchResponse.data.recommendations) {
        recommendationsMap = batchResponse.data.recommendations;
      }
    } catch (err) {
      // ✅ MELHORADO: Log mais detalhado e não falha completamente se recomendações falharem
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        logger.warn(`⏱️ Timeout ao buscar recomendações em lote (90s excedido). Continuando sem recomendações.`);
      } else if (err.code === 'ECONNREFUSED') {
        logger.warn(`🔌 Serviço Python indisponível ao buscar recomendações. Continuando sem recomendações.`);
      } else {
        logger.warn(`⚠️ Erro ao buscar recomendações em lote: ${err.message}. Continuando sem recomendações.`);
      }
      // Continua sem recomendações - não é crítico para a comparação
    }

    // Combina oportunidades com recomendações
    const opportunitiesWithRecommendation = opportunities.map((opp, index) => {
      const recommendation = recommendationsMap[index] || null;

      return {
        id: opp.id,
        product: opp.product,
        origin: {
          city: opp.city,
          state: opp.state,
          lat: opp.lat,
          lng: opp.lng
        },
        destination: {
          name: opp.sellLocation,
          lat: opp.destLat,
          lng: opp.destLng
        },
        buyPrice: opp.buyPrice,
        sellPrice: opp.sellPrice,
        roi: opp.roi ? parseFloat(opp.roi) : null,
        freight: opp.freight ? parseFloat(opp.freight) : null,
        riskLevel: opp.riskLevel,
        volume: opp.volume,
        season: opp.season,
        recommendation: recommendation ? recommendation.action : null
      };
    });

    return {
      opportunities: opportunitiesWithRecommendation,
      recommendations: recommendationsMap
    };
  }

  /**
   * Busca histórico de preços de uma oportunidade
   * ✅ REFACTOR-001: Extraído de server.js
   */
  async getPriceHistory(opportunityId, days = 30) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: opportunityId }
    });

    if (!opportunity) {
      return null;
    }

    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - days);

    const history = await prisma.priceHistory.findMany({
      where: {
        opportunityId: opportunityId,
        createdAt: {
          gte: dateLimit
        }
      },
      orderBy: {
        createdAt: 'asc'
      },
      select: {
        id: true,
        price: true,
        createdAt: true
      }
    });

    return {
      opportunity,
      history
    };
  }
}

module.exports = OpportunityService;

