// frontend/src/components/Common/FavoriteButton.jsx

import React, { useState, useEffect } from 'react';
import favoriteService from '../../services/favoriteService';

const FavoriteButton = ({ opportunityId, size = 'medium', onToggle }) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Verifica se está favoritado ao montar
  useEffect(() => {
    const checkFavorite = async () => {
      try {
        setIsChecking(true);
        const result = await favoriteService.checkFavorite(opportunityId);
        setIsFavorite(result.isFavorite || false);
      } catch (error) {
        console.error('Erro ao verificar favorito:', error);
        setIsFavorite(false);
      } finally {
        setIsChecking(false);
      }
    };

    if (opportunityId) {
      checkFavorite();
    }
  }, [opportunityId]);

  const handleToggle = async (e) => {
    e.stopPropagation(); // Previne que o clique no card seja acionado
    
    if (isLoading || isChecking) return;

    try {
      setIsLoading(true);
      
      if (isFavorite) {
        await favoriteService.removeFavorite(opportunityId);
        setIsFavorite(false);
        if (onToggle) onToggle(false);
      } else {
        await favoriteService.addFavorite(opportunityId);
        setIsFavorite(true);
        if (onToggle) onToggle(true);
      }
    } catch (error) {
      console.error('Erro ao alternar favorito:', error);
      // Reverte o estado em caso de erro
      setIsFavorite(!isFavorite);
    } finally {
      setIsLoading(false);
    }
  };

  const sizeStyles = {
    small: { fontSize: '16px', padding: '4px' },
    medium: { fontSize: '20px', padding: '6px' },
    large: { fontSize: '24px', padding: '8px' }
  };

  const style = {
    ...sizeStyles[size],
    background: 'none',
    border: 'none',
    cursor: isLoading || isChecking ? 'wait' : 'pointer',
    color: isFavorite ? '#fbbf24' : '#64748b', // Amarelo se favorito, cinza se não
    transition: 'all 0.2s ease',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '50%',
    opacity: isLoading || isChecking ? 0.6 : 1
  };

  return (
    <button
      onClick={handleToggle}
      style={style}
      title={isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      disabled={isLoading || isChecking}
    >
      {isChecking ? '⏳' : isFavorite ? '⭐' : '☆'}
    </button>
  );
};

export default FavoriteButton;

