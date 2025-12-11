import React from 'react';
import theme from '../../styles/theme';

const OpportunityTabs = ({ tabs, activeTab, onTabChange }) => {
  return (
    <div
      style={{
        display: 'flex',
        borderBottom: `2px solid ${theme.colors.accent}`,
        background: theme.colors.background,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          style={{
            flex: 1,
            minWidth: '120px',
            padding: '16px 20px',
            background: activeTab === tab.id 
              ? `linear-gradient(180deg, ${theme.colors.accent}20 0%, transparent 100%)`
              : 'transparent',
            border: 'none',
            borderBottom: activeTab === tab.id 
              ? `3px solid ${theme.colors.accent}`
              : '3px solid transparent',
            color: activeTab === tab.id 
              ? theme.colors.accent 
              : theme.colors.textMuted,
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: activeTab === tab.id ? 'bold' : '600',
            transition: theme.transition,
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontFamily: theme.font
          }}
          onMouseEnter={(e) => {
            if (activeTab !== tab.id) {
              e.target.style.color = theme.colors.accent;
              e.target.style.background = 'rgba(0, 217, 255, 0.05)';
            }
          }}
          onMouseLeave={(e) => {
            if (activeTab !== tab.id) {
              e.target.style.color = theme.colors.textMuted;
              e.target.style.background = 'transparent';
            }
          }}
        >
          <span style={{ fontSize: '18px' }}>{tab.icon}</span>
          <span>{tab.label.replace(tab.icon + ' ', '')}</span>
        </button>
      ))}
      <style>{`
        div::-webkit-scrollbar {
          display: none;
        }
      `}</style>
    </div>
  );
};

export default OpportunityTabs;



