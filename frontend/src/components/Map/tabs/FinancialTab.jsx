import React from 'react';
import theme from '../../../styles/theme';

const FinancialTab = ({ opportunity }) => {
  const financials = opportunity.financials || {};
  
  // ✅ UNIFICADO: ROI vem do Python (cálculo de produção completa)
  // Não recalcula no frontend - usa o ROI que vem do banco (calculado pelo Python)
  // ROI vem do Python (cálculo completo: produção + frete + taxas + quebra + embalagem)
  const roiValue = financials.roi;
  const roi = (roiValue !== null && roiValue !== undefined && !isNaN(roiValue) && typeof roiValue === 'number') 
    ? parseFloat(roiValue) 
    : null;
  
  // ⚠️ VALIDAÇÃO: ROI muito alto pode indicar problema de unidade
  const roiIsSuspicious = roi !== null && roi > 500; // ROI > 500% é suspeito

  const formatPrice = (price) => {
    if (!price && price !== 0) return 'N/A';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(price);
  };

  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        💰 Análise Financeira
      </h3>

      {/* ROI Card */}
      <div
        style={{
          background: roi !== null && !isNaN(roi)
            ? (roiIsSuspicious 
              ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' // Amarelo para suspeito
              : roi >= 100 ? 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)' 
              : roi >= 50 ? 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)' 
              : 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)')
            : 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)',
          padding: '20px',
          borderRadius: theme.borderRadius,
          marginBottom: '20px',
          textAlign: 'center',
          border: `2px solid ${roi !== null && !isNaN(roi) 
            ? (roiIsSuspicious 
              ? '#b45309' // Amarelo para suspeito
              : roi >= 100 ? '#15803d' : roi >= 50 ? '#b45309' : '#dc2626')
            : '#6366f1'}`
        }}
      >
        <div style={{ fontSize: '14px', color: '#64748b', marginBottom: '8px', fontWeight: '600' }}>
          Retorno sobre Investimento
          {roiIsSuspicious && (
            <span style={{ display: 'block', fontSize: '11px', color: '#b45309', marginTop: '4px' }}>
              ⚠️ Valor suspeito - Verifique unidades (caixa vs kg)
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: '48px',
            fontWeight: 'bold',
            color: roi !== null && !isNaN(roi)
              ? (roiIsSuspicious 
                ? '#b45309' // Amarelo para suspeito
                : roi >= 100 ? '#15803d' : roi >= 50 ? '#b45309' : '#dc2626')
              : '#6366f1',
            lineHeight: '1'
          }}
        >
          {roi !== null && !isNaN(roi) && typeof roi === 'number' 
            ? `${roi.toFixed(1)}%` 
            : '⏳ N/A'}
        </div>
        {roiIsSuspicious && (
          <div style={{ fontSize: '11px', color: '#b45309', marginTop: '8px', fontStyle: 'italic' }}>
            ROI > 500% pode indicar erro de unidade
          </div>
        )}
      </div>

      {/* Preços */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '20px' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(34, 197, 94, 0.1) 100%)`,
            padding: '16px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(34, 197, 94, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            💰 Preço de Compra
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e' }}>
            {formatPrice(financials.buyPrice)}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '4px' }}>
            por kg
          </div>
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.1) 100%)`,
            padding: '16px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(0, 217, 255, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            💵 Preço de Venda
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.accent }}>
            {formatPrice(financials.sellPrice)}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '4px' }}>
            por kg
          </div>
        </div>
      </div>

      {/* Frete e Destino */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(124, 58, 237, 0.1) 100%)`,
            padding: '16px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(124, 58, 237, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            🚛 Frete
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: theme.colors.secondary }}>
            {formatPrice(financials.freight)}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '4px' }}>
            por kg
          </div>
        </div>

        <div
          style={{
            background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.1) 100%)`,
            padding: '16px',
            borderRadius: theme.borderRadius,
            border: `1px solid rgba(0, 217, 255, 0.3)`
          }}
        >
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            📍 Destino
          </div>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.colors.accent }}>
            {opportunity.destination?.name || 'N/A'}
          </div>
          <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginTop: '4px' }}>
            {opportunity.destination?.state || ''}
          </div>
        </div>
      </div>

      {/* Informação adicional */}
      <div style={{ marginTop: '20px' }}>
        {opportunity.financials?.needsCalculation && (
          <div
            style={{
              padding: '12px',
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: theme.borderRadius,
              color: '#fca5a5',
              fontSize: '12px',
              textAlign: 'center',
              marginBottom: '12px'
            }}
          >
            ⚠️ Alguns valores precisam ser calculados pelo Python
          </div>
        )}
        
        {/* Informação sobre cálculo do ROI */}
        <div
          style={{
            padding: '12px',
            background: 'rgba(0, 217, 255, 0.1)',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            borderRadius: theme.borderRadius,
            color: theme.colors.textMuted,
            fontSize: '11px',
            lineHeight: '1.5'
          }}
        >
          <strong style={{ color: theme.colors.accent }}>ℹ️ Sobre o ROI:</strong><br/>
          {roi !== null ? (
            <>
              <strong>ROI de Produção Completa:</strong> {roi.toFixed(1)}%
              {roiIsSuspicious && (
                <><br/><span style={{ color: '#b45309' }}>⚠️ ROI muito alto - Verifique se os preços estão na mesma unidade (kg)</span></>
              )}
              <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '4px', fontSize: '10px' }}>
                📊 <strong>Este ROI inclui:</strong>
                <br />• Custo de produção
                <br />• Frete e logística
                <br />• Taxas CEASA (17%)
                <br />• Quebra técnica (perda no transporte)
                <br />• Embalagem
                <br />
                <br />💡 <strong>Mesmo cálculo usado no simulador</strong> - valores consistentes em toda a aplicação.
              </div>
            </>
          ) : (
            'ROI calculado pelo Python (cálculo de produção completa)'
          )}
        </div>
      </div>
    </div>
  );
};

export default FinancialTab;



