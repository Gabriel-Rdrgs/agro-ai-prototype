// frontend/src/services/storageService.js

import api from './api'; // ✅ Usa a instância principal do backend Node.js

export const StorageService = {
  /**
   * Simula cenário de armazenagem com análise de volatilidade climática.
   * Endpoint: POST /api/ai/storage (via backend Node.js)
   * 
   * @param {Object} data - Dados do cenário
   * @returns {Promise<Object>} Resultado da simulação
   */
  simulateScenario: async (data) => {
    // Normaliza o payload para o formato esperado pelo backend
    const payload = {
      product: data.product || 'Tomate',
      state: data.state || 'SP',
      current_price: parseFloat(data.current_price || data.currentPrice || 0),
      buy_price: parseFloat(data.buy_price || data.buyPrice || 0),
      storage_cost_per_day: parseFloat(data.storage_cost_per_day || data.storageCost || 0.03),
      accumulated_rainfall: parseFloat(data.accumulated_rainfall || data.rain || 0),
      daily_rain: Array.isArray(data.daily_rain || data.rainData) 
        ? (data.daily_rain || data.rainData) 
        : [],
      lat: parseFloat(data.lat || 0),
      lng: parseFloat(data.lng || 0)
    };

    try {
      console.log("📡 Enviando simulação para IA:", payload);
      
      // ✅ Chama /api/ai/storage (baseURL já inclui /api)
      const response = await api.post('/ai/storage', payload, {
        timeout: 90000 // 90 segundos para análise climática
      });
      
      console.log("✅ Resposta da IA (Volatilidade):", response.data);
      return response.data;
      
    } catch (error) {
      console.error("❌ Erro na Simulação:", error);
      console.error("   Status:", error.response?.status);
      console.error("   Detalhes:", error.response?.data || error.message);
      console.error("   Payload enviado:", payload);

      // Tratamento específico para timeout
      if (error.code === 'ECONNABORTED') {
        throw new Error('⏱️ Análise de armazenagem excedeu o tempo limite. Tente novamente.');
      }

      // Tratamento para erros HTTP específicos
      if (error.response?.status === 404) {
        throw new Error('🚫 Endpoint de armazenagem não encontrado. Verifique se o backend está rodando.');
      }

      if (error.response?.status === 500) {
        throw new Error('⚠️ Erro interno no servidor. Tente novamente em alguns instantes.');
      }

      if (error.response?.status === 503) {
        throw new Error('🔧 Serviço de IA temporariamente indisponível. Tente novamente.');
      }

      // Retorna mensagem de erro amigável
      const errorMessage = 
        error.response?.data?.detail || 
        error.response?.data?.error || 
        error.response?.data?.message || 
        error.message || 
        "Erro desconhecido ao simular armazenagem";
      
      throw new Error(errorMessage);
    }
  }
};
