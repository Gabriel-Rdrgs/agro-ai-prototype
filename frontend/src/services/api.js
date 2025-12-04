// frontend/src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api', // Endereço do seu Backend Node.js
});

// Interceptor para injetar o Token automaticamente (Se você já tiver feito login)
api.interceptors.request.use(async (config) => {
  const token = localStorage.getItem('token'); // Ou onde você guarda o token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;