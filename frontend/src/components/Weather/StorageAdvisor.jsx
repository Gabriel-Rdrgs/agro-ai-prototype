import React, { useState, useEffect, useCallback } from 'react';
import { StorageService } from '../../services/storageService';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

const StorageAdvisor = ({ currentPrice, rainData, rain, product, state, lat, lng }) => {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const price = parseFloat(currentPrice);
      
      const payload = {
        product: product || 'Tomate',
        state: state || 'SP',
        current_price: price,
        // Lógica de Produtor: Preço de Custo (60%) vs Venda (100%)
        buy_price: price * 0.6, 
        storage_cost_per_day: 0.03,
        accumulated_rainfall: parseFloat(rain) || 0,
        daily_rain: Array.isArray(rainData) ? rainData : [],
        // ✅ Coordenadas para buscar dados climáticos reais por estado
        lat: parseFloat(lat) || 0,
        lng: parseFloat(lng) || 0
      };

      const data = await StorageService.simulateScenario(payload);
      setAnalysis(data);
    } catch (err) {
      console.error("Erro no StorageAdvisor:", err);
      setError("Não foi possível gerar a simulação.");
    } finally {
      setLoading(false);
    }
  }, [currentPrice, product, state, rain, lat, lng, rainData]);

  useEffect(() => {
    if (currentPrice && product) {
      fetchAnalysis();
    }
  }, [currentPrice, product, state, rain, fetchAnalysis]);

  // --- CONFIGURAÇÃO DAS 3 LINHAS ---
  const chartData = analysis ? {
    labels: analysis.chart_data.labels,
    datasets: [
      {
        label: 'Mercado (CEASA)', // Linha Branca (Referência)
        data: analysis.chart_data.prices_market, // Chave correta do backend novo
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.3,
        fill: false,
      },
      {
        label: 'Meu Produto (Real)', // Linha Azul (O que você recebe)
        data: analysis.chart_data.prices_my_product, // Chave correta do backend novo
        borderColor: '#00d9ff',
        backgroundColor: 'rgba(0, 217, 255, 0.1)',
        borderWidth: 3,
        pointRadius: 3,
        tension: 0.3,
        fill: true,
      },
      {
        label: 'Custo Total', // Linha Vermelha
        data: analysis.chart_data.costs,
        borderColor: '#ef4444',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false, // Permite ajustar à altura fixa
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: '#fff', font: {size: 11} } },
      tooltip: {
        backgroundColor: '#15192c',
        titleColor: '#00d9ff',
        bodyColor: '#fff',
        borderColor: 'rgba(0, 217, 255, 0.3)',
        borderWidth: 1,
        callbacks: {
            label: function(context) {
                let label = context.dataset.label || '';
                if (label) label += ': ';
                if (context.parsed.y !== null) {
                    label += new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(context.parsed.y);
                }
                return label;
            }
        }
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8', callback: (val) => `R$ ${val}` }
      },
      x: { display: false }
    }
  };

  return (
    <div className="advisor-container" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="advisor-header">
        <h3>🔮 Simulador de Armazenagem (IA)</h3>
        <small style={{ color: '#94a3b8' }}>Análise de 30 dias: Mercado vs Deterioração</small>
      </div>

      <div className="advisor-content" style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {loading && <div style={{ display:'flex', justifyContent:'center', alignItems:'center', height:'100%', color:'#00d9ff' }}>⚙️ Simulando...</div>}
        {error && <div style={{ padding:'20px', color:'#ef4444', textAlign:'center' }}>{error}</div>}

        {!loading && !error && !analysis && (
          <div style={{ padding: '20px', color: '#94a3b8', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Aguardando dados para simulação...
          </div>
        )}

        {!loading && !error && analysis && (
          <>
            <div className="decision-cards" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div className="metric-box" style={{ background: 'rgba(0, 217, 255, 0.05)', border: '1px solid #00d9ff', borderRadius: '12px', padding: '15px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#00d9ff', textTransform: 'uppercase', marginBottom: '5px', fontWeight:'bold' }}>Recomendação</label>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff' }}>{analysis.recommendation.action}</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>{analysis.recommendation.risk_event}</div>
              </div>
              <div className="metric-box" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10b981', borderRadius: '12px', padding: '15px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#10b981', textTransform: 'uppercase', marginBottom: '5px', fontWeight:'bold' }}>Melhor Cenário</label>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#fff' }}>R$ {analysis.recommendation.projected_profit?.toFixed(2)}/kg</div>
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>Em: {analysis.recommendation.best_day_date}</div>
              </div>
            </div>

            {/* CORREÇÃO ANTI-LOOP + GRÁFICO */}
            <div className="chart-wrapper" style={{ flex: '0 0 300px', height: '300px', width: '100%', position: 'relative' }}>
              <Line data={chartData} options={chartOptions} />
            </div>
            
            <div style={{ marginTop: '10px', textAlign: 'right' }}>
              <small style={{ fontSize: '10px', color: '#666' }}>*Base: Custo Prod. (60%) + Taxas e Quebra.</small>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default StorageAdvisor;