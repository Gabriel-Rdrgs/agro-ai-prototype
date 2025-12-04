import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2'; // Mudei para Line para misturar dados melhor
import { OpportunityService } from '../../services/opportunityService';
import '../../styles/dashboard.css';
import StorageAdvisor from './StorageAdvisor';

const WeatherDashboard = ({ opportunities = [] }) => {
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- ESTADOS DE FILTRO (A Novidade!) ---
  const [metrics, setMetrics] = useState({
    temp: true,
    rain: true,
    soil: false, // Umidade do solo
    sun: false   // Radiação
  });

  // UX: Auto-seleção
  useEffect(() => {
    if (opportunities.length > 0 && !selectedOppId) {
      setSelectedOppId(opportunities[0].id);
    }
  }, [opportunities, selectedOppId]);

  const selectedOpp = opportunities.find(o => o.id === parseInt(selectedOppId));

useEffect(() => {
    if (selectedOpp) {
      setLoading(true);
      // CORREÇÃO: Coordenadas vêm de 'coords'
      const lat = selectedOpp.coords?.lat;
      const lng = selectedOpp.coords?.lng;
      
      if (lat && lng) {
          OpportunityService.getForecast(lat, lng)
            .then(data => {
              setForecast(data);
              setLoading(false);
            });
      }
    }
  }, [selectedOpp]);

  // --- CONFIGURAÇÃO DINÂMICA DO GRÁFICO ---
  const getDatasets = () => {
    if (!forecast) return [];
    const sets = [];

    if (metrics.temp) {
      sets.push({
        type: 'line', label: 'Temp Máx (°C)', data: forecast.map(d => d.tempMax),
        borderColor: '#ef4444', borderWidth: 2, yAxisID: 'y', tension: 0.4, pointRadius: 0
      });
    }
    if (metrics.rain) {
      sets.push({
        type: 'bar', label: 'Chuva (mm)', data: forecast.map(d => d.rain),
        backgroundColor: 'rgba(0, 217, 255, 0.6)', yAxisID: 'y1'
      });
    }
    if (metrics.soil) {
      sets.push({
        type: 'line', label: 'Umidade Solo (m³/m³)', data: forecast.map(d => d.soil), // Removi a multiplicação por 100 para ser tecnicamente preciso (fração volumétrica) ou mantenha *100 se preferir porcentagem
        borderColor: '#8d4f2b', borderDash: [5,5], borderWidth: 2, yAxisID: 'y', pointRadius: 0
      });
    }
    if (metrics.sun) {
      sets.push({
        type: 'line', label: 'Radiação Solar (MJ)', data: forecast.map(d => d.sun),
        borderColor: '#facc15', borderWidth: 2, yAxisID: 'y1', tension: 0.4, pointRadius: 0
      });
    }
    return sets;
  };

  const chartData = forecast ? {
    labels: forecast.map(d => d.date),
    datasets: getDatasets()
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { labels: { color: '#cbd5e1', font: { size: 11 } } },
      title: { display: false }
    },
    scales: {
      x: { ticks: { color: '#64748b' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { 
        type: 'linear', display: true, position: 'left', 
        ticks: { color: '#cbd5e1' }, grid: { color: 'rgba(255,255,255,0.05)' },
        title: { display: true, text: 'Temperatura / Solo', color: '#64748b', font: {size: 10} }
      },
      y1: { 
        type: 'linear', display: true, position: 'right', 
        grid: { drawOnChartArea: false }, 
        ticks: { color: '#00d9ff' },
        title: { display: true, text: 'Chuva / Sol', color: '#00d9ff', font: {size: 10} }
      },
    }
  };

  const toggleMetric = (key) => setMetrics(prev => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="dashboard-container">
      {/* HEADER & SELETORES */}
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid #334155', paddingBottom: '15px' }}>
        <div>
            <h2 style={{ color: '#fff', margin: '0 0 5px 0' }}>⛈️ Monitoramento Climático</h2>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select 
                value={selectedOppId || ''} 
                onChange={(e) => setSelectedOppId(e.target.value)}
                style={{ padding: '6px', borderRadius: '6px', background: '#15192c', color: '#00d9ff', border: '1px solid #334155', fontWeight: 'bold' }}
                >
                {opportunities.map(op => (
                    <option key={op.id} value={op.id}>
        {/* CORREÇÃO: City e State vêm de 'origin' */}
        {op.product} | {op.origin?.city} - {op.origin?.state}
    </option>
                ))}
                </select>
                <span style={{ fontSize: '12px', color: '#64748b' }}>• Previsão 16 Dias (GFS)</span>
            </div>
        </div>

        {/* BOTÕES DE FILTRO (CHECKBOXES ESTILIZADOS) */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            <button onClick={() => toggleMetric('temp')} style={{ opacity: metrics.temp ? 1 : 0.4, background: '#ef4444', border: 'none', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>🌡️ Temp</button>
            <button onClick={() => toggleMetric('rain')} style={{ opacity: metrics.rain ? 1 : 0.4, background: '#00d9ff', border: 'none', color: '#000', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>☔ Chuva</button>
            <button onClick={() => toggleMetric('soil')} style={{ opacity: metrics.soil ? 1 : 0.4, background: '#8d4f2b', border: 'none', color: 'white', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>🌱 Solo</button>
            <button onClick={() => toggleMetric('sun')} style={{ opacity: metrics.sun ? 1 : 0.4, background: '#facc15', border: 'none', color: '#000', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', fontWeight: 'bold' }}>☀️ Sol</button>
        </div>
      </div>

      {/* GRÁFICO PRINCIPAL */}
      {loading ? (
        <div style={{ color: '#00d9ff', textAlign: 'center', padding: '40px' }}>📡 Baixando dados de satélite...</div>
      ) : forecast ? (
        <div className="dashboard-charts" style={{ marginTop: 0 }}>
          <div className="chart-container" style={{ height: '350px', flex: '2 1 500px' }}>
             <Line data={chartData} options={chartOptions} />
          </div>
          
          {/* CARDS LATERAIS DE RESUMO */}
          <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
             
             {/* Card Chuva (Agora com dados reais de precipitação) */}
             <div style={{ background: '#15192c', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #00d9ff' }}>
                <small style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Precipitação (16d)</small>
                <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>
                    {forecast.reduce((acc, d) => acc + (d.rain || 0), 0).toFixed(1)} mm
                </div>
             </div>

             {/* Card Solo (Agora conectado ao backend) */}
             <div style={{ background: '#15192c', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #8d4f2b' }}>
                <small style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Umidade Solo (Méd)</small>
                <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>
                    {/* Exibindo em % para facilitar leitura */}
                    {((forecast.reduce((acc, d) => acc + (d.soil || 0), 0) / forecast.length) * 100).toFixed(0)}%
                </div>
                <small style={{ color: '#8d4f2b' }}>{forecast[0].soil > 0.4 ? 'Solo Úmido' : 'Solo Seco'}</small>
             </div>

             {/* ☀️ O RETORNO DO CARD DE RADIAÇÃO */}
             <div style={{ background: '#15192c', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #facc15' }}>
                <small style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Radiação Solar (Méd)</small>
                <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>
                    {(forecast.reduce((acc, d) => acc + (d.sun || 0), 0) / forecast.length).toFixed(1)} MJ
                </div>
                <small style={{ color: '#facc15' }}>Energia acumulada</small>
             </div>

          </div>
        </div>
      ) : (
        <div style={{ color: '#64748b' }}>Selecione uma oportunidade.</div>
      )}

      {/* IA DE ARMAZENAGEM */}
      <StorageAdvisor opportunity={selectedOpp} forecast={forecast} />
    </div>
  );
};

export default WeatherDashboard;