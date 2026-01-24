// backend/routes/admin.js
/**
 * ✅ FASE B - B4: Rotas administrativas
 * Endpoints para monitoramento e administração do sistema
 */

const express = require('express');
const router = express.Router();
const { verifyToken, checkRole } = require('../authMiddleware');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * GET /api/admin/cache/stats
 * Retorna estatísticas do cache (Redis + Memória)
 * Requer role: admin
 */
router.get('/cache/stats', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const stats = await cacheService.getStats();
    
    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      ...stats
    });
  } catch (error) {
    logger.error('❌ Erro ao buscar estatísticas do cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao buscar estatísticas do cache',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/cache/clear
 * Limpa todo o cache (Redis + Memória)
 * Requer role: admin
 */
router.post('/cache/clear', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    await cacheService.clear();
    
    logger.info('🧹 Cache limpo manualmente por admin');
    
    res.json({
      success: true,
      message: 'Cache limpo com sucesso'
    });
  } catch (error) {
    logger.error('❌ Erro ao limpar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao limpar cache',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * POST /api/admin/cache/invalidate
 * Invalida cache por padrão
 * Requer role: admin
 * Body: { prefix: 'OPPORTUNITIES', pattern: '*' }
 */
router.post('/cache/invalidate', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { prefix, pattern } = req.body;
    
    if (!prefix || !pattern) {
      return res.status(400).json({
        success: false,
        error: 'prefix e pattern são obrigatórios'
      });
    }
    
    const invalidated = await cacheService.invalidatePattern(prefix, pattern);
    
    logger.info(`🧹 Cache invalidado: ${invalidated} itens removidos (${prefix}:${pattern})`);
    
    res.json({
      success: true,
      message: `Cache invalidado com sucesso`,
      invalidated
    });
  } catch (error) {
    logger.error('❌ Erro ao invalidar cache:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao invalidar cache',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;

