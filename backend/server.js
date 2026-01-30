// backend/server.js
// ============================================
// 🏗️ AGRO-AI BACKEND v7.2 (VERSÃO COMPLETA INTEGRADA)
// ============================================

if (process.env.RAILWAY_ENVIRONMENT_NAME) {
  app.set('trust proxy', true);
  console.log('✅ Trust proxy habilitado para Railway');
}

// 1. CARREGAMENTO DE DEPENDÊNCIAS
require('dotenv').config();

// ✅ CRIT-004: Validação de variáveis de ambiente (ANTES de tudo)
const { validateCriticalEnv } = require('./config/envValidation');
try {
  validateCriticalEnv();
} catch (error) {
  console.error('❌ ERRO CRÍTICO: Falha na validação de variáveis de ambiente');
  console.error(error.message);
  process.exit(1); // Falha rápida se variáveis críticas faltarem
}

// ✅ FASE 0 - Semana 2: Sentry deve ser inicializado ANTES de tudo
const Sentry = require('./utils/sentry');
const logger = require('./utils/logger');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

// 2. IMPORTAÇÃO DE MÓDULOS LOCAIS
// ✅ FASE 0: Migrado para Supabase Auth
const authController = require('./authController_supabase');
const { verifyToken, checkRole } = require('./authMiddleware');
const ceasaRoutes = require('./routes/ceasa');
const etlRoutes = require('./routes/etl'); // ✅ ETL ASSÍNCRONO
const favoritesRoutes = require('./routes/favorites'); // ✅ NOVO: Favoritos
const alertsRoutes = require('./routes/alerts'); // ✅ NOVO: Sistema de Alertas
const portfolioRoutes = require('./routes/portfolio'); // ✅ NOVO: Portfolio Tracking
const adminRoutes = require('./routes/admin'); // ✅ FASE B - B4: Rotas administrativas (cache stats)
const cache = require('./utils/cache'); // ✅ CACHE EM MEMÓRIA (fallback)
const cacheService = require('./services/cacheService'); // ✅ FASE B - B4: Cache Redis Multinível
const jobQueue = require('./utils/jobQueue'); // ✅ JOBS ASSÍNCRONOS
const { logAction } = require('./services/auditService'); // ✅ AUDIT LOG
const { exportOpportunitiesToExcel } = require('./services/exportService'); // ✅ FASE B - B1: Exportação Excel

// 3. INICIALIZAÇÃO
const app = express();

// ✅ FASE 0 - Semana 2: Middlewares do Sentry (ANTES de outros middlewares)
// Na v10 do @sentry/node, a expressIntegration() já gerencia request/tracing automaticamente
// Não precisamos adicionar middlewares manualmente - a integração faz isso automaticamente
// Mas mantemos compatibilidade com código que pode usar Handlers
if (process.env.SENTRY_DSN && Sentry.Handlers && typeof Sentry.Handlers.requestHandler === 'function') {
  app.use(Sentry.Handlers.requestHandler());
  if (typeof Sentry.Handlers.tracingHandler === 'function') {
    app.use(Sentry.Handlers.tracingHandler());
  }
}

// ✅ Prisma Singleton (otimizado para pool de conexões)
// Usa singleton pattern para evitar múltiplas instâncias e controlar pool
const prisma = require('./utils/prisma');
const { dbCircuitBreaker } = require('./utils/circuitBreaker');

// ✅ REFACTOR-001: Controllers e Services
const OpportunityController = require('./controllers/opportunityController');

// ✅ REFACTOR-006: Tratamento de erros padronizado
const { errorHandler, asyncHandler, ErrorHelpers } = require('./utils/errorHandler');

// ✅ FEAT-001: Swagger/OpenAPI
const { swaggerSpec, swaggerUi } = require('./config/swagger');

// ✅ REFACTOR-005: Validação Zod
const validateRequest = require('./middleware/validateRequest');
const {
  listOpportunitiesQuerySchema,
  compareOpportunitiesBodySchema,
  getHistoryParamsSchema,
  getHistoryQuerySchema
} = require('./validators/opportunityValidators');
const {
  extremeEventsQuerySchema,
  historicalExtremeEventsQuerySchema,
  supplyRiskQuerySchema,
  forecastQuerySchema,
  rainComparisonQuerySchema
} = require('./validators/weatherValidators');
const {
  trendsQuerySchema,
  productsQuerySchema,
  regionsQuerySchema,
  municipalitiesQuerySchema,
  trendQuerySchema
} = require('./validators/analyticsValidators');
const {
  storageAnalysisBodySchema,
  batchAIBodySchema,
  recommendationBodySchema,
  bestOpportunitiesBodySchema,
  chatQueryBodySchema
} = require('./validators/aiValidators');
const {
  productionCalculationBodySchema,
  arbitrageCalculationBodySchema
} = require('./validators/calcValidators');
const {
  plantingWindowsQuerySchema
} = require('./validators/zarcValidators');
const {
  fuelPriceParamsSchema
} = require('./validators/fuelValidators');
const {
  marketScanBodySchema
} = require('./validators/marketValidators');

// 4. VARIÁVEIS DE AMBIENTE
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
// Ajuste crítico para Docker vs Localhost
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://ai-service:8000';
const AWESOME_API_URL = process.env.AWESOME_API_URL || 'https://economia.awesomeapi.com.br';
// ✅ SEGURANÇA: Chave compartilhada entre Node.js e Python
const INTERNAL_API_KEY = process.env.INTERNAL_API_KEY;

// Validação de Segurança
if (!JWT_SECRET) {
  logger.warn('⚠️ AVISO: JWT_SECRET não configurado. Usando default inseguro para dev.');
}

// ✅ PERF-003: Timeouts padronizados
const TIMEOUTS = {
  EXTERNAL_API: 10000,      // APIs externas: 10s
  INTERNAL_SERVICE: 30000,  // Python AI: 30s (reduzido de 120s)
  DATABASE: 5000,           // Queries: 5s
  BATCH_OPERATIONS: 60000   // Operações em lote: 60s
};

// ✅ SEGURANÇA: Helper para criar instância axios configurada com autenticação interna
function createPythonAxiosClient() {
  const client = axios.create({
    baseURL: PYTHON_API_URL,
    timeout: TIMEOUTS.INTERNAL_SERVICE, // ✅ PERF-003: Timeout padronizado
  });
  
  // Adiciona header de autenticação em todas as requisições
  if (INTERNAL_API_KEY) {
    client.defaults.headers.common['X-Internal-API-Key'] = INTERNAL_API_KEY;
  } else {
    logger.warn('⚠️ AVISO: INTERNAL_API_KEY não configurado. Requisições ao Python podem falhar em produção.');
  }
  
  return client;
}

// Instância global do cliente axios para Python
const pythonAxios = createPythonAxiosClient();

// ✅ REFACTOR-001: Inicializa controllers (será inicializado após getDollarRate ser definido)
let opportunityController;

// 5. MIDDLEWARES
// ============================================
// 🛡️ CONFIGURAÇÃO DE CORS DINÂMICA
// ============================================

// Função que valida e permite a origem dinamicamente
const corsOptions = {
  origin: function (origin, callback) {
    // Log para sabermos EXATAMENTE quem está tentando entrar
    console.log(`📡 CORS Check | Origin recebida: '${origin}'`);

    // Permite conexões sem origem (Apps, Postman, Server-to-Server)
    if (!origin) return callback(null, true);

    // ✅ MODO PERMISSIVO: Aceita o Frontend da Vercel e Localhost
    // Se a origem contiver "agro-ai-prototype" ou "localhost", deixa passar.
    if (origin.includes('agro-ai-prototype') || origin.includes('localhost') || origin.includes('vercel.app')) {
      return callback(null, true);
    }

    // Se chegou aqui, bloqueia (mas loga o erro)
    logger.warn(`🚫 Bloqueado por CORS: ${origin}`);
    callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
};

// Aplica o CORS
app.use(cors(corsOptions));

// Trata o Preflight (OPTIONS) usando Regex seguro
app.options(/^.*$/, cors(corsOptions));

// ✅ CRÍTICO: Middleware de parsing JSON (necessário para req.body)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ CRIT-003: Rate limiting para rotas de autenticação
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP
  message: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ✅ A5: Rate limiting geral para todas as rotas da API (proteção contra brute force)
// ✅ CORREÇÃO: Aumentado limite para suportar múltiplas requisições simultâneas do frontend
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 1000, // 1000 requests por IP a cada 15 minutos (aumentado de 100 para suportar múltiplas requisições simultâneas)
  message: {
    error: 'Muitas requisições, tente novamente mais tarde',
    retryAfter: '15 minutos'
  },
  standardHeaders: true, // Retorna `RateLimit-*` headers
  legacyHeaders: false, // Não retorna `X-RateLimit-*` headers
  skip: (req) => {
    // Pula rate limiting para health checks, rotas internas e rotas que recebem múltiplas requisições simultâneas
    const path = req.path;
    return path === '/health' || 
           path === '/' || 
           path.startsWith('/api-docs') ||
           path.startsWith('/favorites') ||  // ✅ Favorites recebe muitas requisições simultâneas
           path.startsWith('/weather');      // ✅ Weather recebe muitas requisições simultâneas
  }
});

