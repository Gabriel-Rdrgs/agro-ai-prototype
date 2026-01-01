// frontend/src/components/Dashboard/PredictiveInsightsSection.jsx
import React, { useState, useEffect } from 'react';
import { OpportunityService } from '../../services/opportunityService';
import { Line } from 'react-chartjs-2';
import theme from '../../styles/theme';

const formatPrice = (price) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price || 0);
};

const formatPercent = (value) => {
  return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
};

const PredictiveInsightsSection = ({ onDataReady }) => {
  const [opportunities, setOpportunities] = useState([]);
  const [predictions, setPredictions] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d'); // '7d' ou '30d'

  useEffect(() => {
    fetchPredictiveData();
  }, []);

  const fetchPredictiveData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 1. Busca todas as oportunidades
      const opps = await OpportunityService.getAll();
      if (!Array.isArray(opps) || opps.length === 0) {
        setOpportunities([]);
        setLoading(false);
        return;
      }

      // 2. Pega top 10 por ROI atual para análise preditiva
      const topOpps = [...opps]
        .sort((a, b) => (b.financials?.roi || 0) - (a.financials?.roi || 0))
        .slice(0, 10);

      setOpportunities(topOpps);

      // 3. Calcula previsões para 7 e 30 dias
      const itemsForBatch = topOpps.map(opp => ({
        id: opp.id,
        product: opp.product || 'Tomate',
        state: opp.origin?.state || opp.state || 'SP',
        lat: opp.coords?.lat || opp.origin?.coords?.lat || 0,
        lng: opp.coords?.lng || opp.origin?.coords?.lng || 0,
        current_price: opp.sellPrice || 0,
        buy_price: opp.buyPrice || 0,
        financials: opp.financials || {}
      }));

      try {
        const batchResults = await OpportunityService.calculateBatchAI(itemsForBatch);
        
        // Processa resultados do batch
        const predictionsMap = {};
        if (batchResults && Array.isArray(batchResults)) {
          batchResults.forEach((result, index) => {
            if (result && result.id) {
              predictionsMap[result.id] = {
                roi_d7: result.roi_d7 || result.financials?.roi_d7 || null,
                roi_d30: result.roi_d30 || result.financials?.roi_d30 || null,
                price_d7: result.price_d7 || result.sellPrice_d7 || null,
                price_d30: result.price_d30 || result.sellPrice_d30 || null
              };
            }
          });
        } else if (batchResults && typeof batchResults === 'object') {
          // Se for objeto, processa cada item
          Object.keys(batchResults).forEach(key => {
            const result = batchResults[key];
            if (result && result.id) {
              predictionsMap[result.id] = {
                roi_d7: result.roi_d7 || result.financials?.roi_d7 || null,
                roi_d30: result.roi_d30 || result.financials?.roi_d30 || null,
                price_d7: result.price_d7 || result.sellPrice_d7 || null,
                price_d30: result.price_d30 || result.sellPrice_d30 || null
              };
            }
          });
        }
        
        setPredictions(predictionsMap);
        
        // ✅ NOVO: Notifica o Dashboard quando os dados estão prontos
        if (onDataReady) {
          const topProjected7d = opportunities
            .map(opp => {
              const pred = predictionsMap[opp.id];
              const currentROI = opp.financials?.roi || 0;
              const projectedROI = pred?.roi_d7 || currentROI;
              const change = projectedROI - currentROI;
              return { ...opp, currentROI, projectedROI, change, hasPrediction: pred && pred.roi_d7 !== null };
            })
            .filter(opp => opp.hasPrediction)
            .sort((a, b) => b.projectedROI - a.projectedROI)
            .slice(0, 5);
          
          const topProjected30d = opportunities
            .map(opp => {
              const pred = predictionsMap[opp.id];
              const currentROI = opp.financials?.roi || 0;
              const projectedROI = pred?.roi_d30 || currentROI;
              const change = projectedROI - currentROI;
              return { ...opp, currentROI, projectedROI, change, hasPrediction: pred && pred.roi_d30 !== null };
            })
            .filter(opp => opp.hasPrediction)
            .sort((a, b) => b.projectedROI - a.projectedROI)
            .slice(0, 5);
          
          onDataReady({
            opportunities: topOpps,
            predictions: predictionsMap,
            topProjected7d,
            topProjected30d
          });
        }
      } catch (batchError) {
        console.warn('Erro ao calcular previsões batch:', batchError);
        // Continua mesmo sem previsões
      }
    } catch (err) {
      setError(err.message || 'Erro ao carregar dados preditivos');
      console.error('Erro ao buscar dados preditivos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Prepara dados para o gráfico comparativo
  const getChartData = () => {
    const oppsWithPredictions = opportunities
      .filter(opp => {
        const pred = predictions[opp.id];
        return pred && (pred.roi_d7 !== null || pred.roi_d30 !== null);
      })
      .slice(0, 8); // Top 8 para o gráfico

    if (oppsWithPredictions.length === 0) return null;

    const labels = oppsWithPredictions.map(opp => {
      const city = opp.origin?.city || opp.city || 'N/A';
      const state = opp.origin?.state || opp.state || '';
      return `${city.substring(0, 12)}${city.length > 12 ? '...' : ''}, ${state}`;
    });

    const currentROI = oppsWithPredictions.map(opp => opp.financials?.roi || 0);
    const projectedROI = oppsWithPredictions.map(opp => {
      const pred = predictions[opp.id];
      if (selectedTimeframe === '7d') {
        return pred?.roi_d7 || opp.financials?.roi || 0;
      } else {
        return pred?.roi_d30 || opp.financials?.roi || 0;
      }
    });

    return {
      labels,
      datasets: [
        {
          label: 'ROI Atual',
          data: currentROI,
          borderColor: '#3b82f6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          tension: 0.4,
          fill: false
        },
        {
          label: `ROI Projetado (${selectedTimeframe === '7d' ? '+7 dias' : '+30 dias'})`,
          data: projectedROI,
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          tension: 0.4,
          fill: false,
          borderDash: [5, 5]
        }
      ]
    };
  };

  // Top oportunidades com melhor projeção futura
  const getTopProjectedOpportunities = () => {
    return opportunities
      .map(opp => {
        const pred = predictions[opp.id];
        const currentROI = opp.financials?.roi || 0;
        const projectedROI = selectedTimeframe === '7d' 
          ? (pred?.roi_d7 || currentROI)
          : (pred?.roi_d30 || currentROI);
        const change = projectedROI - currentROI;
        
        return {
          ...opp,
          currentROI,
          projectedROI,
          change,
          hasPrediction: pred && (pred.roi_d7 !== null || pred.roi_d30 !== null)
        };
      })
      .filter(opp => opp.hasPrediction)
      .sort((a, b) => b.projectedROI - a.projectedROI)
      .slice(0, 5);
  };

  const chartData = getChartData();
  const topProjected = getTopProjectedOpportunities();

  if (loading) {
    return (
      <div className="highlight-section" style={{
        background: 'var(--bg-card)',
        padding: '20px',
        borderRadius: '12px',
        border: '1px solid rgba(255,255,255,0.05)',
        marginBottom: '30px',
        textAlign: 'center'
      }}>
        <div style={{ color: theme.colors.textMuted }}>
          🔮 Carregando insights preditivos...
        </div>
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
        marginBottom: '30px'
      }}>
        <div style={{ color: '#ef4444' }}>
          ⚠️ {error}
        </div>
        <button
          onClick={fetchPredictiveData}
          style={{
            marginTop: '10px',
            padding: '6px 12px',
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #ef4444',
            borderRadius: '6px',
            color: '#ef4444',
            cursor: 'pointer'
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <div className="highlight-section" style={{
      background: 'var(--bg-card)',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)',
      marginBottom: '30px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          color: theme.colors.accent,
          margin: 0,
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          🔮 Insights Preditivos (IA Prophet)
        </h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={() => setSelectedTimeframe('7d')}
            style={{
              padding: '6px 12px',
              background: selectedTimeframe === '7d' 
                ? 'rgba(0, 217, 255, 0.2)' 
                : 'transparent',
              border: `1px solid ${selectedTimeframe === '7d' ? '#00d9ff' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '6px',
              color: selectedTimeframe === '7d' ? '#00d9ff' : theme.colors.textMuted,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            +7 dias
          </button>
          <button
            onClick={() => setSelectedTimeframe('30d')}
            style={{
              padding: '6px 12px',
              background: selectedTimeframe === '30d' 
                ? 'rgba(0, 217, 255, 0.2)' 
                : 'transparent',
              border: `1px solid ${selectedTimeframe === '30d' ? '#00d9ff' : 'rgba(255,255,255,0.2)'}`,
              borderRadius: '6px',
              color: selectedTimeframe === '30d' ? '#00d9ff' : theme.colors.textMuted,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            +30 dias
          </button>
        </div>
      </div>

      {/* Gráfico Comparativo */}
      {chartData && (
        <div style={{ marginBottom: '30px' }}>
          <h4 style={{
            color: theme.colors.textPrimary,
            fontSize: '0.95rem',
            marginBottom: '15px',
            fontWeight: 600
          }}>
            Comparação: ROI Atual vs. Projetado
          </h4>
          <div style={{
            background: 'rgba(0, 0, 0, 0.2)',
            padding: '15px',
            borderRadius: '8px',
            height: '300px'
          }}>
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                    labels: {
                      color: theme.colors.textPrimary,
                      font: { size: 12 }
                    }
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                      label: (context) => {
                        return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
                      }
                    }
                  }
                },
                scales: {
                  x: {
                    ticks: {
                      color: theme.colors.textMuted,
                      font: { size: 10 },
                      maxRotation: 45,
                      minRotation: 45
                    },
                    grid: {
                      color: 'rgba(255,255,255,0.05)'
                    }
                  },
                  y: {
                    ticks: {
                      color: theme.colors.textMuted,
                      font: { size: 11 }
                    },
                    grid: {
                      color: 'rgba(255,255,255,0.05)'
                    },
                    title: {
                      display: true,
                      text: 'ROI (%)',
                      color: theme.colors.textMuted,
                      font: { size: 11 }
                    }
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Top Oportunidades com Melhor Projeção */}
      {topProjected.length > 0 && (
        <div>
          <h4 style={{
            color: theme.colors.textPrimary,
            fontSize: '0.95rem',
            marginBottom: '15px',
            fontWeight: 600
          }}>
            🎯 Top Oportunidades com Melhor Projeção Futura
          </h4>
          <div style={{
            display: 'grid',
            gap: '12px'
          }}>
            {topProjected.map((opp, index) => {
              const trendIcon = opp.change > 0 ? '📈' : opp.change < 0 ? '📉' : '➡️';
              const trendColor = opp.change > 0 ? '#10b981' : opp.change < 0 ? '#ef4444' : theme.colors.textMuted;
              
              return (
                <div
                  key={opp.id || index}
                  style={{
                    background: 'rgba(0, 0, 0, 0.2)',
                    padding: '12px',
                    borderRadius: '8px',
                    border: `1px solid ${trendColor}40`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <span style={{ fontSize: '1.1rem' }}>
                        {opp.product === 'Tomate' ? '🍅' : opp.product === 'Soja' ? '🌾' : '🌽'}
                      </span>
                      <strong style={{ color: theme.colors.textPrimary }}>
                        {opp.origin?.city || opp.city || 'N/A'}, {opp.origin?.state || opp.state || ''}
                      </strong>
                    </div>
                    <div style={{
                      fontSize: '0.85rem',
                      color: theme.colors.textMuted
                    }}>
                      ROI Atual: <strong style={{ color: theme.colors.accent }}>
                        {opp.currentROI.toFixed(1)}%
                      </strong>
                    </div>
                  </div>
                  <div style={{
                    textAlign: 'right',
                    marginLeft: '15px'
                  }}>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: trendColor,
                      marginBottom: '4px'
                    }}>
                      {opp.projectedROI.toFixed(1)}%
                    </div>
                    <div style={{
                      fontSize: '0.8rem',
                      color: trendColor,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      justifyContent: 'flex-end'
                    }}>
                      {trendIcon} {formatPercent(opp.change)}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: theme.colors.textMuted,
                      marginTop: '2px'
                    }}>
                      Projeção {selectedTimeframe === '7d' ? '+7d' : '+30d'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {topProjected.length === 0 && !loading && (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: theme.colors.textMuted
        }}>
          ⚠️ Nenhuma projeção disponível no momento. Tente atualizar os dados.
        </div>
      )}
    </div>
  );
};

export default PredictiveInsightsSection;

