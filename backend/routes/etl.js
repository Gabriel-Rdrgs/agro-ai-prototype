// backend/routes/etl.js
/**
 * Rotas para ETL assíncrono
 * URGENTE: Performance - ETL não deve bloquear requests
 */

const express = require('express');
const router = express.Router();
const axios = require('axios');
const { verifyToken, checkRole } = require('../authMiddleware');
const jobQueue = require('../utils/jobQueue');
const cache = require('../utils/cache');
const { logAction } = require('../services/auditService'); // ✅ AUDIT LOG

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://ai-service:8000';

/**
 * POST /api/admin/etl/start
 * Inicia ETL em background (retorna imediatamente)
 */
router.post('/start', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const userId = req.user?.id || 'system';
    const { type = 'all', skipIbge = false } = req.body;

    // ✅ AUDIT LOG: Registra ação crítica
    await logAction(userId, 'ETL_START', `Iniciado ETL tipo: ${type}, skipIbge: ${skipIbge}`);

    // Cria job
    const jobId = jobQueue.createJob('etl', {
      type,
      skipIbge
    });

    // Inicia em background
    jobQueue.startJob(jobId, async (job) => {
      try {
        jobQueue.updateProgress(jobId, 10, 'Iniciando ETL...');

        // Chama Python API
        const endpoint = type === 'all' 
          ? '/api/v1/admin/etl/all'
          : type === 'market'
          ? '/api/v1/admin/etl/market-prices'
          : '/api/v1/admin/etl/ibge-production';

        const params = type === 'all' ? { skip_ibge: skipIbge } : {};
        
        jobQueue.updateProgress(jobId, 30, 'Processando dados...');
        
        const response = await axios.post(
          `${PYTHON_API_URL}${endpoint}`,
          params,
          { timeout: 600000 } // 10 minutos
        );

        jobQueue.updateProgress(jobId, 90, 'Finalizando...');

        // Invalida cache após ETL
        cache.invalidatePattern('opportunities:*');

        // ✅ AUDIT LOG: Registra conclusão do ETL (em background)
        await logAction(userId, 'ETL_COMPLETE', `ETL ${type} concluído com sucesso. JobId: ${jobId}`);

        return {
          success: true,
          ...response.data
        };
      } catch (error) {
        // ✅ AUDIT LOG: Registra erro do ETL (em background)
        await logAction(userId, 'ETL_ERROR', `ETL ${type} falhou. JobId: ${jobId}, Erro: ${error.message}`);
        throw new Error(error.response?.data?.detail || error.message);
      }
    });

    // Retorna imediatamente (não espera conclusão)
    res.json({
      success: true,
      jobId,
      message: 'ETL iniciado em background',
      statusUrl: `/api/admin/etl/status/${jobId}`
    });

  } catch (error) {
    const userId = req.user?.id || 'system';
    console.error('❌ Erro ao iniciar ETL:', error);
    
    // ✅ AUDIT LOG: Registra erro ao iniciar ETL
    await logAction(userId, 'ETL_START_ERROR', `Erro ao iniciar ETL: ${error.message}`);
    
    res.status(500).json({
      error: 'Erro ao iniciar ETL',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/etl/status/:jobId
 * Verifica status do job
 */
router.get('/status/:jobId', verifyToken, checkRole(['admin']), (req, res) => {
  try {
    const { jobId } = req.params;
    const job = jobQueue.getJob(jobId);

    if (!job) {
      return res.status(404).json({
        error: 'Job não encontrado'
      });
    }

    res.json({
      id: job.id,
      type: job.type,
      status: job.status, // pending, running, completed, failed
      progress: job.progress,
      message: job.data.message,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt
    });

  } catch (error) {
    console.error('❌ Erro ao buscar status:', error);
    res.status(500).json({
      error: 'Erro ao buscar status',
      details: error.message
    });
  }
});

/**
 * GET /api/admin/etl/jobs
 * Lista todos os jobs (últimos 50)
 */
router.get('/jobs', verifyToken, checkRole(['admin']), (req, res) => {
  try {
    const jobs = jobQueue.listJobs(50);
    
    res.json({
      total: jobs.length,
      jobs: jobs.map(job => ({
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        createdAt: job.createdAt,
        completedAt: job.completedAt
      }))
    });

  } catch (error) {
    console.error('❌ Erro ao listar jobs:', error);
    res.status(500).json({
      error: 'Erro ao listar jobs',
      details: error.message
    });
  }
});

module.exports = router;



