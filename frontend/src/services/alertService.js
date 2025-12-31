// services/alertService.js
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

export const AlertService = {
  // Lista todos os alertas do usuário
  getAll: async (isActive = null) => {
    try {
      const params = {};
      if (isActive !== null) {
        params.isActive = isActive;
      }
      const response = await api.get('/api/alerts', { params });
      return response.data;
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
      throw error;
    }
  },

  // Cria novo alerta
  create: async (alertData) => {
    try {
      const response = await api.post('/api/alerts', alertData);
      return response.data;
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      throw error;
    }
  },

  // Atualiza alerta
  update: async (alertId, alertData) => {
    try {
      const response = await api.put(`/api/alerts/${alertId}`, alertData);
      return response.data;
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error);
      throw error;
    }
  },

  // Remove alerta
  delete: async (alertId) => {
    try {
      const response = await api.delete(`/api/alerts/${alertId}`);
      return response.data;
    } catch (error) {
      console.error('Erro ao remover alerta:', error);
      throw error;
    }
  }
};

