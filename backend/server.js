// ============================================
// 🔐 CARREGAR VARIÁVEIS DE AMBIENTE (PRIMEIRA COISA!)
// ============================================
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const authController = require('./authController');
const { verifyToken, checkRole } = require('./authMiddleware');
const ceasaRoutes = require('./routes/ceasa');

const app = express();
const prisma = new PrismaClient();

// ============================================
// ⚙️ VARIÁVEIS DE AMBIENTE (DEFINIR UMA VEZ)
// ============================================
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';
const AWESOME_API_URL = process.env.AWESOME_API_URL || 'https://economia.awesomeapi.com.br';

// Validação
if (!JWT_SECRET) {
  console.error('❌ ERRO: JWT_SECRET não configurado no .env');
  process.exit(1);
}

// ============================================
// 🛠️ MIDDLEWARE
// ============================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// ============================================
// 📊 FUNÇÕES AUXILIARES
// ============================================

async function getDollarRate() {
  try {
    const response = await axios.get(`${AWESOME_API_URL}/last/USD-BRL`);
    return parseFloat(response.data.USDBRL.bid);
  } catch (error) {
    console.error("Erro dólar:", error.message);
    return 5.50;
  }
}

async function getWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=America/Sao_Paulo`;
    const response = await axios.get(url);
    return response.data.current_weather;
  } catch (error) {
    return null;
  }
}

// ============================================
// 🔑 ROTAS DE AUTH
// ============================================

app.post('/api/auth/register', verifyToken, checkRole(['admin']), authController.register);
app.post('/api/auth/login', authController.login);
app.post('/api/auth/refresh', authController.refreshToken);

// ============================================
// 📊 ROTAS DE NEGÓCIO
// ============================================

// 1. Oportunidades
app.get('/api/opportunities', verifyToken, async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany();
    const dollarRate = await getDollarRate();
    const enrichedOpportunities = opportunities.map(opp => ({
      ...opp,
      priceUsd: parseFloat((opp.sellPrice / dollarRate).toFixed(2)),
      dollarRate: dollarRate,
    }));
    res.json(enrichedOpportunities);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar oportunidades' });
  }
});

// 2. Clima
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

// 3. 🚀 ROTA DE IA (Proxy para o Python)
app.post('/api/ai/storage', verifyToken, checkRole(['admin', 'premium']), async (req, res) => {
  try {
    console.log("📦 BODY RECEBIDO DO FRONTEND:", JSON.stringify(req.body, null, 2));
    // ❌ NÃO REDEFINA PYTHON_API_URL aqui! Já está definida lá em cima
    const response = await axios.post(`${PYTHON_API_URL}/predict/storage`, req.body);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao processar IA' });
  }
});

// 4. NOVA ROTA: Ponte para a Calculadora de Produção (Node -> Python)
app.post('/calc/production', verifyToken, async (req, res) => {
  try {
    // Repassa o pedido para o Python
    const response = await axios.post(`${PYTHON_API_URL}/calc/production`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Erro na ponte de produção:", error.message);
    res.status(500).json({ error: 'Erro ao conectar com serviço de cálculo.' });
  }
});

// backend/server.js
app.post('/calc/arbitrage', verifyToken, async (req, res) => {
  try {
    // Repassa o pedido para o Python (IA)
    const response = await axios.post(`${PYTHON_API_URL}/calc/arbitrage`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Erro Arbitragem:", error.message);
    res.status(500).json({ error: 'Erro no cálculo de arbitragem.' });
  }
});
app.post('/market/scan', verifyToken, async (req, res) => {
  try {
    // Repassa o pedido para o serviço Python
    const response = await axios.post(`${PYTHON_API_URL}/market/scan`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Erro no Radar de Mercado:", error.message);
    res.status(500).json({ error: 'Erro ao processar radar de mercado.' });
  }
});
// 👇 ROTA NOVA: Proxy para buscar preços de combustível no Python
app.get('/api/fuel/current-prices', verifyToken, async (req, res) => {
  try {
    const response = await axios.get(`${PYTHON_API_URL}/api/fuel/current-prices`);
    res.json(response.data);
  } catch (error) {
    console.error("Erro Fuel:", error.message);
    res.status(500).json({ error: 'Erro ao buscar preços de combustível' });
  }
});
// 5. ROTA DE HISTÓRICO (Com Filtros Dinâmicos)
app.get('/api/analytics/trend', verifyToken, async (req, res) => {
  try {
    const { product, city } = req.query;
    const whereCondition = {};
    if (product) whereCondition.product = product;
    if (city) whereCondition.city = city;
    const history = await prisma.priceHistory.findMany({
      where: {
        opportunity: whereCondition
      },
      orderBy: { createdAt: 'asc' },
    });
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
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar tendência' });
  }
});

app.post('/api/ai/batch', verifyToken, async (req, res) => {
  try {
    const response = await axios.post(`${PYTHON_API_URL}/predict/batch`, req.body);
    res.json(response.data);
  } catch (error) {
    console.error("Erro Batch:", error.message);
    res.status(500).json({ error: 'Erro ao processar lote' });
  }
});

// ============================================
// 📈 ROTAS DE CEASA
// ============================================
app.use('/api/ceasa', ceasaRoutes);

// ============================================
// 🚀 INICIAR SERVIDOR
// ============================================

app.listen(PORT, () => {
  console.log(`🔥 Servidor Node rodando em http://localhost:${PORT}`);
});
