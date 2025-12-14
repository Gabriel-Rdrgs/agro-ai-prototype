// backend/utils/sentry.js
// ============================================
// 🐛 CONFIGURAÇÃO DO SENTRY PARA BACKEND
// ============================================

const Sentry = require('@sentry/node');

// Inicializa Sentry apenas se DSN estiver configurado
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Integração do Express (necessária para request/error handlers)
      Sentry.expressIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% em produção, 100% em dev
    // Profiling desabilitado (requer @sentry/profiling-node)
    // profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Release tracking (útil para versionamento)
    release: process.env.SENTRY_RELEASE || undefined,
    // Filtra informações sensíveis
    beforeSend(event, hint) {
      // Remove dados sensíveis do contexto
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry inicializado para backend');
} else {
  console.warn('⚠️ SENTRY_DSN não configurado. Erros não serão enviados ao Sentry.');
}

// Na versão 10.x do @sentry/node, Handlers não existe mais
// Usamos setupExpressErrorHandler e expressIntegration em vez disso
// Mas mantemos um objeto Handlers para compatibilidade com o código existente
Sentry.Handlers = {
  requestHandler: () => {
    // Na v10, o request handler é gerenciado pela expressIntegration
    // Retornamos um middleware vazio (a integração já faz o trabalho)
    return (req, res, next) => next();
  },
  tracingHandler: () => {
    // Na v10, o tracing é gerenciado pela expressIntegration
    return (req, res, next) => next();
  },
  errorHandler: () => {
    // Na v10, usamos setupExpressErrorHandler
    // Mas retornamos um middleware que chama captureException
    return (err, req, res, next) => {
      if (process.env.SENTRY_DSN) {
        Sentry.captureException(err);
      }
      next(err);
    };
  },
};

module.exports = Sentry;

