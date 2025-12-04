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

// 3. INICIALIZAÇÃO
const app = express();
const prisma = new PrismaClient();

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
app.use(cors({
  origin: '*', 
  credentials: true
}));
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
app.get('/api/opportunities', verifyToken, async (req, res) => {
  try {
    // Busca Oportunidades e Dólar em paralelo
    const [opportunities, dollarRate] = await Promise.all([
        prisma.opportunity.findMany({ orderBy: { createdAt: 'desc' } }),
        getDollarRate() // Função que já existe no seu arquivo
    ]);
    
    console.log(`💵 Dólar Atual: R$ ${dollarRate}`);

const formattedOpportunities = opportunities.map(opp => {
      let buyPrice = parseFloat(opp.buyPrice);
      let sellPrice = parseFloat(opp.sellPrice);
      
      // --- CORREÇÃO DE UNIDADE (Defesa em Camada) ---
      // Se o preço do "quilo" for maior que R$ 20,00, com certeza é Caixa de 20kg ou 25kg.
      // Normalizamos dividindo por 20 para padronizar tudo em Kg.
      if (buyPrice > 20) buyPrice /= 20;
      if (sellPrice > 20) sellPrice /= 20;

      // Fallback Inteligente de ROI
      let roi = opp.roi ? parseFloat(opp.roi) : 0;
      let freight = opp.freight ? parseFloat(opp.freight) : 0;

      if (roi === 0 && buyPrice > 0) {
          // Estimativa se não tiver ROI gravado
          const estimatedCost = buyPrice * 1.2;
          const profit = sellPrice - estimatedCost;
          roi = (profit / estimatedCost) * 100;
          freight = buyPrice * 0.15;
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
            sellPrice: parseFloat(sellPrice.toFixed(2)), // Agora normalizado
            freight: parseFloat(freight.toFixed(2)),
            roi: parseFloat(roi.toFixed(1)),
            currency: "BRL"
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
    
    res.json(formattedOpportunities);
  } catch (error) {
    console.error("❌ Erro opportunities:", error);
    res.status(500).json({ error: 'Erro interno' });
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
    const response = await axios.post(`${PYTHON_API_URL}/predict/storage`, safePayload);
    
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

    const response = await axios.post(`${PYTHON_API_URL}/predict/batch`, { items: sanitizedItems }, { timeout: 60000 });
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
    const response = await axios.get(`${PYTHON_API_URL}/predict/fuel`);
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
    const response = await axios.get(`${PYTHON_API_URL}/predict/fuel`);
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

    const response = await axios.post(`${PYTHON_API_URL}/calc/production`, safePayload);
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
    const response = await axios.post(`${PYTHON_API_URL}/calc/arbitrage`, safePayload);
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
    const response = await axios.post(`${PYTHON_API_URL}/predict/market/scan`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Erro Ponte Radar:", error.message);
    res.status(500).json({ error: 'Erro ao processar radar de mercado.' });
  }
});

// 7. Admin: Correção de Dados
app.post('/api/admin/fix-data', verifyToken, async (req, res) => {
  try {
    console.log("🔧 Solicitando correção de dados ao Python...");
    const response = await axios.post(`${PYTHON_API_URL}/admin/fix-market-data`);
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

// ============================================
// 🚀 INICIALIZAÇÃO DO SERVIDOR
// ============================================
app.listen(PORT, () => {
  console.log('🔥 BACKEND AGRO-AI - MODO TECH LEAD ATIVADO NA PORTA ' + PORT);
  console.log(`🔗 Conectado ao Python em: ${PYTHON_API_URL}`);
});