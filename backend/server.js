// backend/server.js
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();

app.use(cors()); // Permite que o Frontend (porta 3000) acesse aqui
app.use(express.json()); // Permite receber JSON

// Rota de Teste
app.get('/', (req, res) => {
  res.send('🚀 AgroArbitrage API está rodando!');
});

// Rota para buscar oportunidades (Vai substituir o mock)
app.get('/api/opportunities', async (req, res) => {
  try {
    const opportunities = await prisma.opportunity.findMany();
    res.json(opportunities);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar oportunidades' });
  }
});

const PORT = 3001; // Vamos rodar na porta 3001 para não brigar com o React (3000)
app.listen(PORT, () => {
  console.log(`🔥 Servidor rodando em http://localhost:${PORT}`);
});