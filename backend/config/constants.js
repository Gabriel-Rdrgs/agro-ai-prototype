// backend/config/constants.js
// ✅ REFACTOR-003: Elimina magic numbers - centraliza constantes

/**
 * Constantes de Cache (TTL em segundos)
 */
const CACHE_TTL = {
  OPPORTUNITIES: 15 * 60,  // 15 minutos
  WEATHER: 30 * 60,        // 30 minutos
  TRENDS: 5 * 60,          // 5 minutos
  RECOMMENDATIONS: 5 * 60  // 5 minutos
};

/**
 * Constantes de Validação de Preços
 */
const PRICE_VALIDATION = {
  MAX_KG_PRICE: 20,        // R$/kg - Preços acima disso são suspeitos (dados legados)
  MIN_KG_PRICE: 0.01,      // R$/kg - Preço mínimo válido
  SUSPICIOUS_THRESHOLD: 20 // R$/kg - Threshold para aviso de dado legado
};

/**
 * Constantes de Limites
 */
const LIMITS = {
  OPPORTUNITIES_COMPARE_MAX: 5,      // Máximo de oportunidades por comparação
  OPPORTUNITIES_LIST_MAX: 1000,      // Máximo de oportunidades na listagem
  OPPORTUNITIES_LIST_DEFAULT: 50,    // Padrão de oportunidades na listagem
  ANALYTICS_TREND_MAX: 100,          // Máximo de registros em tendências
  CEASA_PROJECTIONS_MAX: 500,        // Máximo de projeções CEASA
  CEASA_PROJECTIONS_DEFAULT: 100     // Padrão de projeções CEASA
};

/**
 * Constantes de ROI
 */
const ROI_THRESHOLDS = {
  HIGH: 100,    // ROI alto: >= 100%
  MEDIUM: 50,   // ROI médio: >= 50% e < 100%
  LOW: 0        // ROI baixo: < 50%
};

/**
 * Constantes de Timeout (em milissegundos)
 * ✅ PERF-003: Já implementado, mas centralizado aqui para referência
 */
const TIMEOUTS = {
  EXTERNAL_API: 10000,      // APIs externas: 10s
  INTERNAL_SERVICE: 30000,  // Python AI: 30s
  DATABASE: 5000,           // Queries: 5s
  BATCH_OPERATIONS: 60000   // Operações em lote: 60s
};

/**
 * Constantes de Fallback
 */
const FALLBACKS = {
  DOLLAR_RATE: 5.50,  // Taxa de câmbio fallback (R$/USD)
  DEFAULT_STATE: 'SP' // Estado padrão quando não especificado
};

module.exports = {
  CACHE_TTL,
  PRICE_VALIDATION,
  LIMITS,
  ROI_THRESHOLDS,
  TIMEOUTS,
  FALLBACKS
};

