// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const authController = require('./authController');
const { verifyToken, checkRole } = require('./authMiddleware'); // Importante: Proteção

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- FUNÇÕES AUXILIARES ---
async function getDollarRate() {
  try {
    const response = await axios.get('https://economia.awesomeapi.com.br/last/USD-BRL');
    return parseFloat(response.data.USDBRL.bid);
  } catch (error) {
    console.error("Erro dólar:", error.message);
    return 5.50;
  }
}

async function getWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=America%2FSao_Paulo`;
    const response = await axios.get(url);
    return response.data.current_weather;
  } catch (error) {
    return null;
  }
}

// --- ROTAS DE AUTH ---
app.post('/api/auth/register', verifyToken, checkRole(['admin']), authController.register); // Protegido (Só Admin cria)
app.post('/api/auth/login', authController.login);
app.post('/api/auth/refresh', authController.refreshToken);
// --- ROTAS DE NEGÓCIO ---

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
// backend/server.js

app.post('/api/ai/storage', verifyToken, checkRole(['admin', 'premium']), async (req, res) => {
  try {
    const PYTHON_API_URL = process.env.PYTHON_API_URL || 'http://localhost:8000';
    
    // 🕵️‍♂️ ESPIÃO: O que exatamente estamos mandando?
    console.log("📦 BODY RECEBIDO DO FRONTEND:", JSON.stringify(req.body, null, 2));

    const response = await axios.post(`${PYTHON_API_URL}/predict/storage`, req.body);
    
    res.json(response.data);

  } catch (error) {
    // ... erro ...
  }
});

const PORT = 3001;
// 4. ROTA DE HISTÓRICO (Com Filtros Dinâmicos)
app.get('/api/analytics/trend', verifyToken, async (req, res) => {
  try {
    const { product, city } = req.query; // Lê os filtros da URL (?product=X&city=Y)

    // Monta o filtro dinâmico para o Prisma
    const whereCondition = {};
    if (product) whereCondition.product = product;
    if (city) whereCondition.city = city;

    // Busca histórico filtrado pela oportunidade relacionada
    const history = await prisma.priceHistory.findMany({
      where: {
        opportunity: whereCondition // Filtra dentro da relação "opportunity"
      },
      orderBy: { createdAt: 'asc' },
      // take: 100 // (Opcional: removi o limite para garantir que o gráfico pegue o período todo se filtrar)
    });

    // Agrupa por data (Média do dia para os filtros selecionados)
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
app.listen(PORT, () => {
  console.log(`🔥 Servidor Node rodando em http://localhost:${PORT}`);
});