// ✅ Rate limiter mais permissivo para rotas que recebem múltiplas requisições simultâneas
const permissiveLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 300, // 300 requests por minuto (para favorites, weather, etc.)
  message: {
    error: 'Muitas requisições, tente novamente em alguns segundos',
    retryAfter: '1 minuto'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// ✅ Aplica rate limiter permissivo ANTES do geral (para rotas específicas)
app.use('/api/favorites', permissiveLimiter);
app.use('/api/weather', permissiveLimiter);

// Aplica rate limiting em todas as rotas da API (exceto as que já têm permissiveLimiter)
app.use('/api/', apiLimiter);

// Rota para o Railway saber que o app está vivo
app.get('/', (req, res) => res.send('Backend Agro-AI Online 🚀'));

// Health check básico (rápido, para load balancers)
/**
 * @swagger
 * /health:
 *   get:
 *     summary: Health check básico (para load balancers)
 *     tags: [Sistema]
 *     security: []
 *     responses:
 *       200:
 *         description: Serviço saudável
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 database:
 *                   type: string
 *                   example: connected
 *                 circuit_breaker:
 *                   type: string
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       503:
 *         description: Serviço degradado
 */
app.get('/health', async (req, res) => {
  try {
    // Testa conexão com banco (com circuit breaker)
    await dbCircuitBreaker.execute(async () => {
      await prisma.$queryRaw`SELECT 1`;
    });
    
    res.json({ 
      status: 'ok',
      database: 'connected',
      circuit_breaker: dbCircuitBreaker.getState(),
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'degraded',
      database: 'disconnected',
      error: error.message,
      circuit_breaker: dbCircuitBreaker.getState(),
      timestamp: new Date().toISOString()
    });
  }
});

// Health check detalhado
app.get('/health/detailed', async (req, res) => {
  const checks = {
    status: 'healthy',
    service: 'agro-ai-backend',
    version: process.env.npm_package_version || '1.0.0',
    timestamp: new Date().toISOString(),
    checks: {}
  };
  
  // 1. Banco de Dados
  try {
    await dbCircuitBreaker.execute(async () => {
      const result = await prisma.$queryRaw`SELECT version() as version`;
      checks.checks.database = {
        status: 'ok',
        connected: true,
        circuit_breaker: dbCircuitBreaker.getState(),
        version: result[0]?.version?.substring(0, 50) || 'unknown'
      };
    });
  } catch (error) {
    checks.checks.database = {
      status: 'error',
      connected: false,
      error: error.message,
      circuit_breaker: dbCircuitBreaker.getState()
    };
  }
  
  // 2. Serviços Internos
  const services = {
    cache: cache ? 'online' : 'offline',
    jobQueue: jobQueue ? 'online' : 'offline',
    logger: logger ? 'online' : 'offline'
  };
  
  checks.checks.services = {
    status: Object.values(services).every(s => s === 'online') ? 'ok' : 'degraded',
    services: services
  };
  
  // 3. APIs Externas (configuração)
  const externalApis = {
    python: {
      configured: !!process.env.PYTHON_API_URL,
      url: process.env.PYTHON_API_URL || 'not_configured',
      status: process.env.PYTHON_API_URL ? 'ok' : 'not_configured'
    },
    supabase: {
      configured: !!process.env.SUPABASE_URL,
      status: process.env.SUPABASE_URL ? 'ok' : 'not_configured'
    }
  };
  
  checks.checks.external = {
    status: 'ok',
    apis: externalApis
  };
  
  // 4. Recursos do Sistema
  try {
    const memUsage = process.memoryUsage();
    checks.checks.resources = {
      status: 'ok',
      memory: {
        heap_used_mb: Math.round(memUsage.heapUsed / 1024 / 1024),
        heap_total_mb: Math.round(memUsage.heapTotal / 1024 / 1024),
        rss_mb: Math.round(memUsage.rss / 1024 / 1024)
      },
      uptime_seconds: Math.round(process.uptime())
    };
  } catch (error) {
    checks.checks.resources = {
      status: 'warning',
      error: error.message
    };
  }
  
  // Status geral
  const allHealthy = (
    checks.checks.database.status === 'ok' &&
    checks.checks.services.status === 'ok' &&
    checks.checks.external.status === 'ok' &&
    checks.checks.resources.status === 'ok'
  );
  
  checks.status = allHealthy ? 'healthy' : 'degraded';
  
  const statusCode = allHealthy ? 200 : 503;
  res.status(statusCode).json(checks);
});

// ============================================
// 🛠️ FUNÇÕES AUXILIARES (HELPER FUNCTIONS)
// ============================================

// Busca Cotação do Dólar (Com Fallback)
async function getDollarRate() {
  try {
    const response = await axios.get(`${AWESOME_API_URL}/last/USD-BRL`);
    return parseFloat(response.data.USDBRL.bid);
  } catch (error) {
    logger.warn("⚠️ Erro na API de Dólar:", { error: error.message });
    return 5.50; // Fallback seguro
  }
}

// --- FUNÇÃO ATUALIZADA: Busca Previsão Completa (Solo + Chuva Real) ---
async function getWeatherFull(lat, lng) {
  try {
    // 1. URL ATUALIZADA:
    // - Trocamos 'rain_sum' por 'precipitation_sum' (Chuva total)
    // - Adicionamos 'soil_moisture_0_to_10cm_mean' (Umidade do Solo)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,shortwave_radiation_sum,soil_moisture_0_to_10cm_mean&current_weather=true&timezone=America%2FSao_Paulo`;
    
    const response = await axios.get(url, {
      timeout: TIMEOUTS.EXTERNAL_API // ✅ PERF-003: Timeout padronizado
    });
    const daily = response.data.daily;
    const current = response.data.current_weather;

    // 2. Mapeamento para o Frontend
    const forecastList = daily.time.map((time, index) => ({
      date: time,
      tempMax: daily.temperature_2m_max[index],
      tempMin: daily.temperature_2m_min[index],
      rain: daily.precipitation_sum[index], // Agora inclui pancadas!
      sun: daily.shortwave_radiation_sum[index],
      soil: daily.soil_moisture_0_to_10cm_mean[index] // Novo dado!
    }));

    return {
        forecast: forecastList,
        current: {
            temp: current.temperature,
            code: current.weathercode,
            wind: current.windspeed
        }
    };
  } catch (error) {
    console.error("Erro OpenMeteo:", error.message);
    return null;
  }
}

// ============================================
// 📚 FEAT-001: Swagger/OpenAPI Documentation
// ============================================
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Agro-AI API Documentation'
}));


// ============================================
// 🔐 ROTAS DE AUTENTICAÇÃO
// ============================================
if (authController) {
  /**
   * @swagger
   * /api/auth/register:
   *   post:
   *     summary: Registrar novo usuário (apenas admin)
   *     tags: [Autenticação]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *               password:
   *                 type: string
   *                 minLength: 8
   *     responses:
   *       201:
   *         description: "Usuário criado com sucesso"
   *       400:
   *         $ref: '#/components/responses/Error'
   *       401:
   *         $ref: '#/components/responses/Error'
   *       403:
   *         $ref: '#/components/responses/Error'
   */
  app.post('/api/auth/register', verifyToken, checkRole(['admin']), authController.register);
  
  /**
   * @swagger
   * /api/auth/login:
   *   post:
   *     summary: Fazer login e obter token JWT
   *     tags: [Autenticação]
   *     security: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - email
   *               - password
   *             properties:
   *               email:
   *                 type: string
   *                 format: email
   *                 example: user@example.com
   *               password:
   *                 type: string
   *                 example: senha123
   *     responses:
   *       200:
   *         description: "Login bem-sucedido"
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 token:
   *                   type: string
   *                   description: "Token JWT para autenticação"
   *                 user:
   *                   type: object
   *                   properties:
   *                     id:
   *                       type: string
   *                     email:
   *                       type: string
   *                     role:
   *                       type: string
   *       401:
   *         $ref: '#/components/responses/Error'
   *       429:
   *         description: "Muitas tentativas de login"
   */
  app.post('/api/auth/login', authLimiter, authController.login); // ✅ CRIT-003: Rate limiting para login
  
  /**
   * @swagger
   * /api/auth/refresh:
   *   post:
   *     summary: Renovar token JWT
   *     tags: [Autenticação]
   *     security: []
   *     responses:
   *       200:
   *         description: "Token renovado"
   *       401:
   *         $ref: '#/components/responses/Error'
   */
  app.post('/api/auth/refresh', authLimiter, authController.refreshToken); // ✅ CRIT-003: Rate limiting para refresh
}


// ✅ REFACTOR-001: Inicializa controller após getDollarRate estar definido
opportunityController = new OpportunityController(pythonAxios, getDollarRate);


// Verificação de segurança
if (!opportunityController) {
  logger.error('❌ ERRO CRÍTICO: opportunityController não foi inicializado!');
  process.exit(1);
}


// ============================================
// 📊 ROTAS DE NEGÓCIO (DADOS)
// ============================================


// 1. Listar Oportunidades (Com Dólar em Tempo Real)
// ✅ REFACTOR-001: Usa controller
// ✅ REFACTOR-005: Validação Zod adicionada
/**
 * @swagger
 * /api/opportunities:
 *   get:
 *     summary: Lista todas as oportunidades de mercado
 *     tags: [Oportunidades]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *         description: "Número máximo de resultados"
 *       - in: query
 *         name: skip
 *         schema:
 *           type: integer
 *           default: 0
 *         description: "Número de resultados para pular"
 *       - in: query
 *         name: product
 *         schema:
 *           type: string
 *         description: "Filtrar por produto (ex: Tomate, Soja)"
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: "Filtrar por estado (ex: MT, GO)"
 *       - in: query
 *         name: minRoi
 *         schema:
 *           type: number
 *           format: float
 *         description: "ROI mínimo"
 *       - in: query
 *         name: maxRoi
 *         schema:
 *           type: number
 *           format: float
 *         description: "ROI máximo"
 *     responses:
 *       200:
 *         description: "Lista de oportunidades"
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Opportunity'
 *       400:
 *         $ref: '#/components/responses/Error'
 */
