import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import theme from '../../../styles/theme';
import { OpportunityService } from '../../../services/opportunityService';

// Registra componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const HistoryTab = ({ opportunity }) => {
  const [historyData, setHistoryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(90); // Padrão: 90 dias

  useEffect(() => {
    const fetchHistory = async () => {
      if (!opportunity || !opportunity.id) return;

      setLoading(true);
      setError(null);

      try {
        const data = await OpportunityService.getPriceHistory(opportunity.id, selectedPeriod);
        setHistoryData(data);
      } catch (err) {
        console.error('Erro ao buscar histórico:', err);
        setError(err.message || 'Erro ao carregar histórico de preços');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [opportunity, selectedPeriod]);

  if (loading) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>📈</div>
        <div style={{ color: theme.colors.textMuted }}>Carregando histórico...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: theme.colors.textPrimary }}>
        <div
          style={{
            padding: '20px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(239, 68, 68, 0.3)`,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ color: theme.colors.textMuted }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!historyData || !historyData.history || historyData.history.length === 0) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>📈</div>
        <div style={{ color: theme.colors.textMuted, marginBottom: '8px' }}>
          Nenhum histórico disponível
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
          O histórico será preenchido conforme os preços forem atualizados
        </div>
      </div>
    );
  }

  // Prepara dados para o gráfico
  const chartData = {
    labels: historyData.chart.labels,
    datasets: [
      {
        label: 'Preço de Venda (R$/kg)',
        data: historyData.chart.prices,
        borderColor: theme.colors.accent,
        backgroundColor: `${theme.colors.accent}20`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointHoverRadius: 5,
        pointBackgroundColor: theme.colors.accent,
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          color: theme.colors.textPrimary,
          font: {
            size: 12
          }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: theme.colors.accent,
        borderWidth: 1,
        callbacks: {
          label: function(context) {
            return `R$ ${context.parsed.y.toFixed(2)}/kg`;
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: theme.colors.textMuted,
          maxTicksLimit: 10
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      y: {
        ticks: {
          color: theme.colors.textMuted,
          callback: function(value) {
            return `R$ ${value.toFixed(2)}`;
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  const trendColor = historyData.trend.direction === 'up' 
    ? '#10b981' 
    : historyData.trend.direction === 'down' 
    ? '#ef4444' 
    : '#f59e0b';

  const trendEmoji = historyData.trend.direction === 'up' 
    ? '📈' 
    : historyData.trend.direction === 'down' 
    ? '📉' 
    : '➡️';

  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        📈 Histórico de Preços
      </h3>

      {/* Seletor de Período */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {[7, 30, 90, 180, 365].map((days) => (
          <button
            key={days}
            onClick={() => setSelectedPeriod(days)}
            style={{
              padding: '8px 16px',
              background: selectedPeriod === days 
                ? theme.colors.accent 
                : 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${selectedPeriod === days ? theme.colors.accent : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: theme.borderRadius,
              color: selectedPeriod === days ? theme.colors.background : theme.colors.textPrimary,
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: selectedPeriod === days ? 'bold' : 'normal',
              transition: 'all 0.2s ease'
            }}
          >
            {days === 7 ? '7 dias' : days === 30 ? '30 dias' : days === 90 ? '90 dias' : days === 180 ? '6 meses' : '1 ano'}
          </button>
        ))}
      </div>

      {/* Estatísticas */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
        <div
          style={{
            padding: '16px',
            background: 'rgba(0, 217, 255, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(0, 217, 255, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
            Preço Atual
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: theme.colors.accent }}>
            R$ {historyData.statistics.current.toFixed(2)}/kg
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            background: 'rgba(124, 58, 237, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(124, 58, 237, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
            Média ({historyData.statistics.period})
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>
            R$ {historyData.statistics.average.toFixed(2)}/kg
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            background: 'rgba(16, 185, 129, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(16, 185, 129, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
            Mínimo
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#10b981' }}>
            R$ {historyData.statistics.min.toFixed(2)}/kg
          </div>
        </div>

        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(239, 68, 68, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
            Máximo
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
            R$ {historyData.statistics.max.toFixed(2)}/kg
          </div>
        </div>
      </div>

      {/* Tendência */}
      <div
        style={{
          padding: '16px',
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${trendColor}15 100%)`,
          borderRadius: theme.borderRadius,
          border: `1px solid ${trendColor}40`,
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div style={{ fontSize: '32px' }}>{trendEmoji}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
            Tendência (últimos 7 dias)
          </div>
          <div style={{ fontSize: '18px', fontWeight: 'bold', color: trendColor }}>
            {historyData.trend.direction === 'up' ? 'Alta' : historyData.trend.direction === 'down' ? 'Baixa' : 'Lateral'}
            {' '}
            {Math.abs(historyData.trend.changePercent).toFixed(1)}%
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '4px' }}>
            Média 7d: R$ {historyData.trend.recent7Avg.toFixed(2)} vs 7d anteriores: R$ {historyData.trend.previous7Avg.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Gráfico */}
      <div
        style={{
          padding: '20px',
          background: 'rgba(0, 217, 255, 0.05)',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(0, 217, 255, 0.2)`,
          marginBottom: '20px'
        }}
      >
        <div style={{ height: '300px' }}>
          <Line data={chartData} options={chartOptions} />
        </div>
      </div>

      {/* Informações Adicionais */}
      <div
        style={{
          padding: '16px',
          background: 'rgba(0, 217, 255, 0.05)',
          border: `1px solid rgba(0, 217, 255, 0.2)`,
          borderRadius: theme.borderRadius,
          fontSize: '12px',
          color: theme.colors.textMuted
        }}
      >
        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
          ℹ️ Sobre o Histórico
        </div>
        <div style={{ marginBottom: '4px' }}>
          • {historyData.statistics.count} registros no período de {historyData.statistics.period}
        </div>
        <div style={{ marginBottom: '4px' }}>
          • Dados atualizados automaticamente via ETL
        </div>
        <div>
          • Histórico usado para análise de tendências e previsões
        </div>
      </div>
    </div>
  );
};

export default HistoryTab;


