// frontend/src/utils/sentry.js
// ============================================
// 🐛 CONFIGURAÇÃO DO SENTRY PARA FRONTEND
// ============================================

import * as Sentry from '@sentry/react';

// Inicializa Sentry apenas se DSN estiver configurado
if (process.env.REACT_APP_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.REACT_APP_SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({
        maskAllText: true, // Mascara dados sensíveis
        blockAllMedia: true,
      }),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0, // 10% em produção
    // Session Replay
    replaysSessionSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    replaysOnErrorSampleRate: 1.0, // Sempre grava erros
    // Release tracking
    release: process.env.REACT_APP_SENTRY_RELEASE || undefined,
    // Filtra informações sensíveis
    beforeSend(event, hint) {
      // Remove dados sensíveis
      if (event.request) {
        delete event.request.cookies;
        if (event.request.headers) {
          delete event.request.headers.authorization;
        }
      }
      return event;
    },
  });

  console.log('✅ Sentry inicializado para frontend');
} else {
  console.warn('⚠️ REACT_APP_SENTRY_DSN não configurado. Erros não serão enviados ao Sentry.');
}

export default Sentry;

