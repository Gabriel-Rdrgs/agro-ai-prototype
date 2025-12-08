// frontend/src/services/opportunityService.js
import axios from 'axios';

// --- CÓDIGO EXISTENTE (NÃO MEXA) ---
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
    baseURL: API_URL
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});
// -----------------------------------

// 🔥 ADICIONE ISTO AQUI (NOVA CONEXÃO SÓ PARA O PYTHON)
const aiApi = axios.create({
    baseURL: 'http://localhost:8000/api/v1', // Porta 8000 (Python)
    timeout: 20000 // 20 segundos
});

const handleAuthError = (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.warn("Sessão expirada.");
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return true;
    }
    return false;
};

export const OpportunityService = {
  // --- LISTAGEM ---
  getAll: async () => {
    try {
        const response = await api.get('/api/opportunities');
        return response.data; 
    } catch (error) {
        if (!handleAuthError(error)) console.error("Erro getAll:", error);
        return [];
    }
  },

  create: async (opportunity) => {
    try {
        const response = await api.post('/api/opportunities', opportunity);
        return response.data;
    } catch (error) {
        handleAuthError(error);
        throw error;
    }
  },

//CALCULADORAS (Corrigido: scanMarket adicionado!)
  calculateArbitrage: async (data) => {
    try {
        const response = await api.post('/calc/arbitrage', data);
        return response.data;
    } catch (error) {
        console.error("Erro Arbitragem:", error);
        throw error;
    }
  },

  calculateProduction: async (data) => {
    try {
        const response = await api.post('/calc/production', data);
        return response.data;
    } catch (error) {
        console.error("Erro Produção:", error);
        throw error;
    }
  },
  scanMarket: async (product, origin_state, volume, month) => {
    try {
        const payload = { product, origin_state, volume, month };
        const response = await api.post('/market/scan', payload);
        return response.data;
    } catch (error) {
        console.error("Erro Scan:", error);
        return null;
    }
  },

  // 2. IA DE ARMAZENAGEM (Corrigido para 'getStorageAnalysis')
  getStorageAnalysis: async (product, state, current_price, buy_price, risk_factor, daily_rain, daily_temp_max, daily_sun, daily_temp_min, lat, lng) => {
    try {
        // Monta o payload exatamente como o backend espera
        const payload = {
            product, state, 
            current_price, buy_price, 
            risk_factor, 
            daily_rain, daily_temp_max, daily_sun, daily_temp_min,
            lat, lng
        };
        const response = await api.post('/api/ai/storage', payload);
        return response.data;
    } catch (error) {
        handleAuthError(error);
        throw error;
    }
  },

  // 3. SLIDER TEMPORAL (Mantido 'calculateBatchAI' pois já ajustamos o App.js)
  calculateBatchAI: async (items) => {
    try {
        const response = await api.post('/api/ai/batch', { items });
        return response.data;
    } catch (error) {
        console.error("Erro Batch AI:", error);
        return null;
    }
  },

// 4. PREVISÃO DO TEMPO (Alterado para usar aiApi na porta 8000)
  getForecast: async (lat, lng) => {
      try {
          // Usa a conexão 'aiApi' que criamos acima
          const response = await aiApi.get('/weather/forecast', {
              params: { lat, lng }
          });
          
          // Retorna os dados diretos (o Python já manda no formato { data: ... })
          return response.data; 
      } catch (error) {
          console.error("Erro getForecast (IA):", error);
          return null;
      }
  },
  
  getCurrentWeather: async (lat, lng) => {
      try {
          const response = await api.get(`/api/weather`, { params: { lat, lng } });
          return response.data.current || null;
      } catch (error) {
          return null;
      }
  },

  // 5. DADOS COMPLEMENTARES
  getFuelPrices: async () => {
    try {
      const response = await api.get('/api/fuel/current-prices');
      return response.data;
    } catch (error) {
      console.error("Erro Fuel:", error);
      return null;
    }
  },

  getPriceTrend: async (product, city) => {
    try {
      const response = await api.get('/api/analytics/trend', {
        params: { product, city }
      });
      return response.data;
    } catch (error) {
      console.error("Erro Trend:", error);
      return null;
    }
  }
};