app.get('/api/opportunities',
  verifyToken,
  validateRequest({ query: listOpportunitiesQuerySchema }),
  (req, res) => {
    if (!opportunityController) {
      return res.status(500).json({ error: 'Controller não inicializado' });
    }
    return opportunityController.list(req, res);
  }
);


// ✅ FASE B - B1: Exportação Excel Premium
/**
 * @swagger
 * /api/export/opportunities:
 *   get:
 *     summary: Exporta oportunidades para Excel com formatação premium
 *     tags: [Exportação]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: product
 *         schema:
 *           type: string
 *         description: "Filtrar por produto"
 *       - in: query
 *         name: state
 *         schema:
 *           type: string
 *         description: "Filtrar por estado"
 *       - in: query
 *         name: minRoi
 *         schema:
 *           type: number
 *         description: "ROI mínimo"
 *       - in: query
 *         name: maxResults
 *         schema:
 *           type: integer
 *           default: 1000
 *         description: "Número máximo de resultados"
 *     responses:
 *       200:
 *         description: "Arquivo Excel"
 *         content:
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         $ref: '#/components/responses/Error'
 */
app.get('/api/export/opportunities',
  verifyToken,
  async (req, res) => {
    try {
      const { product, state, minRoi, maxResults = 1000 } = req.query;

      // Construir filtros
      const where = {};
      if (product) {
        where.product = { contains: product, mode: 'insensitive' };
      }
      if (state) {
        where.state = state.toUpperCase();
      }
      if (minRoi) {
        where.roi = { gte: parseFloat(minRoi) };
      }

      // Buscar oportunidades
      logger.info(`📊 Exportação Excel: Buscando oportunidades com filtros:`, JSON.stringify(where));
      
      // Primeiro, verifica se há oportunidades no banco (sem filtros)
      const totalCount = await prisma.opportunity.count();
      logger.info(`📊 Exportação Excel: Total de oportunidades no banco: ${totalCount}`);
      
      const opportunities = await prisma.opportunity.findMany({
        where,
        take: parseInt(maxResults),
        orderBy: { createdAt: 'desc' } // Ordena por data de criação (mais recentes primeiro)
      });
      
      // Ordena manualmente por ROI (nulls por último)
      opportunities.sort((a, b) => {
        const roiA = a.roi ?? -Infinity;
        const roiB = b.roi ?? -Infinity;
        return roiB - roiA;
      });

      logger.info(`📊 Exportação Excel: Encontradas ${opportunities.length} oportunidades após filtros`);

      if (opportunities.length === 0) {
        // Se não há filtros, retorna erro mais específico
        const hasFilters = Object.keys(where).length > 0;
        const errorMsg = hasFilters 
          ? 'Nenhuma oportunidade encontrada com os filtros especificados'
          : 'Nenhuma oportunidade encontrada no banco de dados';
        
        logger.warn(`⚠️ Exportação Excel: ${errorMsg} (Total no banco: ${totalCount})`);
        return res.status(404).json({ 
          error: errorMsg,
          totalInDatabase: totalCount 
        });
      }

      // Gerar Excel
      const excelBuffer = await exportOpportunitiesToExcel(opportunities, {
        product,
        state,
        minRoi
      });

      // Configurar headers para download
      const filename = `oportunidades_${new Date().toISOString().split('T')[0]}.xlsx`;
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', excelBuffer.length);

      // Enviar arquivo
      res.send(excelBuffer);

      logger.info(`📊 Excel exportado: ${opportunities.length} oportunidades por ${req.user?.email || 'unknown'}`);

    } catch (error) {
      logger.error(`❌ Erro ao exportar Excel: ${error.message}`);
      res.status(500).json({ 
        error: 'Erro ao exportar oportunidades',
        details: error.message 
      });
    }
  }
);

// ✅ NOVO: Endpoint para comparar múltiplas oportunidades
// ✅ REFACTOR-001: Usa controller
// ✅ REFACTOR-005: Validação Zod adicionada
/**
 * @swagger
 * /api/opportunities/compare:
 *   post:
 *     summary: Compara múltiplas oportunidades lado a lado
 *     tags: [Oportunidades]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - opportunityIds
 *             properties:
 *               opportunityIds:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 minItems: 1
 *                 maxItems: 5
 *                 example: [1, 2, 3]
 *     responses:
 *       200:
 *         description: Comparação de oportunidades
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 allOf:
 *                   - $ref: '#/components/schemas/Opportunity'
 *                   - type: object
 *                     properties:
 *                       recommendation:
 *                         $ref: '#/components/schemas/Recommendation'
 *       400:
 *         $ref: '#/components/responses/Error'
 *       404:
 *         description: Nenhuma oportunidade encontrada
 */
app.post('/api/opportunities/compare',
  verifyToken,
  validateRequest({ body: compareOpportunitiesBodySchema }),
  (req, res) => {
    if (!opportunityController) {
      return res.status(500).json({ error: 'Controller não inicializado' });
    }
    return opportunityController.compare(req, res);
  }
);

// ✅ REFACTOR-001: Rota de histórico movida para usar controller
// ✅ REFACTOR-005: Validação Zod adicionada
/**
 * @swagger
 * /api/opportunities/{id}/history:
 *   get:
 *     summary: Busca histórico de preços de uma oportunidade
 *     tags: [Oportunidades]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID da oportunidade
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *           default: 30
 *           minimum: 1
 *           maximum: 365
 *         description: Número de dias de histórico (padrão: 30)
 *     responses:
 *       200:
 *         description: Histórico de preços com estatísticas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 labels:
 *                   type: array
 *                   items:
 *                     type: string
 *                 prices:
 *                   type: array
 *                   items:
 *                     type: number
 *                 avgPrice:
 *                   type: number
 *                 minPrice:
 *                   type: number
 *                 maxPrice:
 *                   type: number
 *                 currentPrice:
 *                   type: number
 *                 trend:
 *                   type: object
 *                   properties:
 *                     direction:
 *                       type: string
 *                       enum: [up, down, sideways]
 *                     percent:
 *                       type: number
 *       404:
 *         $ref: '#/components/responses/Error'
 */
app.get('/api/opportunities/:id/history',
  verifyToken,
  validateRequest({ 
    params: getHistoryParamsSchema,
    query: getHistoryQuerySchema 
  }),
  (req, res) => {
    if (!opportunityController) {
      return res.status(500).json({ error: 'Controller não inicializado' });
    }
    return opportunityController.getHistory(req, res);
  }
);

// 🔒 RBAC: Apenas admin pode executar cálculo em massa (via API web)
app.post('/api/opportunities/calculate-all-roi', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const userId = req.user?.id || 'system';
    logger.info(`🔄 Admin ${req.user?.email || 'unknown'} iniciando cálculo massivo de ROI...`);
    
    // ✅ AUDIT LOG: Registra ação crítica
    await logAction(userId, 'CALCULATE_ALL_ROI', 'Iniciado cálculo massivo de ROI para todas as oportunidades');
    
    // Chama o endpoint Python que processa todas as oportunidades de uma vez
    const response = await pythonAxios.post(
      '/api/v1/admin/calculate-all-roi',
      {},
      { timeout: 300000 }  // 5 minutos (pode demorar para muitas oportunidades)
    );
    
    const result = response.data;
    
    logger.info(`✅ Cálculo concluído: ${result.updated} atualizados, ${result.errors} erros`);
    
    // ✅ AUDIT LOG: Registra resultado
    await logAction(userId, 'CALCULATE_ALL_ROI', `Concluído: ${result.updated} atualizados, ${result.errors} erros`);
    
    // ✅ PERF-002: Cache granular - após cálculo em massa, invalida apenas lista geral
    cache.del('opportunities:all');
    
    res.json({
      success: true,
      message: 'Cálculo de ROI concluído',
      ...result
    });
    
  } catch (error) {
    const userId = req.user?.id || 'system';
    logger.error("❌ Erro ao calcular ROI em massa:", { error: error.message });
    
    // ✅ AUDIT LOG: Registra erro
    await logAction(userId, 'CALCULATE_ALL_ROI_ERROR', `Erro: ${error.message}`);
    
    res.status(500).json({ 
      error: 'Erro ao calcular ROI',
      details: error.response?.data?.detail || error.message
    });
  }
});

