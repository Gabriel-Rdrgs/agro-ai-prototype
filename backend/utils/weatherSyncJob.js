// backend/utils/weatherSyncJob.js
// ============================================
// ✅ FASE 0 - Semana 3: Job agendado para sincronizar dados climáticos
// ============================================

const cron = require('node-cron');
const axios = require('axios');
const logger = require('./logger');

const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://ai-service:8000';

/**
 * Executa a sincronização de dados climáticos via script Python
 */
async function syncWeatherData() {
  try {
    logger.info('🔄 Iniciando sincronização de dados climáticos...');
    
    // Chama o script Python via API ou executa diretamente
    // Por enquanto, vamos executar via subprocess (mais direto)
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    const scriptPath = process.env.WEATHER_SYNC_SCRIPT_PATH || 
                      '/app/scripts/sync_weather_data.py'; // Caminho no Docker
    
    // Tenta executar o script Python
    try {
      const { stdout, stderr } = await execAsync(
        `python3 ${scriptPath}`,
        { 
          timeout: 300000, // 5 minutos timeout
          maxBuffer: 10 * 1024 * 1024 // 10MB buffer
        }
      );
      
      if (stdout) {
        logger.info(`✅ Sincronização concluída: ${stdout}`);
      }
      if (stderr) {
        logger.warn(`⚠️ Avisos: ${stderr}`);
      }
      
      return { success: true, message: 'Sincronização concluída' };
      
    } catch (execError) {
      // Se falhar, tenta via API (se houver endpoint)
      logger.warn(`⚠️ Execução direta falhou, tentando via API: ${execError.message}`);
      
      try {
        const response = await axios.post(
          `${PYTHON_API_URL}/admin/sync-weather`,
          {},
          { timeout: 300000 } // 5 minutos
        );
        
        logger.info(`✅ Sincronização via API concluída: ${JSON.stringify(response.data)}`);
        return { success: true, data: response.data };
        
      } catch (apiError) {
        logger.error(`❌ Erro ao sincronizar via API: ${apiError.message}`);
        throw apiError;
      }
    }
    
  } catch (error) {
    logger.error(`❌ Erro na sincronização de dados climáticos: ${error.message}`, {
      error: error.message,
      stack: error.stack
    });
    return { success: false, error: error.message };
  }
}

/**
 * Configura o job agendado para sincronização diária
 * 
 * @param {string} schedule - Cron schedule (padrão: '0 2 * * *' = 2h da manhã)
 */
function setupWeatherSyncJob(schedule = '0 2 * * *') {
  // Valida o schedule
  if (!cron.validate(schedule)) {
    logger.error(`❌ Schedule inválido: ${schedule}`);
    return null;
  }
  
  logger.info(`⏰ Configurando job de sincronização climática: ${schedule}`);
  
  // Cria o job
  const job = cron.schedule(schedule, async () => {
    logger.info('⏰ Executando job agendado de sincronização climática...');
    await syncWeatherData();
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });
  
  logger.info('✅ Job de sincronização climática configurado');
  
  return job;
}

/**
 * Executa sincronização manual (para testes)
 */
async function runManualSync() {
  logger.info('🔧 Executando sincronização manual...');
  return await syncWeatherData();
}

module.exports = {
  syncWeatherData,
  setupWeatherSyncJob,
  runManualSync
};
