// frontend/src/services/storageService.js
import { api } from './api'; 
// Importante: use a instância 'api' ou 'aiApi' dependendo de onde o endpoint está.
// Como registramos /predictions no main.py do Python, vamos usar a URL completa se necessário
// ou assumir que o gateway redireciona. 
// Para garantir, vamos usar uma chamada direta similar ao Chat.

import axios from 'axios';

// Instância dedicada para IA (mesma lógica do Chat)
const aiApi = axios.create({
  baseURL: 'http://localhost:8000/api/v1', 
  headers: { 'Content-Type': 'application/json' }
});

export const StorageService = {
  /**
   * Pede para a IA simular o cenário de armazenagem com volatilidade climática.
   */
  simulateScenario: async (data) => {
    try {
      // Payload que o Python espera (SimulationRequest)
      const payload = {
        product: data.product || 'Tomate',
        current_price: parseFloat(data.currentPrice) || 0,
        buy_price: parseFloat(data.buyPrice) || 0,
        storage_cost_per_day: parseFloat(data.storageCost) || 0.03,
        accumulated_rainfall: parseFloat(data.rain) || 0 // Chuva real aqui
      };

      console.log("📡 Enviando simulação para IA:", payload);

      // Chama o endpoint "nervoso" que criamos
      const response = await aiApi.post('/predictions/storage', payload);
      
      console.log("✅ Resposta da IA (Volatilidade):", response.data);
      return response.data;

    } catch (error) {
      console.error("❌ Erro na Simulação:", error);
      // Fallback silencioso apenas se a API cair
      throw error; 
    }
  }
};