// ✅ NOVO: Endpoint para enriquecer oportunidades sem ROI (processa uma por uma)
// 🔒 RBAC: Apenas admin pode executar enriquecimento em massa
app.post('/api/opportunities/enrich', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const userId = req.user?.id || 'system';
    logger.info(`🔄 Admin ${req.user?.email || 'unknown'} iniciando enriquecimento de oportunidades...`);
    
    // ✅ AUDIT LOG: Registra ação crítica
    await logAction(userId, 'ENRICH_OPPORTUNITIES', 'Iniciado enriquecimento em massa de oportunidades');
    
    // Busca oportunidades sem ROI ou com ROI = 0
    const opportunities = await prisma.opportunity.findMany({
      where: {
        OR: [
          { roi: null },
          { roi: 0 }
        ]
      },
      take: 50  // Limita a 50 por vez para não sobrecarregar
    });
    
    if (opportunities.length === 0) {
      // ✅ PERF-002: Cache granular - após cálculo em massa, invalida apenas lista geral
      cache.del('opportunities:all');
      
      return res.json({
        success: true,
        message: 'Todas as oportunidades já têm ROI calculado',
        processed: 0
      });
    }
    
    console.log(`🔄 Enriquecendo ${opportunities.length} oportunidades...`);
    
    let processed = 0;
    let errors = 0;
    
    for (const opp of opportunities) {
      try {
        let buyPrice = parseFloat(opp.buyPrice);
        // Validação: loga se encontrar preço suspeito (não altera mais)
        if (buyPrice > 20) {
          logger.warn(`⚠️ [${opp.id}] buyPrice suspeito (R$ ${buyPrice}) - possível dado legado. Execute migrate_units_to_kg.py se necessário.`);
        }
        
        const payload = {
          product: opp.product,
          state: opp.state,
          city: opp.city,
          buyPrice: buyPrice,
          lat: parseFloat(opp.lat) || 0,
          lng: parseFloat(opp.lng) || 0
        };
        
        const response = await pythonAxios.post(
          '/api/v1/calc/opportunity/recalculate',
          payload,
          { timeout: 10000 }  // 10 segundos por oportunidade
        );
        
        const pythonData = response.data;
        
        await prisma.opportunity.update({
          where: { id: opp.id },
          data: {
            roi: pythonData.roi,
            sellPrice: pythonData.sell_price,
            freight: pythonData.freight,
            sellLocation: pythonData.destination_name,
            bestRoute: true
          }
        });
        
        processed++;
        
      } catch (error) {
        console.error(`❌ Erro ao processar oportunidade ${opp.id}:`, error.message);
        errors++;
      }
    }
    
    logger.info(`✅ Enriquecimento concluído: ${processed} processadas, ${errors} erros`);
    
    // ✅ AUDIT LOG: Registra resultado
    await logAction(userId, 'ENRICH_OPPORTUNITIES', `Concluído: ${processed} processadas, ${errors} erros de ${opportunities.length} total`);
    
    res.json({
      success: true,
      message: `Processamento concluído`,
      processed,
      errors,
      total: opportunities.length
    });
    
  } catch (error) {
    const userId = req.user?.id || 'system';
    logger.error("❌ Erro ao enriquecer oportunidades:", { error: error.message });
    
    // ✅ AUDIT LOG: Registra erro
    await logAction(userId, 'ENRICH_OPPORTUNITIES_ERROR', `Erro: ${error.message}`);
    
    res.status(500).json({ 
      error: 'Erro ao enriquecer oportunidades',
      details: error.response?.data?.detail || error.message
    });
  }
});

// --- ROTA ATUALIZADA ---
// ✅ REFACTOR-005: Validação Zod adicionada
/**
 * @swagger
 * /api/weather:
 *   get:
 *     summary: Obtém dados climáticos atuais
 *     tags: [Clima]
 *     parameters:
 *       - in: query
 *         name: lat
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Latitude
 *       - in: query
 *         name: lng
 *         required: true
 *         schema:
 *           type: number
 *           format: float
 *         description: Longitude
 *     responses:
 *       200:
 *         description: Dados climáticos atuais
 *       400:
 *         $ref: '#/components/responses/Error'
 */
app.get('/api/weather',
  verifyToken,
  validateRequest({ query: forecastQuerySchema }),
  async (req, res) => {
  const { lat, lng } = req.query;
  
  const data = await getWeatherFull(lat, lng);
  
  if (data) {
    res.json(data); // Retorna { forecast: [...], current: {...} }
  } else {
    res.status(500).json({ error: 'Dados climáticos indisponíveis' });
  }
});

// Eventos Extremos (Melhorado)
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/weather/extreme-events',
  verifyToken,
  validateRequest({ query: extremeEventsQuerySchema }),
  async (req, res) => {
  try {
    const { lat, lng, days } = req.query;
    const daysParam = days || 16;
    
    // ✅ MELHORADO: Timeout aumentado para 40s (API Open-Meteo pode demorar até 20s + processamento)
    const response = await pythonAxios.get(
      '/api/v1/weather/extreme-events',
      {
        params: { lat: parseFloat(lat), lng: parseFloat(lng), days: daysParam },
        timeout: 40000 // 40 segundos (API externa pode demorar)
      }
    );
    
    res.json(response.data);
  } catch (error) {
    // ✅ MELHORADO: Log mais detalhado para debugging
    logger.warn("⚠️ Erro ao buscar eventos extremos:", { 
      error: error.message, 
      code: error.code,
      lat: req.query.lat,
      lng: req.query.lng,
      response: error.response?.data
    });
    
    // ✅ MELHORADO: Tratamento específico para diferentes tipos de erro
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        error: 'Timeout ao buscar eventos extremos',
        details: 'A API externa demorou muito para responder. Tente novamente em alguns instantes.'
      });
    }
    
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(503).json({
        error: 'Serviço Python indisponível',
        details: 'O serviço de IA não está respondendo. Verifique se o serviço está rodando.'
      });
    }
    
    // Se o Python retornou um erro HTTP, repassa
    if (error.response) {
      return res.status(error.response.status).json({
        error: 'Erro no serviço de IA',
        details: error.response.data?.detail || error.response.data?.message || error.message
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao analisar eventos extremos',
      details: error.message
    });
  }
});

// Eventos Históricos (ex: granizo há 2 dias)
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/weather/extreme-events/historical',
  verifyToken,
  validateRequest({ query: historicalExtremeEventsQuerySchema }),
  async (req, res) => {
  try {
    const { lat, lng, days_back } = req.query;
    
    const daysBackParam = days_back ? parseInt(days_back) : 7;
    
    const response = await pythonAxios.get(
      '/api/v1/weather/extreme-events/historical',
      {
        params: { lat: parseFloat(lat), lng: parseFloat(lng), days_back: daysBackParam },
        timeout: 30000 // 30 segundos
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error("Erro ao buscar eventos históricos:", error.message);
    res.status(500).json({ 
      error: 'Erro ao analisar eventos históricos',
      details: error.message
    });
  }
});

// 2.4. Risco de Abastecimento (Proxy para Python)
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/weather/supply-risk',
  verifyToken,
  validateRequest({ query: supplyRiskQuerySchema }),
  async (req, res) => {
  try {
    const { lat, lng, product, days } = req.query;
    
    console.log(`📊 Buscando supply risk para lat=${lat}, lng=${lng}, product=${product || 'Tomate'}`);
    
    const response = await pythonAxios.get(
      '/api/v1/weather/supply-risk',
      {
        params: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          product: product || 'Tomate',
          days: days ? parseInt(days) : 16
        },
        timeout: 60000 // 60 segundos (análise de risco pode demorar, especialmente na primeira vez)
      }
    );
    
    console.log(`✅ Supply risk recebido:`, response.status, response.data ? 'com dados' : 'sem dados');
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro ao buscar risco de abastecimento:", error.message);
    if (error.response) {
      console.error("   Status:", error.response.status);
      console.error("   Data:", error.response.data);
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout ao buscar risco de abastecimento',
        details: 'O serviço demorou muito para responder'
      });
    }
    res.status(500).json({
      error: 'Erro ao buscar risco de abastecimento',
      details: error.message
    });
  }
});

// 2.5. Previsão Climática (Proxy para Python)
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/weather/forecast',
  verifyToken,
  validateRequest({ query: forecastQuerySchema }),
  async (req, res) => {
  try {
    const { lat, lng } = req.query;
    
    console.log(`📊 Buscando forecast para lat=${lat}, lng=${lng}`);
    
    const response = await pythonAxios.get(
      '/api/v1/weather/forecast',
      {
        params: { lat: parseFloat(lat), lng: parseFloat(lng) },
        timeout: 30000 // 30 segundos (forecast pode demorar na primeira vez)
      }
    );
    
    console.log(`✅ Forecast recebido:`, response.status);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro ao buscar previsão climática:", error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Serviço Python indisponível',
        details: 'O serviço de IA não está respondendo. Verifique se está rodando.'
      });
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        error: 'Timeout ao buscar previsão climática',
        details: 'O serviço demorou muito para responder'
      });
    }
    if (error.response) {
      console.error("   Status Python:", error.response.status);
      console.error("   Data Python:", error.response.data);
      return res.status(error.response.status || 500).json({ 
        error: 'Erro ao buscar previsão climática',
        details: error.response.data?.detail || error.message
      });
    }
    res.status(500).json({ 
      error: 'Erro ao buscar previsão climática',
      details: error.message
    });
  }
});

// 2.6. Comparação de Chuva (últimos N dias vs mesmo período ano anterior)
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/weather/rain-comparison',
  verifyToken,
  validateRequest({ query: rainComparisonQuerySchema }),
  async (req, res) => {
  try {
    const { lat, lng, days } = req.query;

    console.log(`📊 Comparando chuva (últimos ${days || 30} dias vs ano anterior) para lat=${lat}, lng=${lng}`);

    const response = await pythonAxios.get(
      '/api/v1/weather/rain-comparison',
      {
        params: {
          lat: parseFloat(lat),
          lng: parseFloat(lng),
          days: days ? parseInt(days, 10) : 30
        },
        timeout: 30000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro ao comparar chuva:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Serviço Python indisponível',
        details: 'O serviço de IA não está respondendo. Verifique se está rodando.'
      });
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout ao comparar chuva',
        details: 'O serviço demorou muito para responder'
      });
    }
    res.status(500).json({
      error: 'Erro ao comparar chuva',
      details: error.response?.data?.detail || error.message
    });
  }
});

