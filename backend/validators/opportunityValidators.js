// backend/validators/opportunityValidators.js
// ✅ REFACTOR-005: Schemas Zod para validação de inputs de oportunidades

const { z } = require('zod');

/**
 * Schema para query parameters de listagem de oportunidades
 */
const listOpportunitiesQuerySchema = z.object({
  limit: z.string().optional().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  }),
  skip: z.string().optional().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) ? undefined : parsed;
  }),
  product: z.string().optional(),
  state: z.string().optional(),
  minRoi: z.string().optional().transform((val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  }),
  maxRoi: z.string().optional().transform((val) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? undefined : parsed;
  })
});

/**
 * Schema para body de comparação de oportunidades
 * Aceita array de números ou strings (converte strings para números)
 */
const compareOpportunitiesBodySchema = z.object({
  opportunityIds: z.array(
    z.union([
      z.number().int().positive(),
      z.string().transform((val) => {
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed <= 0) {
          throw new z.ZodError([{
            code: 'custom',
            path: [],
            message: 'ID deve ser um número positivo'
          }]);
        }
        return parsed;
      })
    ])
  )
    .min(1, 'opportunityIds deve conter pelo menos 1 ID')
    .max(5, 'Máximo de 5 oportunidades por comparação')
});

/**
 * Schema para parâmetros de histórico de preços
 */
const getHistoryParamsSchema = z.object({
  id: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new z.ZodError([{
        code: 'custom',
        path: ['id'],
        message: 'ID deve ser um número positivo'
      }]);
    }
    return parsed;
  })
});

/**
 * Schema para query parameters de histórico
 */
const getHistoryQuerySchema = z.object({
  days: z.string().optional().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed <= 0 ? 30 : parsed;
  }).default('30')
});

/**
 * Schema para body de simulação de cenário
 */
const simulateScenarioBodySchema = z.object({
  dollar_change: z.number().optional().default(0),
  freight_change: z.number().optional().default(0),
  buy_price_change: z.number().optional().default(0),
  sell_price_change: z.number().optional().default(0),
  rain_mm: z.number().nullable().optional(),
  temperature_change: z.number().optional().default(0)
});

/**
 * Schema para parâmetros de recálculo de ROI
 */
const recalculateRoiParamsSchema = z.object({
  id: z.string().transform((val) => {
    const parsed = parseInt(val, 10);
    if (isNaN(parsed) || parsed <= 0) {
      throw new z.ZodError([{
        code: 'custom',
        path: ['id'],
        message: 'ID deve ser um número positivo'
      }]);
    }
    return parsed;
  })
});

module.exports = {
  listOpportunitiesQuerySchema,
  compareOpportunitiesBodySchema,
  getHistoryParamsSchema,
  getHistoryQuerySchema,
  simulateScenarioBodySchema,
  recalculateRoiParamsSchema
};

