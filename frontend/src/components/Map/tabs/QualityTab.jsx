import React from 'react';
import theme from '../../../styles/theme';

const QualityTab = ({ opportunity }) => {
  // TODO: Buscar dados de qualidade do Python (storage_advisor)
  // Por enquanto, mostra estrutura básica
  
  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        📊 Qualidade & Disponibilidade
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
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
          Qualidade Atual
        </div>
        <div style={{ fontSize: '48px', fontWeight: 'bold', color: theme.colors.accent }}>
          ⏳
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '8px' }}>
          Dados serão carregados do Python
        </div>
      </div>

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
            ⏳
          </div>
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
            🕐 Shelf-Life
          </div>
          <div style={{ fontSize: '24px', fontWeight: 'bold', color: theme.colors.secondary }}>
            ⏳
          </div>
        </div>
      </div>

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
        ℹ️ Esta aba será preenchida com dados do Storage Advisor (Python) em breve.
      </div>
    </div>
  );
};

export default QualityTab;



