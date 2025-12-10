// Script Node.js para testar endpoints rapidamente
const axios = require('axios');

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Configuração - AJUSTE AQUI SEU EMAIL E SENHA
const EMAIL = process.env.TEST_EMAIL || 'admin@example.com';
const PASSWORD = process.env.TEST_PASSWORD || 'admin123';

async function testEndpoints() {
  console.log('🧪 TESTANDO ENDPOINTS DE PROJEÇÕES\n');
  console.log('='.repeat(50));
  console.log('');

  try {
    // 1. Login
    console.log('1️⃣ Fazendo login...');
    const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });

    const token = loginRes.data.accessToken;
    if (!token) {
      console.error('❌ Erro: Token não recebido');
      console.log('Response:', loginRes.data);
      return;
    }
    console.log('✅ Login realizado!\n');

    // 2. Testar histórico
    console.log('2️⃣ GET /api/ceasa/historical?product=Tomate&limit=3');
    try {
      const histRes = await axios.get(`${BACKEND_URL}/api/ceasa/historical`, {
        params: { product: 'Tomate', limit: 3 },
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Sucesso!');
      console.log(`   Total: ${histRes.data.count} registros`);
      if (histRes.data.data && histRes.data.data.length > 0) {
        const sample = histRes.data.data[0];
        console.log(`   Exemplo: ${sample.product_name} - R$ ${sample.price_avg} (${sample.data_type})`);
      }
    } catch (e) {
      console.log('❌ Erro:', e.response?.data?.error || e.message);
    }
    console.log('');

    // 3. Testar projeções
    console.log('3️⃣ GET /api/ceasa/projections?product=Tomate&limit=3');
    try {
      const projRes = await axios.get(`${BACKEND_URL}/api/ceasa/projections`, {
        params: { product: 'Tomate', limit: 3 },
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Sucesso!');
      console.log(`   Total: ${projRes.data.count} registros`);
      if (projRes.data.count === 0) {
        console.log('   ℹ️ Nenhuma projeção encontrada (normal se não houver dados futuros)');
      }
    } catch (e) {
      console.log('❌ Erro:', e.response?.data?.error || e.message);
    }
    console.log('');

    // 4. Testar comparação
    console.log('4️⃣ GET /api/ceasa/compare/Tomate');
    try {
      const compareRes = await axios.get(`${BACKEND_URL}/api/ceasa/compare/Tomate`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('✅ Sucesso!');
      console.log(`   Históricos: ${compareRes.data.historical?.count || 0}`);
      console.log(`   Projeções: ${compareRes.data.projections?.count || 0}`);
      if (compareRes.data.comparison) {
        console.log(`   Diferença: ${compareRes.data.comparison.difference_percent}%`);
        console.log(`   Tendência: ${compareRes.data.comparison.trend}`);
      }
    } catch (e) {
      console.log('❌ Erro:', e.response?.data?.error || e.message);
    }
    console.log('');

    // 5. Testar validação Python
    console.log('5️⃣ GET /api/v1/projections/compare/Tomate (Python)');
    try {
      const validateRes = await axios.get(`${AI_SERVICE_URL}/api/v1/projections/compare/Tomate`, {
        params: { region: 'SP' }
      });
      console.log('✅ Sucesso!');
      if (validateRes.data.success) {
        console.log(`   Comparações: ${validateRes.data.comparison?.total_comparisons || 0}`);
        console.log(`   Diferença média: ${validateRes.data.comparison?.average_difference_percent || 0}%`);
        console.log(`   Alertas: ${validateRes.data.alerts?.length || 0}`);
      }
    } catch (e) {
      console.log('❌ Erro:', e.response?.data?.detail || e.message);
      if (e.response?.status === 404) {
        console.log('   ℹ️ Endpoint pode não estar registrado ainda');
      }
    }
    console.log('');

    console.log('✅ Testes concluídos!');

  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testEndpoints();
