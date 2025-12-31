import React, { useState, useEffect } from 'react';
import theme from '../../styles/theme';
import { OpportunityService } from '../../services/opportunityService';

const ComparisonModal = ({ opportunities, isOpen, onClose }) => {
  const [selectedOpportunities, setSelectedOpportunities] = useState([]);
  const [comparisonData, setComparisonData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && opportunities && opportunities.length > 0) {
      // Inicializa com as primeiras 3 oportunidades se houver
      setSelectedOpportunities(opportunities.slice(0, Math.min(3, opportunities.length)).map(opp => opp.id));
    }
  }, [isOpen, opportunities]);

  useEffect(() => {
    const fetchComparison = async () => {
      if (selectedOpportunities.length === 0) {
        setComparisonData(null);
        return;
      }

      setLoading(true);
      try {
        const response = await OpportunityService.compareOpportunities(selectedOpportunities);
        setComparisonData(response);
      } catch (error) {
        console.error('Erro ao comparar oportunidades:', error);
      } finally {
        setLoading(false);
      }
    };

    if (selectedOpportunities.length > 0) {
      fetchComparison();
    }
  }, [selectedOpportunities]);

  if (!isOpen) return null;

  const toggleOpportunity = (oppId) => {
    setSelectedOpportunities(prev => {
      if (prev.includes(oppId)) {
        return prev.filter(id => id !== oppId);
      } else if (prev.length < 5) {
        return [...prev, oppId];
      }
      return prev;
    });
  };

  const getRecommendationColor = (rec) => {
    if (!rec) return theme.colors.textMuted;
    switch (rec) {
      case 'COMPRAR':
        return '#10b981';
      case 'AGUARDAR':
        return '#f59e0b';
      case 'NÃO COMPRAR':
        return '#ef4444';
      default:
        return theme.colors.accent;
    }
  };

  return (
    <>
      {/* Overlay */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 20000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          animation: 'fadeIn 0.3s ease'
        }}
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            background: theme.colors.background,
            borderRadius: theme.borderRadius,
            width: '100%',
            maxWidth: '1200px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: theme.colors.cardGlow,
            border: `2px solid ${theme.colors.accent}`,
            display: 'flex',
            flexDirection: 'column',
            animation: 'slideUp 0.3s ease',
            fontFamily: theme.font
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div
            style={{
              padding: '20px',
              borderBottom: `2px solid ${theme.colors.accent}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.1) 100%)`
            }}
          >
            <div>
              <h2 style={{ margin: 0, color: theme.colors.accent, fontSize: '20px', fontWeight: 'bold' }}>
                🔄 Comparar Oportunidades
              </h2>
              <p style={{ margin: '4px 0 0 0', color: theme.colors.textMuted, fontSize: '14px' }}>
                Selecione até 5 oportunidades para comparar
              </p>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${theme.colors.accent}`,
                color: theme.colors.accent,
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                cursor: 'pointer',
                fontSize: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: theme.transition
              }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: `linear-gradient(180deg, ${theme.colors.background} 0%, rgba(10, 14, 39, 0.95) 100%)`
            }}
          >
            {/* Seleção de Oportunidades */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ fontSize: '14px', color: theme.colors.textMuted, marginBottom: '12px' }}>
                Selecione as oportunidades para comparar ({selectedOpportunities.length}/5):
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
                {opportunities && opportunities.map((opp) => {
                  const isSelected = selectedOpportunities.includes(opp.id);
                  return (
                    <div
                      key={opp.id}
                      onClick={() => toggleOpportunity(opp.id)}
                      style={{
                        padding: '12px',
                        background: isSelected 
                          ? `linear-gradient(135deg, ${theme.colors.accent}20 0%, ${theme.colors.accent}10 100%)`
                          : 'rgba(255, 255, 255, 0.05)',
                        border: `2px solid ${isSelected ? theme.colors.accent : 'rgba(255, 255, 255, 0.2)'}`,
                        borderRadius: theme.borderRadius,
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOpportunity(opp.id)}
                          style={{ cursor: 'pointer' }}
                        />
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
                          {opp.product}
                        </div>
                      </div>
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                        {opp.origin?.city}, {opp.origin?.state}
                      </div>
                      {opp.roi !== null && opp.roi !== undefined && (
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: theme.colors.accent, marginTop: '4px' }}>
                          ROI: {opp.roi.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Tabela Comparativa */}
            {loading && (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textMuted }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
                <div>Comparando oportunidades...</div>
              </div>
            )}

            {!loading && comparisonData && comparisonData.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: theme.borderRadius,
                    overflow: 'hidden'
                  }}
                >
                  <thead>
                    <tr style={{ background: 'rgba(0, 217, 255, 0.1)' }}>
                      <th style={{ padding: '12px', textAlign: 'left', color: theme.colors.accent, fontSize: '12px', fontWeight: 'bold' }}>
                        Métrica
                      </th>
                      {comparisonData.map((opp, idx) => (
                        <th
                          key={opp.id}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            color: theme.colors.textPrimary,
                            fontSize: '12px',
                            fontWeight: 'bold',
                            borderLeft: idx > 0 ? `1px solid rgba(255, 255, 255, 0.1)` : 'none'
                          }}
                        >
                          <div style={{ fontSize: '14px', marginBottom: '4px' }}>{opp.product}</div>
                          <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                            {opp.origin?.city}, {opp.origin?.state}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ padding: '12px', color: theme.colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                        💰 ROI
                      </td>
                      {comparisonData.map((opp, idx) => (
                        <td
                          key={opp.id}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            color: opp.roi >= 50 ? '#10b981' : opp.roi >= 30 ? '#3b82f6' : opp.roi >= 15 ? '#f59e0b' : '#ef4444',
                            fontSize: '16px',
                            fontWeight: 'bold',
                            borderLeft: idx > 0 ? `1px solid rgba(255, 255, 255, 0.1)` : 'none'
                          }}
                        >
                          {opp.roi !== null && opp.roi !== undefined ? `${opp.roi.toFixed(1)}%` : 'N/A'}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                      <td style={{ padding: '12px', color: theme.colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                        💵 Preço Compra
                      </td>
                      {comparisonData.map((opp, idx) => (
                        <td
                          key={opp.id}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            color: theme.colors.textPrimary,
                            fontSize: '14px',
                            borderLeft: idx > 0 ? `1px solid rgba(255, 255, 255, 0.1)` : 'none'
                          }}
                        >
                          {opp.buyPrice !== null && opp.buyPrice !== undefined ? `R$ ${parseFloat(opp.buyPrice).toFixed(2)}/kg` : 'N/A'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', color: theme.colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                        💵 Preço Venda
                      </td>
                      {comparisonData.map((opp, idx) => (
                        <td
                          key={opp.id}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            color: theme.colors.textPrimary,
                            fontSize: '14px',
                            borderLeft: idx > 0 ? `1px solid rgba(255, 255, 255, 0.1)` : 'none'
                          }}
                        >
                          {opp.sellPrice !== null && opp.sellPrice !== undefined ? `R$ ${parseFloat(opp.sellPrice).toFixed(2)}/kg` : 'N/A'}
                        </td>
                      ))}
                    </tr>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                      <td style={{ padding: '12px', color: theme.colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                        🚚 Frete
                      </td>
                      {comparisonData.map((opp, idx) => (
                        <td
                          key={opp.id}
                          style={{
                            padding: '12px',
                            textAlign: 'center',
                            color: theme.colors.textPrimary,
                            fontSize: '14px',
                            borderLeft: idx > 0 ? `1px solid rgba(255, 255, 255, 0.1)` : 'none'
                          }}
                        >
                          {opp.freight !== null && opp.freight !== undefined ? `R$ ${parseFloat(opp.freight).toFixed(2)}/kg` : 'N/A'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', color: theme.colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                        📍 Distância
                      </td>
                      {comparisonData.map((opp, idx) => {
                        // Calcula distância aproximada se tiver coordenadas
                        let distance = 'N/A';
                        if (opp.origin?.lat && opp.origin?.lng && opp.destination?.lat && opp.destination?.lng) {
                          // Fórmula de Haversine simplificada
                          const R = 6371; // Raio da Terra em km
                          const dLat = (opp.destination.lat - opp.origin.lat) * Math.PI / 180;
                          const dLon = (opp.destination.lng - opp.origin.lng) * Math.PI / 180;
                          const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                            Math.cos(opp.origin.lat * Math.PI / 180) * Math.cos(opp.destination.lat * Math.PI / 180) *
                            Math.sin(dLon/2) * Math.sin(dLon/2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                          distance = `${Math.round(R * c * 1.35)} km`; // 1.35 = fator de sinuosidade
                        }
                        return (
                          <td
                            key={opp.id}
                            style={{
                              padding: '12px',
                              textAlign: 'center',
                              color: theme.colors.textPrimary,
                              fontSize: '14px',
                              borderLeft: idx > 0 ? `1px solid rgba(255, 255, 255, 0.1)` : 'none'
                            }}
                          >
                            {distance}
                          </td>
                        );
                      })}
                    </tr>
                    <tr style={{ background: 'rgba(255, 255, 255, 0.02)' }}>
                      <td style={{ padding: '12px', color: theme.colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                        ⚠️ Risco Climático
                      </td>
                      {comparisonData.map((opp, idx) => {
                        const riskLevel = opp.riskLevel || 0;
                        const riskColor = riskLevel <= 2 ? '#10b981' : riskLevel <= 4 ? '#f59e0b' : '#ef4444';
                        const riskText = riskLevel <= 2 ? 'Baixo' : riskLevel <= 4 ? 'Médio' : 'Alto';
                        return (
                          <td
                            key={opp.id}
                            style={{
                              padding: '12px',
                              textAlign: 'center',
                              color: riskColor,
                              fontSize: '14px',
                              fontWeight: 'bold',
                              borderLeft: idx > 0 ? `1px solid rgba(255, 255, 255, 0.1)` : 'none'
                            }}
                          >
                            {riskText}
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td style={{ padding: '12px', color: theme.colors.textPrimary, fontSize: '13px', fontWeight: 'bold' }}>
                        🤖 Recomendação IA
                      </td>
                      {comparisonData.map((opp, idx) => {
                        const rec = opp.recommendation || 'N/A';
                        const recColor = getRecommendationColor(rec);
                        return (
                          <td
                            key={opp.id}
                            style={{
                              padding: '12px',
                              textAlign: 'center',
                              color: recColor,
                              fontSize: '14px',
                              fontWeight: 'bold',
                              borderLeft: idx > 0 ? `1px solid rgba(255, 255, 255, 0.1)` : 'none'
                            }}
                          >
                            {rec !== 'N/A' ? rec : 'N/A'}
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {!loading && (!comparisonData || comparisonData.length === 0) && selectedOpportunities.length > 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textMuted }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>📊</div>
                <div>Nenhum dado de comparação disponível</div>
              </div>
            )}

            {selectedOpportunities.length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textMuted }}>
                <div style={{ fontSize: '32px', marginBottom: '16px' }}>🔄</div>
                <div>Selecione pelo menos uma oportunidade para comparar</div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default ComparisonModal;


