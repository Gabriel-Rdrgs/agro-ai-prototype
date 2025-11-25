import React, { useState, useEffect } from 'react';
import { OpportunityService } from '../../services/opportunityService';
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
import { Line } from 'react-chartjs-2';
import '../../styles/StorageAdvisor.css'; // Importando o CSS novo

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

const StorageAdvisor = ({ opportunity, forecast }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opportunity) {
      fetchAnalysis();
    }
  }, [opportunity, forecast]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const dailyRain = forecast ? forecast.map(d => d.rain) : [];
      const dailyTempMax = forecast ? forecast.map(d => d.tempMax) : [];
      const dailyTempMin = forecast ? forecast.map(d => d.tempMin) : [];
      const dailySun = forecast ? forecast.map(d => d.sun) : [];

      // --- CORREÇÃO DE COORDENADAS ---
      // Tenta pegar lat/lng da raiz OU do array position (fallback)
      let lat = opportunity.lat;
      let lng = opportunity.lng;

      if (!lat && opportunity.position && opportunity.position.length === 2) {
          lat = opportunity.position[0];
          lng = opportunity.position[1];
      }
      
      console.log("📍 Enviando para IA:", { product: opportunity.product, state: opportunity.state, lat, lng });

      const data = await OpportunityService.getStorageAnalysis(
        opportunity.product,
        opportunity.state,
        opportunity.buyPrice,
        opportunity.riskLevel,
        dailyRain,
        dailyTempMax,
        dailySun,
        dailyTempMin,
        lat, // <--- Agora usamos as variáveis tratadas
        lng
      );
      setAnalysis(data);
    } catch (error) {
      console.error("Erro ao buscar análise:", error);
    } finally {
      setLoading(false);
    }
  };
  
  if (!opportunity) return null;

  // --- Helpers de Visual ---

  const getStatusColor = () => {
    if (!analysis) return '';
    const action = analysis.recommendation.action.toUpperCase();
    if (action.includes('ARMAZENAR')) return 'status-green';
    if (action.includes('VENDER') && !action.includes('PARCIAL')) return 'status-red';
    return 'status-yellow';
  };

  // Configuração do Gráfico (Estilo Enterprise)
  const chartData = analysis ? {
    labels: analysis.chart_data.labels,
    datasets: [
      {
        label: 'Preço Projetado (R$)',
        data: analysis.chart_data.prices,
        borderColor: '#10B981', // Verde Esmeralda
        backgroundColor: 'rgba(16, 185, 129, 0.1)', // Fundo suave
        tension: 0.4, // Curva suave
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 6,
      },
      {
        label: 'Custo Acumulado (R$)',
        data: analysis.chart_data.costs.map(c => c + opportunity.buyPrice),
        borderColor: '#EF4444', // Vermelho
        borderDash: [5, 5],
        tension: 0.1,
        pointRadius: 0,
        fill: false
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top', 
        align: 'end',
        labels: { color: '#94a3b8' } // Cor do texto da legenda (cinza claro)
      },
      tooltip: { 
        mode: 'index', 
        intersect: false,
        backgroundColor: '#15192c', // Fundo do tooltip escuro
        titleColor: '#ffffff',      // Texto branco
        bodyColor: '#94a3b8',       // Texto cinza
        borderColor: '#00d9ff',     // Borda Cyan
        borderWidth: 1
      },
    },
    scales: {
      y: { 
        grid: { color: 'rgba(255, 255, 255, 0.05)' }, // Linhas da grade bem sutis
        ticks: { 
          color: '#94a3b8', // Cor dos números
          callback: (value) => `R$ ${value}` 
        }
      },
      x: { 
        grid: { display: false },
        ticks: { color: '#94a3b8' } // Cor das datas
      }
    }
  };
  
  return (
    <div className="advisor-container">
      <div className="advisor-header">
        <h2>🧠 Inteligência de Mercado (IA)</h2>
        <p>Análise preditiva para <strong>{opportunity.product}</strong> considerando custos e clima.</p>
      </div>

      <div className="advisor-content">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <span>Consultando redes neurais...</span>
          </div>
        ) : !analysis ? (
          <div className="error-state">
            ⚠️ Dados insuficientes para gerar projeção.
          </div>
        ) : (
          <>
            {/* 1. Card de Decisão Principal */}
            <div className={`decision-card ${getStatusColor()}`}>
              <div className="decision-label">RECOMENDAÇÃO ESTRATÉGICA</div>
              <div className="decision-action">{analysis.recommendation.action}</div>
              <div className="decision-reason">
                "{analysis.recommendation.risk_event}"
              </div>
            </div>

            {/* 2. Grid de Métricas */}
            <div className="metrics-row">
              {/* Lucro */}
              <div className="metric-box">
                <label>Lucro Projetado</label>
                <span className={analysis.recommendation.projected_profit > 0 ? 'text-green' : 'text-red'}>
                  R$ {analysis.recommendation.projected_profit}
                </span>
                <small>por unidade</small>
              </div>

              {/* Data Ideal */}
              <div className="metric-box">
                <label>Melhor Momento</label>
                <span className="text-dark">
                  {analysis.recommendation.best_day_date}
                </span>
                <small>Pico de preço</small>
              </div>

              {/* Confiança */}
              <div className="metric-box">
                <label>Nível de Confiança</label>
                <div className="confidence-wrapper">
                  <span className="confidence-value">
                    {Math.round(analysis.recommendation.confidence_score * 100)}%
                  </span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{width: `${analysis.recommendation.confidence_score * 100}%`}}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Gráfico */}
            <div className="chart-wrapper">
              <Line data={chartData} options={chartOptions} />
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StorageAdvisor;