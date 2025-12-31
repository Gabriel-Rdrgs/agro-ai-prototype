#!/usr/bin/env node
/**
 * Script para recalcular ROI de todas as oportunidades
 * 
 * Uso:
 *   node scripts/recalculate_all_roi.js
 * 
 * Ou via Railway Scheduler Worker:
 *   Schedule: 0 2 * * * (2h da manhã, diariamente)
 *   Command: node scripts/recalculate_all_roi.js
 */

const axios = require('axios');
require('dotenv').config();

const API_URL = process.env.API_URL || process.env.BACKEND_URL || 'http://localhost:3001';
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

async function recalculateAllROI() {
  console.log('🔄 Iniciando recálculo automático de ROI...');
  console.log(`📍 API URL: ${API_URL}`);
  
  if (!INTERNAL_API_KEY) {
    console.error('❌ INTERNAL_API_KEY não configurada!');
    process.exit(1);
  }

  try {
    const startTime = Date.now();
    
    const response = await axios.post(
      `${API_URL}/api/internal/calculate-all-roi`, // ✅ Endpoint interno (sem auth JWT)
      {},
      {
        headers: {
          'X-Internal-API-Key': INTERNAL_API_KEY,
          'Content-Type': 'application/json'
        },
        timeout: 300000 // 5 minutos (pode demorar para muitas oportunidades)
      }
    );

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log('✅ ROI recalculado com sucesso!');
    console.log(`📊 Resultado:`, response.data);
    console.log(`⏱️  Duração: ${duration}s`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Erro ao recalcular ROI:');
    console.error('   Mensagem:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  recalculateAllROI();
}

module.exports = { recalculateAllROI };

