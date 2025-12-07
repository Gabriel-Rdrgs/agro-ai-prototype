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
      // Debounce para não chamar a API excessivamente
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
      // Prepara dados do clima
      const dailyRain = forecast.map(d => d.rain || 0);
      const dailyTempMax = forecast.map(d => d.tempMax || 25);
      const dailyTempMin = forecast.map(d => d.tempMin || 18);
      const dailySun = forecast.map(d => d.sun || 0);

      // --- CORREÇÃO CRÍTICA DE DADOS ---
      // Extração segura para não enviar undefined/NaN para o Python
      const financials = opportunity.financials || {};
      const origin = opportunity.origin || {};
      const coords = opportunity.coords || {};
      const details = opportunity.details || {};

      const result = await OpportunityService.getStorageAnalysis(
        opportunity.product,
        origin.state || 'SP',                  // Lê de 'origin'
        financials.sellPrice || 0,             // Lê de 'financials' (Venda)
        financials.buyPrice || 0,              // Lê de 'financials' (Compra)
        details.riskLevel || 1,                // Lê de 'details'
        dailyRain,
        dailyTempMax,
        dailySun,
        dailyTempMin,
        coords.lat || 0,                       // Lê de 'coords'
        coords.lng || 0
      );

      if (result && result.recommendation) {
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

// --- PREPARAÇÃO DO GRÁFICO (LÓGICA HÍBRIDA) ---
  // O Backend pode mandar os dados "achatados" (na raiz) ou "aninhados" (chart_data).
  // Esta lógica garante que encontramos os arrays onde quer que estejam.
  const labels = analysis?.labels || analysis?.chart_data?.labels;
  const prices = analysis?.prices || analysis?.chart_data?.prices;
  const costs = analysis?.costs || analysis?.chart_data?.costs;
  
  // Normaliza a recomendação também
  const recommendation = analysis?.recommendation || analysis || {};

  const chartData = (labels && prices) ? {
    labels: labels,
    datasets: [
      {
        label: 'Preço Previsto (Kg)',
        data: prices,
        borderColor: '#22c55e', 
        backgroundColor: (context) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(34, 197, 94, 0.4)'); 
          gradient.addColorStop(1, 'rgba(34, 197, 94, 0.0)');
          return gradient;
        },
        tension: 0,
        fill: true,
        pointRadius: 2,
        borderWidth: 2
      },
      {
        label: 'Custo Acumulado',
        data: costs,
        borderColor: '#ef4444', 
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0,
        pointRadius: 0,
        borderWidth: 2
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#94a3b8', font: { size: 12 } } },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
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
        grid: { color: '#334155' },
        ticks: { color: '#94a3b8' },
        beginAtZero: false
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', maxTicksLimit: 6 }
      }
    },
    interaction: { mode: 'nearest', axis: 'x', intersect: false }
  };

  // --- RENDERIZAÇÃO ---
  return (
    <div className="storage-advisor-container">
      <div className="advisor-header">
        <h4>🧠 Inteligência de Armazenagem (IA)</h4>
        
        {/* Badge de Recomendação */}
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

        {/* 3. Empty State */}
        {!loading && !error && !analysis && (
          <div className="empty-state text-muted text-center p-4">
            Aguardando seleção de oportunidade...
          </div>
        )}

        {/* 4. DADOS COMPLETOS (SEU LAYOUT RICO) */}
        {!loading && !error && analysis && analysis.recommendation && (
          <>
          {/* Alerta de Risco */}
          {analysis.recommendation.risk_event && (
                <div style={{
                    marginBottom: '10px', padding: '8px', borderRadius: '4px', fontSize: '12px',
                    background: analysis.recommendation.risk_event.includes('Favorável') || analysis.recommendation.risk_event.includes('Estável') ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: analysis.recommendation.risk_event.includes('Favorável') || analysis.recommendation.risk_event.includes('Estável') ? '#86efac' : '#fca5a5',
                    border: `1px solid ${analysis.recommendation.risk_event.includes('Favorável') ? '#22c55e' : '#ef4444'}`
                }}>
                    📢 <strong>Análise:</strong> {analysis.recommendation.risk_event}
                </div>
            )}
            
            <div className="metrics-grid">
              {/* Lucro Projetado (CORRIGIDO: Lê projected_profit) */}
              <div className="metric-box">
                <label>Lucro Projetado</label>
                <span className={analysis.recommendation.projected_profit > 0 ? 'text-green' : 'text-red'}>
                  R$ {analysis.recommendation.projected_profit?.toFixed(2)}
                </span>
                <small>diferencial por unidade</small>
              </div>

              {/* Data Ideal (CORRIGIDO: Lê best_day_date) */}
              <div className="metric-box">
                <label>Melhor Momento</label>
                <span className="text-dark">
                  Dia {analysis.recommendation.best_day_date}
                </span>
                <small>Pico de preço</small>
              </div>

              {/* Confiança (Sua barra de progresso original) */}
              <div className="metric-box">
                <label>Nível de Confiança</label>
                <div className="confidence-wrapper">
                  <span className="confidence-value">
                    {Math.round(analysis.recommendation.confidence_score * 100)}%
                  </span>
                  <div className="progress-bar-custom">
                    <div 
                      className="progress-fill" 
                      style={{
                        width: `${analysis.recommendation.confidence_score * 100}%`,
                        backgroundColor: analysis.recommendation.confidence_score > 0.8 ? '#27ae60' : '#f1c40f',
                        height: '6px',
                        borderRadius: '3px',
                        transition: 'width 1s ease'
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Gráfico */}
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