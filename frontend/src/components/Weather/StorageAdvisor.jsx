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
    if (opportunity && forecast && forecast.length > 0) {
      // Debounce: Espera 500ms após parar de mexer no slider para chamar a API
      const timer = setTimeout(() => {
          fetchAnalysis();
      }, 500);
      return () => clearTimeout(timer);
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
        opportunity.buyPrice,
        opportunity.riskLevel || 1,
        dailyRain,
        dailyTempMax,
        dailySun,
        dailyTempMin,
        opportunity.lat,
        opportunity.lng,
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
        label: 'Preço Previsto',
        data: analysis.prices,
        // Estilo Neon Verde
        borderColor: '#22c55e', 
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)'); 
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
          return gradient;
        },
        tension: 0.4,
        fill: true,
        pointRadius: 0, // Limpo (sem bolinhas)
        pointHoverRadius: 6,
        borderWidth: 3
      },
      {
        label: 'Ponto de Equilíbrio (Custo)',
        data: analysis.costs,
        // Estilo Alerta Vermelho Pontilhado
        borderColor: '#ef4444', 
        backgroundColor: 'transparent',
        borderDash: [5, 5], // Linha tracejada
        tension: 0.4,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        position: 'top',
        labels: { color: '#94a3b8', font: { size: 12 } } // Texto cinza claro
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)', // Tooltip escuro
        titleColor: '#f8fafc',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: R$ ${Number(ctx.raw).toFixed(2)}`
        }
      }
    },
    scales: {
      y: {
        grid: { color: '#334155' }, // Grade escura
        ticks: { color: '#94a3b8' },
        beginAtZero: false // IMPORTANTE: Permite o gráfico focar na variação de preço
      },
      x: {
        grid: { display: false }, // Remove grade vertical
        ticks: { color: '#94a3b8', maxTicksLimit: 6 }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
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
          {analysis.recommendation.risk_event && (
                <div style={{
                    marginBottom: '10px', padding: '8px', borderRadius: '4px', fontSize: '12px',
                    background: analysis.recommendation.risk_event.includes('Favorável') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: analysis.recommendation.risk_event.includes('Favorável') ? '#86efac' : '#fca5a5',
                    border: `1px solid ${analysis.recommendation.risk_event.includes('Favorável') ? '#22c55e' : '#ef4444'}`
                }}>
                    📢 <strong>Análise:</strong> {analysis.recommendation.risk_event}
                </div>
            )}
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