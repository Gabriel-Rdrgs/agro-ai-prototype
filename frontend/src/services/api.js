// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Endereço do seu Backend Node.js
});

// 1. NOVA INSTÂNCIA DEDICADA PARA IA (Python)
// Aponta direto para o container Python na porta 8000
export const aiApi = axios.create({
  baseURL: 'http://localhost:8000/api/v1', // Atenção ao /api/v1
  timeout: 60000, // 60 segundos (IA pode demorar para processar análises complexas)
  headers: {
    'Content-Type': 'application/json',
  }
});

// Interceptor para injetar o Token automaticamente (Se você já tiver feito login)
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 2. ATUALIZE O CHAT SERVICE
export const chatService = {
  askAgronomist: async (question) => {
    try {
      // Use 'aiApi' em vez de 'api'
      // Como o baseURL já tem /api/v1, aqui colocamos só o restante
      const response = await aiApi.post('/chat/query', { question });
      return response.data;
    } catch (error) {
      console.error("Erro no Chat:", error);
      throw error;
    }
  }
};

export default api;