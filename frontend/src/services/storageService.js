// frontend/src/services/storageService.js
import { aiApi } from './api'; 

export const StorageService = {
  /**
   * Pede para a IA simular o cenário de armazenagem com volatilidade climática.
   * Endpoint: POST /predict/storage
   */
  simulateScenario: async (data) => {
    // Payload que o Python espera (SimulationRequest)
    // Suporta tanto camelCase quanto snake_case para compatibilidade
    const payload = {
      product: data.product || 'Tomate',
      state: data.state || 'SP',
      // Garante numérico para evitar erro de validação no Pydantic
      current_price: parseFloat(data.current_price || data.currentPrice || 0) || 0,
      buy_price: parseFloat(data.buy_price || data.buyPrice || 0) || 0,
      storage_cost_per_day: parseFloat(data.storage_cost_per_day || data.storageCost || 0.03) || 0.03,
      accumulated_rainfall: parseFloat(data.accumulated_rainfall || data.rain || 0) || 0,
      // ✅ DADOS CLIMÁTICOS REAIS por estado
      daily_rain: Array.isArray(data.daily_rain || data.rainData) ? (data.daily_rain || data.rainData) : [],
      lat: parseFloat(data.lat || 0) || 0,
      lng: parseFloat(data.lng || 0) || 0
    };

    try {
      console.log("📡 Enviando simulação para IA:", payload);

      // CORREÇÃO DE ROTA:
      // 1. Removemos '/api/v1' se o backend não tiver esse prefixo global no main.py
      // 2. Corrigimos de '/predictions' para '/predict' (conforme seu main.py)
      const response = await aiApi.post('/predict/storage', payload, {
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
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || "Erro desconhecido ao simular armazenagem";
      throw new Error(errorMessage);
    }
  }
};