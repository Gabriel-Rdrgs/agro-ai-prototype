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

// Registra os componentes do gráfico (caso não tenha sido feito globalmente)
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

const StorageAdvisor = ({ opportunity }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (opportunity) {
      fetchAnalysis();
    }
  }, [opportunity]);

  const fetchAnalysis = async () => {
    setLoading(true);
    try {
      const data = await OpportunityService.getStorageAnalysis(
        opportunity.product,
        opportunity.buyPrice
      );
      setAnalysis(data);
    } catch (error) {
      console.error("Erro na IA:", error);
    } finally {
      setLoading(false);
    }
  };

  if (!opportunity) return <div className="advisor-card empty">Selecione uma oportunidade no mapa</div>;

  // --- CONFIGURAÇÃO DO GRÁFICO ---
  const chartData = analysis ? {
    labels: analysis.chart_data.labels,
    datasets: [
      {
        label: 'Preço de Venda Projetado (R$)',
        data: analysis.chart_data.prices,
        borderColor: '#10b981', // Verde
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        tension: 0.4,
        fill: false,
        pointRadius: 0, // Linha limpa
        pointHitRadius: 10,
      },
      {
        label: 'Custo Total (Compra + Armazenagem)',
        // Aqui somamos o Custo de Armazenagem (python) ao Preço de Compra Original
        data: analysis.chart_data.costs.map(c => c + opportunity.buyPrice),
        borderColor: '#ef4444', // Vermelho
        borderWidth: 2,
        borderDash: [5, 5], // Linha tracejada para indicar custo
        tension: 0.4,
        pointRadius: 0,
        pointHitRadius: 10,
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#94a3b8', font: { size: 10 } }
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        titleColor: '#fff',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        callbacks: {
            label: (context) => {
                return `${context.dataset.label}: R$ ${context.raw.toFixed(2)}`;
            },
            footer: (tooltipItems) => {
                // Calcula o lucro no tooltip
                const price = tooltipItems[0].parsed.y;
                const cost = tooltipItems[1].parsed.y;
                const profit = price - cost;
                return `Lucro Líquido: R$ ${profit.toFixed(2)}`;
            }
        }
      },
      // Linha vertical no melhor dia
      annotation: {
          // (Requer plugin extra, vamos manter simples por enquanto)
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', maxTicksLimit: 6 }
      },
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#64748b', callback: (v) => `R$ ${v}` }
      }
    }
  };

  return (
    <div className="advisor-container">
      <div className="advisor-header">
        <div>
            <h3>🧠 IA de Armazenagem</h3>
            <p style={{fontSize: '11px', color: '#64748b', margin: 0}}>Análise de Margem Líquida (30 Dias)</p>
        </div>
        <span className="ai-badge">Python V2.1</span>
      </div>

      {loading ? (
        <div className="advisor-loading">
          <div className="spinner"></div>
          <p>Simulando cenários futuros...</p>
        </div>
      ) : analysis ? (
        <div className="advisor-content fade-in">
          
          {/* GRÁFICO DE DECISÃO (NOVO) */}
          <div style={{ height: '200px', marginBottom: '20px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px', padding: '10px' }}>
              <Line data={chartData} options={chartOptions} />
          </div>

          {/* RECOMENDAÇÃO */}
          <div style={{ display: 'flex', gap: '15px', alignItems: 'stretch' }}>
              {/* Box Esquerdo: Ação */}
              <div className={`recommendation-box ${analysis.recommendation.action.includes('VENDER') ? 'sell' : 'hold'}`} style={{ flex: 1, marginBottom: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span className="action-label">ESTRATÉGIA</span>
                <h2 style={{fontSize: '1.4rem'}}>{analysis.recommendation.action}</h2>
                <p className="confidence" style={{fontSize: '0.8rem'}}>Confiança: {Math.round(analysis.recommendation.confidence_score * 100)}%</p>
              </div>

              {/* Box Direito: Dados */}
              <div style={{ flex: 1.5, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div className="analysis-item" style={{padding: '8px'}}>
                    <label>Pico de Lucro</label>
                    <strong style={{ color: '#10b981' }}>{analysis.recommendation.best_day_date}</strong>
                    <small>R$ {analysis.recommendation.projected_profit}/kg extra</small>
                  </div>
                  <div className="analysis-item" style={{padding: '8px', marginTop: '8px'}}>
                    <label>Motivo</label>
                    <small style={{color: '#cbd5e1'}}>{analysis.recommendation.risk_event}</small>
                  </div>
              </div>
          </div>

        </div>
      ) : (
        <div className="advisor-error">
          Dados insuficientes para projeção.
        </div>
      )}
    </div>
  );
};

export default StorageAdvisor;