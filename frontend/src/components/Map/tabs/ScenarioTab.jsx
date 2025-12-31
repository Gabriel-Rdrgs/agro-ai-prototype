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
  Legend
} from 'chart.js';
import theme from '../../../styles/theme';
import { OpportunityService } from '../../../services/opportunityService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const ScenarioTab = ({ opportunity }) => {
  const [scenario, setScenario] = useState({
    dollar_change: 0,
    freight_change: 0,
    buy_price_change: 0,
    sell_price_change: 0,
    rain_mm: null,
    temperature_change: 0
  });
  const [simulationResult, setSimulationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [presetScenarios, setPresetScenarios] = useState(null);

  useEffect(() => {
    // Carrega cenários pré-definidos
    setPresetScenarios({
      optimistic: {
        name: 'Cenário Otimista',
        description: 'Dólar cai, frete reduz',
        dollar_change: -10,
        freight_change: -20,
        buy_price_change: 0,
        sell_price_change: 0,
        rain_mm: null,
        temperature_change: 0
      },
      pessimistic: {
        name: 'Cenário Pessimista',
        description: 'Dólar sobe, frete aumenta',
        dollar_change: 10,
        freight_change: 20,
        buy_price_change: 0,
        sell_price_change: 0,
        rain_mm: null,
        temperature_change: 0
      },
      drought: {
        name: 'Cenário de Seca',
        description: 'Chuva reduzida em 50%',
        dollar_change: 0,
        freight_change: 0,
        buy_price_change: 0,
        sell_price_change: 0,
        rain_mm: -50,
        temperature_change: 0
      },
      heavy_rain: {
        name: 'Cenário de Chuva Excessiva',
        description: 'Chuva aumentada em 100%',
        dollar_change: 0,
        freight_change: 0,
        buy_price_change: 0,
        sell_price_change: 0,
        rain_mm: 100,
        temperature_change: 0
      }
    });
  }, []);

  const handleScenarioChange = (field, value) => {
    setScenario(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyPreset = (preset) => {
    setScenario(preset);
  };

  const runSimulation = async () => {
    if (!opportunity || !opportunity.id) {
      setError('Oportunidade não disponível');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await OpportunityService.simulateScenario(opportunity.id, scenario);
      setSimulationResult(result);
    } catch (err) {
      console.error('Erro ao simular cenário:', err);
      setError(err.message || 'Erro ao executar simulação');
    } finally {
      setLoading(false);
    }
  };

  const resetScenario = () => {
    setScenario({
      dollar_change: 0,
      freight_change: 0,
      buy_price_change: 0,
      sell_price_change: 0,
      rain_mm: null,
      temperature_change: 0
    });
    setSimulationResult(null);
    setError(null);
  };

  const currentROI = opportunity?.roi || 0;
  const simulatedROI = simulationResult?.roi || currentROI;
  const roiDifference = simulatedROI - currentROI;

  // Dados para gráfico de comparação
  const comparisonChartData = {
    labels: ['ROI Atual', 'ROI Simulado'],
    datasets: [
      {
        label: 'ROI (%)',
        data: [currentROI, simulatedROI],
        backgroundColor: [
          currentROI >= 50 ? 'rgba(16, 185, 129, 0.5)' : currentROI >= 30 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)',
          simulatedROI >= 50 ? 'rgba(16, 185, 129, 0.5)' : simulatedROI >= 30 ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)'
        ],
        borderColor: [
          currentROI >= 50 ? '#10b981' : currentROI >= 30 ? '#3b82f6' : '#ef4444',
          simulatedROI >= 50 ? '#10b981' : simulatedROI >= 30 ? '#3b82f6' : '#ef4444'
        ],
        borderWidth: 2
      }
    ]
  };

  const comparisonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `ROI: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          color: theme.colors.textMuted,
          callback: function(value) {
            return `${value}%`;
          }
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      },
      x: {
        ticks: {
          color: theme.colors.textMuted
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)'
        }
      }
    }
  };

  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        🎯 Simulador de Cenários
      </h3>

      {/* Cenários Pré-definidos */}
      {presetScenarios && (
        <div style={{ marginBottom: '24px' }}>
          <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
            Cenários Pré-definidos:
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            {Object.entries(presetScenarios).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => applyPreset(preset)}
                style={{
                  padding: '12px',
                  background: 'rgba(0, 217, 255, 0.1)',
                  border: `1px solid rgba(0, 217, 255, 0.3)`,
                  borderRadius: theme.borderRadius,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(0, 217, 255, 0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(0, 217, 255, 0.1)';
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: '4px' }}>
                  {preset.name}
                </div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                  {preset.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Controles de Simulação */}
      <div
        style={{
          padding: '20px',
          background: 'rgba(0, 217, 255, 0.05)',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(0, 217, 255, 0.2)`,
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '16px' }}>
          Ajuste as variáveis para simular diferentes cenários:
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          {/* Dólar */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
              💵 Dólar: {scenario.dollar_change > 0 ? '+' : ''}{scenario.dollar_change}%
            </label>
            <input
              type="range"
              min="-20"
              max="20"
              value={scenario.dollar_change}
              onChange={(e) => handleScenarioChange('dollar_change', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Frete */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
              🚚 Frete: {scenario.freight_change > 0 ? '+' : ''}{scenario.freight_change}%
            </label>
            <input
              type="range"
              min="-30"
              max="30"
              value={scenario.freight_change}
              onChange={(e) => handleScenarioChange('freight_change', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Preço de Compra */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
              💵 Preço Compra: {scenario.buy_price_change > 0 ? '+' : ''}{scenario.buy_price_change}%
            </label>
            <input
              type="range"
              min="-15"
              max="15"
              value={scenario.buy_price_change}
              onChange={(e) => handleScenarioChange('buy_price_change', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Preço de Venda */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
              💵 Preço Venda: {scenario.sell_price_change > 0 ? '+' : ''}{scenario.sell_price_change}%
            </label>
            <input
              type="range"
              min="-15"
              max="15"
              value={scenario.sell_price_change}
              onChange={(e) => handleScenarioChange('sell_price_change', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          {/* Chuva */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
              🌧️ Chuva: {scenario.rain_mm !== null ? (scenario.rain_mm > 0 ? '+' : '') + scenario.rain_mm + '%' : 'Sem alteração'}
            </label>
            <input
              type="range"
              min="-50"
              max="100"
              value={scenario.rain_mm !== null ? scenario.rain_mm : 0}
              onChange={(e) => {
                const value = parseFloat(e.target.value);
                handleScenarioChange('rain_mm', value === 0 ? null : value);
              }}
              style={{ width: '100%' }}
            />
          </div>

          {/* Temperatura */}
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
              🌡️ Temperatura: {scenario.temperature_change > 0 ? '+' : ''}{scenario.temperature_change}°C
            </label>
            <input
              type="range"
              min="-5"
              max="5"
              step="0.5"
              value={scenario.temperature_change}
              onChange={(e) => handleScenarioChange('temperature_change', parseFloat(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
          <button
            onClick={runSimulation}
            disabled={loading}
            style={{
              flex: 1,
              padding: '12px',
              background: loading 
                ? 'rgba(255, 255, 255, 0.1)' 
                : `linear-gradient(135deg, ${theme.colors.accent} 0%, rgba(0, 217, 255, 0.8) 100%)`,
              border: `2px solid ${theme.colors.accent}`,
              borderRadius: theme.borderRadius,
              color: theme.colors.background,
              fontSize: '14px',
              fontWeight: 'bold',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? '⏳ Simulando...' : '🚀 Simular Cenário'}
          </button>
          <button
            onClick={resetScenario}
            style={{
              padding: '12px 20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              borderRadius: theme.borderRadius,
              color: theme.colors.textPrimary,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            🔄 Resetar
          </button>
        </div>
      </div>

      {/* Resultado da Simulação */}
      {error && (
        <div
          style={{
            padding: '16px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(239, 68, 68, 0.3)`,
            marginBottom: '20px',
            color: theme.colors.textPrimary
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {simulationResult && (
        <>
          {/* Comparação ROI */}
          <div
            style={{
              padding: '20px',
              background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${roiDifference >= 0 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'} 100%)`,
              borderRadius: theme.borderRadius,
              border: `2px solid ${roiDifference >= 0 ? '#10b981' : '#ef4444'}`,
              marginBottom: '20px'
            }}
          >
            <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
              📊 Comparação de ROI
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                  ROI Atual
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
                  {currentROI.toFixed(1)}%
                </div>
              </div>
              <div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                  ROI Simulado
                </div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: roiDifference >= 0 ? '#10b981' : '#ef4444' }}>
                  {simulatedROI.toFixed(1)}%
                </div>
              </div>
            </div>
            <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: theme.borderRadius }}>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                Diferença
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: roiDifference >= 0 ? '#10b981' : '#ef4444' }}>
                {roiDifference >= 0 ? '+' : ''}{roiDifference.toFixed(1)}%
              </div>
            </div>
          </div>

          {/* Gráfico de Comparação */}
          <div
            style={{
              padding: '20px',
              background: 'rgba(0, 217, 255, 0.05)',
              borderRadius: theme.borderRadius,
              border: `1px solid rgba(0, 217, 255, 0.2)`,
              marginBottom: '20px'
            }}
          >
            <div style={{ height: '200px' }}>
              <Line data={comparisonChartData} options={comparisonChartOptions} />
            </div>
          </div>

          {/* Análise de Sensibilidade */}
          {simulationResult.sensitivity && (
            <div
              style={{
                padding: '20px',
                background: 'rgba(124, 58, 237, 0.05)',
                borderRadius: theme.borderRadius,
                border: `1px solid rgba(124, 58, 237, 0.2)`,
                marginBottom: '20px'
              }}
            >
              <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
                📊 Análise de Sensibilidade
              </div>
              <div style={{ fontSize: '13px', color: theme.colors.textPrimary }}>
                {simulationResult.sensitivity.message || 'Análise de sensibilidade não disponível'}
              </div>
            </div>
          )}

          {/* Recomendação Atualizada */}
          {simulationResult.recommendation && (
            <div
              style={{
                padding: '20px',
                background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${getRecommendationColor(simulationResult.recommendation)}15 100%)`,
                borderRadius: theme.borderRadius,
                border: `2px solid ${getRecommendationColor(simulationResult.recommendation)}`,
                marginBottom: '20px',
                textAlign: 'center'
              }}
            >
              <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
                🤖 Recomendação Atualizada
              </div>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: getRecommendationColor(simulationResult.recommendation) }}>
                {simulationResult.recommendation}
              </div>
            </div>
          )}
        </>
      )}

      {/* Informações Adicionais */}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(0, 217, 255, 0.05)',
          border: `1px solid rgba(0, 217, 255, 0.2)`,
          borderRadius: theme.borderRadius,
          fontSize: '12px',
          color: theme.colors.textMuted
        }}
      >
        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
          ℹ️ Sobre o Simulador
        </div>
        <div style={{ marginBottom: '4px' }}>
          • Teste diferentes cenários antes de tomar decisões
        </div>
        <div style={{ marginBottom: '4px' }}>
          • ROI é recalculado considerando todas as variáveis ajustadas
        </div>
        <div>
          • Use cenários pré-definidos para análises rápidas
        </div>
      </div>
    </div>
  );
};

const getRecommendationColor = (rec) => {
  if (!rec) return theme.colors.textMuted;
  switch (rec) {
    case 'COMPRAR':
      return '#10b981';
    case 'AGUARDAR':
      return '#f59e0b';
    case 'NÃO COMPRAR':
      return '#ef4444';
    default:
      return theme.colors.accent;
  }
};

export default ScenarioTab;


