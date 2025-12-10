// backend/services/auditService.js
const prisma = require('../utils/prisma');

async function logAction(userId, action, details = '') {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId,
        action: action,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
      },
    });
    console.log(`[AUDIT] User ${userId} performed ${action}`);
  } catch (error) {
    // Importante: Falha no log não deve parar o sistema, mas deve ser avisada
    console.error('❌ Falha ao gravar log de auditoria:', error);
  }
}

module.exports = { logAction };