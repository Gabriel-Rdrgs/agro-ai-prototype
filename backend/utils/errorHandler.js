// backend/utils/errorHandler.js
// ✅ REFACTOR-006: Tratamento de erros padronizado

const logger = require('./logger');
const Sentry = require('./sentry');

/**
 * Códigos de erro HTTP padronizados
 */
const HTTP_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504
};

/**
 * Tipos de erro conhecidos
 */
const ERROR_TYPES = {
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  TIMEOUT: 'TIMEOUT',
  EXTERNAL_SERVICE: 'EXTERNAL_SERVICE_ERROR',
  DATABASE: 'DATABASE_ERROR',
  INTERNAL: 'INTERNAL_ERROR'
};

/**
 * Mapeia códigos de erro do Axios para tipos de erro
 */
function mapAxiosError(error) {
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return {
      type: ERROR_TYPES.TIMEOUT,
      status: HTTP_STATUS.GATEWAY_TIMEOUT,
      message: 'O serviço demorou muito para responder. Tente novamente em alguns instantes.'
    };
  }
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    return {
      type: ERROR_TYPES.EXTERNAL_SERVICE,
      status: HTTP_STATUS.SERVICE_UNAVAILABLE,
      message: 'Serviço externo indisponível. Verifique se o serviço está rodando.'
    };
  }
  
  if (error.response) {
    // Erro HTTP do serviço externo
    return {
      type: ERROR_TYPES.EXTERNAL_SERVICE,
      status: error.response.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: error.response.data?.detail || error.response.data?.message || error.message,
      details: error.response.data
    };
  }
  
  return {
    type: ERROR_TYPES.INTERNAL,
    status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message: 'Erro interno do servidor'
  };
}

/**
 * Formata resposta de erro padronizada
 */
function formatErrorResponse(error, context = {}) {
  const {
    type = ERROR_TYPES.INTERNAL,
    status = HTTP_STATUS.INTERNAL_SERVER_ERROR,
    message = 'Erro interno do servidor',
    details = null,
    field = null
  } = error;
  
  const response = {
    error: {
      type,
      message,
      ...(details && { details }),
      ...(field && { field }),
      timestamp: new Date().toISOString(),
      ...(context.requestId && { requestId: context.requestId })
    }
  };
  
  // Em desenvolvimento, inclui stack trace
  if (process.env.NODE_ENV === 'development' && error.stack) {
    response.error.stack = error.stack;
  }
  
  return { status, response };
}

/**
 * Middleware de tratamento de erros para Express
 */
function errorHandler(error, req, res, next) {
  // Se a resposta já foi enviada, delega para o handler padrão do Express
  if (res.headersSent) {
    return next(error);
  }
  
  let errorResponse;
  
  // Erro do Zod (validação)
  if (error.name === 'ZodError') {
    errorResponse = formatErrorResponse({
      type: ERROR_TYPES.VALIDATION,
      status: HTTP_STATUS.BAD_REQUEST,
      message: 'Dados de entrada inválidos',
      details: error.errors.map(err => ({
        field: err.path.join('.'),
        message: err.message
      }))
    });
  }
  // Erro do Axios (chamadas HTTP)
  else if (error.isAxiosError) {
    const mapped = mapAxiosError(error);
    errorResponse = formatErrorResponse({
      ...mapped,
      details: mapped.details || error.response?.data
    });
  }
  // Erro de autenticação/autorização
  else if (error.name === 'UnauthorizedError' || error.status === 401) {
    errorResponse = formatErrorResponse({
      type: ERROR_TYPES.UNAUTHORIZED,
      status: HTTP_STATUS.UNAUTHORIZED,
      message: error.message || 'Não autorizado'
    });
  }
  // Erro de permissão
  else if (error.status === 403) {
    errorResponse = formatErrorResponse({
      type: ERROR_TYPES.FORBIDDEN,
      status: HTTP_STATUS.FORBIDDEN,
      message: error.message || 'Acesso negado'
    });
  }
  // Erro de não encontrado
  else if (error.status === 404 || error.name === 'NotFoundError') {
    errorResponse = formatErrorResponse({
      type: ERROR_TYPES.NOT_FOUND,
      status: HTTP_STATUS.NOT_FOUND,
      message: error.message || 'Recurso não encontrado'
    });
  }
  // Erro de banco de dados (Prisma)
  else if (error.code && error.code.startsWith('P')) {
    logger.error('❌ Erro de banco de dados:', { error: error.message, code: error.code });
    errorResponse = formatErrorResponse({
      type: ERROR_TYPES.DATABASE,
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: 'Erro ao acessar banco de dados',
      details: process.env.NODE_ENV === 'development' ? error.message : null
    });
  }
  // Erro genérico
  else {
    logger.error('❌ Erro não tratado:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      status: error.status,
      path: req.path,
      method: req.method
    });
    
    // ✅ Integração com Sentry para erros não tratados
    if (process.env.SENTRY_DSN && Sentry && typeof Sentry.captureException === 'function') {
      Sentry.captureException(error);
    }
    
    errorResponse = formatErrorResponse({
      type: error.type || ERROR_TYPES.INTERNAL,
      status: error.status || HTTP_STATUS.INTERNAL_SERVER_ERROR,
      message: error.message || 'Erro interno do servidor',
      details: error.details || null
    });
  }
  
  res.status(errorResponse.status).json(errorResponse.response);
}

/**
 * Wrapper para rotas async que captura erros automaticamente
 */
function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Cria um erro padronizado
 */
function createError(type, message, status = null, details = null) {
  const error = new Error(message);
  error.type = type;
  error.status = status || HTTP_STATUS.INTERNAL_SERVER_ERROR;
  if (details) error.details = details;
  return error;
}

/**
 * Helpers para criar erros específicos
 */
const ErrorHelpers = {
  validation: (message, details = null) => 
    createError(ERROR_TYPES.VALIDATION, message, HTTP_STATUS.BAD_REQUEST, details),
  
  notFound: (resource = 'Recurso') => 
    createError(ERROR_TYPES.NOT_FOUND, `${resource} não encontrado`, HTTP_STATUS.NOT_FOUND),
  
  unauthorized: (message = 'Não autorizado') => 
    createError(ERROR_TYPES.UNAUTHORIZED, message, HTTP_STATUS.UNAUTHORIZED),
  
  forbidden: (message = 'Acesso negado') => 
    createError(ERROR_TYPES.FORBIDDEN, message, HTTP_STATUS.FORBIDDEN),
  
  timeout: (service = 'Serviço') => 
    createError(ERROR_TYPES.TIMEOUT, `${service} demorou muito para responder`, HTTP_STATUS.GATEWAY_TIMEOUT),
  
  externalService: (service, message = null) => 
    createError(
      ERROR_TYPES.EXTERNAL_SERVICE,
      message || `Serviço externo (${service}) indisponível`,
      HTTP_STATUS.SERVICE_UNAVAILABLE
    ),
  
  database: (message = 'Erro ao acessar banco de dados') => 
    createError(ERROR_TYPES.DATABASE, message, HTTP_STATUS.INTERNAL_SERVER_ERROR),
  
  internal: (message = 'Erro interno do servidor') => 
    createError(ERROR_TYPES.INTERNAL, message, HTTP_STATUS.INTERNAL_SERVER_ERROR)
};

module.exports = {
  errorHandler,
  asyncHandler,
  createError,
  ErrorHelpers,
  ERROR_TYPES,
  HTTP_STATUS
};

