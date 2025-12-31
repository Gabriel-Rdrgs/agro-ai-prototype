// frontend/src/components/Dashboard/FavoritesSection.jsx

import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import favoriteService from '../../services/favoriteService';
import FavoriteButton from '../Common/FavoriteButton';

const FavoritesSection = () => {
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchFavorites();
  }, []);

  const fetchFavorites = async () => {
    try {
      setLoading(true);
      const response = await favoriteService.getFavorites();
      setFavorites(response.favorites || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao buscar favoritos:', err);
      setError('Erro ao carregar favoritos');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (opportunityId) => {
    try {
      await favoriteService.removeFavorite(opportunityId);
      // Remove da lista local
      setFavorites(prev => prev.filter(fav => fav.opportunityId !== opportunityId));
    } catch (err) {
      console.error('Erro ao remover favorito:', err);
    }
  };

  // Prepara dados para gráfico de histórico de preços
  const preparePriceHistoryChart = (favorite) => {
    const history = favorite.opportunity?.priceHistory || [];
    
    if (history.length === 0) {
      return null;
    }

    // Ordena por data (mais antigo primeiro)
    // O backend retorna { price, date } onde date é string ISO
    const sortedHistory = [...history].sort((a, b) => {
      const dateA = new Date(a.date || a.createdAt);
      const dateB = new Date(b.date || b.createdAt);
      return dateA - dateB;
    });

    const labels = sortedHistory.map(h => {
      const date = new Date(h.date || h.createdAt);
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    });

    const prices = sortedHistory.map(h => {
      // Pode vir como Decimal do Prisma ou número
      const price = typeof h.price === 'string' ? parseFloat(h.price) : h.price;
      return price || 0;
    });

    return {
      labels,
      datasets: [{
        label: 'Preço (R$/kg)',
        data: prices,
        borderColor: '#00d9ff',
        backgroundColor: 'rgba(0, 217, 255, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#00d9ff',
        borderWidth: 1
      }
    },
    scales: {
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: 'rgba(255,255,255,0.05)' }
      },
      x: {
        ticks: { color: '#94a3b8', maxRotation: 45 },
        grid: { display: false }
      }
    }
  };

  if (loading) {
    return (
      <div className="highlight-section" style={{
        background: 'var(--bg-card)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center'
      }}>
        <p style={{ color: '#94a3b8' }}>⏳ Carregando favoritos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="highlight-section" style={{
        background: 'var(--bg-card)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        textAlign: 'center'
      }}>
        <p style={{ color: '#ef4444' }}>❌ {error}</p>
        <button
          onClick={fetchFavorites}
          style={{
            marginTop: '10px',
            padding: '8px 16px',
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid #00d9ff',
            borderRadius: '6px',
            color: '#00d9ff',
            cursor: 'pointer'
          }}
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="highlight-section" style={{
        background: 'var(--bg-card)',
        padding: '40px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⭐</div>
        <h3 style={{ color: 'var(--text-primary)', marginBottom: '8px' }}>
          Nenhum Favorito Ainda
        </h3>
        <p style={{ color: '#94a3b8', fontSize: '0.9rem' }}>
          Clique na estrela (☆) em qualquer oportunidade para adicionar aos favoritos
        </p>
      </div>
    );
  }

  return (
    <div className="highlight-section" style={{
      background: 'var(--bg-card)',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          margin: 0,
          color: 'var(--text-primary)',
          fontSize: '1.1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          ⭐ Meus Favoritos ({favorites.length})
        </h3>
        <button
          onClick={fetchFavorites}
          style={{
            padding: '6px 12px',
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid #00d9ff',
            borderRadius: '6px',
            color: '#00d9ff',
            cursor: 'pointer',
            fontSize: '0.85rem'
          }}
        >
          🔄 Atualizar
        </button>
      </div>

      <div style={{ display: 'grid', gap: '20px' }}>
        {favorites.map((favorite) => {
          const opp = favorite.opportunity;
          
          // ✅ CORREÇÃO: Backend agora retorna no formato padronizado
          const financials = opp?.financials || {};
          const origin = opp?.origin || {};
          
          // Extrai valores com fallback seguro
          const roi = financials.roi !== null && financials.roi !== undefined 
                     ? parseFloat(financials.roi) 
                     : 0;
          const buyPrice = financials.buyPrice ? parseFloat(financials.buyPrice) : 0;
          const sellPrice = financials.sellPrice ? parseFloat(financials.sellPrice) : 0;
          
          const chartData = preparePriceHistoryChart(favorite);

          return (
            <div
              key={favorite.id}
              style={{
                background: 'rgba(0, 217, 255, 0.05)',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 217, 255, 0.2)'
              }}
            >
              {/* Header do Card */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}>
                      {opp?.product || 'N/A'}
                    </h4>
                    <FavoriteButton
                      opportunityId={opp?.id}
                      size="small"
                      onToggle={(isFavorite) => {
                        if (!isFavorite) {
                          handleRemoveFavorite(opp?.id);
                        }
                      }}
                    />
                  </div>
                  <p style={{
                    margin: 0,
                    color: '#94a3b8',
                    fontSize: '0.85rem'
                  }}>
                    📍 {origin.city || 'N/A'}, {origin.state || 'N/A'}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{
                    background: roi > 50 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                    color: roi > 50 ? '#10b981' : '#f59e0b',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    fontSize: '0.85rem'
                  }}>
                    ROI: {roi.toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Informações Financeiras */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '12px',
                fontSize: '0.85rem'
              }}>
                <div>
                  <span style={{ color: '#94a3b8' }}>Compra:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>
                    R$ {buyPrice.toFixed(2)}/kg
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Venda:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: '4px' }}>
                    R$ {sellPrice.toFixed(2)}/kg
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8' }}>Lucro:</span>
                  <strong style={{
                    color: (sellPrice - buyPrice) > 0 ? '#10b981' : '#ef4444',
                    marginLeft: '4px'
                  }}>
                    R$ {((sellPrice - buyPrice) * 1000).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </strong>
                </div>
              </div>

              {/* Notas do Usuário */}
              {favorite.notes && (
                <div style={{
                  marginBottom: '12px',
                  padding: '8px',
                  background: 'rgba(0, 217, 255, 0.1)',
                  borderRadius: '4px',
                  fontSize: '0.85rem',
                  color: '#94a3b8',
                  fontStyle: 'italic'
                }}>
                  💬 {favorite.notes}
                </div>
              )}

              {/* Gráfico de Histórico de Preços */}
              {chartData ? (
                <div style={{ height: '150px', marginTop: '12px' }}>
                  <Line data={chartData} options={chartOptions} />
                </div>
              ) : (
                <div style={{
                  padding: '20px',
                  textAlign: 'center',
                  color: '#64748b',
                  fontSize: '0.85rem',
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px'
                }}>
                  📊 Histórico de preços não disponível
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FavoritesSection;

