import React, { useState } from 'react';
import theme from '../../styles/theme';
import OpportunityTabs from './OpportunityTabs';
import FinancialTab from './tabs/FinancialTab';
import QualityTab from './tabs/QualityTab';
import ClimateTab from './tabs/ClimateTab';
import AITab from './tabs/AITab';

const OpportunityModal = ({ opportunity, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('financial');

  if (!isOpen || !opportunity) return null;

  const tabs = [
    { id: 'financial', label: '💰 Financeiro', icon: '💰' },
    { id: 'quality', label: '📊 Qualidade', icon: '📊' },
    { id: 'climate', label: '🌦️ Clima', icon: '🌦️' },
    { id: 'ai', label: '🤖 IA', icon: '🤖' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'financial':
        return <FinancialTab opportunity={opportunity} />;
      case 'quality':
        return <QualityTab opportunity={opportunity} />;
      case 'climate':
        return <ClimateTab opportunity={opportunity} />;
      case 'ai':
        return <AITab opportunity={opportunity} />;
      default:
        return <FinancialTab opportunity={opportunity} />;
    }
  };

  return (
    <>
      {/* Overlay (fundo escurecido) */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          zIndex: 10000,
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
            maxWidth: '900px',
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
                {opportunity.product}
                {opportunity.details?.isOptimized && (
                  <span title="Otimizado por IA" style={{ fontSize: '0.8em', marginLeft: '8px' }}>🤖</span>
                )}
              </h2>
              <p style={{ margin: '4px 0 0 0', color: theme.colors.textMuted, fontSize: '14px' }}>
                📍 {opportunity.origin?.city}, {opportunity.origin?.state}
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
              onMouseEnter={(e) => {
                e.target.style.background = theme.colors.accent;
                e.target.style.color = theme.colors.background;
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = theme.colors.accent;
              }}
            >
              ✕
            </button>
          </div>

          {/* Tabs Navigation */}
          <div style={{ position: 'relative', zIndex: 10 }}>
            <OpportunityTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
          </div>

          {/* Tab Content */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '20px',
              background: `linear-gradient(180deg, ${theme.colors.background} 0%, rgba(10, 14, 39, 0.95) 100%)`,
              position: 'relative',
              zIndex: 1 // ✅ CORRIGIDO: Conteúdo da tab fica abaixo dos botões
            }}
          >
            {renderTabContent()}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default OpportunityModal;



