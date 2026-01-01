// backend/middleware/validateRequest.js
// ✅ REFACTOR-005: Middleware de validação reutilizável com Zod

const logger = require('../utils/logger');

/**
 * Middleware para validar request usando schemas Zod
 * 
 * @param {Object} schemas - Objeto com schemas para validar (body, query, params)
 * @returns {Function} - Middleware Express
 * 
 * @example
 * router.post('/api/opportunities/compare',
 *   validateRequest({
 *     body: compareOpportunitiesBodySchema
 *   }),
 *   opportunityController.compare
 * );
 */
function validateRequest(schemas = {}) {
  return async (req, res, next) => {
    try {
      // Valida body se schema fornecido
      if (schemas.body) {
        // Garante que body existe (pode ser undefined em GET requests)
        req.body = await schemas.body.parseAsync(req.body || {});
      }

      // Valida query se schema fornecido
      if (schemas.query) {
        // Garante que query existe
        req.query = await schemas.query.parseAsync(req.query || {});
      }

      // Valida params se schema fornecido
      if (schemas.params) {
        // Garante que params existe
        req.params = await schemas.params.parseAsync(req.params || {});
      }

      next();
    } catch (error) {
      // Erro de validação Zod
      if (error.name === 'ZodError') {
        // ZodError sempre tem a propriedade 'errors', mas vamos garantir
        const zodErrors = error.errors || (error.issues || []);
        
        if (Array.isArray(zodErrors) && zodErrors.length > 0) {
          const errors = zodErrors.map(err => ({
            field: (err.path && Array.isArray(err.path)) ? err.path.join('.') : (err.path || 'unknown'),
            message: err.message || 'Erro de validação'
          }));

          logger.warn('⚠️ Validação falhou:', {
            errors,
            body: req.body,
            query: req.query,
            params: req.params,
            path: req.path,
            method: req.method
          });

          return res.status(400).json({
            error: 'Dados de entrada inválidos',
            details: errors
          });
        }
      }

      // Outros erros
      logger.error('❌ Erro inesperado na validação:', {
        error: error.message,
        stack: error.stack,
        name: error.name,
        hasErrors: !!error.errors,
        errorsType: typeof error.errors,
        errorKeys: Object.keys(error)
      });
      return res.status(500).json({
        error: 'Erro ao validar dados de entrada',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  };
}

module.exports = validateRequest;

