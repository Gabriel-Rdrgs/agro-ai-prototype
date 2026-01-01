// backend/validators/fuelValidators.js
// ✅ REFACTOR-005: Schemas Zod para validação de inputs de combustível

const { z } = require('zod');

/**
 * Schema para parâmetros de preço de combustível por estado
 */
const fuelPriceParamsSchema = z.object({
  state: z.string().min(2, 'Estado é obrigatório').transform((val) => val.toLowerCase())
});

module.exports = {
  fuelPriceParamsSchema
};

