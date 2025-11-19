// backend/server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios'); // <--- Importamos o Axios
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors());
app.use(express.json());

// --- FUNÇÕES AUXILIARES (Inteligência Externa) ---

// 1. Busca Dólar (AwesomeAPI)
async function getDollarRate() {
  try {
    const response = await axios.get('https://economia.awesomeapi.com.br/last/USD-BRL');
    return parseFloat(response.data.USDBRL.bid);
  } catch (error) {
    console.error("Erro ao buscar dólar:", error.message);
    return 5.50; // Fallback seguro se a API cair
  }
}

// 2. Busca Clima (OpenMeteo - Gratuito e sem chave)
async function getWeather(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true&timezone=America%2FSao_Paulo`;
    const response = await axios.get(url);
    return {
      temp: response.data.current_weather.temperature,
      code: response.data.current_weather.weathercode
    };
  } catch (error) {
    return null; // Sem clima se der erro
  }
}

// --- ROTAS ---

app.get('/', (req, res) => {
  res.send('🚀 AgroArbitrage API (Com Dados Reais) está rodando!');
});

// Rota Principal: Oportunidades + Dados Vivos
app.get('/api/opportunities', async (req, res) => {
  try {
    // 1. Busca dados estáticos no Banco (SQLite)
    const opportunities = await prisma.opportunity.findMany();

    // 2. Busca dados vivos (Dólar) - Uma vez só para todos
    const dollarRate = await getDollarRate();

    // 3. Enriquecimento (Mistura Banco + Mundo Real)
    // Nota: Num app real, faríamos cache do clima. Aqui faremos sob demanda simplificada.
    // Para não ficar lento, vamos injetar apenas o Dólar agora e deixar o clima para um endpoint de detalhe,
    // OU pegar o clima apenas para as primeiras oportunidades para não travar o load.
    
    const enrichedOpportunities = opportunities.map(opp => ({
      ...opp,
      // Adicionamos campos virtuais calculados
      priceUsd: parseFloat((opp.sellPrice / dollarRate).toFixed(2)),
      dollarRate: dollarRate, // Mandamos a cotação junto para o front saber
    }));

    res.json(enrichedOpportunities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar oportunidades' });
  }
});

// Rota Nova: Clima em Tempo Real (Chamada pelo Frontend quando clica no mapa)
app.get('/api/weather', async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: 'Lat/Lng obrigatórios' });

  const weather = await getWeather(lat, lng);
  res.json(weather || { temp: 'N/A', condition: 'Indisponível' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🔥 Servidor Inteligente rodando em http://localhost:${PORT}`);
});