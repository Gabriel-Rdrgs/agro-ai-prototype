// backend/server.js
// ============================================
// 🏗️ AGRO-AI BACKEND v7.2 (VERSÃO COMPLETA INTEGRADA)
// ============================================

// 1. CARREGAMENTO DE DEPENDÊNCIAS
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');

// 2. IMPORTAÇÃO DE MÓDULOS LOCAIS
const authController = require('./authController');
const { verifyToken, checkRole } = require('./authMiddleware');
const ceasaRoutes = require('./routes/ceasa');
const etlRoutes = require('./routes/etl'); // ✅ ETL ASSÍNCRONO
const cache = require('./utils/cache'); // ✅ CACHE URGENTE
const jobQueue = require('./utils/jobQueue'); // ✅ JOBS ASSÍNCRONOS

// 3. INICIALIZAÇÃO
const app = express();

// ✅ Prisma Singleton (otimizado para pool de conexões)
// Usa singleton pattern para evitar múltiplas instâncias e controlar pool
const prisma = require('./utils/prisma');
const { dbCircuitBreaker } = require('./utils/circuitBreaker');

// 4. VARIÁVEIS DE AMBIENTE
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
// Ajuste crítico para Docker vs Localhost
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://ai-service:8000';
const AWESOME_API_URL = process.env.AWESOME_API_URL || 'https://economia.awesomeapi.com.br';

// Validação de Segurança
if (!JWT_SECRET) {
  console.warn('⚠️ AVISO: JWT_SECRET não configurado. Usando default inseguro para dev.');
}

