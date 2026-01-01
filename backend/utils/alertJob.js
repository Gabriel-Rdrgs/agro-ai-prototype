// backend/utils/alertJob.js
// ✅ FASE B - B2: Job agendado para verificar e disparar alertas

const cron = require('node-cron');
const { checkAlertRules } = require('../services/alertService');
const logger = require('./logger');

let alertCronJob = null;

/**
 * Configura o job de verificação de alertas
 * @param {string} schedule - Cron schedule (padrão: a cada 30 minutos)
 */
function setupAlertJob(schedule = '*/30 * * * *') {
  if (alertCronJob) {
    alertCronJob.stop();
  }

  alertCronJob = cron.schedule(schedule, async () => {
    try {
      logger.info('🔔 Executando verificação de alertas...');
      await checkAlertRules();
    } catch (error) {
      logger.error(`❌ Erro no job de alertas: ${error.message}`);
    }
  }, {
    scheduled: true,
    timezone: 'America/Sao_Paulo'
  });

  logger.info(`✅ Job de verificação de alertas configurado: ${schedule}`);
}

/**
 * Para o job de alertas
 */
function stopAlertJob() {
  if (alertCronJob) {
    alertCronJob.stop();
    logger.info('⏹️ Job de alertas parado');
  }
}

module.exports = {
  setupAlertJob,
  stopAlertJob
};

