// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // <--- O "Navegador" do servidor
const { PrismaClient } = require('@prisma/client');
const authController = require('./authController');
const authMiddleware = require('./authMiddleware');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- FUNÇÕES DE INTELIGÊNCIA (DADOS EXTERNOS) ---

// 1. Busca Dólar em Tempo Real (AwesomeAPI - Grátis e Confiável)
async function getDollarRate() {
  try {
    console.log('💵 Buscando cotação do Dólar...');
    const response = await axios.get('https://economia.awesomeapi.com.br/last/USD-BRL');
    const rate = parseFloat(response.data.USDBRL.bid);
    console.log(`✅ Dólar atual: R$ ${rate}`);
    return rate;
  } catch (error) {
    console.error("❌ Erro ao buscar dólar (usando fallback):", error.message);
    return 5.80; // Valor de segurança se a API cair
  }
}

// 2. Busca Clima (OpenMeteo - Gratuito)
async function getWeather(lat, lng) {
  try {
    // Busca temperatura atual e código do clima (chuva, sol, etc)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=America%2FSao_Paulo`;
    const response = await axios.get(url);
    return response.data.current_weather;
  } catch (error) {
    console.error("Erro ao buscar clima:", error.message);
    return null;
  }
}
// --- ROTAS DE AUTENTICAÇÃO ---
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);


// --- ROTAS DA API ---

app.get('/', (req, res) => {
  res.send('🚀 AgroArbitrage API (Inteligente) está rodando!');
});

// Rota Principal: Oportunidades + Dólar
app.get('/api/opportunities', authMiddleware, async (req, res) => {
  try {
    // 1. Busca dados no Banco Local (SQLite)
    const opportunities = await prisma.opportunity.findMany();

    // 2. Busca dados na Nuvem (Dólar)
    // Fazemos isso uma vez só para não travar a requisição
    const dollarRate = await getDollarRate();

    // 3. Enriquecimento de Dados
    const enrichedOpportunities = opportunities.map(opp => ({
      ...opp,
      // Adiciona o preço em Dólar calculado na hora
      priceUsd: parseFloat((opp.sellPrice / dollarRate).toFixed(2)),
      // Envia a cotação junto para o Frontend mostrar no Dashboard
      dollarRate: dollarRate, 
    }));

    res.json(enrichedOpportunities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro interno ao buscar oportunidades' });
  }
});

// Rota de Detalhe: Clima Local (Chamada quando clica no mapa)
app.get('/api/weather', authMiddleware, async (req, res) => {
  const { lat, lng } = req.query;

  if (!lat || !lng) {
    return res.status(400).json({ error: 'Latitude e Longitude são obrigatórias' });
  }

  const weatherData = await getWeather(lat, lng);
  
  if (weatherData) {
    res.json({
      temp: weatherData.temperature,
      code: weatherData.weathercode, // Código WMO (ex: 0 = Céu Limpo, 61 = Chuva)
      wind: weatherData.windspeed
    });
  } else {
    res.status(500).json({ error: 'Dados climáticos indisponíveis' });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🔥 Servidor Inteligente rodando em http://localhost:${PORT}`);
});