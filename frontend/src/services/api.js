// frontend/src/services/api.js
import axios from 'axios';

// ✅ CORRIGIDO: Usa variáveis de ambiente em produção
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
});

// 1. NOVA INSTÂNCIA DEDICADA PARA IA (Python)
export const aiApi = axios.create({
  baseURL: process.env.REACT_APP_AI_API_URL || 'http://localhost:8000/api/v1',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para injetar o Token automaticamente
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. CHAT SERVICE
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
