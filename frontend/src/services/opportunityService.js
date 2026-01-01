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

// 🔥 CONEXÃO DIRETA COM A IA (PYTHON)
// Em produção, usa a variável do Vercel. Localmente, usa localhost.
// const PYTHON_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000'; // Não usado atualmente

// const aiApi = axios.create({
//     baseURL: `${PYTHON_URL}/api/v1`, 
//     timeout: 60000 
// }); // TODO: Usar quando necessário

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

  // ✅ Novo: Comparação de chuva (últimos N dias vs mesmo período do ano anterior)
  getRainComparison: async (lat, lng, days = 30) => {
    try {
      const response = await api.get('/api/weather/rain-comparison', {
        params: { lat, lng, days },
        timeout: 30000
      });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar comparação de chuva:', error);
      return null;
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
        const response = await api.post('/calc/arbitrage', data, {
          timeout: 90000 // 90 segundos (cálculo completo pode demorar)
        });
        return response.data;
    } catch (error) {
        console.error("Erro Arbitragem:", error);
        if (error.code === 'ECONNABORTED') {
          throw new Error('Tempo de espera esgotado. O cálculo está demorando mais que o esperado. Tente novamente.');
        }
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

  // ✅ NOVO: Buscar melhores oportunidades automaticamente
  getBestOpportunities: async (options = {}) => {
    try {
      const payload = {
        products: options.products || null,  // Se null, busca todos
        max_results: options.max_results || 10,
        min_roi: options.min_roi || null,
        month: options.month || null
      };
      
      const response = await api.post('/api/ai/best-opportunities', payload, {
        timeout: 120000 // 2 minutos
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar melhores oportunidades:", error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('A busca está demorando mais que o esperado. Tente reduzir o número de produtos.');
      }
      throw error;
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
        const response = await api.post('/api/ai/storage', payload, {
          timeout: 90000 // 90 segundos (análise climática pode demorar)
        });
        return response.data;
    } catch (error) {
        handleAuthError(error);
        if (error.code === 'ECONNABORTED') {
          throw new Error('Análise de armazenagem está demorando mais que o esperado. Tente novamente.');
        }
        throw error;
    }
  },

  // 3. SLIDER TEMPORAL (Mantido 'calculateBatchAI' pois já ajustamos o App.js)
  calculateBatchAI: async (items) => {
    try {
        const response = await api.post('/api/ai/batch', { items }, {
          timeout: 120000 // 120 segundos (processamento em lote pode demorar)
        });
        return response.data;
    } catch (error) {
        console.error("Erro Batch AI:", error);
        if (error.code === 'ECONNABORTED') {
          console.warn("⚠️ Processamento em lote demorou mais que 2 minutos.");
        }
        return null;
    }
  },

// 4. PREVISÃO DO TEMPO (Alterado para usar aiApi na porta 8000)
  getForecast: async (lat, lng) => {
      try {
          // ✅ OTIMIZADO: Chama através do backend Node.js (proxy para Python)
          // Isso permite melhor controle de timeout e cache
          const response = await api.get('/api/weather/forecast', {
              params: { lat, lng },
              timeout: 30000 // 30 segundos (backend tem 25s, dá margem)
          });
          
          // Valida a estrutura da resposta
          if (response.data && response.data.status === 'success' && response.data.data) {
              return response.data;
          } else if (response.data && (response.data.data || response.data.daily)) {
              // Fallback: se não tiver status, mas tiver data
              return response.data;
          } else {
              console.warn("⚠️ Estrutura de resposta inválida:", response.data);
              return null;
          }
      } catch (error) {
          console.error("❌ Erro getForecast (IA):", error.response?.data || error.message);
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

  // ✅ NOVO: Obter eventos extremos melhorados
  getExtremeEvents: async (lat, lng, days = 16) => {
    try {
      const response = await api.get('/api/weather/extreme-events', {
        params: { lat, lng, days },
        timeout: 40000 // 40 segundos (API Open-Meteo pode demorar)
      });
      return response.data;
    } catch (error) {
      // ✅ MELHORADO: Log apenas em debug para não poluir o console
      // Timeouts são esperados quando a API externa está lenta
      if (error.code === 'ECONNABORTED') {
        console.debug(`⏱️ Timeout ao buscar eventos extremos para ${lat},${lng} (API externa lenta)`);
      } else if (error.response?.status === 504) {
        console.debug(`⏱️ Gateway timeout ao buscar eventos extremos para ${lat},${lng}`);
      } else if (error.response?.status === 503) {
        console.debug(`🔌 Serviço Python indisponível ao buscar eventos extremos`);
      } else {
        console.debug(`⚠️ Erro ao buscar eventos extremos para ${lat},${lng}:`, error.message);
      }
      return null;
    }
  },

  // ✅ NOVO: Risco de Abastecimento (Regiões Comprometidas)
  getSupplyRisk: async (lat, lng, product = 'Tomate', days = 16) => {
    try {
      // ✅ OTIMIZADO: Retry logic para lidar com timeouts
      let lastError = null;
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await api.get('/api/weather/supply-risk', {
            params: { lat, lng, product, days },
            timeout: 70000 // 70 segundos (backend tem 60s, dá margem)
          });
          return response.data;
        } catch (error) {
          lastError = error;
          // Se não for timeout ou 504, não tenta novamente
          if (error.code !== 'ECONNABORTED' && error.response?.status !== 504) {
            throw error;
          }
          // Aguarda antes de tentar novamente (apenas na primeira tentativa)
          if (attempt === 0) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        }
      }
      throw lastError;
    } catch (error) {
      console.error("Erro ao buscar risco de abastecimento:", error);
      return null;
    }
  },

  // ✅ NOVO: Verificar eventos históricos (ex: granizo há 2 dias)
  getHistoricalExtremeEvents: async (lat, lng, daysBack = 7) => {
    try {
      const response = await api.get('/api/weather/extreme-events/historical', {
        params: { lat, lng, days_back: daysBack },
        timeout: 30000 // 30 segundos
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar eventos históricos:", error);
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
  },

  // ✅ NOVO: Buscar tendências de mercado completas (com médias móveis)
  getMarketTrends: async (product, region = null, days = 90) => {
    try {
      const params = new URLSearchParams({
        product,
        days: days.toString()
      });
      
      if (region) {
        params.append('region', region);
      }
      
      const response = await api.get(`/analytics/trends?${params.toString()}`);
      return response.data;
    } catch (error) {
      console.error("Erro Market Trends:", error);
      throw error;
    }
  },

  // ✅ NOVO: Calcular todos os ROIs
  calculateAllROI: async () => {
    try {
      const response = await api.post('/api/opportunities/calculate-all-roi');
      return response.data;
    } catch (error) {
      console.error("Erro ao calcular ROI:", error);
      throw error;
    }
  },

  // ✅ NOVO: Recalcular ROI de uma oportunidade específica
  recalculateROI: async (oppId) => {
    try {
      const response = await api.post(`/api/opportunities/${oppId}/recalculate`);
      return response.data;
    } catch (error) {
      console.error("Erro ao recalcular ROI:", error);
      throw error;
    }
  },

  // ✅ NOVO: Obter recomendação automática da IA
  getRecommendation: async (data) => {
    try {
      const response = await api.post('/api/ai/recommendation', data, {
        timeout: 30000 // 30 segundos
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao obter recomendação:", error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Recomendação está demorando mais que o esperado. Tente novamente.');
      }
      throw error;
    }
  },

  // ✅ NOVO: Obter histórico de preços de uma oportunidade
  getPriceHistory: async (opportunityId, days = 90) => {
    try {
      const response = await api.get(`/api/opportunities/${opportunityId}/history`, {
        params: { days },
        timeout: 30000 // 30 segundos
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao buscar histórico de preços:", error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Busca de histórico está demorando mais que o esperado. Tente novamente.');
      }
      throw error;
    }
  },

  // ✅ NOVO: Comparar múltiplas oportunidades
  compareOpportunities: async (opportunityIds) => {
    try {
      const response = await api.post('/api/opportunities/compare', {
        opportunityIds
      }, {
        timeout: 60000 // 60 segundos (pode incluir múltiplas chamadas à IA)
      });
      return response.data;
    } catch (error) {
      // ✅ MELHORADO: Log mais informativo e tratamento de erros específicos
      if (error.code === 'ECONNABORTED' || error.response?.status === 504) {
        console.warn('⏱️ Timeout ao comparar oportunidades. A IA pode estar processando muitas requisições.');
        throw new Error('Comparação está demorando mais que o esperado. Tente novamente.');
      } else if (error.response?.status === 503) {
        console.warn('🔌 Serviço Python indisponível ao comparar oportunidades.');
        throw new Error('Serviço de IA temporariamente indisponível. Tente novamente em alguns instantes.');
      } else if (error.response?.status === 404) {
        throw new Error('Uma ou mais oportunidades não foram encontradas.');
      } else {
        console.error("Erro ao comparar oportunidades:", error);
        throw error;
      }
    }
  },

  // ✅ NOVO: Simular cenário
  simulateScenario: async (opportunityId, scenarios) => {
    try {
      const response = await api.post(`/api/opportunities/${opportunityId}/simulate`, scenarios, {
        timeout: 30000 // 30 segundos
      });
      return response.data;
    } catch (error) {
      console.error("Erro ao simular cenário:", error);
      if (error.code === 'ECONNABORTED') {
        throw new Error('Simulação está demorando mais que o esperado. Tente novamente.');
      }
      throw error;
    }
  },

  // ✅ FASE B - B1: Exportação Excel Premium
  exportToExcel: async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      if (filters.product) params.append('product', filters.product);
      if (filters.state) params.append('state', filters.state);
      if (filters.minRoi) params.append('minRoi', filters.minRoi);
      if (filters.maxResults) params.append('maxResults', filters.maxResults);

      const token = localStorage.getItem('token');
      const response = await api.get(`/api/export/opportunities?${params.toString()}`, {
        responseType: 'blob',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Criar link de download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `oportunidades_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      return { success: true };
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      if (error.response?.status === 404) {
        throw new Error('Nenhuma oportunidade encontrada com os filtros especificados.');
      }
      throw new Error('Erro ao exportar oportunidades para Excel.');
    }
  }
};