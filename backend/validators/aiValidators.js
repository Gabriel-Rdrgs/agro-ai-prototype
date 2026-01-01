// backend/validators/aiValidators.js
// ✅ REFACTOR-005: Schemas Zod para validação de inputs de IA

const { z } = require('zod');

/**
 * Schema para body de storage analysis
 * Aceita tanto os campos novos (storage_cost_per_day, accumulated_rainfall) quanto os antigos
 */
const storageAnalysisBodySchema = z.object({
  product: z.string().min(1, 'Produto é obrigatório'),
  state: z.string().min(2, 'Estado é obrigatório'),
  current_price: z.number().nonnegative('Preço atual deve ser não negativo'),
  buy_price: z.number().nonnegative('Preço de compra deve ser não negativo'),
  // Campos opcionais (novos do frontend)
  storage_cost_per_day: z.number().nonnegative().optional(),
  accumulated_rainfall: z.number().nonnegative().optional(),
  daily_rain: z.union([z.number().nonnegative(), z.array(z.number())]).optional(),
  // Campos opcionais (antigos)
  risk_factor: z.number().min(0).max(1).optional(),
  daily_temp_max: z.number().optional(),
  daily_sun: z.number().min(0).optional(),
  daily_temp_min: z.number().optional(),
  lat: z.number().min(-90).max(90).optional().default(0),
  lng: z.number().min(-180).max(180).optional().default(0)
});

/**
 * Schema para body de batch AI
 * Aceita objetos de oportunidade completos do frontend (camelCase ou snake_case)
 * O backend processa e normaliza os dados antes de enviar ao Python
 */
const batchAIBodySchema = z.object({
  items: z.array(z.any()).min(1, 'Items array não pode estar vazio')
  // Usa z.any() porque o frontend envia objetos completos de oportunidade
  // e o backend já faz a normalização (linha 1702-1721 do server.js)
});

/**
 * Schema para body de recommendation
 */
const recommendationBodySchema = z.object({
  product: z.string().min(1, 'Produto é obrigatório'),
  state: z.string().min(2, 'Estado é obrigatório'),
  roi: z.number().optional(),
  roi_d7: z.number().optional(),
  roi_d30: z.number().optional(),
  quality_score: z.number().min(0).max(100).optional(),
  shelf_life_days: z.number().min(0).optional(),
  has_extreme_events: z.boolean().optional().default(false),
  extreme_event_severity: z.enum(['low', 'moderate', 'high', 'extreme']).optional(),
  is_ideal_planting_month: z.boolean().optional(),
  is_risk_planting_month: z.boolean().optional(),
  market_trend: z.enum(['up', 'down', 'stable']).optional(),
  current_price: z.number().positive().optional(),
  buy_price: z.number().positive().optional()
});

/**
 * Schema para body de best opportunities
 */
const bestOpportunitiesBodySchema = z.object({
  products: z.union([z.array(z.string()), z.null()]).optional(),
  max_results: z.number().int().positive().max(50).optional().default(10),
  min_roi: z.union([z.number(), z.null()]).optional(),
  month: z.union([z.number().int().min(1).max(12), z.null()]).optional()
});

/**
 * Schema para body de chat query
 * Aceita 'question' (usado pelo frontend) ou 'query' (alternativo)
 */
const chatQueryBodySchema = z.object({
  question: z.string().min(1, 'Question é obrigatória').optional(),
  query: z.string().min(1, 'Query é obrigatória').optional(),
  context: z.string().optional(),
  product: z.string().optional()
}).refine((data) => data.question || data.query, {
  message: 'É necessário fornecer "question" ou "query"',
  path: ['question']
});

module.exports = {
  storageAnalysisBodySchema,
  batchAIBodySchema,
  recommendationBodySchema,
  bestOpportunitiesBodySchema,
  chatQueryBodySchema
};

