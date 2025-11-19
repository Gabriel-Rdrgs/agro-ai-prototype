// src/services/opportunityService.js
import { opportunities } from '../data/mockOpportunities';

// Simulamos um pequeno "delay" para imitar uma API real (importante para testes de loading)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const OpportunityService = {
  // Busca todas as oportunidades
  getAll: async () => {
    await delay(300); // Simula latência de rede 
    return [...opportunities]; // Retorna uma cópia segura dos dados
  },

  // Busca uma oportunidade específica por ID
  getById: async (id) => {
    await delay(200);
    return opportunities.find(op => op.id === id);
  },

  // Lógica de Inteligência: Simula o cálculo de ROI (será usado na Calculadora)
  calculateROI: async ({ buyPrice, sellPrice, volume, transportCost }) => {
    await delay(500); // Simula o processamento da IA
    
    // Lógica de negócio blindada aqui dentro, não na tela
    const grossRevenue = sellPrice * volume * 1000; // Considerando volume em toneladas (kg)
    const grossCost = buyPrice * volume * 1000;
    const totalCost = grossCost + transportCost;
    
    const profit = grossRevenue - totalCost;
    const roi = ((profit / totalCost) * 100);

    return {
      roi: parseFloat(roi.toFixed(1)),
      profit: parseFloat(profit.toFixed(2)),
      totalCost: parseFloat(totalCost.toFixed(2)),
      isHighRisk: roi < 10 // Exemplo de regra de negócio
    };
  }
};