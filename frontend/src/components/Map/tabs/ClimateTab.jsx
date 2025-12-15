import React, { useState, useEffect } from 'react';
import theme from '../../../styles/theme';
import { OpportunityService } from '../../../services/opportunityService';

// Componente para verificar eventos históricos
const HistoricalEventsSection = ({ opportunity }) => {
  const [historicalEvents, setHistoricalEvents] = useState(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    const fetchHistorical = async () => {
      const lat = opportunity?.coords?.lat;
      const lng = opportunity?.coords?.lng;
      
      if (lat && lng) {
        setLoading(true);
        try {
          // Verifica últimos 7 dias (incluindo o alerta de granizo há 2 dias)
          const data = await OpportunityService.getHistoricalExtremeEvents(lat, lng, 7);
          setHistoricalEvents(data);
        } catch (err) {
          console.warn("Erro ao buscar eventos históricos:", err);
        } finally {
          setLoading(false);
        }
      }
    };
    
    fetchHistorical();
  }, [opportunity]);
  
  if (loading) {
    return (
      <div style={{ padding: '12px', textAlign: 'center', color: theme.colors.textMuted }}>
        🔍 Verificando eventos históricos...
      </div>
    );
  }
  
  if (!historicalEvents || !historicalEvents.events || historicalEvents.events.length === 0) {
    return null; // Não mostra se não houver eventos
  }
  
  return (
    <div style={{
      marginTop: '20px',
      padding: '16px',
      background: 'rgba(239, 68, 68, 0.1)',
      borderRadius: theme.borderRadius,
      border: `1px solid rgba(239, 68, 68, 0.3)`
    }}>
      <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: '12px' }}>
        📅 Eventos Históricos (últimos 7 dias)
      </div>
      <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginBottom: '12px' }}>
        {historicalEvents.summary}
      </div>
      {historicalEvents.events.map((event, idx) => (
        <div
          key={idx}
          style={{
            padding: '10px',
            background: event.severity === 'extreme' ? 'rgba(239, 68, 68, 0.2)' :
                        event.severity === 'high' ? 'rgba(251, 146, 60, 0.2)' :
                        'rgba(250, 204, 21, 0.2)',
            borderRadius: theme.borderRadius,
            marginBottom: '8px',
            border: `1px solid ${
              event.severity === 'extreme' ? '#ef4444' :
              event.severity === 'high' ? '#fb923c' :
              '#facc15'
            }`
          }}
        >
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: '4px' }}>
            {event.type === 'hail' ? '🌨️' : event.type === 'tropical_storm' ? '🌀' : '🌧️'} {event.message}
          </div>
          {event.date && (
            <div style={{ fontSize: '10px', color: theme.colors.textMuted }}>
              Data: {event.date}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ClimateTab = ({ opportunity }) => {
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [plantingInfo, setPlantingInfo] = useState(null);

  useEffect(() => {
    const fetchClimateData = async () => {
      if (!opportunity) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const lat = opportunity.coords?.lat;
        const lng = opportunity.coords?.lng;
        const product = opportunity.product || 'Tomate';
        const state = opportunity.origin?.state || 'SP';
        
        // Busca dados climáticos
        if (lat && lng) {
          const forecastData = await OpportunityService.getForecast(lat, lng);
          setForecast(forecastData);
        }
        
        // Busca informações de safra (via ZARC API - Python)
        try {
          const pythonUrl = process.env.REACT_APP_PYTHON_API_URL || 'http://localhost:8000';
          const response = await fetch(`${pythonUrl}/api/v1/zarc/planting-windows?product=${encodeURIComponent(product)}&state=${encodeURIComponent(state)}`);
          if (response.ok) {
            const data = await response.json();
            setPlantingInfo(data);
          } else {
            console.warn("Resposta não OK ao buscar calendário ZARC:", response.status);
          }
        } catch (err) {
          console.warn("Erro ao buscar calendário:", err);
        }
        
      } catch (err) {
        console.error("Erro ao buscar dados climáticos:", err);
        setError(err.message || 'Erro ao carregar dados climáticos');
      } finally {
        setLoading(false);
      }
    };
    
    fetchClimateData();
  }, [opportunity]);
  
  // Calcula comparação de chuva (ano anterior vs atual)
  const getRainComparison = () => {
    if (!forecast?.data) return null;
    
    const rainData = forecast.data.precipitation_sum || forecast.data.rain_sum || [];
    const currentRain = rainData.reduce((sum, val) => sum + (val || 0), 0);
    
    // TODO: Buscar dados do ano anterior do banco quando disponível
    // Por enquanto, usa média histórica como referência
    const avgHistoricalRain = 150; // mm/mês (aproximação)
    
    return {
      current: currentRain,
      previous: avgHistoricalRain,
      difference: currentRain - avgHistoricalRain,
      percentage: ((currentRain - avgHistoricalRain) / avgHistoricalRain) * 100
    };
  };
  
  // ✅ MELHORADO: Busca eventos extremos do novo serviço Python
  const [extremeEventsData, setExtremeEventsData] = useState(null);
  
  useEffect(() => {
    const fetchExtremeEvents = async () => {
      const lat = opportunity.coords?.lat;
      const lng = opportunity.coords?.lng;
      
      if (lat && lng) {
        try {
          const eventsData = await OpportunityService.getExtremeEvents(lat, lng, 16);
          setExtremeEventsData(eventsData);
        } catch (err) {
          console.warn("Erro ao buscar eventos extremos:", err);
          // Fallback para detecção básica se o serviço falhar
          setExtremeEventsData(null);
        }
      }
    };
    
    fetchExtremeEvents();
  }, [opportunity]);
  
  // Detecta eventos extremos (usa novo serviço ou fallback básico)
  const getExtremeEvents = () => {
    // Prioridade 1: Usa dados do novo serviço Python (mais preciso)
    if (extremeEventsData?.events && extremeEventsData.events.length > 0) {
      return extremeEventsData.events.map(event => ({
        type: event.type === 'heat_wave' ? 'heat' : event.type === 'cold_wave' ? 'cold' : event.type,
        severity: event.severity,
        message: event.message,
        impact: event.impact,
        // duration_days só para ondas de calor/frio (não para tempestades isoladas)
        duration_days: (event.type === 'heat_wave' || event.type === 'cold_wave') ? event.duration_days : null,
        day: event.day || null, // Dia do evento (para tempestades)
        temperature: event.max_temperature || event.min_temperature || null,
        wind_speed_kmh: event.wind_speed_kmh || null,
        pressure_hpa: event.pressure_hpa || null
      }));
    }
    
    // Fallback: Detecção básica se novo serviço não disponível
    if (!forecast?.data) return [];
    
    const tempMax = forecast.data.temperature_2m_max || forecast.data.temp_max || [];
    const tempMin = forecast.data.temperature_2m_min || forecast.data.temp_min || [];
    const events = [];
    
    // Pico de calor (> 35°C)
    const maxTemp = Math.max(...tempMax.filter(t => t !== null && t !== undefined));
    if (maxTemp > 35) {
      events.push({
        type: 'heat',
        severity: maxTemp > 40 ? 'extreme' : 'high',
        message: `Onda de calor: ${maxTemp.toFixed(1)}°C`,
        impact: 'Pode comprometer qualidade e reduzir shelf-life'
      });
    }
    
    // Pico de frio (< 10°C)
    const minTemp = Math.min(...tempMin.filter(t => t !== null && t !== undefined));
    if (minTemp < 10) {
      events.push({
        type: 'cold',
        severity: minTemp < 5 ? 'extreme' : 'high',
        message: `Pico de frio: ${minTemp.toFixed(1)}°C`,
        impact: 'Pode causar danos por frio na colheita'
      });
    }
    
    return events;
  };
  
  const rainComparison = getRainComparison();
  const extremeEvents = getExtremeEvents();
  const currentMonth = new Date().getMonth() + 1;
  
  if (loading) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ color: theme.colors.textMuted }}>Carregando dados climáticos...</div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
        <div style={{ color: theme.colors.textMuted }}>{error}</div>
      </div>
    );
  }
  
  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        🌦️ Clima & Safra
      </h3>

      {/* Comparação de Chuva - MELHORADO COM GRÁFICO VISUAL */}
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(0, 217, 255, 0.3)`,
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '16px', fontWeight: 'bold' }}>
          🌧️ Comparação de Chuva (Ano Anterior vs. Atual)
        </div>
        {rainComparison ? (
          <div>
            {/* Gráfico de Barras Comparativo */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '20px', height: '120px', marginBottom: '8px' }}>
                {/* Barra Ano Anterior */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ 
                    width: '100%',
                    background: 'linear-gradient(180deg, rgba(100, 116, 139, 0.8) 0%, rgba(100, 116, 139, 0.4) 100%)',
                    height: `${Math.min((rainComparison.previous / Math.max(rainComparison.previous, rainComparison.current, 200)) * 100, 100)}%`,
                    borderRadius: '4px 4px 0 0',
                    minHeight: '20px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '4px',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {rainComparison.previous.toFixed(0)}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '4px', textAlign: 'center' }}>
                    Ano Anterior
                  </div>
                </div>
                
                {/* Barra Atual */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div style={{ 
                    width: '100%',
                    background: rainComparison.difference > 0 
                      ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.9) 0%, rgba(59, 130, 246, 0.5) 100%)'
                      : 'linear-gradient(180deg, rgba(239, 68, 68, 0.9) 0%, rgba(239, 68, 68, 0.5) 100%)',
                    height: `${Math.min((rainComparison.current / Math.max(rainComparison.previous, rainComparison.current, 200)) * 100, 100)}%`,
                    borderRadius: '4px 4px 0 0',
                    minHeight: '20px',
                    display: 'flex',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    paddingBottom: '4px',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 'bold'
                  }}>
                    {rainComparison.current.toFixed(0)}
                  </div>
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '4px', textAlign: 'center' }}>
                    Atual (16 dias)
                  </div>
                </div>
              </div>
              
              {/* Legenda e Diferença */}
              <div style={{
                padding: '12px',
                background: rainComparison.difference > 0 ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                borderRadius: theme.borderRadius,
                fontSize: '13px',
                color: rainComparison.difference > 0 ? '#3b82f6' : '#ef4444',
                textAlign: 'center',
                fontWeight: '600'
              }}>
                {rainComparison.difference > 0 ? '↑' : '↓'} {Math.abs(rainComparison.difference).toFixed(1)} mm 
                ({Math.abs(rainComparison.percentage).toFixed(1)}% {rainComparison.difference > 0 ? 'mais' : 'menos'} que a média histórica)
              </div>
            </div>
            
            {/* Informações Adicionais */}
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              fontSize: '12px', 
              color: theme.colors.textMuted,
              marginTop: '12px',
              paddingTop: '12px',
              borderTop: `1px solid rgba(0, 217, 255, 0.2)`
            }}>
              <div>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Ano Anterior</div>
                <div>{rainComparison.previous.toFixed(1)} mm</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>Atual</div>
                <div>{rainComparison.current.toFixed(1)} mm</div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: theme.colors.textMuted, textAlign: 'center', padding: '20px' }}>
            Dados de chuva não disponíveis
          </div>
        )}
      </div>

      {/* Eventos Extremos (Melhorado) */}
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(239, 68, 68, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(239, 68, 68, 0.3)`,
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px', fontWeight: 'bold' }}>
          ⚠️ Eventos Extremos (16 dias)
        </div>
        
        {/* Resumo de Risco */}
        {extremeEventsData?.risk_level && (
          <div style={{
            padding: '8px',
            background: extremeEventsData.risk_level === 'extreme' ? 'rgba(239, 68, 68, 0.3)' :
                        extremeEventsData.risk_level === 'high' ? 'rgba(251, 146, 60, 0.3)' :
                        extremeEventsData.risk_level === 'moderate' ? 'rgba(250, 204, 21, 0.3)' :
                        'rgba(34, 197, 94, 0.3)',
            borderRadius: theme.borderRadius,
            marginBottom: '12px',
            fontSize: '12px',
            fontWeight: 'bold',
            color: theme.colors.textPrimary,
            textAlign: 'center'
          }}>
            {extremeEventsData.summary}
          </div>
        )}
        
        {/* Lista de Eventos */}
        {extremeEvents.length > 0 ? (
          <div>
            {extremeEvents.map((event, idx) => (
              <div
                key={idx}
                style={{
                  padding: '12px',
                  background: event.severity === 'extreme' ? 'rgba(239, 68, 68, 0.2)' : 
                              event.severity === 'high' ? 'rgba(251, 146, 60, 0.2)' :
                              'rgba(250, 204, 21, 0.2)',
                  borderRadius: theme.borderRadius,
                  marginBottom: '8px',
                  border: `1px solid ${
                    event.severity === 'extreme' ? '#ef4444' : 
                    event.severity === 'high' ? '#fb923c' : 
                    '#facc15'
                  }`
                }}
              >
                <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: '4px' }}>
                  {event.type === 'heat' || event.type === 'heat_wave' ? '🔥' : 
                   event.type === 'cold' || event.type === 'cold_wave' ? '❄️' : 
                   event.type === 'tropical_storm' ? '🌀' :
                   event.type === 'hail' ? '🌨️' :
                   '🌧️'} {event.message}
                </div>
                {/* Duração apenas para ondas de calor/frio (não para eventos pontuais) */}
                {event.duration_days && (event.type === 'heat' || event.type === 'heat_wave' || event.type === 'cold' || event.type === 'cold_wave') && (
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                    Duração: {event.duration_days} dias consecutivos
                  </div>
                )}
                {/* Informações adicionais para tempestades */}
                {event.type === 'tropical_storm' && (
                  <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                    {event.pressure_hpa && `Pressão: ${event.pressure_hpa} hPa`}
                    {event.day !== null && event.day !== undefined && ` • Dia ${event.day + 1} da previsão`}
                  </div>
                )}
                <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                  {event.impact}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: theme.colors.textPrimary }}>
            ✅ Nenhum evento extremo detectado nos próximos 16 dias
          </div>
        )}
        
        {/* Recomendações */}
        {extremeEventsData?.recommendations && extremeEventsData.recommendations.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(0, 217, 255, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(0, 217, 255, 0.3)`
          }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: '8px' }}>
              💡 Recomendações:
            </div>
            {extremeEventsData.recommendations.map((rec, idx) => (
              <div key={idx} style={{ fontSize: '11px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                • {rec}
              </div>
            ))}
          </div>
        )}
        
        {/* Contexto El Niño */}
        {extremeEventsData?.el_nino_context && extremeEventsData.el_nino_context.status !== 'neutral' && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: 'rgba(255, 193, 7, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(255, 193, 7, 0.3)`
          }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.textPrimary, marginBottom: '4px' }}>
              🌍 Contexto El Niño/La Niña:
            </div>
            <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
              Status: <strong>{extremeEventsData.el_nino_context.status.toUpperCase()}</strong> ({extremeEventsData.el_nino_context.strength})
            </div>
          </div>
        )}
      </div>
      
      {/* Verificação de Eventos Históricos */}
      <HistoricalEventsSection opportunity={opportunity} />

      {/* Informações de Safra - MELHORADO COM CALENDÁRIO VISUAL */}
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(34, 197, 94, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(34, 197, 94, 0.3)`
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '16px', fontWeight: 'bold' }}>
          🌾 Calendário de Plantio e Colheita
        </div>
        {plantingInfo ? (
          <div>
            {/* Status do Mês Atual */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
                Mês Atual: <strong>{new Date().toLocaleString('pt-BR', { month: 'long' })}</strong>
              </div>
              {plantingInfo.ideal && plantingInfo.ideal.includes(currentMonth) && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(34, 197, 94, 0.2)',
                  borderRadius: theme.borderRadius,
                  fontSize: '13px',
                  color: '#22c55e',
                  marginBottom: '8px',
                  border: '2px solid #22c55e',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  ✅ Mês IDEAL para plantio
                </div>
              )}
              {plantingInfo.risk && plantingInfo.risk.includes(currentMonth) && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  borderRadius: theme.borderRadius,
                  fontSize: '13px',
                  color: '#ef4444',
                  marginBottom: '8px',
                  border: '2px solid #ef4444',
                  fontWeight: 'bold',
                  textAlign: 'center'
                }}>
                  ⚠️ Mês de RISCO para plantio
                </div>
              )}
              {(!plantingInfo.ideal || !plantingInfo.ideal.includes(currentMonth)) && 
               (!plantingInfo.risk || !plantingInfo.risk.includes(currentMonth)) && (
                <div style={{
                  padding: '12px',
                  background: 'rgba(100, 116, 139, 0.2)',
                  borderRadius: theme.borderRadius,
                  fontSize: '13px',
                  color: '#64748b',
                  marginBottom: '8px',
                  textAlign: 'center'
                }}>
                  ⏸️ Mês neutro para plantio
                </div>
              )}
            </div>
            
            {/* Calendário Visual dos Meses */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px', fontWeight: 'bold' }}>
                Calendário Anual:
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(4, 1fr)', 
                gap: '6px',
                marginBottom: '8px'
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => {
                  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                  const isIdeal = plantingInfo.ideal && plantingInfo.ideal.includes(month);
                  const isRisk = plantingInfo.risk && plantingInfo.risk.includes(month);
                  const isCurrent = month === currentMonth;
                  
                  return (
                    <div
                      key={month}
                      style={{
                        padding: '8px 4px',
                        background: isCurrent 
                          ? (isIdeal ? 'rgba(34, 197, 94, 0.3)' : isRisk ? 'rgba(239, 68, 68, 0.3)' : 'rgba(100, 116, 139, 0.3)')
                          : (isIdeal ? 'rgba(34, 197, 94, 0.15)' : isRisk ? 'rgba(239, 68, 68, 0.15)' : 'rgba(100, 116, 139, 0.1)'),
                        borderRadius: '6px',
                        fontSize: '11px',
                        textAlign: 'center',
                        fontWeight: isCurrent ? 'bold' : 'normal',
                        color: isIdeal ? '#22c55e' : isRisk ? '#ef4444' : theme.colors.textMuted,
                        border: isCurrent ? `2px solid ${isIdeal ? '#22c55e' : isRisk ? '#ef4444' : '#64748b'}` : '1px solid transparent',
                        position: 'relative'
                      }}
                    >
                      {monthNames[month - 1]}
                      {isCurrent && (
                        <div style={{
                          position: 'absolute',
                          top: '-2px',
                          right: '-2px',
                          width: '8px',
                          height: '8px',
                          background: theme.colors.accent,
                          borderRadius: '50%',
                          border: '2px solid white'
                        }} />
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Legenda */}
              <div style={{ 
                display: 'flex', 
                gap: '12px', 
                fontSize: '10px', 
                color: theme.colors.textMuted,
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: 'rgba(34, 197, 94, 0.3)', borderRadius: '3px' }} />
                  <span>Ideal</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: 'rgba(239, 68, 68, 0.3)', borderRadius: '3px' }} />
                  <span>Risco</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '12px', height: '12px', background: 'rgba(100, 116, 139, 0.2)', borderRadius: '3px' }} />
                  <span>Neutro</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '8px', height: '8px', background: theme.colors.accent, borderRadius: '50%' }} />
                  <span>Atual</span>
                </div>
              </div>
            </div>
            
            {plantingInfo.notes && (
              <div style={{
                marginTop: '12px',
                padding: '12px',
                background: 'rgba(0, 217, 255, 0.1)',
                borderRadius: theme.borderRadius,
                fontSize: '11px',
                color: theme.colors.textMuted,
                fontStyle: 'italic',
                border: `1px solid rgba(0, 217, 255, 0.2)`
              }}>
                💡 {plantingInfo.notes}
              </div>
            )}
          </div>
        ) : (
          <div style={{ fontSize: '14px', color: theme.colors.textMuted, textAlign: 'center', padding: '20px' }}>
            Dados de calendário não disponíveis para {opportunity?.product || 'produto'} em {opportunity?.origin?.state || 'estado'}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClimateTab;



