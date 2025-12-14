// backend/utils/logger.js
// ============================================
// 📊 LOGGING ESTRUTURADO COM WINSTON
// ============================================

const winston = require('winston');
const path = require('path');

// Configuração de níveis de log
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Cores para console
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'white',
};

winston.addColors(colors);

// Formato para desenvolvimento (colorido e legível)
const developmentFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} [${info.level}]: ${info.message}${info.stack ? '\n' + info.stack : ''}`
  )
);

// Formato para produção (JSON estruturado)
const productionFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Determina formato baseado no ambiente
const format = process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat;

// Cria o logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'info' : 'debug'),
  levels,
  format,
  transports: [
    // Console (sempre ativo)
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
    // Arquivo de erros (apenas em produção)
    ...(process.env.NODE_ENV === 'production'
      ? [
          new winston.transports.File({
            filename: path.join(__dirname, '../../logs/error.log'),
            level: 'error',
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
          new winston.transports.File({
            filename: path.join(__dirname, '../../logs/combined.log'),
            maxsize: 5242880, // 5MB
            maxFiles: 5,
          }),
        ]
      : []),
  ],
  // Não sair do processo em caso de erro
  exitOnError: false,
});

// Stream para integração com Express morgan (opcional)
logger.stream = {
  write: (message) => {
    logger.http(message.trim());
  },
};

module.exports = logger;

