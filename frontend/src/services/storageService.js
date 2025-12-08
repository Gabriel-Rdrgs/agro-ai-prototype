// frontend/src/services/storageService.js
import { aiApi } from './api'; 

export const StorageService = {
  /**
   * Pede para a IA simular o cenário de armazenagem com volatilidade climática.
   * Endpoint: POST /predict/storage
   */
  simulateScenario: async (data) => {
    try {
      // Payload que o Python espera (SimulationRequest)
      const payload = {
        product: data.product || 'Tomate',
        // Garante numérico para evitar erro de validação no Pydantic
        current_price: parseFloat(data.currentPrice) || 0,
        buy_price: parseFloat(data.buyPrice) || 0,
        storage_cost_per_day: parseFloat(data.storageCost) || 0.03,
        accumulated_rainfall: parseFloat(data.rain) || 0 
      };

      console.log("📡 Enviando simulação para IA:", payload);

      // CORREÇÃO DE ROTA:
      // 1. Removemos '/api/v1' se o backend não tiver esse prefixo global no main.py
      // 2. Corrigimos de '/predictions' para '/predict' (conforme seu main.py)
      const response = await aiApi.post('/predict/storage', payload);
      
      console.log("✅ Resposta da IA (Volatilidade):", response.data);
      return response.data;

    } catch (error) {
      console.error("❌ Erro na Simulação:", error);
      throw error; 
    }
  }
};