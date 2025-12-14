import React, { useState, useEffect } from 'react';
import theme from '../../../styles/theme';
import { OpportunityService } from '../../../services/opportunityService';

const QualityTab = ({ opportunity }) => {
  const [storageData, setStorageData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStorageData = async () => {
      if (!opportunity) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const product = opportunity.product || 'Tomate';
        const state = opportunity.origin?.state || 'SP';
        const currentPrice = opportunity.financials?.sellPrice || 0;
        const buyPrice = opportunity.financials?.buyPrice || 0;
        const lat = opportunity.coords?.lat || 0;
        const lng = opportunity.coords?.lng || 0;
        
        // Busca dados climáticos para análise
        let rainData = [];
        let dailyTempMax = [];
        let dailyTempMin = [];
        let dailySun = [];
        
        if (lat && lng) {
          try {
            const forecast = await OpportunityService.getForecast(lat, lng);
            if (forecast?.data) {
              rainData = forecast.data.precipitation_sum || forecast.data.rain_sum || [];
              dailyTempMax = forecast.data.temperature_2m_max || forecast.data.temp_max || [];
              dailyTempMin = forecast.data.temperature_2m_min || forecast.data.temp_min || [];
              dailySun = forecast.data.sunshine_duration || [];
            }
          } catch (err) {
            console.warn("Erro ao buscar dados climáticos:", err);
          }
        }
        
        // Calcula chuva acumulada (pode ser usado no futuro)
        // const accumulatedRain = rainData.reduce((sum, val) => sum + (val || 0), 0);
        
        // Busca análise de armazenagem
        const analysis = await OpportunityService.getStorageAnalysis(
          product,
          state,
          currentPrice,
          buyPrice,
          0.5, // risk_factor padrão
          rainData,
          dailyTempMax,
          dailySun,
          dailyTempMin,
          lat,
          lng
        );
        
        console.log("📊 QualityTab: Dados recebidos do Storage Advisor:", JSON.stringify(analysis, null, 2));
        
        // Valida estrutura dos dados
        if (!analysis) {
          throw new Error('Resposta vazia do servidor');
        }
        
        // Garante que chart_data existe
        if (!analysis.chart_data && !analysis.chartData) {
          console.warn("⚠️ QualityTab: chart_data não encontrado, criando estrutura padrão");
          analysis.chart_data = {
            labels: [],
            prices_market: [],
            prices_my_product: [],
            costs: []
          };
        }
        
        setStorageData(analysis);
      } catch (err) {
        console.error("Erro ao buscar dados de qualidade:", err);
        setError(err.message || 'Erro ao carregar dados de qualidade');
      } finally {
        setLoading(false);
      }
    };
    
    fetchStorageData();
  }, [opportunity]);
  
  // Calcula dias restantes baseado na recomendação
  const getDaysRemaining = () => {
    // Prioridade 1: Usa best_day_days se disponível (mais confiável e consistente)
    if (storageData?.recommendation?.best_day_days !== undefined && storageData.recommendation.best_day_days !== null) {
      const days = parseInt(storageData.recommendation.best_day_days, 10);
      if (!isNaN(days) && days >= 0) {
        return days;
      }
    }
    
    // Prioridade 2: Calcula a partir da data absoluta (com ano)
    if (!storageData?.recommendation?.best_day_date) {
      return null;
    }
    
    const bestDay = storageData.recommendation.best_day_date;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliza para início do dia
    
    // Formato DD/MM/YYYY (preferencial - data absoluta)
    const parts = bestDay.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // Mês é 0-indexed
      const year = parseInt(parts[2], 10);
      
      const bestDate = new Date(year, month, day);
      bestDate.setHours(0, 0, 0, 0);
      
      if (!isNaN(bestDate.getTime())) {
        const diffTime = bestDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
      }
    }
    
    // Fallback: Formato DD/MM (sem ano) - assume ano atual ou próximo
    if (parts.length === 2) {
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = today.getFullYear();
      
      let bestDate = new Date(year, month, day);
      bestDate.setHours(0, 0, 0, 0);
      
      // Se a data já passou neste ano, assume próximo ano
      if (bestDate < today) {
        bestDate = new Date(year + 1, month, day);
        bestDate.setHours(0, 0, 0, 0);
      }
      
      if (!isNaN(bestDate.getTime())) {
        const diffTime = bestDate - today;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
      }
    }
    
    return null;
  };
  
  // Calcula shelf-life estimado (baseado na qualidade)
  const getShelfLife = () => {
    // Tenta acessar chart_data em diferentes formatos possíveis
    const chartData = storageData?.chart_data || storageData?.chartData || storageData;
    const labels = chartData?.labels;
    
    if (!labels || !Array.isArray(labels) || labels.length === 0) {
      // Se não tem labels, usa best_day_days ou fallback para 16 dias (período padrão de análise)
      const daysRemaining = getDaysRemaining();
      if (daysRemaining !== null && daysRemaining > 0) {
        return daysRemaining;
      }
      // Fallback: período padrão de análise do StorageAdvisor (16-30 dias)
      return 16;
    }
    
    // Shelf-life base: usa o número de dias no gráfico
    const totalDays = labels.length;
    
    // Se temos recomendação de venda, shelf-life é pelo menos até a data recomendada
    const daysRemaining = getDaysRemaining();
    if (daysRemaining !== null && daysRemaining > 0) {
      // Shelf-life é o máximo entre o período analisado e os dias até a recomendação
      return Math.max(totalDays, daysRemaining);
    }
    
    return totalDays;
  };
  
  const daysRemaining = getDaysRemaining();
  const shelfLife = getShelfLife();
  
  if (loading) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>⏳</div>
        <div style={{ color: theme.colors.textMuted }}>Carregando análise de qualidade...</div>
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
  
  if (!storageData) {
    return (
      <div style={{ color: theme.colors.textPrimary, textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📊</div>
        <div style={{ color: theme.colors.textMuted }}>Dados de qualidade não disponíveis</div>
      </div>
    );
  }
  
  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        📊 Qualidade & Disponibilidade
      </h3>

      {/* Recomendação Principal */}
      {storageData.recommendation && (
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.1) 100%)`,
            padding: '20px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(0, 217, 255, 0.3)`,
            marginBottom: '20px',
            textAlign: 'center'
          }}
        >
          <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            🎯 Recomendação IA
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.accent, marginBottom: '8px' }}>
            {storageData.recommendation.action}
          </div>
          {storageData.recommendation.best_day_date && (
            <div style={{ fontSize: '14px', color: theme.colors.textMuted }}>
              Data ideal: {storageData.recommendation.best_day_date}
            </div>
          )}
          {storageData.recommendation.projected_profit && (
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '4px' }}>
              Lucro projetado: R$ {storageData.recommendation.projected_profit.toFixed(2)}/kg
            </div>
          )}
          {storageData.recommendation.risk_event && (
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '8px', fontStyle: 'italic' }}>
              {storageData.recommendation.risk_event}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(34, 197, 94, 0.1) 100%)`,
            padding: '16px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(34, 197, 94, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            📅 Dias Restantes
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
            {daysRemaining !== null ? `${daysRemaining} dias` : 'Calculando...'}
          </div>
          {daysRemaining !== null && storageData.recommendation?.best_day_date && (
            <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginTop: '4px' }}>
              Até {storageData.recommendation.best_day_date}
            </div>
          )}
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(124, 58, 237, 0.1) 100%)`,
            padding: '16px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(124, 58, 237, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            🕐 Shelf-Life Estimado
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.secondary }}>
            {shelfLife !== null ? `${shelfLife} dias` : 'Calculando...'}
          </div>
          {shelfLife !== null && (
            <div style={{ fontSize: '10px', color: theme.colors.textMuted, marginTop: '4px' }}>
              Vida útil estimada (análise de 16 dias)
            </div>
          )}
        </div>
      </div>

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
          ℹ️ Informações de Qualidade
        </div>
        <div style={{ marginBottom: '4px' }}>
          • Análise baseada em dados climáticos reais (16 dias)
        </div>
        <div style={{ marginBottom: '4px' }}>
          • Considera degradação biológica e volatilidade de mercado
        </div>
        {storageData.recommendation?.confidence_score && (
          <div style={{ marginTop: '8px', fontSize: '11px', fontStyle: 'italic' }}>
            Confiança: {(storageData.recommendation.confidence_score * 100).toFixed(0)}%
          </div>
        )}
      </div>
    </div>
  );
};

export default QualityTab;



