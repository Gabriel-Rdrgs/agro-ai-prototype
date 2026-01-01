// backend/validators/analyticsValidators.js
// ✅ REFACTOR-005: Schemas Zod para validação de inputs de analytics

const { z } = require('zod');

/**
 * Schema para query de trends
 */
const trendsQuerySchema = z.object({
  product: z.string().min(1, 'Produto é obrigatório'),
  region: z.string().optional(),
  municipality: z.string().optional(),
  days: z.string().optional().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 1 || parsed > 365 ? 90 : parsed;
  }).default('90')
});

/**
 * Schema para query de products
 */
const productsQuerySchema = z.object({
  // Sem parâmetros obrigatórios - retorna todos os produtos
});

/**
 * Schema para query de regions
 */
const regionsQuerySchema = z.object({
  product: z.string().optional()
});

/**
 * Schema para query de municipalities
 */
const municipalitiesQuerySchema = z.object({
  product: z.string().optional(),
  region: z.string().optional()
});

/**
 * Schema para query de trend (singular)
 */
const trendQuerySchema = z.object({
  product: z.string().optional(), // Produto pode ser opcional (frontend chama sem parâmetros às vezes)
  city: z.string().optional() // Cidade pode ser opcional
});

module.exports = {
  trendsQuerySchema,
  productsQuerySchema,
  regionsQuerySchema,
  municipalitiesQuerySchema,
  trendQuerySchema
};

