// backend/config/envValidation.js
// ✅ CRIT-004: Validação de variáveis de ambiente com Zod

const { z } = require('zod');
const logger = require('../utils/logger');

// Schema de validação para variáveis de ambiente
const envSchema = z.object({
  // Banco de dados
  DATABASE_URL: z.string().url('DATABASE_URL deve ser uma URL válida'),
  
  // Autenticação
  JWT_SECRET: z.string().min(32, 'JWT_SECRET deve ter pelo menos 32 caracteres'),
  SUPABASE_URL: z.string().url('SUPABASE_URL deve ser uma URL válida'),
  SUPABASE_ANON_KEY: z.string().min(1, 'SUPABASE_ANON_KEY é obrigatório'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY é obrigatório'),
  
  // API Interna
  INTERNAL_API_KEY: z.string().min(16, 'INTERNAL_API_KEY deve ter pelo menos 16 caracteres'),
  PYTHON_API_URL: z.string().url('PYTHON_API_URL deve ser uma URL válida').optional(),
  
  // APIs Externas
  AWESOME_API_URL: z.string().url('AWESOME_API_URL deve ser uma URL válida').optional(),
  OPENAI_API_KEY: z.string().startsWith('sk-', 'OPENAI_API_KEY deve começar com "sk-"').optional(),
  
  // Observabilidade
  SENTRY_DSN: z.string().url('SENTRY_DSN deve ser uma URL válida').optional(),
  
  // Ambiente
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().regex(/^\d+$/).transform(Number).default('3001'),
});

/**
 * Valida variáveis de ambiente
 * @param {boolean} strict - Se true, falha em produção se variáveis obrigatórias faltarem
 * @returns {object} Variáveis validadas
 * @throws {Error} Se validação falhar
 */
function validateEnv(strict = false) {
  try {
    // Em produção, validação estrita
    const isProduction = process.env.NODE_ENV === 'production';
    const shouldStrict = strict || isProduction;
    
    if (shouldStrict) {
      // Validação completa em produção
      const validated = envSchema.parse(process.env);
      logger.info('✅ Variáveis de ambiente validadas com sucesso');
      return validated;
    } else {
      // Em desenvolvimento, apenas valida e avisa sobre faltantes
      const result = envSchema.safeParse(process.env);
      
      if (!result.success) {
        const missing = result.error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
        logger.warn('⚠️ Variáveis de ambiente com problemas:', { errors: missing });
        
        // Em desenvolvimento, continua mesmo com erros (mas avisa)
        if (isProduction) {
          throw new Error(`❌ Variáveis de ambiente inválidas em produção:\n${missing.join('\n')}`);
        }
      }
      
      return result.data || process.env;
    }
  } catch (error) {
    logger.error('❌ Erro ao validar variáveis de ambiente:', error);
    throw error;
  }
}

/**
 * Valida apenas variáveis críticas (para uso em startup)
 */
function validateCriticalEnv() {
  const criticalVars = [
    'DATABASE_URL',
    'JWT_SECRET',
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'INTERNAL_API_KEY'
  ];
  
  const missing = criticalVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    const error = new Error(`❌ Variáveis críticas faltando: ${missing.join(', ')}`);
    logger.error(error.message);
    throw error;
  }
  
  logger.info('✅ Variáveis críticas validadas');
  return true;
}

module.exports = {
  validateEnv,
  validateCriticalEnv,
  envSchema
};

