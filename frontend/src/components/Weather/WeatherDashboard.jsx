import React, { useState, useEffect } from 'react';
import { Bar } from 'react-chartjs-2';
import { OpportunityService } from '../../services/opportunityService';
import '../../styles/dashboard.css';
import StorageAdvisor from './StorageAdvisor';

const WeatherDashboard = ({ opportunities = [] }) => {
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  // UX: Seleciona automaticamente a primeira cidade quando os dados carregam
  useEffect(() => {
    if (opportunities.length > 0 && !selectedOppId) {
      setSelectedOppId(opportunities[0].id);
    }
  }, [opportunities, selectedOppId]);

  // Encontra o objeto completo da oportunidade selecionada
  const selectedOpp = opportunities.find(o => o.id === parseInt(selectedOppId));

  // Busca previsão do tempo quando muda a seleção
  useEffect(() => {
    if (selectedOpp) {
      setLoading(true);
      OpportunityService.getForecast(selectedOpp.lat, selectedOpp.lng) // Usa lat/lng reais do banco
        .then(data => {
          setForecast(data);
          setLoading(false);
        });
    }
  }, [selectedOpp]);

  // Configuração do Gráfico
  const chartData = forecast ? {
    labels: forecast.map(d => d.date),
    datasets: [
      {
        type: 'line',
        label: 'Temp Máx (°C)',
        data: forecast.map(d => d.tempMax),
        borderColor: '#ef4444',
        borderWidth: 2,
        yAxisID: 'y',
      },
      {
        type: 'bar',
        label: 'Chuva (mm)',
        data: forecast.map(d => d.rain),
        backgroundColor: 'rgba(0, 217, 255, 0.6)',
        yAxisID: 'y1',
      }
    ]
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#fff' } },
      title: { display: true, text: `Previsão: ${selectedOpp?.city || 'Selecione'}`, color: '#fff' }
    },
    scales: {
      x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
      y: { 
        type: 'linear', display: true, position: 'left', 
        ticks: { color: '#ef4444' }, title: { display: true, text: 'Temperatura' } 
      },
      y1: { 
        type: 'linear', display: true, position: 'right', 
        grid: { drawOnChartArea: false }, 
        ticks: { color: '#00d9ff' }, title: { display: true, text: 'Chuva (mm)' } 
      },
    }
  };

  return (
    <div className="dashboard-container">
      {/* HEADER */}
      <div style={{ marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
        <h2 style={{ color: '#fff', margin: '0 0 10px 0' }}>⛈️ Inteligência Climática</h2>
        <p style={{ color: '#94a3b8', fontSize: '14px' }}>Monitore os riscos meteorológicos nas regiões de produção.</p>
      </div>

      {/* SELETOR (Aqui você escolhe a oportunidade!) */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ color: '#00d9ff', fontWeight: 'bold', marginRight: '10px' }}>Monitorar Região:</label>
        <select 
          value={selectedOppId || ''} 
          onChange={(e) => setSelectedOppId(e.target.value)}
          style={{ padding: '8px', borderRadius: '8px', background: '#15192c', color: 'white', border: '1px solid #334155' }}
        >
          {opportunities.map(op => (
            <option key={op.id} value={op.id}>{op.product} ({op.city} - {op.state})</option>
          ))}
        </select>
      </div>

      {/* GRÁFICOS DE CLIMA */}
      {loading ? (
        <div style={{ color: '#00d9ff', textAlign: 'center', padding: '40px' }}>📡 Baixando dados de satélite...</div>
      ) : forecast ? (
        <div className="dashboard-charts">
          <div className="chart-container" style={{ height: '350px' }}>
             <Bar data={chartData} options={chartOptions} />
          </div>
          
          {/* CARD DE RISCO */}
          <div className="chart-container" style={{ height: 'auto', minHeight: 'auto' }}>
             <h3 style={{ color: '#fff', fontSize: '16px', marginBottom: '10px' }}>⚠️ Análise de Risco (7 Dias)</h3>
             {forecast.reduce((acc, day) => acc + day.rain, 0) > 50 ? (
                <div style={{ padding: '15px', background: 'rgba(239,68,68,0.2)', borderLeft: '4px solid #ef4444', borderRadius: '4px' }}>
                   <strong style={{ color: '#ef4444' }}>ALERTA DE CHUVA EXCESSIVA</strong>
                   <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#cbd5e1' }}>
                     Acumulado previsto de <strong>{forecast.reduce((acc, day) => acc + day.rain, 0).toFixed(1)}mm</strong>. 
                     Risco alto para colheita e transporte. Considere adiar.
                   </p>
                </div>
             ) : (
                <div style={{ padding: '15px', background: 'rgba(16,185,129,0.2)', borderLeft: '4px solid #10b981', borderRadius: '4px' }}>
                   <strong style={{ color: '#10b981' }}>CONDIÇÕES FAVORÁVEIS</strong>
                   <p style={{ margin: '5px 0 0 0', fontSize: '13px', color: '#cbd5e1' }}>
                     Previsão de tempo estável. Acumulado de chuva baixo. Ideal para operações logísticas.
                   </p>
                </div>
             )}
          </div>
        </div>
      ) : (
        <div style={{ color: '#64748b', padding: '20px' }}>Selecione uma região acima para ver a previsão.</div>
      )}

      {/* 🧠 IA DE ARMAZENAGEM (Agora Conectada Corretamente!) */}
      {/* O erro estava aqui: Antes passava 'product', agora passa 'opportunity' inteiro */}
      <StorageAdvisor opportunity={selectedOpp} />

    </div>
  );
};

export default WeatherDashboard;