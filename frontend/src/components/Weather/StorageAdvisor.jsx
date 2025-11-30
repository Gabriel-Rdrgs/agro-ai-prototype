// frontend/src/components/Weather/StorageAdvisor.jsx
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
import '../../styles/StorageAdvisor.css';

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
  const [error, setError] = useState(null);

  useEffect(() => {
    // Validação robusta antes de chamar a API
    if (opportunity && forecast && forecast.length > 0) {
      fetchAnalysis();
    }
  }, [opportunity, forecast]);

  const fetchAnalysis = async () => {
    setLoading(true);
    setError(null);
    try {
      // Prepara dados do clima (map segurando falhas)
      const dailyRain = forecast.map(d => d.rain || 0);
      const dailyTempMax = forecast.map(d => d.tempMax || 25);
      const dailyTempMin = forecast.map(d => d.tempMin || 18);
      const dailySun = forecast.map(d => d.sun || 0);

      // Chama o serviço
      const result = await OpportunityService.getStorageAnalysis(
        opportunity.product,
        opportunity.state,
        opportunity.sellPrice,
        opportunity.riskLevel || 1,
        dailyRain,
        dailyTempMax,
        dailySun,
        dailyTempMin,
        opportunity.lat,
        opportunity.lng
      );

      if (result) {
        setAnalysis(result);
      } else {
        throw new Error("Dados de análise vazios");
      }
    } catch (err) {
      console.error("❌ Erro no Advisor:", err);
      setError("Não foi possível conectar à Inteligência Artificial.");
    } finally {
      setLoading(false);
    }
  };

  // --- PREPARAÇÃO DO GRÁFICO (COM SEGURANÇA) ---
  // Só montamos o objeto data se analysis e labels existirem
  const chartData = (analysis && analysis.labels) ? {
    labels: analysis.labels,
    datasets: [
      {
        label: 'Preço Previsto (R$/kg)',
        data: analysis.prices,
        borderColor: '#27ae60',
        backgroundColor: 'rgba(39, 174, 96, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 3,
        pointHoverRadius: 5
      },
      {
        label: 'Custo Acumulado',
        data: analysis.costs,
        borderColor: '#e74c3c',
        borderDash: [5, 5],
        tension: 0.1,
        fill: false,
        pointRadius: 0
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: R$ ${Number(ctx.raw).toFixed(2)}`
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    scales: {
      y: {
        beginAtZero: false,
        grid: { color: '#f0f0f0' }
      },
      x: {
        grid: { display: false }
      }
    }
  };

  // --- RENDERIZAÇÃO ---
  return (
    <div className="storage-advisor-container">
      <div className="advisor-header">
        <h4>🧠 Inteligência de Armazenagem (IA)</h4>
        
        {/* Badge de Recomendação (Só exibe se existir) */}
        {analysis && analysis.recommendation && (
          <div className={`recommendation-badge ${analysis.recommendation.action?.includes('VENDER') ? 'sell' : 'store'}`}>
            {analysis.recommendation.action?.replace(/_/g, ' ')}
          </div>
        )}
      </div>

      <div className="advisor-content">
        {/* 1. Loading */}
        {loading && (
          <div className="loading-state" style={{padding: '20px', textAlign: 'center'}}>
            <div className="spinner-border text-success" role="status"></div>
            <p className="mt-2 text-muted">Simulando 30 dias de mercado e clima...</p>
          </div>
        )}

        {/* 2. Erro */}
        {!loading && error && (
          <div className="alert alert-danger">
            <i className="fas fa-exclamation-triangle"></i> {error}
            <button className="btn btn-link btn-sm ms-2" onClick={fetchAnalysis}>Tentar novamente</button>
          </div>
        )}

        {/* 3. Empty State (Se não houver dados e não estiver carregando) */}
        {!loading && !error && !analysis && (
          <div className="empty-state text-muted text-center p-4">
            Aguardando seleção de oportunidade...
          </div>
        )}

        {/* 4. DADOS COMPLETOS (Seu Layout Original) */}
        {!loading && !error && analysis && analysis.recommendation && (
          <>
            <div className="metrics-grid">
              {/* Lucro Projetado */}
              <div className="metric-box">
                <label>Lucro Projetado</label>
                <span className={analysis.recommendation.estimated_profit > 0 ? 'text-green' : 'text-red'}>
                  R$ {analysis.recommendation.estimated_profit?.toFixed(2)}
                </span>
                <small>por unidade</small>
              </div>

              {/* Data Ideal */}
              <div className="metric-box">
                <label>Melhor Momento</label>
                <span className="text-dark">
                  Dia {analysis.recommendation.best_day}
                </span>
                <small>Pico de preço</small>
              </div>

              {/* Confiança */}
              <div className="metric-box">
                <label>Nível de Confiança</label>
                <div className="confidence-wrapper">
                  <span className="confidence-value">
                    {Math.round(analysis.recommendation.confidence * 100)}%
                  </span>
                  <div className="progress-bar-custom">
                    <div 
                      className="progress-fill" 
                      style={{
                        width: `${analysis.recommendation.confidence * 100}%`,
                        backgroundColor: analysis.recommendation.confidence > 0.8 ? '#27ae60' : '#f1c40f',
                        height: '6px',
                        borderRadius: '3px',
                        transition: 'width 1s ease'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico (Só renderiza se chartData existir) */}
            <div className="chart-wrapper mt-4" style={{ height: '300px', position: 'relative' }}>
              {chartData && <Line data={chartData} options={chartOptions} />}
            </div>
            
            <div className="advisor-footer mt-3 text-end">
              <small className="text-muted" style={{fontSize: '0.75rem'}}>
                *Considera deterioração biológica e custos operacionais
              </small>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StorageAdvisor;