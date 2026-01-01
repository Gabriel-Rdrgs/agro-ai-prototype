// backend/validators/weatherValidators.js
// ✅ REFACTOR-005: Schemas Zod para validação de inputs de clima

const { z } = require('zod');

/**
 * Schema para coordenadas (lat/lng)
 */
const coordinatesSchema = z.object({
  lat: z.string().transform((val) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < -90 || parsed > 90) {
      throw new z.ZodError([{
        code: 'custom',
        path: ['lat'],
        message: 'Latitude deve ser um número entre -90 e 90'
      }]);
    }
    return parsed;
  }),
  lng: z.string().transform((val) => {
    const parsed = parseFloat(val);
    if (isNaN(parsed) || parsed < -180 || parsed > 180) {
      throw new z.ZodError([{
        code: 'custom',
        path: ['lng'],
        message: 'Longitude deve ser um número entre -180 e 180'
      }]);
    }
    return parsed;
  })
});

/**
 * Schema para query de eventos extremos
 */
const extremeEventsQuerySchema = coordinatesSchema.extend({
  days: z.string().optional().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 7 || parsed > 30 ? 16 : parsed;
  }).default('16')
});

/**
 * Schema para query de eventos históricos
 */
const historicalExtremeEventsQuerySchema = coordinatesSchema.extend({
  days_back: z.string().optional().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 1 || parsed > 30 ? 7 : parsed;
  }).default('7')
});

/**
 * Schema para query de supply risk
 */
const supplyRiskQuerySchema = coordinatesSchema.extend({
  product: z.string().optional().default('Tomate'),
  days: z.string().optional().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 7 || parsed > 30 ? 16 : parsed;
  }).default('16')
});

/**
 * Schema para query de forecast
 */
const forecastQuerySchema = coordinatesSchema;

/**
 * Schema para query de rain comparison
 */
const rainComparisonQuerySchema = coordinatesSchema.extend({
  days: z.string().optional().transform((val) => {
    const parsed = parseInt(val, 10);
    return isNaN(parsed) || parsed < 7 || parsed > 120 ? 30 : parsed;
  }).default('30')
});

module.exports = {
  coordinatesSchema,
  extremeEventsQuerySchema,
  historicalExtremeEventsQuerySchema,
  supplyRiskQuerySchema,
  forecastQuerySchema,
  rainComparisonQuerySchema
};

