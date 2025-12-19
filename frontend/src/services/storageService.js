// frontend/src/services/storageService.js
import api from './api'; // ✅ CORRIGIDO: Usa o backend Node.js, não o Python diretamente

export const StorageService = {
  /**
   * Pede para a IA simular o cenário de armazenagem com volatilidade climática.
   * Endpoint: POST /api/ai/storage (via backend Node.js)
   */
  simulateScenario: async (data) => {
    // Payload que o backend espera
    const payload = {
      product: data.product || 'Tomate',
      state: data.state || 'SP',
      current_price: parseFloat(data.current_price || data.currentPrice || 0) || 0,
      buy_price: parseFloat(data.buy_price || data.buyPrice || 0) || 0,
      storage_cost_per_day: parseFloat(data.storage_cost_per_day || data.storageCost || 0.03) || 0.03,
      accumulated_rainfall: parseFloat(data.accumulated_rainfall || data.rain || 0) || 0,
      daily_rain: Array.isArray(data.daily_rain || data.rainData) ? (data.daily_rain || data.rainData) : [],
      lat: parseFloat(data.lat || 0) || 0,
      lng: parseFloat(data.lng || 0) || 0
    };

    try {
      console.log("📡 Enviando simulação para IA:", payload);

      // ✅ CORRIGIDO: Chama o backend Node.js que faz proxy para o Python
      const response = await api.post('/ai/storage', payload, {
        timeout: 90000 // 90 segundos (análise climática pode demorar)
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
        throw new Error('Análise de armazenagem está demorando mais que o esperado. Tente novamente.');
      }
      
      // Retorna erro mais amigável
      const errorMessage = error.response?.data?.detail || error.response?.data?.error || error.response?.data?.message || error.message || "Erro desconhecido ao simular armazenagem";
      throw new Error(errorMessage);
    }
  }
};