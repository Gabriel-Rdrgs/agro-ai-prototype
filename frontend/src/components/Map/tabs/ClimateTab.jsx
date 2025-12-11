import React from 'react';
import theme from '../../../styles/theme';

const ClimateTab = ({ opportunity }) => {
  // TODO: Buscar dados climáticos do Python
  // Por enquanto, mostra estrutura básica
  
  return (
    <div style={{ color: theme.colors.textPrimary }}>
      <h3 style={{ color: theme.colors.accent, marginBottom: '20px', fontSize: '18px' }}>
        🌦️ Clima & Safra
      </h3>

      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(0, 217, 255, 0.3)`,
          marginBottom: '20px'
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
          🌧️ Comparação de Chuva
        </div>
        <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
          Ano Anterior vs. Atual
        </div>
        <div style={{ marginTop: '12px', fontSize: '14px', color: theme.colors.textPrimary }}>
          ⏳ Dados serão carregados do Python
        </div>
      </div>

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
          ⚠️ Eventos Extremos
        </div>
        <div style={{ fontSize: '14px', color: theme.colors.textPrimary }}>
          ⏳ Detecção de picos de frio/calor será implementada
        </div>
      </div>

      <div
        style={{
          background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(34, 197, 94, 0.1) 100%)`,
          padding: '20px',
          borderRadius: theme.borderRadius,
          border: `1px solid rgba(34, 197, 94, 0.3)`
        }}
      >
        <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
          🌾 Informações de Safra
        </div>
        <div style={{ fontSize: '14px', color: theme.colors.textPrimary }}>
          ⏳ Dados do calendário de safra serão exibidos aqui
        </div>
      </div>
    </div>
  );
};

export default ClimateTab;



