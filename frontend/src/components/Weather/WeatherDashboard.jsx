import React, { useState, useEffect, useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { OpportunityService } from '../../services/opportunityService';
import '../../styles/dashboard.css';
import StorageAdvisor from './StorageAdvisor';

// Registro dos componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const WeatherDashboard = ({ opportunities = [] }) => {
  const [selectedOppId, setSelectedOppId] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- 1. ESTADO DOS FILTROS ---
  const [metrics, setMetrics] = useState({
    temp: true,
    rain: true,
    hum: false, // Umidade
    et0: false  // Evapotranspiração
  });

  // UX: Auto-seleção da primeira oportunidade
  useEffect(() => {
    if (opportunities.length > 0 && !selectedOppId) {
      setSelectedOppId(opportunities[0].id);
    }
  }, [opportunities, selectedOppId]);

  const selectedOpp = opportunities.find(o => o.id === parseInt(selectedOppId));

  // Busca de Dados (com retry logic)
  useEffect(() => {
    if (selectedOpp) {
      setLoading(true);
      const lat = selectedOpp.coords?.lat;
      const lng = selectedOpp.coords?.lng;
      
      if (lat && lng) {
          // Retry logic: tenta até 3 vezes com delay crescente
          let retries = 0;
          const maxRetries = 3;
          
          const fetchWithRetry = async () => {
            try {
              const data = await OpportunityService.getForecast(lat, lng);
              console.log("📊 Dados recebidos do clima:", data);
              // Garante que temos a estrutura correta
              if (data && (data.data || data.daily)) {
                setForecast(data);
                setLoading(false);
              } else {
                console.warn("⚠️ Estrutura de dados inválida:", data);
                if (retries < maxRetries) {
                  retries++;
                  setTimeout(fetchWithRetry, 2000 * retries); // Delay crescente: 2s, 4s, 6s
                } else {
                  setForecast(null);
                  setLoading(false);
                }
              }
            } catch (err) {
              console.error(`❌ Erro ao buscar clima (tentativa ${retries + 1}/${maxRetries}):`, err);
              if (retries < maxRetries) {
                retries++;
                setTimeout(fetchWithRetry, 2000 * retries); // Retry com delay crescente
              } else {
                setForecast(null);
                setLoading(false);
              }
            }
          };
          
          fetchWithRetry();
      } else {
        console.warn("⚠️ Coordenadas inválidas:", { lat, lng });
        setLoading(false);
      }
    }
  }, [selectedOpp]);

  // --- 2. EXTRAÇÃO SEGURA DE DADOS (16 DIAS) ---
  const fData = forecast?.data || forecast?.daily || {};
  const time = Array.isArray(fData.time) ? fData.time : [];
  
  const tMax = Array.isArray(fData.temp_max) ? fData.temp_max : (Array.isArray(fData.temperature_2m_max) ? fData.temperature_2m_max : []);
  const tMin = Array.isArray(fData.temp_min) ? fData.temp_min : (Array.isArray(fData.temperature_2m_min) ? fData.temperature_2m_min : []);
  const rain = Array.isArray(fData.rain_sum) ? fData.rain_sum : (Array.isArray(fData.precipitation_sum) ? fData.precipitation_sum : []);
  const et0 = Array.isArray(fData.et0) ? fData.et0 : [];
  const hum = Array.isArray(fData.humidity_max) ? fData.humidity_max : [];

  // --- 3. CONFIGURAÇÃO DO GRÁFICO (MEMOIZED) ---
  const chartData = useMemo(() => {
    if (!time.length) return { labels: [], datasets: [] };

    return {
      labels: time.map(d => {
        const dateObj = new Date(d + 'T12:00:00');
        return dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      }),
      datasets: [
        {
          label: 'Temp Máx (°C)',
          data: metrics.temp ? tMax : [],
          borderColor: '#ff6b6b',
          backgroundColor: 'transparent',
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Temp Mín (°C)',
          data: metrics.temp ? tMin : [],
          borderColor: '#4ecdc4',
          backgroundColor: 'transparent',
          tension: 0.4,
          yAxisID: 'y',
        },
        {
          label: 'Chuva (mm)',
          data: metrics.rain ? rain : [],
          borderColor: '#00d9ff',
          backgroundColor: 'rgba(0, 217, 255, 0.2)',
          tension: 0.1,
          type: 'bar',
          yAxisID: 'y',
        },
        {
          label: 'Umidade Máx (%)',
          data: metrics.hum ? hum : [],
          borderColor: '#d97706',
          backgroundColor: 'transparent',
          borderDash: [5, 5],
          tension: 0.4,
          yAxisID: 'y1',
          hidden: !metrics.hum
        },
        {
          label: 'ET₀ (mm)',
          data: metrics.et0 ? et0 : [],
          borderColor: '#facc15',
          backgroundColor: 'rgba(250, 204, 21, 0.2)',
          tension: 0.4,
          yAxisID: 'y',
          hidden: !metrics.et0
        }
      ],
    };
  }, [time, metrics, tMax, tMin, rain, et0, hum]);

  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { position: 'top', labels: { color: '#fff' } },
      tooltip: { 
        backgroundColor: '#15192c', 
        titleColor: '#00d9ff',
        bodyColor: '#fff', 
        borderColor: 'rgba(0,217,255,0.3)', 
        borderWidth: 1 
      }
    },
    scales: {
      y: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#94a3b8' },
        title: { display: true, text: 'Temp / Chuva', color: '#64748b' }
      },
      y1: {
        position: 'right',
        display: metrics.hum,
        grid: { drawOnChartArea: false },
        ticks: { color: '#d97706' },
        title: { display: true, text: 'Umidade (%)', color: '#d97706' }
      },
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', maxTicksLimit: 8 }
      }
    }
  }), [metrics.hum]);

  // --- RENDERIZAÇÃO ---

  return (
    <div className="dashboard-container" style={{ paddingBottom: '100px', overflowY: 'auto' }}>
      
      {/* 1. Header SEMPRE Visível */}
      <div className="dashboard-header">
        <div>
          <h2>⛈️ Clima & Risco (16 Dias)</h2>
          {selectedOpp ? (
             <p>Análise agrometeorológica para {selectedOpp.origin.city} - {selectedOpp.origin.state}</p>
          ) : (
             <p>Selecione uma oportunidade</p>
          )}
        </div>
        
        <select 
          value={selectedOppId || ''} 
          onChange={(e) => setSelectedOppId(e.target.value)}
          style={{ padding: '10px', background: '#15192c', color: '#fff', border: '1px solid #00d9ff', borderRadius: '8px' }}
        >
          <option value="" disabled>Selecione...</option>
          {opportunities.map(opp => (
            <option key={opp.id} value={opp.id}>
              {opp.product} - {opp.origin.city}/{opp.origin.state}
            </option>
          ))}
        </select>
      </div>

      {/* 2. Conteúdo Condicional */}
      {(() => {
        if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}><h3 style={{ color: '#00d9ff' }}>📡 Carregando Previsão de 16 Dias...</h3></div>;
        if (!selectedOpp) return <div style={{ padding: '40px', textAlign: 'center' }}><h3 style={{ color: '#94a3b8' }}>Nenhuma oportunidade selecionada.</h3></div>;
        if (time.length === 0) return <div style={{ padding: '40px', textAlign: 'center' }}><h3 style={{ color: '#ef4444' }}>⚠️ Sem dados climáticos disponíveis.</h3></div>;

        return (
           <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
              
              {/* 3. SEÇÃO PRINCIPAL (GRÁFICO E KPIS) - LARGURA TOTAL */}
              <div className="chart-section" style={{ minHeight: '500px', display: 'flex', flexDirection: 'column' }}>
                  
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <h4 style={{ margin: 0 }}>Tendência Climática</h4>
                    <span style={{ fontSize: '11px', background: '#00d9ff20', color: '#00d9ff', padding: '4px 8px', borderRadius: '4px' }}>
                      Fonte: Open-Meteo GFS (Híbrido)
                    </span>
                  </div>

                  {/* Botões de Filtro */}
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                    {[
                      { key: 'temp', label: '🌡️ Temp', color: '#ff6b6b', bg: 'rgba(255, 107, 107, 0.2)' },
                      { key: 'rain', label: '🌧️ Chuva', color: '#00d9ff', bg: 'rgba(0, 217, 255, 0.2)' },
                      { key: 'hum',  label: '💧 Umidade', color: '#d97706', bg: 'rgba(217, 119, 6, 0.2)' },
                      { key: 'et0',  label: '☀️ ET₀', color: '#facc15', bg: 'rgba(250, 204, 21, 0.2)' }
                    ].map(btn => (
                      <button
                        key={btn.key}
                        onClick={() => setMetrics(p => ({ ...p, [btn.key]: !p[btn.key] }))}
                        style={{
                          padding: '8px 16px',
                          borderRadius: '20px',
                          border: `1px solid ${btn.color}`,
                          background: metrics[btn.key] ? btn.bg : 'transparent',
                          color: '#fff',
                          cursor: 'pointer',
                          fontWeight: metrics[btn.key] ? 'bold' : 'normal',
                          transition: 'all 0.2s'
                        }}
                      >
                        {btn.label}
                      </button>
                    ))}
                  </div>

                  {/* Gráfico */}
                  <div style={{ flex: 1, minHeight: '350px' }}>
                    <Line data={chartData} options={chartOptions} />
                  </div>

                  {/* Resumo do Ciclo (KPIs) */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', marginTop: '30px' }}>
                     
                     <div style={{ background: '#15192c', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #00d9ff' }}>
                        <small style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Chuva Total</small>
                        <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>
                            {rain.length > 0 ? rain.reduce((a, b) => (a || 0) + (b || 0), 0).toFixed(1) : '0.0'} mm
                        </div>
                        <small style={{ color: '#00d9ff' }}>Acumulado 16 dias</small>
                     </div>

                     <div style={{ background: '#15192c', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #ff6b6b' }}>
                        <small style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Temp Média</small>
                        <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>
                            {tMax.length > 0 && time.length > 0 ? (tMax.reduce((a, b) => (a || 0) + (b || 0), 0) / time.length).toFixed(1) : '0.0'}°C
                        </div>
                        <small style={{ color: '#ff6b6b' }}>Máximas</small>
                     </div>

                     <div style={{ background: '#15192c', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #d97706' }}>
                        <small style={{ color: '#94a3b8', textTransform: 'uppercase' }}>Umidade Máx (Méd)</small>
                        <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>
                            {hum.length > 0 && time.length > 0 ? (hum.reduce((a, b) => (a || 0) + (b || 0), 0) / time.length).toFixed(0) : '0'}%
                        </div>
                        <small style={{ color: '#d97706' }}>Risco Fúngico</small>
                     </div>

                     <div style={{ background: '#15192c', padding: '15px', borderRadius: '12px', borderLeft: '4px solid #facc15' }}>
                        <small style={{ color: '#94a3b8', textTransform: 'uppercase' }}>ET₀ Acumulado</small>
                        <div style={{ fontSize: '24px', color: '#fff', fontWeight: 'bold' }}>
                            {et0.length > 0 ? et0.reduce((a, b) => (a || 0) + (b || 0), 0).toFixed(1) : '0.0'} mm
                        </div>
                        <small style={{ color: '#facc15' }}>Demanda Hídrica</small>
                     </div>
                  </div>
              </div>

              {/* 4. LISTA DE PREVISÃO (SCROLL HORIZONTAL) - Agora no meio */}
              <div>
                  <h4 style={{ color: '#fff', marginBottom: '15px' }}>📅 Previsão Diária Detalhada</h4>
                  
                  <div className="forecast-scroll-container" style={{ 
                      display: 'flex', 
                      overflowX: 'auto', 
                      gap: '12px', 
                      paddingBottom: '15px' 
                  }}>
                    {time.map((dateStr, i) => {
                      try {
                        const dateObj = new Date(dateStr + 'T12:00:00');
                        const isRainy = (rain[i] || 0) > 5;
                        const et0Val = et0[i] || 0;
                        const tMaxVal = tMax[i] || 0;
                        const tMinVal = tMin[i] || 0;
                        
                        return (
                          <div key={i} style={{ 
                              minWidth: '130px', 
                              background: '#15192c', 
                              padding: '15px', 
                              borderRadius: '12px', 
                              border: '1px solid rgba(0, 217, 255, 0.1)',
                              textAlign: 'center',
                              flexShrink: 0 
                          }}>
                            <div style={{ color: '#94a3b8', fontSize: '12px', marginBottom: '5px' }}>
                              {dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })}
                            </div>
                            
                            <div style={{ fontSize: '28px', marginBottom: '10px' }}>
                              {isRainy ? '🌧️' : (tMaxVal > 30 ? '☀️' : '⛅')}
                            </div>

                            <div style={{ fontWeight: 'bold', color: '#fff', marginBottom: '8px' }}>
                              {tMaxVal.toFixed(0)}° <span style={{color:'#666', fontSize:'0.9em'}}>{tMinVal.toFixed(0)}°</span>
                            </div>
                            
                            <div style={{ fontSize: '11px', display:'flex', flexDirection:'column', gap:'4px' }}>
                                <span style={{ color: '#00d9ff' }}>💧 {(rain[i] || 0).toFixed(1)} mm</span>
                                {et0Val > 0 && <span style={{ color: '#facc15' }}>♨️ {et0Val.toFixed(1)} mm</span>}
                            </div>
                          </div>
                        );
                      } catch (err) {
                        console.error(`Erro ao renderizar dia ${i}:`, err);
                        return null;
                      }
                    })}
                  </div>
              </div>

              {/* 5. SIMULADOR DE ARMAZENAGEM (LARGURA TOTAL - FINAL) */}
              <div style={{ width: '100%', minHeight: '600px' }}>
                  <StorageAdvisor 
                     currentPrice={selectedOpp.financials?.buyPrice || 0}
                     rainData={rain} 
                     rain={rain.reduce((a, b) => a + b, 0)} 
                     product={selectedOpp.product}
                     state={selectedOpp.origin.state}
                     lat={selectedOpp.coords?.lat}
                     lng={selectedOpp.coords?.lng}
                  />
              </div>

           </div>
        );
      })()}

    </div>
  );
};

export default WeatherDashboard;