// ✅ NOVO: Rota pública para buscar janelas de plantio (ZARC) - Proxy para Python
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/zarc/planting-windows',
  verifyToken,
  validateRequest({ query: plantingWindowsQuerySchema }),
  async (req, res) => {
  try {
    const { product, state } = req.query;

    console.log(`📅 Buscando janelas de plantio ZARC para product=${product}, state=${state}`);

    const response = await pythonAxios.get(
      '/api/v1/zarc/planting-windows',
      {
        params: {
          product: product,
          state: state
        },
        timeout: 30000
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('❌ Erro ao buscar janelas de plantio ZARC:', error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Serviço Python indisponível',
        details: 'O serviço de IA não está respondendo. Verifique se está rodando.'
      });
    }
    if (error.response) {
      // ✅ MELHORADO: Se o Python retornar 404 (CSV não disponível), retorna resposta vazia ao invés de erro
      if (error.response.status === 404) {
        console.warn('⚠️ ZARC CSV não disponível, retornando resposta vazia');
        return res.json({ windows: [], message: 'Dados ZARC temporariamente indisponíveis' });
      }
      return res.status(error.response.status).json(error.response.data);
    }
    res.status(500).json({ error: 'Erro interno ao buscar janelas de plantio' });
  }
});

// 3. Calendário de Plantio/Colheita
// 🔒 RBAC: Apenas admin pode acessar calendário (chama endpoint admin do Python)
app.get('/api/calendar/planting-window', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const { product, state } = req.query;
    if (!product || !state) {
      return res.status(400).json({ error: 'Product e state são obrigatórios' });
    }
    
    // Chama Python para buscar informações de calendário
    const response = await pythonAxios.get(
      '/api/v1/admin/calendar/planting-window',
      {
        params: { product, state },
        timeout: 30000 // 30 segundos
      }
    );
    
    res.json(response.data);
  } catch (error) {
    console.error("Erro ao buscar calendário:", error.message);
    res.status(500).json({ 
      error: 'Erro ao buscar calendário de plantio',
      details: error.message
    });
  }
});

