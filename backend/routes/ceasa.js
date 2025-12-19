// backend/routes/ceasa.js

const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { dbCircuitBreaker } = require('../utils/circuitBreaker');
const { verifyToken, checkRole } = require('../authMiddleware');
const logger = require('../utils/logger');

// ============================================
// 📈 ROTAS DE CEASA
// ============================================

/**
 * GET /api/ceasa/latest
 * Retorna os preços mais recentes de todas as regiões
 */
router.get('/latest', verifyToken, async (req, res) => {
  try {
    logger.info('📊 Buscando preços mais recentes...');
    
    // ✅ OTIMIZAÇÃO: Limite padrão de 100, máximo de 500
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    
    const prices = await prisma.ceasaPrice.findMany({
      orderBy: {
        price_date: 'desc'
      },
      take: limit,
      distinct: ['ceasa_region'] // Um por região
    });

    logger.debug(`✅ Preços encontrados: ${prices.length} registros`);
    
    res.json({
      success: true,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar preços recentes:', {
      error: error.message,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível carregar os preços recentes. Tente novamente em alguns instantes.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ceasa/region/:region
 * Retorna preços de uma região específica
 * Exemplo: /api/ceasa/region/SP
 */
router.get('/region/:region', verifyToken, async (req, res) => {
  try {
    const region = req.params.region.toUpperCase();
    logger.info(`📍 Buscando preços da região: ${region}`);

    // ✅ OTIMIZAÇÃO: Limite padrão de 30, máximo de 200
    const limit = Math.min(parseInt(req.query.limit) || 30, 200);
    
    const prices = await prisma.ceasaPrice.findMany({
      where: {
        ceasa_region: region
      },
      orderBy: {
        price_date: 'desc'
      },
      take: limit
    });

    if (prices.length === 0) {
      logger.warn(`⚠️ Nenhum preço encontrado para a região ${region}`);
      return res.status(404).json({
        success: false,
        error: `Nenhum preço encontrado para a região ${region}. Verifique se a região está correta.`
      });
    }

    logger.debug(`✅ Preços encontrados para ${region}: ${prices.length} registros`);
    
    res.json({
      success: true,
      region: region,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar preços por região:', {
      error: error.message,
      region: req.params.region,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível carregar os preços da região. Tente novamente em alguns instantes.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ceasa/history/:product
 * Retorna histórico de preços de um produto
 * Exemplo: /api/ceasa/history/Tomate
 */
router.get('/history/:product', verifyToken, async (req, res) => {
  try {
    const product = req.params.product;
    logger.info(`📉 Buscando histórico de: ${product}`);

    // ✅ OTIMIZAÇÃO: Limite padrão de 500, máximo de 2000
    const limit = Math.min(parseInt(req.query.limit) || 500, 2000);
    
    const prices = await prisma.ceasaPrice.findMany({
      where: {
        product_name: {
          contains: product,
          mode: 'insensitive'
        }
      },
      orderBy: {
        price_date: 'asc'
      },
      take: limit
    });

    if (prices.length === 0) {
      logger.warn(`⚠️ Nenhum histórico encontrado para ${product}`);
      return res.status(404).json({
        success: false,
        error: `Nenhum histórico encontrado para "${product}". Verifique se o nome do produto está correto.`
      });
    }

    logger.debug(`✅ Histórico encontrado para ${product}: ${prices.length} registros`);
    
    res.json({
      success: true,
      product: product,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar histórico:', {
      error: error.message,
      product: req.params.product,
      stack: error.stack
    });
    
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível carregar o histórico de preços. Tente novamente em alguns instantes.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ceasa/compare/:product
 * Compara dados históricos com projeções para um produto
 * ⚠️ DEVE VIR ANTES DE /:region/:product para não ser interceptado
 */
router.get('/compare/:product', verifyToken, async (req, res) => {
  try {
    const product = req.params.product;
    logger.info(`⚖️ Comparando histórico vs projeções para: ${product}`);
    
    const [historical, projections] = await Promise.all([
      prisma.ceasaPrice.findMany({
        where: {
          product_name: {
            contains: product,
            mode: 'insensitive'
          },
          is_projection: false
        },
        orderBy: {
          price_date: 'desc'
        },
        take: Math.min(parseInt(req.query.limit) || 30, 100) // ✅ OTIMIZAÇÃO: Limite máximo de 100
      }),
      prisma.ceasaPrice.findMany({
        where: {
          product_name: {
            contains: product,
            mode: 'insensitive'
          },
          is_projection: true
        },
        orderBy: {
          price_date: 'asc'
        },
        take: Math.min(parseInt(req.query.limit) || 30, 100) // ✅ OTIMIZAÇÃO: Limite máximo de 100
      })
    ]);

    // Verifica se há dados
    if (historical.length === 0 && projections.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Nenhum dado encontrado para ${product}`
      });
    }

    // Calcula estatísticas
    const histAvg = historical.length > 0 
      ? historical.reduce((sum, p) => sum + Number(p.price_avg), 0) / historical.length 
      : 0;
    const projAvg = projections.length > 0
      ? projections.reduce((sum, p) => sum + Number(p.price_avg), 0) / projections.length
      : 0;
    
    const difference = histAvg > 0 && projAvg > 0 
      ? ((projAvg - histAvg) / histAvg * 100) 
      : (projAvg > 0 && histAvg === 0 ? 100 : 0);

    res.json({
      success: true,
      product: product,
      historical: {
        count: historical.length,
        avg_price: histAvg > 0 ? parseFloat(histAvg.toFixed(2)) : 0,
        data: historical.slice(0, 10) // Limita a 10 para não sobrecarregar
      },
      projections: {
        count: projections.length,
        avg_price: projAvg > 0 ? parseFloat(projAvg.toFixed(2)) : 0,
        data: projections.slice(0, 10) // Limita a 10 para não sobrecarregar
      },
      comparison: {
        difference_percent: parseFloat(difference.toFixed(2)),
        trend: difference > 5 ? 'up' : difference < -5 ? 'down' : 'stable',
        note: projections.length === 0 ? 'Nenhuma projeção disponível' : null
      }
    });
  } catch (error) {
    logger.error('❌ Erro ao comparar:', { error: error.message, product, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível comparar histórico e projeções. Tente novamente em alguns instantes.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ceasa/:region/:product
 * Retorna preços de um produto em uma região específica
 * Exemplo: /api/ceasa/SP/Tomate
 */
router.get('/:region/:product', verifyToken, async (req, res) => {
  try {
    const region = req.params.region.toUpperCase();
    const product = req.params.product;
    logger.info(`🔍 Buscando ${product} em ${region}`);

    // ✅ OTIMIZAÇÃO: Limite padrão de 30, máximo de 200
    const limit = Math.min(parseInt(req.query.limit) || 30, 200);
    
    const prices = await prisma.ceasaPrice.findMany({
      where: {
        ceasa_region: region,
        product_name: {
          contains: product,
          mode: 'insensitive'
        }
      },
      orderBy: {
        price_date: 'desc'
      },
      take: limit
    });

    if (prices.length === 0) {
      return res.status(404).json({
        success: false,
        error: `${product} não encontrado em ${region}`
      });
    }

    res.json({
      success: true,
      region: region,
      product: product,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    logger.error('❌ Erro na busca:', { error: error.message, product, region, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: `Não foi possível buscar preços de ${product} em ${region}. Tente novamente em alguns instantes.`,
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ceasa/stats/regions
 * Retorna estatísticas por região
 */
router.get('/stats/regions', verifyToken, async (req, res) => {
  try {
    logger.info('📊 Calculando estatísticas por região...');

    const stats = await prisma.ceasaPrice.groupBy({
      by: ['ceasa_region'],
      _count: {
        id: true
      },
      _avg: {
        price_avg: true
      },
      _min: {
        price_min: true
      },
      _max: {
        price_max: true
      }
    });

    res.json({
      success: true,
      count: stats.length,
      data: stats
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar estatísticas por região:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível calcular as estatísticas por região. Tente novamente em alguns instantes.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ceasa/stats/products
 * Retorna estatísticas por produto
 */
router.get('/stats/products', verifyToken, async (req, res) => {
  try {
    logger.info('📊 Calculando estatísticas por produto...');

    const stats = await prisma.ceasaPrice.groupBy({
      by: ['product_name'],
      _count: {
        id: true
      },
      _avg: {
        price_avg: true
      },
      _min: {
        price_min: true
      },
      _max: {
        price_max: true
      }
    });

    res.json({
      success: true,
      count: stats.length,
      data: stats
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar estatísticas por produto:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível calcular as estatísticas por produto. Tente novamente em alguns instantes.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ceasa/historical
 * Retorna apenas dados históricos (não projeções)
 * Query params: ?product=Tomate&region=SP&limit=100
 */
router.get('/historical', verifyToken, async (req, res) => {
  try {
    const { product, region } = req.query;
    logger.info('📅 Buscando dados históricos...');
    
    // ✅ OTIMIZAÇÃO: Limite padrão de 100, máximo de 500
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    
    const where = {
      is_projection: false
    };
    
    if (product) {
      where.product_name = {
        contains: product,
        mode: 'insensitive'
      };
    }
    
    if (region) {
      where.ceasa_region = region.toUpperCase();
    }
    
    const prices = await prisma.ceasaPrice.findMany({
      where,
      orderBy: {
        price_date: 'desc'
      },
      take: limit
    });

    res.json({
      success: true,
      data_type: 'historical',
      count: prices.length,
      data: prices
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar dados históricos:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível carregar os dados históricos. Tente novamente em alguns instantes.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * GET /api/ceasa/projections
 * Retorna apenas projeções futuras
 * Query params: ?product=Tomate&region=SP&limit=100
 */
router.get('/projections', verifyToken, async (req, res) => {
  try {
    const { product, region } = req.query;
    logger.info('🔮 Buscando projeções...');
    
    // ✅ OTIMIZAÇÃO: Limite padrão de 100, máximo de 500
    const limit = Math.min(parseInt(req.query.limit) || 100, 500);
    
    const where = {
      is_projection: true
    };
    
    if (product) {
      where.product_name = {
        contains: product,
        mode: 'insensitive'
      };
    }
    
    if (region) {
      where.ceasa_region = region.toUpperCase();
    }
    
    const prices = await prisma.ceasaPrice.findMany({
      where,
      orderBy: {
        price_date: 'asc'
      },
      take: limit
    });

    res.json({
      success: true,
      data_type: 'projections',
      count: prices.length,
      data: prices
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar projeções:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível carregar as projeções. Tente novamente em alguns instantes.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});


/**
 * POST /api/ceasa/import (PROTEGIDO COM RBAC - APENAS ADMIN)
 * Importa novos preços de CEASA
 */
router.post('/import', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    logger.info(`🔄 Admin ${req.user.email} iniciando importação de preços...`);
    
    // Validação básica
    const { prices } = req.body;
    if (!Array.isArray(prices)) {
      return res.status(400).json({
        success: false,
        error: 'Esperado array de preços'
      });
    }

    // Importar em lote
    const result = await prisma.ceasaPrice.createMany({
      data: prices,
      skipDuplicates: true // Ignorar duplicadas por unique constraint
    });

    res.json({
      success: true,
      imported: result.count,
      message: `${result.count} preços importados com sucesso`
    });
  } catch (error) {
    logger.error('❌ Erro ao importar preços:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      success: false,
      error: 'Não foi possível importar os preços. Verifique os dados e tente novamente.',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;