// 5. MIDDLEWARES
// 🚨 INSERÇÃO START: Configuração para Deploy 🚨
app.use(cors({
  origin: true,       // Reflete a origem da requisição (aceita tudo)
  credentials: true,  // Permite cookies/headers de auth
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Rota para o Railway saber que o app está vivo
app.get('/', (req, res) => res.send('Backend Agro-AI Online 🚀'));

// Health check com verificação de banco e circuit breaker
app.get('/health', async (req, res) => {
  try {
    // Testa conexão com banco (com circuit breaker)
    await dbCircuitBreaker.execute(async () => {
      await prisma.$queryRaw`SELECT 1`;
    });
    
    res.json({ 
      status: 'ok',
      database: 'connected',
      circuit_breaker: dbCircuitBreaker.getState()
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'degraded',
      database: 'disconnected',
      error: error.message,
      circuit_breaker: dbCircuitBreaker.getState()
    });
  }
});
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// --- 🕵️‍♂️ MIDDLEWARE DE DEBUG (RAIO-X) ---
app.use((req, res, next) => {
  console.log(`\n📨 [DEBUG] Requisição recebida: ${req.method} ${req.url}`);
  console.log('🔑 Headers Content-Type:', req.headers['content-type']);
  console.log('📦 Body Recebido:', req.body);
  console.log('--------------------------------------------------');
  next();
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
    console.error("⚠️ Erro na API de Dólar:", error.message);
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
    
    const response = await axios.get(url);
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
// 🔐 ROTAS DE AUTENTICAÇÃO
// ============================================
if (authController) {
  app.post('/api/auth/register', verifyToken, checkRole(['admin']), authController.register);
  app.post('/api/auth/login', authController.login);
  app.post('/api/auth/refresh', authController.refreshToken);
}

// ============================================
// 📊 ROTAS DE NEGÓCIO (DADOS)
// ============================================

// 1. Listar Oportunidades (Com Dólar em Tempo Real)
// ✅ PERFORMANCE: Cache agressivo (5 minutos)
app.get('/api/opportunities', verifyToken, async (req, res) => {
  try {
    // ✅ CACHE: Verifica cache primeiro
    const cacheKey = 'opportunities:all';
    const cached = cache.get(cacheKey);
    
    if (cached) {
      console.log('⚡ Cache HIT: /api/opportunities');
      return res.json(cached);
    }

    console.log('🔍 Cache MISS: /api/opportunities - Buscando do banco...');
    
    // ✅ PERFORMANCE: Select apenas campos necessários (não busca tudo)
    // Busca Oportunidades e Dólar em paralelo (com circuit breaker)
    const [opportunities, dollarRate] = await Promise.all([
        dbCircuitBreaker.execute(async () => {
          return await prisma.opportunity.findMany({
            select: {
              id: true,
              product: true,
              category: true,
              city: true,
              state: true,
              lat: true,
              lng: true,
              buyPrice: true,
              sellPrice: true,
              sellLocation: true,
              roi: true,
              freight: true,
              bestRoute: true,
              volume: true,
              riskLevel: true,
              season: true,
              createdAt: true
            },
            orderBy: { createdAt: 'desc' }
          });
        }),
        getDollarRate() // Função que já existe no seu arquivo
    ]);
    
    console.log(`💵 Dólar Atual: R$ ${dollarRate}`);

const formattedOpportunities = opportunities.map(opp => {
      let buyPrice = parseFloat(opp.buyPrice);
      let sellPrice = parseFloat(opp.sellPrice);
      
      // --- CORREÇÃO DE UNIDADE (Defesa em Camada) ---
      // ⚠️ ATENÇÃO: Python agora salva TUDO em R$/kg
      // Mas pode haver dados antigos no banco em caixa (legado)
      // Se o preço for muito alto (> 20), provavelmente está em caixa e precisa normalizar
      // Se o preço for razoável (< 20), já está em kg
      if (buyPrice > 20) {
          // Dados antigos em caixa - normaliza para kg
          console.warn(`⚠️ [${opp.id}] buyPrice normalizado de caixa para kg: ${opp.buyPrice} -> ${buyPrice / 20}`);
          buyPrice /= 20;
      }
      if (sellPrice > 20) {
          // Dados antigos em caixa - normaliza para kg
          console.warn(`⚠️ [${opp.id}] sellPrice normalizado de caixa para kg: ${opp.sellPrice} -> ${sellPrice / 20}`);
          sellPrice /= 20;
      }

      // ✅ ROI e Freight DEVEM vir do Python (via banco ou cálculo em tempo real)
      // ❌ REMOVIDO: Fallback que calculava ROI no Node.js
      // Se ROI não existir, será null/0 e o frontend pode solicitar recálculo
      let roi = opp.roi ? parseFloat(opp.roi) : null;  // null se não calculado pelo Python
      let freight = opp.freight ? parseFloat(opp.freight) : null;  // null se não calculado pelo Python
      
      // ✅ SellPrice também deve vir do Python (via banco)
      // Se não existir, mantém o valor do banco ou null
      if (!sellPrice || sellPrice === 0) {
          sellPrice = null;  // Indica que precisa ser calculado pelo Python
      }

      return {
        id: opp.id,
        product: opp.product,
        dollarRate: dollarRate, 
        
        origin: { 
            city: opp.city, 
            state: opp.state 
        },
        
        destination: { 
            name: opp.sellLocation, 
            state: opp.sellLocation && opp.sellLocation.includes('-') 
                   ? opp.sellLocation.split('-').pop().trim() 
                   : 'BR'
        },
        
        financials: {
            buyPrice: parseFloat(buyPrice.toFixed(2)),   // Agora normalizado
            sellPrice: sellPrice ? parseFloat(sellPrice.toFixed(2)) : null, // Vem do Python ou null
            freight: freight ? parseFloat(freight.toFixed(2)) : null,       // Vem do Python ou null
            roi: roi ? parseFloat(roi.toFixed(1)) : null,                  // Vem do Python ou null
            currency: "BRL",
            needsCalculation: !roi || !sellPrice || !freight  // Flag: precisa calcular pelo Python?
        },
        
        coords: { 
            lat: parseFloat(opp.lat), 
            lng: parseFloat(opp.lng) 
        },
        
        details: {
            volume: opp.volume,
            riskLevel: opp.riskLevel,
            season: opp.season,
            isOptimized: opp.bestRoute 
        }
      };
    });
    
    // ✅ CACHE: Salva resultado no cache (5 minutos)
    cache.set(cacheKey, formattedOpportunities, 300);
    console.log(`💾 Cache SET: /api/opportunities (${formattedOpportunities.length} oportunidades)`);
    
    res.json(formattedOpportunities);
  } catch (error) {
    console.error("❌ Erro opportunities:", error);
    res.status(500).json({ error: 'Erro interno' });
  }
});

// ✅ NOVO: Endpoint para recalcular ROI pelo Python
app.post('/api/opportunities/:id/recalculate', verifyToken, async (req, res) => {
  try {
    const oppId = parseInt(req.params.id);
    
    // Busca a oportunidade no banco
    const opportunity = await prisma.opportunity.findUnique({
      where: { id: oppId }
    });
    
    if (!opportunity) {
      return res.status(404).json({ error: 'Oportunidade não encontrada' });
    }
    
    // Normaliza preço se necessário
    let buyPrice = parseFloat(opportunity.buyPrice);
    if (buyPrice > 20) buyPrice /= 20;
    
    // Chama Python para recalcular
    const payload = {
      product: opportunity.product,
      state: opportunity.state,
      city: opportunity.city,
      buyPrice: buyPrice,
      lat: parseFloat(opportunity.lat) || 0,
      lng: parseFloat(opportunity.lng) || 0
    };
    
    console.log(`🔄 Recalculando ROI pelo Python para oportunidade ${oppId}...`);
    const response = await axios.post(
      `${PYTHON_API_URL}/api/v1/calc/opportunity/recalculate`,
      payload
    );
    
    const pythonData = response.data;
    
    // Atualiza no banco
          await prisma.opportunity.update({
            where: { id: oppId },
            data: {
              roi: pythonData.roi,
              sellPrice: pythonData.sell_price,
              freight: pythonData.freight,
              sellLocation: pythonData.destination_name,
              bestRoute: true
            }
          });
          
          // ✅ CACHE: Invalida cache após update
          cache.invalidatePattern('opportunities:*');
    
    console.log(`✅ ROI recalculado: ${pythonData.roi}%`);
    
    res.json({
      success: true,
      message: 'ROI recalculado com sucesso',
      data: pythonData
    });
    
  } catch (error) {
    console.error("❌ Erro ao recalcular ROI:", error.message);
    res.status(500).json({ 
      error: 'Erro ao recalcular ROI',
      details: error.response?.data?.detail || error.message
    });
  }
});

// ✅ NOVO: Endpoint para calcular TODOS os ROIs (chama Python diretamente)
app.post('/api/opportunities/calculate-all-roi', verifyToken, async (req, res) => {
  try {
    console.log("🔄 Iniciando cálculo massivo de ROI pelo Python...");
    
    // Chama o endpoint Python que processa todas as oportunidades de uma vez
    const response = await axios.post(
      `${PYTHON_API_URL}/api/v1/admin/calculate-all-roi`,
      {},
      { timeout: 300000 }  // 5 minutos (pode demorar para muitas oportunidades)
    );
    
    const result = response.data;
    
    console.log(`✅ Cálculo concluído: ${result.updated} atualizados, ${result.errors} erros`);
    
    // ✅ CACHE: Invalida cache após cálculo em massa
    cache.invalidatePattern('opportunities:*');
    
    res.json({
      success: true,
      message: 'Cálculo de ROI concluído',
      ...result
    });
    
  } catch (error) {
    console.error("❌ Erro ao calcular ROI em massa:", error.message);
    res.status(500).json({ 
      error: 'Erro ao calcular ROI',
      details: error.response?.data?.detail || error.message
    });
  }
});

// ✅ NOVO: Endpoint para enriquecer oportunidades sem ROI (processa uma por uma)
app.post('/api/opportunities/enrich', verifyToken, async (req, res) => {
  try {
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
      // ✅ CACHE: Invalida cache após cálculo em massa
      cache.invalidatePattern('opportunities:*');
      
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
        if (buyPrice > 20) buyPrice /= 20;
        
        const payload = {
          product: opp.product,
          state: opp.state,
          city: opp.city,
          buyPrice: buyPrice,
          lat: parseFloat(opp.lat) || 0,
          lng: parseFloat(opp.lng) || 0
        };
        
        const response = await axios.post(
          `${PYTHON_API_URL}/api/v1/calc/opportunity/recalculate`,
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
    
    res.json({
      success: true,
      message: `Processamento concluído`,
      processed,
      errors,
      total: opportunities.length
    });
    
  } catch (error) {
    console.error("❌ Erro ao enriquecer oportunidades:", error.message);
    res.status(500).json({ 
      error: 'Erro ao enriquecer oportunidades',
      details: error.message
    });
  }
});

// --- ROTA ATUALIZADA ---
app.get('/api/weather', verifyToken, async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Lat/Lng obrigatórios' });
  
  const data = await getWeatherFull(lat, lng);
  
  if (data) {
    res.json(data); // Retorna { forecast: [...], current: {...} }
  } else {
    res.status(500).json({ error: 'Dados climáticos indisponíveis' });
  }
});

// 3. Histórico e Tendências (Analytics)
app.get('/api/analytics/trend', verifyToken, async (req, res) => {
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
    console.error("Erro Trend:", error);
    res.status(500).json({ error: 'Erro ao buscar tendência' });
  }
});

// 1. Armazenagem (Storage Advisor) - VERSÃO BLINDADA DEFINITIVA
app.post('/api/ai/storage', verifyToken, async (req, res) => {
  try {
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
    const response = await axios.post(
      `${PYTHON_API_URL}/predict/storage`, 
      safePayload,
      { timeout: 60000 } // 60 segundos (análise climática pode demorar)
    );
    
    // Tratamento da resposta para evitar erro no Front
    const pyData = response.data || {};
    const formattedData = {
        ...(pyData.chart_data || {}),
        recommendation: pyData.recommendation || {}
    };

    res.json(formattedData);

  } catch (error) {
    const errorDetail = error.response?.data?.detail || error.message;
    console.error("❌ Erro Node Storage:", JSON.stringify(errorDetail));
    // Retorna 500 mas com JSON válido para o front não crashar feio
    res.status(500).json({ error: 'Erro IA', details: errorDetail });
  }
});

// 2. Processamento em Lote (Batch) - VERSÃO DEBUG X9 🕵️‍♂️
app.post('/api/ai/batch', verifyToken, async (req, res) => {
  try {
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

    const response = await axios.post(`${PYTHON_API_URL}/api/v1/predict/batch`, { items: sanitizedItems }, { timeout: 60000 });
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
    const response = await axios.get(`${PYTHON_API_URL}/api/v1/predict/fuel`);
    // O Dashboard espera array ou objeto, mandamos direto
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro Fuel Geral:", error.message);
    res.json([]); 
  }
});

// 4. Preço de Combustível POR ESTADO (A Rota que faltava para FuelPriceDisplay.jsx)
app.get('/api/fuel/price/:state', verifyToken, async (req, res) => {
  try {
    const state = req.params.state.toLowerCase();
    
    // 1. Buscamos TODOS os dados do Python (é mais seguro que tentar adivinhar endpoint específico)
    const response = await axios.get(`${PYTHON_API_URL}/predict/fuel`, {
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
app.post('/calc/production', verifyToken, async (req, res) => {
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

    const response = await axios.post(
      `${PYTHON_API_URL}/api/v1/calc/production`, 
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
app.post('/calc/arbitrage', verifyToken, async (req, res) => {
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
    const response = await axios.post(
      `${PYTHON_API_URL}/api/v1/calc/arbitrage`, 
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
// 6. Radar de Mercado
app.post('/market/scan', verifyToken, async (req, res) => {
  try {
    const response = await axios.post(
      `${PYTHON_API_URL}/api/v1/predict/market/scan`, 
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
    console.log(`🔧 Admin ${req.user.email} solicitando correção de dados ao Python...`);
    const response = await axios.post(
      `${PYTHON_API_URL}/admin/fix-market-data`,
      {},
      { timeout: 120000 } // 120 segundos (operação admin pode demorar muito)
    );
    res.json(response.data);
  } catch (error) {
    console.error("Erro Admin Fix:", error.message);
    res.status(500).json({ error: 'Erro ao executar rotina de correção.' });
  }
});

// ============================================
// 🥬 ROTAS ESPECÍFICAS (CEASA)
// ============================================
app.use('/api/ceasa', ceasaRoutes);
app.use('/api/admin/etl', etlRoutes); // ✅ ETL ASSÍNCRONO

// ============================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log('🔥 BACKEND AGRO-AI - MODO TECH LEAD ATIVADO NA PORTA ' + PORT);
  console.log(`🔗 Conectado ao Python em: ${PYTHON_API_URL}`);
});