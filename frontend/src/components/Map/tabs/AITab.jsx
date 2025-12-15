import React from 'react';
import theme from '../../../styles/theme';

const AITab = ({ opportunity }) => {
  // TODO: Implementar sistema de recomendação automática
  // Por enquanto, mostra estrutura básica
  
  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        🤖 Recomendações da IA
      </h3>

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
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
          Recomendação
        </div>
        <div style={{ fontSize: '32px', fontWeight: 'bold', color: theme.colors.accent, marginBottom: '8px' }}>
          ⏳
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
          Sistema de recomendação automática será implementado
        </div>
      </div>

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
          📊 Score de Recomendação
        </div>
        <div style={{ fontSize: '14px', color: theme.colors.textPrimary }}>
          ⏳ Score será calculado baseado em múltiplos fatores
        </div>
      </div>

      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(239, 68, 68, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(239, 68, 68, 0.3)`
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
          🚨 Regiões Comprometidas
        </div>
        <div style={{ fontSize: '14px', color: theme.colors.textPrimary }}>
          ⏳ Identificação de regiões comprometidas será implementada
        </div>
      </div>
    </div>
  );
};

export default AITab;



