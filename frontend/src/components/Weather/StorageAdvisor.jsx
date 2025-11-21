import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import { OpportunityService } from '../../services/opportunityService';
import '../../styles/dashboard.css';

const StorageAdvisor = ({ product = "Tomate" }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🚀 EFEITO: Chama o serviço (que chama o Python)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    
    console.log(`📊 StorageAdvisor: Iniciando análise para ${product}...`);

    // Chama a função do OpportunityService.js
    OpportunityService.getStorageAnalysis(product)
      .then(data => {
        if (isMounted && data) {
            console.log("📊 Dados recebidos no componente:", data);
            setAnalysis(data);
            setLoading(false);
        }
      })
      .catch(err => {
          console.error("Erro no componente:", err);
          if (isMounted) setLoading(false);
      });

    return () => { isMounted = false };
  }, [product]);

  // Estado de Carregamento (Visual tecnológico)
  if (loading) {
      return (
        <div style={{ marginTop: '30px', background: '#0f172a', padding: '40px', borderRadius: '16px', border: '1px solid #334155', textAlign: 'center' }}>
            <h3 style={{ color: '#00d9ff' }}>🔄 Conectando ao Cérebro Neural...</h3>
            <p style={{ color: '#94a3b8' }}>Processando viabilidade logística no Python.</p>
        </div>
      );
  }

  // Se não tiver dados, não mostra nada (ou poderia mostrar erro)
  if (!analysis) return null;

  // --- CONFIGURAÇÃO DO GRÁFICO ---
  const data = {
    labels: analysis.labels,
    datasets: [
      {
        label: 'Preço de Mercado Previsto (R$/kg)',
        data: analysis.prices,
        borderColor: '#10b981', // Verde
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        yAxisID: 'y',
        tension: 0.4,
        fill: true
      },
      {
        label: 'Custo Acumulado de Armazenagem (R$/kg)',
        data: analysis.costs,
        borderColor: '#ef4444', // Vermelho
        borderDash: [5, 5],
        yAxisID: 'y',
        tension: 0.1
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#cbd5e1' } },
      tooltip: { 
          callbacks: { 
              label: (ctx) => `R$ ${Number(ctx.raw).toFixed(2)}` 
          } 
      }
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: '#334155' } },
      y: { 
          ticks: { color: '#cbd5e1', callback: (v) => `R$ ${v}` }, 
          grid: { color: '#334155' },
          title: { display: true, text: 'Valor (R$)', color: '#94a3b8' }
      }
    }
  };

  const { recommendation } = analysis;

  return (
    <div style={{ marginTop: '30px', background: '#0f172a', padding: '20px', borderRadius: '16px', border: '1px solid #334155' }}>
      
      {/* --- HEADER E KPI PRINCIPAL --- */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <h3 style={{ color: '#00d9ff', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                🧠 IA de Armazenagem Estratégica
                <span style={{ fontSize: '10px', background: '#10b981', color: '#000', padding: '2px 6px', borderRadius: '4px' }}>ONLINE</span>
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginTop: '5px' }}>
                Análise de oportunidade baseada na previsão climática de concorrentes.
            </p>
          </div>

          <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', padding: '10px 20px', borderRadius: '8px', textAlign: 'right' }}>
              <span style={{ display: 'block', fontSize: '12px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>Recomendação da IA</span>
              <strong style={{ color: '#fff', fontSize: '18px' }}>
                  {recommendation.extraProfit > 0 ? `ARMAZENAR POR ${recommendation.bestDayIndex + 1} DIAS` : "VENDER IMEDIATAMENTE"}
              </strong>
              <span style={{ display: 'block', fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
                  Venda prevista para {recommendation.bestDayLabel}. Lucro extra: +R$ {recommendation.extraProfit.toFixed(2)}/kg
              </span>
          </div>
      </div>

      {/* --- CONTEÚDO PRINCIPAL (GRÁFICO + INSIGHTS) --- */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          
          {/* GRÁFICO */}
          <div style={{ height: '300px', background: '#1e293b', padding: '15px', borderRadius: '12px' }}>
              <Line data={data} options={options} />
          </div>

          {/* INSIGHTS LATERAIS */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #facc15' }}>
                  <strong style={{ color: '#facc15', fontSize: '14px' }}>⚠️ Evento Gatilho Detectado</strong>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '5px 0 0 0' }}>
                      {recommendation.riskEvent}. Probabilidade de impacto: <strong>{recommendation.riskProbability}</strong>.
                  </p>
              </div>

              <div style={{ background: '#1e293b', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #00d9ff' }}>
                  <strong style={{ color: '#00d9ff', fontSize: '14px' }}>📉 Impacto na Oferta</strong>
                  <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '5px 0 0 0' }}>
                      A quebra de safra reduzirá a oferta nacional, pressionando o preço para cima a partir do ponto de inflexão.
                  </p>
              </div>

              <button style={{ 
                  marginTop: 'auto', 
                  background: '#10b981', 
                  color: '#000', 
                  border: 'none', 
                  padding: '12px', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
              }}>
                  ❄️ Reservar Câmara Fria
              </button>
          </div>
      </div>
    </div>
  );
};

export default StorageAdvisor;