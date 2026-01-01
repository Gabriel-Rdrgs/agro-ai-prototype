// backend/validators/marketValidators.js
// ✅ REFACTOR-005: Schemas Zod para validação de inputs de mercado

const { z } = require('zod');

/**
 * Schema para body de market scan
 */
const marketScanBodySchema = z.object({
  product: z.string().min(1, 'Produto é obrigatório'),
  origin_state: z.string().min(2, 'Estado de origem é obrigatório'),
  volume: z.number().positive('Volume deve ser positivo'),
  month: z.number().int().min(1).max(12).optional()
});

module.exports = {
  marketScanBodySchema
};

