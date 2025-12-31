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
        // Coleta dados da oportunidade para montar o payload
        const product = opportunity.product || 'Tomate';
        const state = opportunity.origin?.state || opportunity.state || 'SP';
        const roi = opportunity.roi;
        const buyPrice = opportunity.buyPrice;
        const sellPrice = opportunity.sellPrice;

        // Busca dados adicionais se disponíveis
        let qualityScore = null;
        let shelfLifeDays = null;
        let hasExtremeEvents = false;
        let extremeEventSeverity = null;
        let marketTrend = null;

        // Tenta buscar dados de qualidade se disponíveis
        if (opportunity.coords?.lat && opportunity.coords?.lng) {
          try {
            const storageAnalysis = await OpportunityService.getStorageAnalysis(
              product,
              state,
              sellPrice,
              buyPrice,
              0.5,
              null, // rainData
              null, // dailyTempMax
              null, // dailySun
              null, // dailyTempMin
              opportunity.coords.lat,
              opportunity.coords.lng
            );

            if (storageAnalysis) {
              qualityScore = storageAnalysis.quality_score || null;
              shelfLifeDays = storageAnalysis.recommendation?.best_day_days || null;
            }
          } catch (err) {
            console.warn('Erro ao buscar análise de armazenagem:', err);
          }

          // Verifica eventos extremos
          try {
            const extremeEvents = await OpportunityService.getExtremeEvents(
              opportunity.coords.lat,
              opportunity.coords.lng,
              product
            );

            if (extremeEvents && extremeEvents.events && extremeEvents.events.length > 0) {
              hasExtremeEvents = true;
              // Determina severidade máxima
              const severities = extremeEvents.events.map(e => e.severity);
              if (severities.includes('extreme')) {
                extremeEventSeverity = 'extreme';
              } else if (severities.includes('high')) {
                extremeEventSeverity = 'high';
              } else {
                extremeEventSeverity = 'medium';
              }
            }
          } catch (err) {
            console.warn('Erro ao buscar eventos extremos:', err);
          }
        }

        // Busca tendência de mercado
        try {
          const trend = await OpportunityService.getPriceTrend(product, opportunity.origin?.city || state);
          if (trend && trend.trend) {
            if (trend.trend.direction === 'up') {
              marketTrend = 'up';
            } else if (trend.trend.direction === 'down') {
              marketTrend = 'down';
            } else {
              marketTrend = 'sideways';
            }
          }
        } catch (err) {
          console.warn('Erro ao buscar tendência de mercado:', err);
        }

        // Monta payload para recomendação
        const payload = {
          product,
          state,
          roi: roi !== undefined && roi !== null ? parseFloat(roi) : null,
          roi_d7: null, // Pode ser preenchido com dados de previsão se disponível
          roi_d30: null, // Pode ser preenchido com dados de previsão se disponível
          quality_score: qualityScore,
          shelf_life_days: shelfLifeDays,
          has_extreme_events: hasExtremeEvents,
          extreme_event_severity: extremeEventSeverity,
          is_ideal_planting_month: null, // Será calculado no backend
          is_risk_planting_month: null, // Será calculado no backend
          market_trend: marketTrend,
          current_price: sellPrice,
          buy_price: buyPrice
        };

        console.log('📤 Buscando recomendação com payload:', payload);

        const data = await OpportunityService.getRecommendation(payload);
        setRecommendation(data);
      } catch (err) {
        console.error('Erro ao buscar recomendação:', err);
        setError(err.message || 'Erro ao carregar recomendação da IA');
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendation();
  }, [opportunity]);

  // Função para obter cor baseada na recomendação
  const getRecommendationColor = (rec) => {
    if (!rec) return theme.colors.textMuted;
    switch (rec.recommendation) {
      case 'COMPRAR':
        return '#10b981'; // Verde
      case 'AGUARDAR':
        return '#f59e0b'; // Amarelo/Laranja
      case 'NÃO COMPRAR':
        return '#ef4444'; // Vermelho
      default:
        return theme.colors.accent;
    }
  };

  // Função para obter emoji baseado na recomendação
  const getRecommendationEmoji = (rec) => {
    if (!rec) return '⏳';
    switch (rec.recommendation) {
      case 'COMPRAR':
        return '✅';
      case 'AGUARDAR':
        return '⏳';
      case 'NÃO COMPRAR':
        return '❌';
      default:
        return '🤖';
    }
  };

  // Função para obter cor do score
  const getScoreColor = (score) => {
    if (score >= 70) return '#10b981'; // Verde
    if (score >= 50) return '#3b82f6'; // Azul
    if (score >= 35) return '#f59e0b'; // Amarelo
    return '#ef4444'; // Vermelho
  };

  if (loading) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🤖</div>
        <div style={{ color: theme.colors.textMuted }}>Analisando oportunidade...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ color: theme.colors.textPrimary }}>
        <div
          style={{
            padding: '20px',
            background: 'rgba(239, 68, 68, 0.1)',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(239, 68, 68, 0.3)`,
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '24px', marginBottom: '8px' }}>⚠️</div>
          <div style={{ color: theme.colors.textMuted }}>{error}</div>
        </div>
      </div>
    );
  }

  if (!recommendation) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>🤖</div>
        <div style={{ color: theme.colors.textMuted }}>Nenhuma recomendação disponível</div>
      </div>
    );
  }

  const recColor = getRecommendationColor(recommendation);
  const recEmoji = getRecommendationEmoji(recommendation);
  
  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        🤖 Recomendações da IA
      </h3>

      {/* Recomendação Principal */}
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${recColor}15 100%)`,
          padding: '24px',
          borderRadius: theme.borderRadius,
          border: `2px solid ${recColor}`,
          marginBottom: '20px',
          textAlign: 'center'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
          Recomendação
        </div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', marginBottom: '8px' }}>
          {recEmoji}
        </div>
        <div style={{ fontSize: '28px', fontWeight: 'bold', color: recColor, marginBottom: '8px' }}>
          {recommendation.recommendation}
        </div>
        {recommendation.confidence && (
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '8px' }}>
            Confiança: {recommendation.confidence.toFixed(1)}%
          </div>
        )}
      </div>

      {/* Score Geral */}
      {recommendation.opportunity_score !== undefined && (
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(124, 58, 237, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(124, 58, 237, 0.3)`,
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
            📊 Score de Oportunidade
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: getScoreColor(recommendation.opportunity_score)
              }}
            >
              {recommendation.opportunity_score.toFixed(0)}/100
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  height: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${recommendation.opportunity_score}%`,
                    background: `linear-gradient(90deg, ${getScoreColor(recommendation.opportunity_score)} 0%, ${getScoreColor(recommendation.opportunity_score)}80 100%)`,
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Scores por Categoria */}
      {(recommendation.financial_score !== undefined ||
        recommendation.quality_score !== undefined ||
        recommendation.climate_score !== undefined ||
        recommendation.season_score !== undefined ||
        recommendation.market_score !== undefined) && (
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.05) 100%)`,
            padding: '20px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(0, 217, 255, 0.2)`,
            marginBottom: '20px'
          }}
        >
          <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '16px' }}>
            📈 Análise Detalhada por Categoria
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {recommendation.financial_score !== undefined && (
              <div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                  💰 Financeiro
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: getScoreColor(recommendation.financial_score) }}>
                  {recommendation.financial_score.toFixed(0)}/40
                </div>
              </div>
            )}
            {recommendation.quality_score !== undefined && (
              <div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                  📊 Qualidade
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: getScoreColor(recommendation.quality_score) }}>
                  {recommendation.quality_score.toFixed(0)}/20
                </div>
              </div>
            )}
            {recommendation.climate_score !== undefined && (
              <div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                  🌦️ Clima
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: getScoreColor(recommendation.climate_score) }}>
                  {recommendation.climate_score.toFixed(0)}/20
                </div>
              </div>
            )}
            {recommendation.season_score !== undefined && (
              <div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                  📅 Safra
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: getScoreColor(recommendation.season_score) }}>
                  {recommendation.season_score.toFixed(0)}/10
                </div>
              </div>
            )}
            {recommendation.market_score !== undefined && (
              <div>
                <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                  📈 Mercado
                </div>
                <div style={{ fontSize: '18px', fontWeight: 'bold', color: getScoreColor(recommendation.market_score) }}>
                  {recommendation.market_score.toFixed(0)}/10
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Razões da Recomendação */}
      {recommendation.reasons && recommendation.reasons.length > 0 && (
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(10, 217, 255, 0.05) 100%)`,
            padding: '20px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(0, 217, 255, 0.2)`,
            marginBottom: '20px'
          }}
        >
          <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
            💡 Razões da Recomendação
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recommendation.reasons.map((reason, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: theme.borderRadius,
                  fontSize: '13px',
                  color: theme.colors.textPrimary,
                  lineHeight: '1.5'
                }}
              >
                {reason}
              </div>
            ))}
        </div>
      </div>
      )}

      {/* Fatores de Risco */}
      {recommendation.risk_factors && recommendation.risk_factors.length > 0 && (
      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(239, 68, 68, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
            border: `1px solid rgba(239, 68, 68, 0.3)`,
            marginBottom: '20px'
          }}
        >
          <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
            ⚠️ Fatores de Risco Identificados
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recommendation.risk_factors.map((risk, idx) => (
              <div
                key={idx}
                style={{
                  padding: '10px',
                  background: 'rgba(239, 68, 68, 0.1)',
                  borderRadius: theme.borderRadius,
                  fontSize: '13px',
                  color: theme.colors.textPrimary,
                  lineHeight: '1.5'
                }}
              >
                ⚠️ {risk}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Informações Adicionais */}
      <div
        style={{
          marginTop: '20px',
          padding: '16px',
          background: 'rgba(0, 217, 255, 0.05)',
          border: `1px solid rgba(0, 217, 255, 0.2)`,
          borderRadius: theme.borderRadius,
          fontSize: '12px',
          color: theme.colors.textMuted
        }}
      >
        <div style={{ marginBottom: '8px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
          ℹ️ Sobre a Análise
        </div>
        <div style={{ marginBottom: '4px' }}>
          • Análise baseada em múltiplos fatores: ROI, qualidade, clima, safra e mercado
        </div>
        <div style={{ marginBottom: '4px' }}>
          • Recomendação gerada por IA usando dados científicos e históricos
        </div>
        <div>
          • Score de 0-100: quanto maior, melhor a oportunidade
        </div>
      </div>
    </div>
  );
};

export default AITab;
