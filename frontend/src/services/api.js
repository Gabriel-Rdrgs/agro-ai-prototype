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
      // ✅ Agora chamamos o backend Node.js, que faz proxy para o Python
      const response = await api.post('/ai/chat/query', { question });
      
      // Normaliza para garantir o formato esperado pelo componente de chat
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