// 4. Histórico e Tendências de Mercado (Analytics) - ✅ MELHORADO COM FILTROS AVANÇADOS
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/analytics/trends',
  verifyToken,
  validateRequest({ query: trendsQuerySchema }),
  async (req, res) => {
  try {
    const { product, region, municipality, days = 90 } = req.query;
    
    const daysInt = Math.min(parseInt(days) || 90, 365); // Máximo 1 ano
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysInt);
    
    logger.info(`📈 Buscando tendências para ${product}${region ? ` (${region})` : ''}${municipality ? ` - ${municipality}` : ''} - últimos ${daysInt} dias`);
    
    // Busca dados históricos de CeasaPrice (apenas dados reais, não projeções)
    const whereCondition = {
      product_name: {
        contains: product,
        mode: 'insensitive'
      },
      price_date: {
        gte: startDate
      },
      is_projection: false // Apenas dados reais
    };
    
    // Filtro por estado (se fornecido e não for "Total")
    if (region && region !== 'Total' && region !== '') {
      whereCondition.ceasa_region = region.toUpperCase();
    }
    
    // Filtro por município (ceasa_name contém o nome do município)
    if (municipality && municipality !== 'Total' && municipality !== '') {
      whereCondition.ceasa_name = {
        contains: municipality,
        mode: 'insensitive'
      };
    }
    
    const prices = await prisma.ceasaPrice.findMany({
      where: whereCondition,
      orderBy: {
        price_date: 'asc'
      },
      select: {
        price_date: true,
        price_avg: true,
        price_min: true,
        price_max: true,
        ceasa_region: true,
        ceasa_name: true
      }
    });
    
    if (prices.length === 0) {
      return res.status(404).json({
        error: `Nenhum dado histórico encontrado para "${product}"${region ? ` em ${region}` : ''} nos últimos ${daysInt} dias.`
      });
    }
    
    // Agrupa por data (múltiplas regiões podem ter dados no mesmo dia)
    const dailyPrices = {};
    prices.forEach(price => {
      const dateKey = price.price_date.toISOString().split('T')[0];
      if (!dailyPrices[dateKey]) {
        dailyPrices[dateKey] = {
          dates: [],
          prices: [],
          min: [],
          max: []
        };
      }
      dailyPrices[dateKey].prices.push(Number(price.price_avg));
      dailyPrices[dateKey].min.push(Number(price.price_min));
      dailyPrices[dateKey].max.push(Number(price.price_max));
    });
    
    // Calcula médias diárias e ordena por data
    const sortedDates = Object.keys(dailyPrices).sort();
    const historicalData = sortedDates.map(date => ({
      date,
      price: dailyPrices[date].prices.reduce((a, b) => a + b, 0) / dailyPrices[date].prices.length,
      min: Math.min(...dailyPrices[date].min),
      max: Math.max(...dailyPrices[date].max)
    }));
    
    // Calcula médias móveis
    const calculateMovingAverage = (data, window) => {
      const result = [];
      for (let i = 0; i < data.length; i++) {
        const start = Math.max(0, i - window + 1);
        const slice = data.slice(start, i + 1);
        const avg = slice.reduce((sum, item) => sum + item.price, 0) / slice.length;
        result.push(avg);
      }
      return result;
    };
    
    const ma7 = calculateMovingAverage(historicalData, 7);
    const ma30 = calculateMovingAverage(historicalData, 30);
    const ma90 = calculateMovingAverage(historicalData, 90);
    
    // Identifica direção da tendência (últimos 7 dias vs últimos 30 dias)
    const recent7Avg = historicalData.slice(-7).reduce((sum, item) => sum + item.price, 0) / Math.min(7, historicalData.length);
    const recent30Avg = historicalData.slice(-30).reduce((sum, item) => sum + item.price, 0) / Math.min(30, historicalData.length);
    const changePercent = ((recent7Avg - recent30Avg) / recent30Avg) * 100;
    
    let trendDirection = 'stable';
    if (changePercent > 5) trendDirection = 'up';
    else if (changePercent < -5) trendDirection = 'down';
    
    // Estatísticas resumidas
    const currentPrice = historicalData[historicalData.length - 1]?.price || 0;
    const minPrice = Math.min(...historicalData.map(d => d.price));
    const maxPrice = Math.max(...historicalData.map(d => d.price));
    const avgPrice = historicalData.reduce((sum, d) => sum + d.price, 0) / historicalData.length;
    
    // Formata dados para gráfico
    const labels = historicalData.map(d => {
      const date = new Date(d.date);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });
    
    const datasets = {
      historical: historicalData.map(d => Number(d.price.toFixed(2))),
      ma7: ma7.map(v => Number(v.toFixed(2))),
      ma30: ma30.map(v => Number(v.toFixed(2))),
      ma90: ma90.map(v => Number(v.toFixed(2))),
      min: historicalData.map(d => Number(d.min.toFixed(2))),
      max: historicalData.map(d => Number(d.max.toFixed(2)))
    };
    
    res.json({
      success: true,
      product,
      region: region && region !== 'Total' ? region : 'Total (Brasil)',
      municipality: municipality && municipality !== 'Total' ? municipality : null,
      period: {
        days: daysInt,
        startDate: sortedDates[0],
        endDate: sortedDates[sortedDates.length - 1]
      },
      trend: {
        direction: trendDirection,
        changePercent: Number(changePercent.toFixed(2)),
        recent7Avg: Number(recent7Avg.toFixed(2)),
        recent30Avg: Number(recent30Avg.toFixed(2))
      },
      statistics: {
        current: Number(currentPrice.toFixed(2)),
        average: Number(avgPrice.toFixed(2)),
        min: Number(minPrice.toFixed(2)),
        max: Number(maxPrice.toFixed(2)),
        volatility: Number(((maxPrice - minPrice) / avgPrice * 100).toFixed(2)) // Coeficiente de variação
      },
      chart: {
        labels,
        datasets
      },
      dataPoints: historicalData.length
    });
    
  } catch (error) {
    logger.error('❌ Erro ao buscar tendências:', { error: error.message, stack: error.stack });
    res.status(500).json({ 
      error: 'Erro ao buscar tendências de mercado',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ NOVO: Endpoint para listar produtos disponíveis
app.get('/api/analytics/products', verifyToken, async (req, res) => {
  try {
    const products = await prisma.ceasaPrice.findMany({
      where: {
        is_projection: false
      },
      select: {
        product_name: true
      },
      distinct: ['product_name'],
      orderBy: {
        product_name: 'asc'
      }
    });
    
    const productList = products.map(p => p.product_name).filter((v, i, a) => a.indexOf(v) === i);
    
    res.json({
      success: true,
      products: productList
    });
  } catch (error) {
    logger.error('❌ Erro ao listar produtos:', { error: error.message });
    res.status(500).json({ 
      error: 'Erro ao listar produtos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ NOVO: Endpoint para listar estados disponíveis
app.get('/api/analytics/regions', verifyToken, async (req, res) => {
  try {
    const { product } = req.query;
    
    const whereCondition = {
      is_projection: false
    };
    
    if (product) {
      whereCondition.product_name = {
        contains: product,
        mode: 'insensitive'
      };
    }
    
    const regions = await prisma.ceasaPrice.findMany({
      where: whereCondition,
      select: {
        ceasa_region: true
      },
      distinct: ['ceasa_region'],
      orderBy: {
        ceasa_region: 'asc'
      }
    });
    
    const regionList = regions.map(r => r.ceasa_region).filter((v, i, a) => a.indexOf(v) === i);
    
    res.json({
      success: true,
      regions: regionList
    });
  } catch (error) {
    logger.error('❌ Erro ao listar regiões:', { error: error.message });
    res.status(500).json({ 
      error: 'Erro ao listar regiões',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// ✅ NOVO: Endpoint para listar municípios (CEASAs) disponíveis
app.get('/api/analytics/municipalities', verifyToken, async (req, res) => {
  try {
    const { product, region } = req.query;
    
    const whereCondition = {
      is_projection: false
    };
    
    if (product) {
      whereCondition.product_name = {
        contains: product,
        mode: 'insensitive'
      };
    }
    
    if (region && region !== 'Total') {
      whereCondition.ceasa_region = region.toUpperCase();
    }
    
    const municipalities = await prisma.ceasaPrice.findMany({
      where: whereCondition,
      select: {
        ceasa_name: true,
        ceasa_region: true
      },
      distinct: ['ceasa_name'],
      orderBy: {
        ceasa_name: 'asc'
      }
    });
    
    const municipalityList = municipalities.map(m => ({
      name: m.ceasa_name,
      region: m.ceasa_region
    })).filter((v, i, a) => a.findIndex(item => item.name === v.name) === i);
    
    res.json({
      success: true,
      municipalities: municipalityList
    });
  } catch (error) {
    logger.error('❌ Erro ao listar municípios:', { error: error.message });
    res.status(500).json({ 
      error: 'Erro ao listar municípios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Mantém endpoint antigo para compatibilidade (deprecated)
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/analytics/trend',
  verifyToken,
  validateRequest({ query: trendQuerySchema }),
  async (req, res) => {
  try {
    const { product, city } = req.query;
    const whereCondition = {};
    if (product) whereCondition.opportunity = { product: { contains: product } };
    
    const history = await prisma.priceHistory.findMany({
      where: whereCondition,
      orderBy: { createdAt: 'asc' },
      take: 100 // Limita para não explodir o gráfico
    });
    
    // Agregação simples para o gráfico
    const trendMap = {};
    history.forEach(record => {
      const dateKey = new Date(record.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!trendMap[dateKey]) {
        trendMap[dateKey] = { sum: 0, count: 0 };
      }
      trendMap[dateKey].sum += record.price;
      trendMap[dateKey].count += 1;
    });
    
    const labels = Object.keys(trendMap);
    const data = labels.map(date => (trendMap[date].sum / trendMap[date].count).toFixed(2));
    
    res.json({ labels, data });
  } catch (error) {
    logger.error("Erro Trend:", error);
    res.status(500).json({ error: 'Erro ao buscar tendência' });
  }
});

// 1. Armazenagem (Storage Advisor) - VERSÃO BLINDADA DEFINITIVA
// ✅ REFACTOR-005: Validação Zod adicionada
app.post('/api/ai/storage',
  verifyToken,
  validateRequest({ body: storageAnalysisBodySchema }),
  async (req, res) => {
  try {
    // Debug: Verifica se req.body está disponível
    if (!req.body) {
      console.error("❌ CRÍTICO: req.body está undefined!");
      return res.status(400).json({ error: 'req.body não disponível. Verifique middleware express.json()' });
    }
    
    // HIGIENIZAÇÃO: Garante que nada chegue nulo no Python
    const safePayload = {
        product: req.body.product || 'Tomate',
        state: req.body.state || 'SP',
        
        // Numéricos: Se falhar conversão, usa 0
        current_price: parseFloat(req.body.current_price) || 0,
        buy_price: parseFloat(req.body.buy_price) || 0,
        accumulated_rainfall: parseFloat(req.body.accumulated_rainfall) || 0,
        
        // Coordenadas
        lat: parseFloat(req.body.lat) || 0,
        lng: parseFloat(req.body.lng) || 0,
        
        // Opcionais com Default
        planting_date: req.body.planting_date || null,
        storage_cost_per_day: parseFloat(req.body.storage_cost_per_day) || 0.03,
        risk_factor: parseFloat(req.body.risk_factor) || 1.0,
        
        // Arrays vazios se faltarem
        daily_rain: Array.isArray(req.body.daily_rain) ? req.body.daily_rain : [],
        daily_temp_max: Array.isArray(req.body.daily_temp_max) ? req.body.daily_temp_max : [],
        daily_temp_min: Array.isArray(req.body.daily_temp_min) ? req.body.daily_temp_min : [],
        daily_sun: Array.isArray(req.body.daily_sun) ? req.body.daily_sun : []
    };

    console.log(`📤 [Node -> Python] Storage: ${safePayload.product} | R$${safePayload.current_price}`);
    
    let response;
    try {
      response = await pythonAxios.post(
        '/api/v1/predict/storage', 
        safePayload,
        { timeout: 60000 } // 60 segundos (análise climática pode demorar)
      );
    } catch (axiosError) {
      console.error("❌ Erro ao chamar Python /storage:", axiosError.message);
      if (axiosError.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: 'Serviço Python indisponível',
          details: 'O serviço de IA não está respondendo. Verifique se está rodando.'
        });
      }
      if (axiosError.code === 'ECONNABORTED') {
        return res.status(504).json({ 
          error: 'Timeout ao processar análise de armazenagem',
          details: 'O serviço demorou muito para responder (60s)'
        });
      }
      if (axiosError.response) {
        console.error("   Status Python:", axiosError.response.status);
        console.error("   Data Python:", axiosError.response.data);
        return res.status(axiosError.response.status || 500).json({ 
          error: 'Erro no serviço de IA',
          details: axiosError.response.data?.detail || axiosError.message
        });
      }
      throw axiosError; // Re-throw para ser capturado pelo catch externo
    }
    
    // Tratamento da resposta para evitar erro no Front
    const pyData = response.data || {};
    
    // Garante que a estrutura está completa
    const formattedData = {
        chart_data: pyData.chart_data || {
            labels: [],
            prices_market: [],
            prices_my_product: [],
            costs: []
        },
        recommendation: pyData.recommendation || {
            action: "VENDER AGORA",
            best_day_date: null,
            best_day_days: null,
            projected_profit: 0,
            confidence_score: 0,
            risk_event: "Dados não disponíveis"
        }
    };
    
    console.log("📊 Backend Storage Response:", JSON.stringify(formattedData, null, 2));

    res.json(formattedData);

  } catch (error) {
    console.error("❌ Erro Node Storage:", error.message);
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Serviço Python indisponível',
        details: 'O serviço de IA não está respondendo. Verifique se está rodando.'
      });
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        error: 'Timeout ao processar análise de armazenagem',
        details: 'O serviço demorou muito para responder'
      });
    }
    const errorDetail = error.response?.data?.detail || error.message;
    console.error("   Detalhes:", errorDetail);
    // Retorna 500 mas com JSON válido para o front não crashar feio
    res.status(500).json({ 
      error: 'Erro ao processar análise de armazenagem',
      details: errorDetail 
    });
  }
});

// 2. Processamento em Lote (Batch) - VERSÃO DEBUG X9 🕵️‍♂️
// ✅ REFACTOR-005: Validação Zod adicionada
app.post('/api/ai/batch',
  verifyToken,
  validateRequest({ body: batchAIBodySchema }),
  async (req, res) => {
  try {
    // Debug: Verifica se req.body está disponível
    if (!req.body) {
      console.error("❌ CRÍTICO: req.body está undefined no /batch!");
      return res.status(400).json({ error: 'req.body não disponível. Verifique middleware express.json()' });
    }
    
    if (!req.body.items || !Array.isArray(req.body.items)) {
        return res.status(400).json({ error: "Payload inválido: 'items' obrigatório" });
    }

    const sanitizedItems = req.body.items.map(item => {
        const financials = item.financials || {};
        const origin = item.origin || {};
        const coords = item.coords || {};
        
        return {
            id: parseInt(item.id),
            product: item.product || 'Tomate',
            state: origin.state || 'SP',
            
            // Força conversão para número e evita NaN
            lat: Number(coords.lat) || 0.0,
            lng: Number(coords.lng) || 0.0,
            accumulated_rainfall: 0.0, 
            storage_cost_per_day: 0.03, 
            
            current_price: Number(financials.sellPrice) || 0.0, 
            buy_price: Number(financials.buyPrice) || 0.0
        };
    });

    if (sanitizedItems.length === 0) return res.json({});

    const response = await pythonAxios.post(
      '/api/v1/predict/batch', 
      { items: sanitizedItems }, 
      { timeout: 120000 } // 120 segundos (Prophet pode demorar, mas tem fallback rápido)
    );
    res.json(response.data);

  } catch (error) {
    // AQUI ESTÁ O TRUQUE: Pegamos a mensagem de erro do Python e mandamos pro Front
    const pythonError = error.response?.data?.detail || error.message;
    console.error("❌ Erro Batch Node:", JSON.stringify(pythonError));
    
    // Retorna o erro real para vermos no console do navegador
    res.status(500).json({ error: "Erro Python", details: pythonError });
  }
});

// 3. Preços de Combustível GERAL (Para Dashboard principal)
app.get('/api/fuel/current-prices', verifyToken, async (req, res) => {
  try {
    const response = await pythonAxios.get('/api/v1/predict/fuel');
    // O Dashboard espera array ou objeto, mandamos direto
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro Fuel Geral:", error.message);
    res.json([]); 
  }
});

// 4. Preço de Combustível POR ESTADO (A Rota que faltava para FuelPriceDisplay.jsx)
// ✅ REFACTOR-005: Validação Zod adicionada
app.get('/api/fuel/price/:state',
  verifyToken,
  validateRequest({ params: fuelPriceParamsSchema }),
  async (req, res) => {
  try {
    const state = req.params.state;
    
    // 1. Buscamos TODOS os dados do Python (é mais seguro que tentar adivinhar endpoint específico)
    const response = await pythonAxios.get('/predict/fuel', {
      timeout: 30000 // 30 segundos (busca simples de preços)
    });
    const data = response.data;
    
    // 2. Filtramos no Node.js
    // Baseado no seu fuel_pricing.py, a estrutura é data.precos.diesel[uf]
    let priceStr = '0.00';
    let dataColeta = new Date().toISOString();
    
    if (data.precos && data.precos.diesel) {
        // Tenta pegar do estado, se não tiver, pega média BR
        priceStr = data.precos.diesel[state] || data.precos.diesel['br'] || '6.00';
        dataColeta = data.data_coleta;
    }

    // 3. Convertendo string "6,25" para float 6.25
    const price = parseFloat(priceStr.replace(',', '.'));

    // 4. Retornamos no formato exato que FuelPriceDisplay.jsx exige: response.data.data
    res.json({
        data: {
            state: state.toUpperCase(),
            price_per_liter: price,
            data_coleta: dataColeta
        }
    });

  } catch (error) {
    console.error(`❌ Erro Fuel State (${req.params.state}):`, error.message);
    // Retorna fallback para não quebrar a tela
    res.json({
        data: {
            state: req.params.state.toUpperCase(),
            price_per_liter: 0.00,
            data_coleta: 'N/A'
        }
    });
  }
});

// ============================================
// 🧮 ROTAS DE CÁLCULO (AGORA BLINDADAS)
// ============================================

// 4. Calculadora de Produção
// ✅ REFACTOR-005: Validação Zod adicionada
app.post('/calc/production',
  verifyToken,
  validateRequest({ body: productionCalculationBodySchema }),
  async (req, res) => {
  try {
    const safePayload = {
        state: req.body.state || 'SP',
        product: req.body.product || 'Tomate',
        // Garante números
        area_ha: parseFloat(req.body.area_ha) || 10,
        planting_month: parseInt(req.body.planting_month) || 1,
        cost_per_ha: parseFloat(req.body.cost_per_ha) || 0,
        expected_productivity: parseFloat(req.body.expected_productivity) || 0,
        expected_sell_price: parseFloat(req.body.expected_sell_price) || 0
    };

    const response = await pythonAxios.post(
      '/api/v1/calc/production', 
      safePayload,
      { timeout: 60000 } // 60 segundos (cálculo pode demorar)
    );
    res.json(response.data);
  } catch (error) {
    console.error("Erro Ponte Produção:", error.message);
    res.status(500).json({ error: 'Erro cálculo produção' });
  }
});

// 5. Calculadora de Arbitragem (A que estava dando erro 500)
// ✅ REFACTOR-005: Validação Zod adicionada
/**
 * @swagger
 * /calc/arbitrage:
 *   post:
 *     summary: Calcula ROI de arbitragem interestadual
 *     tags: [Calculadoras]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - product
 *               - origin_state
 *               - destination_state
 *               - buy_price
 *               - sell_price
 *               - volume
 *             properties:
 *               product:
 *                 type: string
 *                 example: Tomate
 *               origin_state:
 *                 type: string
 *                 example: MT
 *               destination_state:
 *                 type: string
 *                 example: SP
 *               buy_price:
 *                 type: number
 *                 format: float
 *                 example: 2.50
 *               sell_price:
 *                 type: number
 *                 format: float
 *                 example: 4.00
 *               volume:
 *                 type: number
 *                 format: float
 *                 example: 1000
 *     responses:
 *       200:
 *         description: Resultado do cálculo de arbitragem
 *       400:
 *         $ref: '#/components/responses/Error'
 */
app.post('/calc/arbitrage',
  verifyToken,
  validateRequest({ body: arbitrageCalculationBodySchema }),
  async (req, res) => {
  try {
    // O erro acontecia porque enviávamos req.body direto, e vinha string ou null
    const safePayload = {
        product: req.body.product || 'Tomate',
        origin_state: req.body.origin_state || 'SP',
        destination_state: req.body.destination_state || 'SP',
        // Conversão forçada para evitar erro de validação no Python
        area_ha: parseFloat(req.body.area_ha) || 10,
        planting_month: parseInt(req.body.planting_month) || 1
    };

    console.log(`📤 [Node -> Python] Arbitragem: ${safePayload.origin_state} -> ${safePayload.destination_state}`);
    const response = await pythonAxios.post(
      '/api/v1/calc/arbitrage', 
      safePayload,
      { timeout: 60000 } // 60 segundos (cálculo pode demorar)
    );
    res.json(response.data);

  } catch (error) {
    const errorDetail = error.response?.data?.detail || error.message;
    console.error("❌ Erro Ponte Arbitragem:", JSON.stringify(errorDetail));
    res.status(500).json({ error: 'Erro cálculo arbitragem', details: errorDetail });
  }
});
// 6. Recomendação Automática (IA)
// ✅ REFACTOR-005: Validação Zod adicionada
app.post('/api/ai/recommendation',
  verifyToken,
  validateRequest({ body: recommendationBodySchema }),
  async (req, res) => {
  try {
    // Debug: Verifica se req.body está disponível
    if (!req.body) {
      console.error("❌ CRÍTICO: req.body está undefined no /recommendation!");
      return res.status(400).json({ error: 'req.body não disponível. Verifique middleware express.json()' });
    }
    
    const safePayload = {
      product: req.body.product || 'Tomate',
      state: req.body.state || 'SP',
      roi: req.body.roi !== undefined ? parseFloat(req.body.roi) : null,
      roi_d7: req.body.roi_d7 !== undefined ? parseFloat(req.body.roi_d7) : null,
      roi_d30: req.body.roi_d30 !== undefined ? parseFloat(req.body.roi_d30) : null,
      quality_score: req.body.quality_score !== undefined ? parseFloat(req.body.quality_score) : null,
      shelf_life_days: req.body.shelf_life_days !== undefined ? parseInt(req.body.shelf_life_days) : null,
      has_extreme_events: req.body.has_extreme_events || false,
      extreme_event_severity: req.body.extreme_event_severity || null,
      is_ideal_planting_month: req.body.is_ideal_planting_month !== undefined ? req.body.is_ideal_planting_month : null,
      is_risk_planting_month: req.body.is_risk_planting_month !== undefined ? req.body.is_risk_planting_month : null,
      market_trend: req.body.market_trend || null,
      current_price: req.body.current_price !== undefined ? parseFloat(req.body.current_price) : null,
      buy_price: req.body.buy_price !== undefined ? parseFloat(req.body.buy_price) : null
    };

    console.log(`📤 [Node -> Python] Recomendação: ${safePayload.product}/${safePayload.state}`);
    const response = await pythonAxios.post(
      '/api/v1/predict/recommendation',
      safePayload,
      { timeout: 30000 } // 30 segundos
    );
    
    res.json(response.data);
  } catch (error) {
    console.error("Erro Ponte Recomendação:", error.message);
    res.status(500).json({ 
      error: 'Erro ao gerar recomendação automática',
      details: error.message
    });
  }
});

// 6.5. Melhores Oportunidades Automáticas - ✅ NOVO
// ✅ REFACTOR-005: Validação Zod adicionada
app.post('/api/ai/best-opportunities',
  verifyToken,
  validateRequest({ body: bestOpportunitiesBodySchema }),
  async (req, res) => {
  try {
    const payload = {
      products: req.body.products || null,  // Se null, busca todos
      max_results: req.body.max_results || 10,
      min_roi: req.body.min_roi || null,
      month: req.body.month || null
    };

    logger.info(`🎯 Buscando melhores oportunidades: produtos=${payload.products}, max=${payload.max_results}`);
    
    const response = await pythonAxios.post(
      '/api/v1/predict/best-opportunities',
      payload,
      { timeout: 100000 } // 100 segundos (otimizado: menos combinações agora)
    );
    
    res.json(response.data);
  } catch (error) {
    logger.error(`❌ Erro ao buscar melhores oportunidades: ${error.message}`);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        error: 'Serviço de IA não disponível',
        details: 'O serviço de IA não está respondendo. Verifique se está rodando.'
      });
    }
    
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({
        error: 'Timeout ao buscar melhores oportunidades',
        details: 'A busca está demorando mais que o esperado. Tente reduzir o número de produtos ou aumentar o min_roi.'
      });
    }
    
    res.status(500).json({
      error: 'Erro ao buscar melhores oportunidades',
      details: error.response?.data?.detail || error.message
    });
  }
});

// 7. Chat RAG (Assistente Agronômico) - ✅ NOVO
// ✅ REFACTOR-005: Validação Zod adicionada
app.post('/api/ai/chat/query',
  verifyToken,
  validateRequest({ body: chatQueryBodySchema }),
  async (req, res) => {
  try {
    // Debug: Verifica se req.body está disponível
    if (!req.body) {
      console.error("❌ CRÍTICO: req.body está undefined no /chat/query!");
      return res.status(400).json({ error: 'req.body não disponível. Verifique middleware express.json()' });
    }
    
    // Normaliza: aceita tanto 'question' quanto 'query'
    const questionText = (req.body.question || req.body.query || '').trim();
    
    if (!questionText || questionText.length === 0) {
      return res.status(400).json({ error: 'Campo \"question\" ou \"query\" é obrigatório e deve ser uma string não vazia' });
    }
    
    const safePayload = {
      question: questionText
    };

    console.log(`📤 [Node -> Python] Chat RAG: \"${safePayload.question.substring(0, 50)}...\"`);
    
    // Chama Python com timeout maior (RAG pode demorar com LLM)
    const response = await pythonAxios.post(
      '/api/v1/chat/query',
      safePayload,
      { timeout: 60000 } // 60 segundos
    );
    
    // Normaliza formato da resposta para o frontend
    const pythonData = response.data || {};
    
    res.json({
      answer: pythonData.answer || 'Desculpe, não consegui gerar uma resposta.',
      sources: pythonData.sources || []
    });
    
  } catch (error) {
    console.error("❌ Erro Chat RAG Node:", error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'Serviço Python indisponível',
        details: 'O serviço de IA não está respondendo. Verifique se está rodando.'
      });
    }
    if (error.code === 'ECONNABORTED') {
      return res.status(504).json({ 
        error: 'Timeout ao processar consulta RAG',
        details: 'O serviço demorou muito para responder (60s)'
      });
    }
    if (error.response) {
      const statusCode = error.response.status;
      const pythonError = error.response.data?.detail || error.response.data?.error || error.message;
      
      return res.status(statusCode).json({ 
        error: 'Erro no serviço de IA',
        details: pythonError
      });
    }
    
    res.status(500).json({ 
      error: 'Erro ao processar consulta RAG',
      details: error.message
    });
  }
});

// 8. Radar de Mercado
// ✅ REFACTOR-005: Validação Zod adicionada
app.post('/market/scan',
  verifyToken,
  validateRequest({ body: marketScanBodySchema }),
  async (req, res) => {
  try {
    const response = await pythonAxios.post(
      '/api/v1/predict/market/scan', 
      req.body,
      { timeout: 90000 } // 90 segundos (scan de múltiplos destinos pode demorar)
    );
    res.json(response.data);
  } catch (error) {
    console.error("Erro Ponte Radar:", error.message);
    res.status(500).json({ error: 'Erro ao processar radar de mercado.' });
  }
});

// 7. Admin: Correção de Dados (PROTEGIDO COM RBAC)
app.post('/api/admin/fix-data', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const userId = req.user?.id || 'system';
    logger.info(`🔧 Admin ${req.user?.email || 'unknown'} solicitando correção de dados ao Python...`);
    
    // ✅ AUDIT LOG: Registra ação crítica
    await logAction(userId, 'FIX_MARKET_DATA', 'Iniciada correção de dados de mercado');
    
    const response = await pythonAxios.post(
      '/admin/fix-market-data',
      {},
      { timeout: 120000 } // 120 segundos (operação admin pode demorar muito)
    );
    
    // ✅ AUDIT LOG: Registra sucesso
    await logAction(userId, 'FIX_MARKET_DATA', `Correção concluída: ${JSON.stringify(response.data)}`);
    
    res.json(response.data);
  } catch (error) {
    const userId = req.user?.id || 'system';
    logger.error("Erro Admin Fix:", { error: error.message });
    
    // ✅ AUDIT LOG: Registra erro
    await logAction(userId, 'FIX_MARKET_DATA_ERROR', `Erro: ${error.message}`);
    
    res.status(500).json({ error: 'Erro ao executar rotina de correção.' });
  }
});

// ============================================
// 🥬 ROTAS ESPECÍFICAS (CEASA)
// ============================================
app.use('/api/ceasa', ceasaRoutes);
app.use('/api/admin/etl', etlRoutes); // ✅ ETL ASSÍNCRONO
app.use('/api/favorites', favoritesRoutes); // ✅ NOVO: Favoritos
app.use('/api/alerts', alertsRoutes); // ✅ NOVO: Sistema de Alertas (webhook Telegram não requer auth)
app.use('/api/portfolio', portfolioRoutes); // ✅ NOVO: Portfolio Tracking
app.use('/api/admin', adminRoutes); // ✅ FASE B - B4: Rotas administrativas (cache stats)

// ✅ FASE 0 - Semana 2: Error Handler do Sentry (DEPOIS de todas as rotas, ANTES de error handlers)
// Na v10 do @sentry/node, usamos expressErrorHandler como middleware
if (process.env.SENTRY_DSN && typeof Sentry.expressErrorHandler === 'function') {
  app.use(Sentry.expressErrorHandler());
} else if (process.env.SENTRY_DSN && Sentry.Handlers && typeof Sentry.Handlers.errorHandler === 'function') {
  // Fallback para compatibilidade
  app.use(Sentry.Handlers.errorHandler());
}

// ✅ REFACTOR-006: Error Handler padronizado (substitui o handler antigo)
// O errorHandler já integra com Sentry e logger
app.use(errorHandler);

// ============================================
// ✅ FASE 0 - Semana 3: Job Agendado de Sincronização Climática
// ============================================
const { setupWeatherSyncJob } = require('./utils/weatherSyncJob');

// Configura job agendado (2h da manhã, horário de Brasília)
if (process.env.ENABLE_WEATHER_SYNC !== 'false') {
  const weatherSyncSchedule = process.env.WEATHER_SYNC_SCHEDULE || '0 2 * * *'; // 2h da manhã
  setupWeatherSyncJob(weatherSyncSchedule);
  logger.info(`✅ Job de sincronização climática configurado: ${weatherSyncSchedule}`);
} else {
  logger.info('⚠️ Sincronização climática desabilitada (ENABLE_WEATHER_SYNC=false)');
}

// ✅ FASE B - B2: Job Agendado de Verificação de Alertas
// ============================================
const { setupAlertJob } = require('./utils/alertJob');

// Configura job agendado (a cada 30 minutos)
if (process.env.ENABLE_ALERTS !== 'false') {
  const alertSchedule = process.env.ALERT_CHECK_SCHEDULE || '*/30 * * * *'; // A cada 30 minutos
  setupAlertJob(alertSchedule);
  logger.info(`✅ Job de verificação de alertas configurado: ${alertSchedule}`);
} else {
  logger.info('⚠️ Verificação de alertas desabilitada (ENABLE_ALERTS=false)');
}

// Rota para sincronização manual (apenas para admin)
app.post('/api/admin/sync-weather', verifyToken, checkRole(['admin']), async (req, res) => {
  try {
    const userId = req.user?.id || 'system';
    logger.info(`🌍 Admin ${req.user?.email || 'unknown'} iniciando sincronização manual de clima...`);
    
    // ✅ AUDIT LOG: Registra ação crítica
    await logAction(userId, 'SYNC_WEATHER_MANUAL', 'Iniciada sincronização manual de dados climáticos');
    
    const { runManualSync } = require('./utils/weatherSyncJob');
    const result = await runManualSync();
    
    // ✅ AUDIT LOG: Registra resultado
    await logAction(userId, 'SYNC_WEATHER_MANUAL', `Concluída: ${result.success ? 'sucesso' : 'falha'} - ${result.message || result.error || 'N/A'}`);
    
    res.json(result);
  } catch (error) {
    const userId = req.user?.id || 'system';
    logger.error('❌ Erro na sincronização manual:', { error: error.message });
    
    // ✅ AUDIT LOG: Registra erro
    await logAction(userId, 'SYNC_WEATHER_MANUAL_ERROR', `Erro: ${error.message}`);
    
    res.status(500).json({ error: 'Erro ao sincronizar dados climáticos' });
  }
});

// ============================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR (CORRIGIDA)
// ============================================
// Ouvimos em 0.0.0.0 para garantir que o Docker/Railway consiga acessar
// Se ouvirmos apenas em localhost, o deploy falha com "Application failed to respond"
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info('==================================================');
  logger.info(`🔥 BACKEND ONLINE EM: http://0.0.0.0:${PORT}`);
  logger.info(`🌍 URL Externa esperada: ${process.env.RAILWAY_STATIC_URL || 'Não definida'}`);
  logger.info(`🔗 Conectado ao Python em: ${PYTHON_API_URL}`);
  logger.info('==================================================');
});

