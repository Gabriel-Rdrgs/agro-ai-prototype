// backend/validators/zarcValidators.js
// ✅ REFACTOR-005: Schemas Zod para validação de inputs de ZARC

const { z } = require('zod');

/**
 * Schema para query de planting windows
 */
const plantingWindowsQuerySchema = z.object({
  product: z.string().min(1, 'Produto é obrigatório'),
  state: z.string().min(2, 'Estado é obrigatório')
});

module.exports = {
  plantingWindowsQuerySchema
};

