// backend/validators/calcValidators.js
// ✅ REFACTOR-005: Schemas Zod para validação de inputs de calculadoras

const { z } = require('zod');

/**
 * Schema para body de production calculation
 */
const productionCalculationBodySchema = z.object({
  product: z.string().min(1, 'Produto é obrigatório'),
  state: z.string().min(2, 'Estado é obrigatório'),
  area_hectares: z.number().positive('Área deve ser positiva'),
  expected_yield_per_hectare: z.number().positive('Produtividade esperada deve ser positiva').optional(),
  planting_month: z.number().int().min(1).max(12).optional(),
  region: z.string().optional()
});

/**
 * Schema para body de arbitrage calculation
 */
const arbitrageCalculationBodySchema = z.object({
  product: z.string().min(1, 'Produto é obrigatório'),
  origin_state: z.string().min(2, 'Estado de origem é obrigatório'),
  destination_state: z.string().min(2, 'Estado de destino é obrigatório'),
  buy_price: z.number().positive('Preço de compra deve ser positivo'),
  sell_price: z.number().positive('Preço de venda deve ser positivo'),
  volume: z.number().positive('Volume deve ser positivo'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  dest_lat: z.number().min(-90).max(90).optional(),
  dest_lng: z.number().min(-180).max(180).optional()
});

module.exports = {
  productionCalculationBodySchema,
  arbitrageCalculationBodySchema
};

