import React, { useState, useEffect } from 'react';
import theme from '../../../styles/theme';
import { OpportunityService } from '../../../services/opportunityService';

const AITab = ({ opportunity }) => {
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!opportunity) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Busca dados necessários para recomendação
        const product = opportunity.product || 'Tomate';
        const state = opportunity.origin?.state || 'SP';
        const roi = opportunity.financials?.roi || null;
        const currentPrice = opportunity.financials?.sellPrice || null;
        const buyPrice = opportunity.financials?.buyPrice || null;
        
        // Busca dados de qualidade (storage)
        let shelfLifeDays = null;
        let qualityScore = null;
        try {
          const lat = opportunity.coords?.lat || 0;
          const lng = opportunity.coords?.lng || 0;
          
          if (lat && lng && currentPrice && buyPrice) {
            const forecast = await OpportunityService.getForecast(lat, lng);
            const rainData = forecast?.data?.precipitation_sum || forecast?.data?.rain_sum || [];
            const dailyTempMax = forecast?.data?.temperature_2m_max || forecast?.data?.temp_max || [];
            const dailyTempMin = forecast?.data?.temperature_2m_min || forecast?.data?.temp_min || [];
            const dailySun = forecast?.data?.sunshine_duration || [];
            
            const storageData = await OpportunityService.getStorageAnalysis(
              product,
              state,
              currentPrice,
              buyPrice,
              0.5,
              rainData,
              dailyTempMax,
              dailySun,
              dailyTempMin,
              lat,
              lng
            );
            
            if (storageData?.chart_data?.labels) {
              shelfLifeDays = storageData.chart_data.labels.length;
            }
            if (storageData?.recommendation?.confidence_score) {
              qualityScore = storageData.recommendation.confidence_score;
            }
          }
        } catch (err) {
          console.warn("Erro ao buscar dados de qualidade para recomendação:", err);
        }
        
        // Busca dados climáticos (eventos extremos)
        let hasExtremeEvents = false;
        let extremeEventSeverity = null;
        try {
          const lat = opportunity.coords?.lat;
          const lng = opportunity.coords?.lng;
          
          if (lat && lng) {
            const forecast = await OpportunityService.getForecast(lat, lng);
            if (forecast?.data) {
              const tempMax = forecast.data.temperature_2m_max || forecast.data.temp_max || [];
              const tempMin = forecast.data.temperature_2m_min || forecast.data.temp_min || [];
              
              const maxTemp = Math.max(...tempMax.filter(t => t !== null && t !== undefined));
              const minTemp = Math.min(...tempMin.filter(t => t !== null && t !== undefined));
              
              if (maxTemp > 35 || minTemp < 10) {
                hasExtremeEvents = true;
                if (maxTemp > 40 || minTemp < 5) {
                  extremeEventSeverity = 'extreme';
                } else {
                  extremeEventSeverity = 'high';
                }
              }
            }
          }
        } catch (err) {
          console.warn("Erro ao buscar dados climáticos para recomendação:", err);
        }
        
        // Busca ROI projetado (d7 e d30) se disponível
        let roiD7 = null;
        let roiD30 = null;
        // TODO: Buscar do endpoint /batch se disponível
        
        // Busca informações de safra
        let isIdealPlantingMonth = null;
        let isRiskPlantingMonth = null;
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:3001/api/calendar/planting-window?product=${encodeURIComponent(product)}&state=${encodeURIComponent(state)}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          if (response.ok) {
            const plantingInfo = await response.json();
            const currentMonth = new Date().getMonth() + 1;
            isIdealPlantingMonth = plantingInfo.ideal && plantingInfo.ideal.includes(currentMonth);
            isRiskPlantingMonth = plantingInfo.risk && plantingInfo.risk.includes(currentMonth);
          }
        } catch (err) {
          console.warn("Erro ao buscar calendário para recomendação:", err);
        }
        
        // Gera recomendação
        const recommendationData = await OpportunityService.getRecommendation({
          product,
          state,
          roi,
          roi_d7: roiD7,
          roi_d30: roiD30,
          quality_score: qualityScore,
          shelf_life_days: shelfLifeDays,
          has_extreme_events: hasExtremeEvents,
          extreme_event_severity: extremeEventSeverity,
          is_ideal_planting_month: isIdealPlantingMonth,
          is_risk_planting_month: isRiskPlantingMonth,
          market_trend: null, // TODO: Buscar tendência de mercado
          current_price: currentPrice,
          buy_price: buyPrice
        });
        
        setRecommendation(recommendationData);
      } catch (err) {
        console.error("Erro ao buscar recomendação:", err);
        setError(err.message || 'Erro ao gerar recomendação automática');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendation();
  }, [opportunity]);
  
  const getRecommendationColor = (rec) => {
    if (rec === 'COMPRAR') return '#22c55e'; // Verde
    if (rec === 'AGUARDAR') return '#f59e0b'; // Amarelo/Laranja
    return '#ef4444'; // Vermelho
  };
  
  const getRecommendationIcon = (rec) => {
    if (rec === 'COMPRAR') return '✅';
    if (rec === 'AGUARDAR') return '⏳';
    return '❌';
  };
  
  if (loading) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ color: theme.colors.textMuted }}>Analisando oportunidade...</div>
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
  
  if (!recommendation) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤖</div>
        <div style={{ color: theme.colors.textMuted }}>Recomendação não disponível</div>
      </div>
    );
  }
  
  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        🤖 Recomendações da IA
      </h3>

      {/* Recomendação Principal */}
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `2px solid ${getRecommendationColor(recommendation.recommendation)}`,
          marginBottom: '20px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px', fontWeight: 'bold' }}>
          🤖 Recomendação da IA
        </div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: getRecommendationColor(recommendation.recommendation), marginBottom: '8px' }}>
          {getRecommendationIcon(recommendation.recommendation)} {recommendation.recommendation}
        </div>
        <div style={{ fontSize: '16px', color: theme.colors.textPrimary, marginBottom: '8px', fontWeight: 'bold' }}>
          Score: {recommendation.opportunity_score}/100
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
          Confiança: {recommendation.confidence}%
        </div>
      </div>

      {/* Razões da Recomendação */}
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(124, 58, 237, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(124, 58, 237, 0.3)`,
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px', fontWeight: 'bold' }}>
          📊 Análise Detalhada
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textPrimary, marginBottom: '8px' }}>
          <strong>Score Financeiro:</strong> {recommendation.financial_score}/40
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textPrimary, marginBottom: '8px' }}>
          <strong>Score Qualidade:</strong> {recommendation.quality_score}/20
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textPrimary, marginBottom: '8px' }}>
          <strong>Score Clima:</strong> {recommendation.climate_score}/20
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textPrimary, marginBottom: '8px' }}>
          <strong>Score Safra:</strong> {recommendation.season_score}/10
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textPrimary }}>
          <strong>Score Mercado:</strong> {recommendation.market_score}/10
        </div>
      </div>
      
      {/* Razões */}
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(34, 197, 94, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(34, 197, 94, 0.3)`,
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px', fontWeight: 'bold' }}>
          ✅ Razões da Recomendação
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textPrimary }}>
          {recommendation.reasons.map((reason, idx) => (
            <div key={idx} style={{ marginBottom: '6px' }}>
              {reason}
            </div>
          ))}
        </div>
      </div>

      {/* Fatores de Risco */}
      {recommendation.risk_factors && recommendation.risk_factors.length > 0 && (
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(239, 68, 68, 0.1) 100%)`,
            padding: '20px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(239, 68, 68, 0.3)`
          }}
        >
          <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px', fontWeight: 'bold' }}>
            ⚠️ Fatores de Risco
          </div>
          <div style={{ fontSize: '12px', color: theme.colors.textPrimary }}>
            {recommendation.risk_factors.map((risk, idx) => (
              <div key={idx} style={{ marginBottom: '6px', color: '#ef4444' }}>
                • {risk}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AITab;



