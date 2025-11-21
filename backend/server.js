// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const authController = require('./authController');
const authMiddleware = require('./authMiddleware'); // Importante: Proteção

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
app.post('/api/auth/register', authController.register);
app.post('/api/auth/login', authController.login);

// --- ROTAS DE NEGÓCIO ---

// 1. Oportunidades
app.get('/api/opportunities', authMiddleware, async (req, res) => {
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
app.get('/api/weather', authMiddleware, async (req, res) => {
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

app.post('/api/ai/storage', authMiddleware, async (req, res) => {
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
app.listen(PORT, () => {
  console.log(`🔥 Servidor Node rodando em http://localhost:${PORT}`);
});