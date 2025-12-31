// services/portfolioService.js
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: API_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const PortfolioService = {
  // Lista operações do portfolio
  getOperations: async (status = null, type = null) => {
    try {
      const params = {};
      if (status) params.status = status;
      if (type) params.type = type;
      const response = await api.get('/api/portfolio/operations', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar operações:', error);
      throw error;
    }
  },

  // Busca estatísticas do portfolio
  getStats: async () => {
    try {
      const response = await api.get('/api/portfolio/stats');
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      throw error;
    }
  },

  // Cria nova operação
  createOperation: async (operationData) => {
    try {
      const response = await api.post('/api/portfolio/operations', operationData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar operação:', error);
      throw error;
    }
  },

  // Atualiza operação
  updateOperation: async (operationId, operationData) => {
    try {
      const response = await api.patch(`/api/portfolio/operations/${operationId}`, operationData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar operação:', error);
      throw error;
    }
  },

  // Remove operação
  deleteOperation: async (operationId) => {
    try {
      const response = await api.delete(`/api/portfolio/operations/${operationId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao remover operação:', error);
      throw error;
    }
  }
};

