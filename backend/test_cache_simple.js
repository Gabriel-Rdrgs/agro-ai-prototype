// Teste simples de cache e performance
const axios = require('axios');

const BACKEND_URL = 'http://localhost:3001';

async function testCache() {
  try {
    console.log('🧪 TESTE DE CACHE E PERFORMANCE\n');
    
    // 1. Login
    console.log('1️⃣ Fazendo login...');
    const loginRes = await axios.post(`${BACKEND_URL}/api/auth/login`, {
      email: 'admin@agro.com',
      password: '123456'
    });
    
    const token = loginRes.data.token;
    if (!token) {
      console.log('❌ Falha no login');
      return;
    }
    console.log('✅ Login realizado\n');
    
    // 2. Request 1 (sem cache)
    console.log('2️⃣ Request 1 (deve ser MISS - busca do banco)...');
    const start1 = Date.now();
    const res1 = await axios.get(`${BACKEND_URL}/api/opportunities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const time1 = Date.now() - start1;
    console.log(`   Tempo: ${time1}ms`);
    console.log(`   Oportunidades: ${res1.data.length}\n`);
    
    // 3. Request 2 (com cache)
    console.log('3️⃣ Request 2 (deve ser HIT - do cache)...');
    const start2 = Date.now();
    const res2 = await axios.get(`${BACKEND_URL}/api/opportunities`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const time2 = Date.now() - start2;
    console.log(`   Tempo: ${time2}ms`);
    console.log(`   Oportunidades: ${res2.data.length}\n`);
    
    // 4. Análise
    if (time2 < time1) {
      const improvement = Math.round((1 - time2 / time1) * 100);
      console.log(`✅ CACHE FUNCIONANDO!`);
      console.log(`   Melhoria: ~${improvement}% mais rápido`);
      console.log(`   Redução: ${time1 - time2}ms\n`);
    } else {
      console.log(`⚠️ Cache pode não estar funcionando`);
      console.log(`   Tempo similar: ${time1}ms vs ${time2}ms\n`);
    }
    
    // 5. Teste ETL Assíncrono
    console.log('4️⃣ Testando ETL Assíncrono...');
    try {
      const etlRes = await axios.post(
        `${BACKEND_URL}/api/admin/etl/start`,
        { type: 'market', skipIbge: true },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      const jobId = etlRes.data.jobId;
      console.log(`✅ ETL iniciado (Job ID: ${jobId})`);
      
      // Aguarda 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verifica status
      const statusRes = await axios.get(
        `${BACKEND_URL}/api/admin/etl/status/${jobId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      console.log(`   Status: ${statusRes.data.status}`);
      console.log(`   Progresso: ${statusRes.data.progress}%`);
      
      if (statusRes.data.status === 'running' || statusRes.data.status === 'completed') {
        console.log('✅ ETL ASSÍNCRONO FUNCIONANDO!\n');
      }
    } catch (etlError) {
      console.log(`⚠️ Erro no ETL: ${etlError.response?.data?.error || etlError.message}\n`);
    }
    
    console.log('📊 RESUMO:');
    console.log(`   Request 1 (sem cache): ${time1}ms`);
    console.log(`   Request 2 (com cache): ${time2}ms`);
    console.log(`   Melhoria: ~${Math.round((1 - time2 / time1) * 100)}%`);
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testCache();
