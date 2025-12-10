// backend/routes/ceasa.js

const express = require('express');
const router = express.Router();
const prisma = require('../utils/prisma');
const { dbCircuitBreaker } = require('../utils/circuitBreaker');
const { verifyToken, checkRole } = require('../authMiddleware');

// ============================================
// 📈 ROTAS DE CEASA
// ============================================

/**
 * GET /api/ceasa/latest
 * Retorna os preços mais recentes de todas as regiões
 */
router.get('/latest', verifyToken, async (req, res) => {
  try {
    console.log('📊 Buscando preços mais recentes...');
    
    const prices = await prisma.ceasaPrice.findMany({
      orderBy: {
        price_date: 'desc'
      },
      take: 100,
      distinct: ['ceasa_region'] // Um por região
    });

    res.json({
      success: true,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    console.error('❌ Erro ao buscar preços recentes:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
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
    console.log(`📍 Buscando preços da região: ${region}`);

    const prices = await prisma.ceasaPrice.findMany({
      where: {
        ceasa_region: region
      },
      orderBy: {
        price_date: 'desc'
      },
      take: 30
    });

    if (prices.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Nenhum preço encontrado para a região ${region}`
      });
    }

    res.json({
      success: true,
      region: region,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    console.error('❌ Erro ao buscar preços por região:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
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
    console.log(`📉 Buscando histórico de: ${product}`);

    const prices = await prisma.ceasaPrice.findMany({
      where: {
        product_name: {
          contains: product,
          mode: 'insensitive'
        }
      },
      orderBy: {
        price_date: 'asc'
      }
    });

    if (prices.length === 0) {
      return res.status(404).json({
        success: false,
        error: `Nenhum histórico encontrado para ${product}`
      });
    }

    res.json({
      success: true,
      product: product,
      count: prices.length,
      data: prices
    });
  } catch (error) {
    console.error('❌ Erro ao buscar histórico:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
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
    console.log(`⚖️ Comparando histórico vs projeções para: ${product}`);
    
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
        take: 30
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
        take: 30
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
    console.error('❌ Erro ao comparar:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
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
    console.log(`🔍 Buscando ${product} em ${region}`);

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
      }
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
    console.error('❌ Erro na busca:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/ceasa/stats/regions
 * Retorna estatísticas por região
 */
router.get('/stats/regions', verifyToken, async (req, res) => {
  try {
    console.log('📊 Calculando estatísticas por região...');

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
    console.error('❌ Erro ao buscar estatísticas:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

/**
 * GET /api/ceasa/stats/products
 * Retorna estatísticas por produto
 */
router.get('/stats/products', verifyToken, async (req, res) => {
  try {
    console.log('📊 Calculando estatísticas por produto...');

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
    console.error('❌ Erro ao buscar estatísticas:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
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
    const { product, region, limit = 100 } = req.query;
    console.log('📅 Buscando dados históricos...');
    
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
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data_type: 'historical',
      count: prices.length,
      data: prices
    });
  } catch (error) {
    console.error('❌ Erro ao buscar dados históricos:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
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
    const { product, region, limit = 100 } = req.query;
    console.log('🔮 Buscando projeções...');
    
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
      take: parseInt(limit)
    });

    res.json({
      success: true,
      data_type: 'projections',
      count: prices.length,
      data: prices
    });
  } catch (error) {
    console.error('❌ Erro ao buscar projeções:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});


/**
 * POST /api/ceasa/import (PROTEGIDO COM RBAC - APENAS ADMIN)
 * Importa novos preços de CEASA
 */
router.post('/import', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    console.log(`🔄 Admin ${req.user.email} iniciando importação de preços...`);
    
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
    console.error('❌ Erro ao importar preços:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message 
    });
  }
});

module.exports = router;