// ============================================
// ✅ CRIT-008: Graceful Shutdown
// ============================================
// Fecha conexões adequadamente ao receber SIGTERM/SIGINT
const gracefulShutdown = async (signal) => {
  logger.info(`\n🛑 ${signal} recebido. Iniciando graceful shutdown...`);
  
  // Para de aceitar novas requisições
  server.close(() => {
    logger.info('✅ Servidor HTTP fechado');
  });
  
  // Fecha conexões do Prisma
  try {
    await prisma.$disconnect();
    logger.info('✅ Conexões do Prisma fechadas');
  } catch (error) {
    logger.error('❌ Erro ao fechar Prisma:', error);
  }
  
  // Fecha job queue se existir
  if (jobQueue && typeof jobQueue.close === 'function') {
    try {
      await jobQueue.close();
      logger.info('✅ Job queue fechada');
    } catch (error) {
      logger.error('❌ Erro ao fechar job queue:', error);
    }
  }
  
  logger.info('✅ Graceful shutdown concluído');
  process.exit(0);
};

// Registra handlers para sinais de término
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handler para erros não tratados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('❌ Unhandled Rejection:', { reason, promise });
  // Não encerra o processo, apenas loga (Sentry captura)
});

process.on('uncaughtException', (error) => {
  logger.error('❌ Uncaught Exception:', error);
  // Encerra o processo após logar (erro crítico)
  gracefulShutdown('UNCAUGHT_EXCEPTION');
});