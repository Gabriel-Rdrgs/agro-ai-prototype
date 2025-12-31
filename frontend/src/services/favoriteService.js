// frontend/src/services/favoriteService.js

import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

const api = axios.create({
  baseURL: `${API_URL}/api`
});

// Interceptor para adicionar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Serviço para gerenciar favoritos de oportunidades
 */
class FavoriteService {
  /**
   * Busca todos os favoritos do usuário
   */
  async getFavorites() {
    try {
      const response = await api.get('/favorites');
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao buscar favoritos:', error);
      throw error;
    }
  }

  /**
   * Verifica se uma oportunidade está nos favoritos
   */
  async checkFavorite(opportunityId) {
    try {
      const response = await api.get(`/favorites/check/${opportunityId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao verificar favorito:', error);
      // Se não encontrar, retorna false (não é favorito)
      return { success: true, isFavorite: false };
    }
  }

  /**
   * Adiciona uma oportunidade aos favoritos
   */
  async addFavorite(opportunityId, notes = null) {
    try {
      const response = await api.post('/favorites', {
        opportunityId,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao adicionar favorito:', error);
      throw error;
    }
  }

  /**
   * Remove uma oportunidade dos favoritos
   */
  async removeFavorite(opportunityId) {
    try {
      const response = await api.delete(`/favorites/opportunity/${opportunityId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao remover favorito:', error);
      throw error;
    }
  }

  /**
   * Remove favorito por ID do favorito
   */
  async removeFavoriteById(favoriteId) {
    try {
      const response = await api.delete(`/favorites/${favoriteId}`);
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao remover favorito:', error);
      throw error;
    }
  }

  /**
   * Atualiza notas de um favorito
   */
  async updateFavoriteNotes(opportunityId, notes) {
    try {
      const response = await api.post('/favorites', {
        opportunityId,
        notes
      });
      return response.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar notas do favorito:', error);
      throw error;
    }
  }
}

export default new FavoriteService();

