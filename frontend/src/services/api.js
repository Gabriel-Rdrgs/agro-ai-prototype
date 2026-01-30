// frontend/src/services/api.js

import axios from 'axios';

// ✅ URLs base (SEM /api ou /api/v1 no final)
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const PYTHON_API_URL = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000';

// 1️⃣ INSTÂNCIA PRINCIPAL - Backend Node.js
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2️⃣ INSTÂNCIA PARA IA - Python
export const aiApi = axios.create({
  baseURL: `${PYTHON_API_URL}/api/v1`,
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 📌 Interceptor para injetar o Token automaticamente
api.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

aiApi.interceptors.request.use(
  async (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 3️⃣ CHAT SERVICE
export const chatService = {
  askAgronomist: async (question) => {
    try {
      const response = await api.post('/ai/chat/query', { question });
      return {
        answer: response.data.answer || response.data.message || 'Resposta não disponível',
        sources: response.data.sources || []
      };
    } catch (error) {
      console.error("Erro no Chat:", error);
      
      if (error.response?.status === 401) {
        throw new Error('Sessão expirada ou inválida. Faça login novamente.');
      }
      
      if (error.response?.status === 402) {
        throw new Error('Créditos da OpenAI esgotados. Contate o administrador.');
      }
      
      if (error.response?.status === 429) {
        throw new Error('Muitas requisições. Aguarde alguns segundos e tente novamente.');
      }
      
      throw new Error(error.response?.data?.error || 'Erro ao consultar o assistente agronômico.');
    }
  }
};

export default api;
