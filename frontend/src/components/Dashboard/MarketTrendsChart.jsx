// frontend/src/components/Dashboard/MarketTrendsChart.jsx
import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import api from '../../services/api';

ChartJS.register(
  CategoryScale,
  LinearScale,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const MarketTrendsChart = ({ onError = null }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState(90); // 7, 30, 90, 365 dias
  
  // ✅ NOVO: Estados para filtros
  const [selectedProduct, setSelectedProduct] = useState('Tomate');
  const [selectedRegion, setSelectedRegion] = useState('Total');
  const [selectedMunicipality, setSelectedMunicipality] = useState('Total');
  
  // ✅ NOVO: Opções disponíveis
  const [products, setProducts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);

  // ✅ NOVO: Carrega opções disponíveis
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [productsRes, regionsRes] = await Promise.all([
          api.get('/analytics/products'),
          api.get('/analytics/regions')
        ]);
        
        if (productsRes.data.success) {
          setProducts(productsRes.data.products);
        }
        
        if (regionsRes.data.success) {
          setRegions(['Total', ...regionsRes.data.regions]);
        }
      } catch (err) {
        console.error('Erro ao carregar opções:', err);
      } finally {
        setLoadingOptions(false);
      }
    };
    
    fetchOptions();
  }, []);

  // ✅ NOVO: Carrega municípios quando produto ou região mudam
  useEffect(() => {
    const fetchMunicipalities = async () => {
      if (!selectedProduct) return;
      
      try {
        const params = new URLSearchParams({ product: selectedProduct });
        if (selectedRegion && selectedRegion !== 'Total') {
          params.append('region', selectedRegion);
        }
        
        const response = await api.get(`/analytics/municipalities?${params.toString()}`);
        
        if (response.data.success) {
          setMunicipalities(['Total', ...response.data.municipalities.map(m => m.name)]);
        }
      } catch (err) {
        console.error('Erro ao carregar municípios:', err);
        setMunicipalities(['Total']);
      }
    };
    
    fetchMunicipalities();
  }, [selectedProduct, selectedRegion]);

  // ✅ ATUALIZADO: Busca tendências com todos os filtros
  useEffect(() => {
    const fetchTrends = async () => {
      if (!selectedProduct) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({
          product: selectedProduct,
          days: period.toString()
        });
        
        if (selectedRegion && selectedRegion !== 'Total') {
          params.append('region', selectedRegion);
        }
        
        if (selectedMunicipality && selectedMunicipality !== 'Total') {
          params.append('municipality', selectedMunicipality);
        }
        
        const response = await api.get(`/analytics/trends?${params.toString()}`);
        
        if (response.data.success) {
          setData(response.data);
        } else {
          throw new Error(response.data.error || 'Erro ao buscar tendências');
        }
      } catch (err) {
        const errorMessage = err.response?.data?.error || err.message || 'Erro ao carregar tendências';
        setError(errorMessage);
        if (onError) onError(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    if (selectedProduct && !loadingOptions) {
      fetchTrends();
    }
  }, [selectedProduct, selectedRegion, selectedMunicipality, period, loadingOptions, onError]);

  if (loading) {
    return (
      <div style={{
        padding: '40px',
        textAlign: 'center',
        color: '#94a3b8',
        background: 'rgba(15, 23, 42, 0.5)',
        borderRadius: '12px',
        border: '1px solid rgba(148, 163, 184, 0.1)'
      }}>
        <div style={{ fontSize: '24px', marginBottom: '12px' }}>⏳</div>
        <div>Carregando tendências de mercado...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        padding: '24px',
        textAlign: 'center',
        color: '#ef4444',
        background: 'rgba(239, 68, 68, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(239, 68, 68, 0.3)'
      }}>
        <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚠️</div>
        <div>{error}</div>
      </div>
    );
  }

  if (!data || !data.chart) {
    return null;
  }

  const { chart, trend, statistics } = data;

  // Configuração do gráfico
  const chartData = {
    labels: chart.labels,
    datasets: [
      {
        label: 'Preço Histórico',
        data: chart.datasets.historical,
        borderColor: 'rgba(0, 217, 255, 0.8)',
        backgroundColor: 'rgba(0, 217, 255, 0.1)',
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 4
      },
      {
        label: 'Média Móvel 7 dias',
        data: chart.datasets.ma7,
        borderColor: 'rgba(34, 197, 94, 0.6)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: 'Média Móvel 30 dias',
        data: chart.datasets.ma30,
        borderColor: 'rgba(251, 191, 36, 0.6)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0
      },
      {
        label: 'Média Móvel 90 dias',
        data: chart.datasets.ma90,
        borderColor: 'rgba(168, 85, 247, 0.6)',
        backgroundColor: 'transparent',
        borderWidth: 1.5,
        borderDash: [5, 5],
        fill: false,
        tension: 0.4,
        pointRadius: 0
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: '#e2e8f0',
          font: {
            size: 11
          },
          usePointStyle: true,
          padding: 12
        }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(0, 217, 255, 0.3)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: R$ ${context.parsed.y.toFixed(2)}`;
          }
        }
      },
      title: {
        display: false
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 45
        }
      },
      y: {
        grid: {
          color: 'rgba(148, 163, 184, 0.1)',
          drawBorder: false
        },
        ticks: {
          color: '#94a3b8',
          font: {
            size: 10
          },
          callback: (value) => `R$ ${value.toFixed(2)}`
        }
      }
    },
    interaction: {
      intersect: false,
      mode: 'index'
    }
  };

  // Ícone de tendência
  const getTrendIcon = () => {
    if (trend.direction === 'up') return '📈';
    if (trend.direction === 'down') return '📉';
    return '➡️';
  };

  const getTrendColor = () => {
    if (trend.direction === 'up') return '#22c55e';
    if (trend.direction === 'down') return '#ef4444';
    return '#94a3b8';
  };

  return (
    <div 
      data-chart="market-trends"
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%)',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid rgba(148, 163, 184, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
      }}
    >
      {/* Cabeçalho */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{
          margin: '0 0 16px 0',
          color: '#e2e8f0',
          fontSize: '18px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          📊 Tendências de Mercado
        </h3>
        
        {/* ✅ NOVO: Filtros Avançados */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '16px'
        }}>
          {/* Filtro de Produto */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#94a3b8',
              marginBottom: '6px',
              fontWeight: '500'
            }}>
              Produto
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => {
                setSelectedProduct(e.target.value);
                setSelectedRegion('Total'); // Reset região ao mudar produto
                setSelectedMunicipality('Total'); // Reset município
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                color: '#e2e8f0',
                fontSize: '13px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0, 217, 255, 0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
            >
              {loadingOptions ? (
                <option>Carregando...</option>
              ) : (
                products.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))
              )}
            </select>
          </div>
          
          {/* Filtro de Estado */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#94a3b8',
              marginBottom: '6px',
              fontWeight: '500'
            }}>
              Estado
            </label>
            <select
              value={selectedRegion}
              onChange={(e) => {
                setSelectedRegion(e.target.value);
                setSelectedMunicipality('Total'); // Reset município ao mudar estado
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                color: '#e2e8f0',
                fontSize: '13px',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.target.style.borderColor = 'rgba(0, 217, 255, 0.4)'}
              onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
            >
              {loadingOptions ? (
                <option>Carregando...</option>
              ) : (
                regions.map(r => (
                  <option key={r} value={r}>
                    {r === 'Total' ? '🌎 Total (Brasil)' : r}
                  </option>
                ))
              )}
            </select>
          </div>
          
          {/* Filtro de Município */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#94a3b8',
              marginBottom: '6px',
              fontWeight: '500'
            }}>
              Município (CEASA)
            </label>
            <select
              value={selectedMunicipality}
              onChange={(e) => setSelectedMunicipality(e.target.value)}
              disabled={municipalities.length === 0}
              style={{
                width: '100%',
                padding: '8px 12px',
                background: municipalities.length === 0 
                  ? 'rgba(15, 23, 42, 0.3)' 
                  : 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '6px',
                color: municipalities.length === 0 ? '#64748b' : '#e2e8f0',
                fontSize: '13px',
                cursor: municipalities.length === 0 ? 'not-allowed' : 'pointer',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => {
                if (municipalities.length > 0) {
                  e.target.style.borderColor = 'rgba(0, 217, 255, 0.4)';
                }
              }}
              onBlur={(e) => e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)'}
            >
              {municipalities.length === 0 ? (
                <option>Carregando...</option>
              ) : (
                municipalities.map(m => (
                  <option key={m} value={m}>
                    {m === 'Total' 
                      ? selectedRegion === 'Total' 
                        ? '🌎 Total (Brasil)' 
                        : `📍 Total (${selectedRegion})`
                      : m}
                  </option>
                ))
              )}
            </select>
          </div>
          
          {/* Seletor de Período */}
          <div>
            <label style={{
              display: 'block',
              fontSize: '11px',
              color: '#94a3b8',
              marginBottom: '6px',
              fontWeight: '500'
            }}>
              Período
            </label>
            <div style={{
              display: 'flex',
              gap: '6px',
              flexWrap: 'wrap'
            }}>
              {[7, 30, 90, 365].map(days => (
                <button
                  key={days}
                  onClick={() => setPeriod(days)}
                  style={{
                    flex: '1',
                    minWidth: '50px',
                    padding: '8px 10px',
                    background: period === days 
                      ? 'linear-gradient(135deg, rgba(0, 217, 255, 0.2) 0%, rgba(0, 217, 255, 0.1) 100%)'
                      : 'rgba(148, 163, 184, 0.1)',
                    border: `1px solid ${period === days ? 'rgba(0, 217, 255, 0.4)' : 'rgba(148, 163, 184, 0.2)'}`,
                    borderRadius: '6px',
                    color: period === days ? '#00d9ff' : '#94a3b8',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: period === days ? '600' : '400',
                    transition: 'all 0.2s',
                    outline: 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (period !== days) {
                      e.target.style.background = 'rgba(148, 163, 184, 0.15)';
                      e.target.style.borderColor = 'rgba(148, 163, 184, 0.3)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (period !== days) {
                      e.target.style.background = 'rgba(148, 163, 184, 0.1)';
                      e.target.style.borderColor = 'rgba(148, 163, 184, 0.2)';
                    }
                  }}
                >
                  {days === 7 ? '7d' : days === 30 ? '30d' : days === 90 ? '90d' : '1a'}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Estatísticas Resumidas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: '12px',
        marginBottom: '20px'
      }}>
        <div style={{
          background: 'rgba(0, 217, 255, 0.1)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Preço Atual</div>
          <div style={{ color: '#00d9ff', fontSize: '18px', fontWeight: '600' }}>
            R$ {statistics.current.toFixed(2)}
          </div>
        </div>
        
        <div style={{
          background: 'rgba(34, 197, 94, 0.1)',
          border: '1px solid rgba(34, 197, 94, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Média</div>
          <div style={{ color: '#22c55e', fontSize: '18px', fontWeight: '600' }}>
            R$ {statistics.average.toFixed(2)}
          </div>
        </div>
        
        <div style={{
          background: `rgba(${trend.direction === 'up' ? '34, 197, 94' : trend.direction === 'down' ? '239, 68, 68' : '148, 163, 184'}, 0.1)`,
          border: `1px solid rgba(${trend.direction === 'up' ? '34, 197, 94' : trend.direction === 'down' ? '239, 68, 68' : '148, 163, 184'}, 0.2)`,
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
            Tendência {getTrendIcon()}
          </div>
          <div style={{ 
            color: getTrendColor(), 
            fontSize: '18px', 
            fontWeight: '600' 
          }}>
            {trend.changePercent > 0 ? '+' : ''}{trend.changePercent.toFixed(1)}%
          </div>
        </div>
        
        <div style={{
          background: 'rgba(168, 85, 247, 0.1)',
          border: '1px solid rgba(168, 85, 247, 0.2)',
          borderRadius: '8px',
          padding: '12px',
          textAlign: 'center'
        }}>
          <div style={{ color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>Volatilidade</div>
          <div style={{ color: '#a855f7', fontSize: '18px', fontWeight: '600' }}>
            {statistics.volatility.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div style={{ height: '400px', position: 'relative' }}>
        <Line data={chartData} options={chartOptions} />
      </div>

      {/* Informações Adicionais */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(148, 163, 184, 0.05)',
        borderRadius: '8px',
        fontSize: '11px',
        color: '#94a3b8',
        display: 'flex',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div>
          <strong>Período:</strong> {data.period.startDate} até {data.period.endDate}
        </div>
        <div>
          <strong>Pontos de dados:</strong> {data.dataPoints}
        </div>
        <div>
          <strong>Faixa:</strong> R$ {statistics.min.toFixed(2)} - R$ {statistics.max.toFixed(2)}
        </div>
      </div>
    </div>
  );
};

export default MarketTrendsChart;

