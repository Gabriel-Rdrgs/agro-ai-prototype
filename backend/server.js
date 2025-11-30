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
  origin: '*', // Permite conexões de qualquer origem (útil para dev/mobile)
  credentials: true
}));
app.use(express.json());

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

// Busca Dados Climáticos (OpenMeteo)
async function getWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=America/Sao_Paulo`;
    const response = await axios.get(url);
    return response.data.current_weather;
  } catch (error) {
    console.error(`Erro clima (lat:${lat}, lng:${lng}):`, error.message);
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

// 1. Listar Oportunidades (Com conversão de moeda)
app.get('/api/opportunities', verifyToken, async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    const dollarRate = await getDollarRate();
    
    // Enriquecimento dos dados
    const enrichedOpportunities = opportunities.map(opp => ({
      ...opp,
      // Garante que Decimals virem Numbers para o Frontend
      buyPrice: parseFloat(opp.buyPrice),
      sellPrice: parseFloat(opp.sellPrice),
      lat: parseFloat(opp.lat),
      lng: parseFloat(opp.lng),
      destLat: opp.destLat ? parseFloat(opp.destLat) : null,
      destLng: opp.destLng ? parseFloat(opp.destLng) : null,
      // Cálculo em Dólar
      priceUsd: parseFloat((parseFloat(opp.sellPrice) / dollarRate).toFixed(2)),
      dollarRate: dollarRate,
    }));
    
    res.json(enrichedOpportunities);
  } catch (error) {
    console.error("❌ Erro ao buscar oportunidades:", error);
    res.status(500).json({ error: 'Erro interno ao buscar oportunidades' });
  }
});

// 2. Dados Climáticos (Proxy)
app.get('/api/weather', verifyToken, async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Lat/Lng obrigatórios' });
  
  const weatherData = await getWeather(lat, lng);
  if (weatherData) {
    res.json({
      temp: weatherData.temperature,
      code: weatherData.weathercode,
      wind: weatherData.windspeed
    });
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

// ============================================
// 🧠 ROTAS DE INTELIGÊNCIA ARTIFICIAL (PYTHON BRIDGE)
// ============================================

// 1. Armazenagem (Storage Advisor)
app.post('/api/ai/storage', verifyToken, async (req, res) => {
  try {
    // Log para debug
    console.log(`📤 Enviando para IA (Storage): ${req.body.product}`);
    
    // Rota correta no Python: /predict/storage
    const response = await axios.post(`${PYTHON_API_URL}/predict/storage`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro IA Storage:", error.message);
    res.status(500).json({ error: 'Erro ao processar inteligência de armazenagem' });
  }
});

// 2. Processamento em Lote (Mapa) - A ROTA QUE FALTAVA
app.post('/api/ai/batch', verifyToken, async (req, res) => {
  try {
    // Rota correta no Python: /predict/batch
    // Timeout maior (10s) pois processa múltiplos itens
    const response = await axios.post(`${PYTHON_API_URL}/predict/batch`, req.body, { timeout: 10000 });
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro IA Batch:", error.message);
    res.status(500).json({ error: 'Erro ao processar lote na IA' });
  }
});

// 3. Preços de Combustível (Fuel)
app.get('/api/fuel/current-prices', verifyToken, async (req, res) => {
  try {
    // Rota correta no Python: /predict/fuel
    const response = await axios.get(`${PYTHON_API_URL}/predict/fuel`);
    res.json(response.data);
  } catch (error) {
    console.error("❌ Erro IA Fuel:", error.message);
    res.status(500).json({ error: 'Erro ao buscar preços de combustível' });
  }
});

// 4. Calculadora de Produção
app.post('/calc/production', verifyToken, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_API_URL}/calc/production`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Erro Ponte Produção:", error.message);
    res.status(500).json({ error: 'Erro no serviço de cálculo.' });
  }
});

// 5. Calculadora de Arbitragem
app.post('/calc/arbitrage', verifyToken, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_API_URL}/calc/arbitrage`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Erro Ponte Arbitragem:", error.message);
    res.status(500).json({ error: 'Erro no cálculo de arbitragem.' });
  }
});

// 6. Radar de Mercado
app.post('/market/scan', verifyToken, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_API_URL}/market/scan`, req.body);
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
  console.log(`🔥 BACKEND v7.2 (FULL) RODANDO NA PORTA ${PORT}`);
  console.log(`🔗 Conectado ao Python em: ${PYTHON_API_URL}`);
});