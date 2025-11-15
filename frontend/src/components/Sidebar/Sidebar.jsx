import React, { useState } from 'react';
import theme from '../../styles/theme';
import { opportunities, sortByROI } from '../../data/mockOpportunities';

const Sidebar = ({ onSelectOpportunity, onToggle, hideHeader = false }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('roi');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar oportunidades
  const getFilteredOpportunities = () => {
    let filtered = [...opportunities];

    if (searchTerm) {
      filtered = filtered.filter(opp =>
        opp.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.stateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filter === 'high') {
      filtered = filtered.filter(opp => opp.roi >= 100);
    } else if (filter === 'medium') {
      filtered = filtered.filter(opp => opp.roi >= 50 && opp.roi < 100);
    } else if (filter === 'low') {
      filtered = filtered.filter(opp => opp.roi < 50);
    }

    if (sortBy === 'roi') {
      filtered.sort((a, b) => b.roi - a.roi);
    } else if (sortBy === 'risk') {
      filtered.sort((a, b) => a.riskLevel - b.riskLevel);
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => b.buyPrice - a.buyPrice);
    }

    return filtered;
  };

  const filteredOpportunities = getFilteredOpportunities();

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getROIColor = (roi) => {
    if (roi >= 100) return theme.colors.accent;
    if (roi >= 50) return theme.colors.secondary;
    return theme.colors.warning;
  };

  return (
    <div
      className="sidebar"
      style={{
        width: '350px',
        height: '100vh',
        background: theme.colors.background,
        borderRight: `2px solid ${theme.colors.accent}33`,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        color: theme.colors.textPrimary,
        fontFamily: theme.font,
        boxShadow: theme.colors.cardGlow
      }}
    >
      {/* Busca */}
      <div style={{ padding: '15px', borderBottom: `1px solid ${theme.colors.accent}1A` }}>
        <input
          type="text"
          placeholder="🔍 Buscar produto, estado ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: `2px solid ${theme.colors.accent}1A`,
            borderRadius: theme.borderRadius,
            fontSize: '14px',
            outline: 'none',
            transition: theme.transition,
            boxSizing: 'border-box',
            background: theme.colors.background,
            color: theme.colors.textPrimary,
            fontFamily: theme.font
          }}
          onFocus={(e) => e.target.style.borderColor = theme.colors.accent}
          onBlur={(e) => e.target.style.borderColor = `${theme.colors.accent}1A`}
        />
      </div>

      {/* Filtros */}
      <div style={{ padding: '15px', borderBottom: `1px solid ${theme.colors.accent}1A` }}>
        <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.accent, marginBottom: '8px', display: 'block' }}>
          FILTRAR POR ROI:
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: filter === 'all' ? `2px solid ${theme.colors.accent}` : `2px solid ${theme.colors.textMuted}`,
              borderRadius: theme.borderRadius,
              background: filter === 'all' ? `${theme.colors.accent}12` : theme.colors.background,
              fontSize: '12px',
              fontWeight: filter === 'all' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: theme.transition,
              color: theme.colors.textPrimary
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('high')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: filter === 'high' ? `2px solid ${theme.colors.accent}` : `2px solid ${theme.colors.textMuted}`,
              borderRadius: theme.borderRadius,
              background: filter === 'high' ? `${theme.colors.accent}12` : theme.colors.background,
              fontSize: '12px',
              fontWeight: filter === 'high' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: theme.transition,
              color: theme.colors.textPrimary
            }}
          >
            Alto
          </button>
          <button
            onClick={() => setFilter('medium')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: filter === 'medium' ? `2px solid ${theme.colors.secondary}` : `2px solid ${theme.colors.textMuted}`,
              borderRadius: theme.borderRadius,
              background: filter === 'medium' ? `${theme.colors.secondary}12` : theme.colors.background,
              fontSize: '12px',
              fontWeight: filter === 'medium' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: theme.transition,
              color: theme.colors.textPrimary
            }}
          >
            Médio
          </button>
          <button
            onClick={() => setFilter('low')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: filter === 'low' ? `2px solid ${theme.colors.warning}` : `2px solid ${theme.colors.textMuted}`,
              borderRadius: theme.borderRadius,
              background: filter === 'low' ? `${theme.colors.warning}12` : theme.colors.background,
              fontSize: '12px',
              fontWeight: filter === 'low' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: theme.transition,
              color: theme.colors.textPrimary
            }}
          >
            Baixo
          </button>
        </div>

        <label style={{ fontSize: '12px', fontWeight: 600, color: theme.colors.accent, marginBottom: '8px', display: 'block' }}>
          ORDENAR POR:
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: `2px solid ${theme.colors.accent}1A`,
            borderRadius: theme.borderRadius,
            fontSize: '13px',
            background: theme.colors.background,
            color: theme.colors.textPrimary,
            cursor: 'pointer',
            outline: 'none',
            fontFamily: theme.font
          }}
        >
          <option value="roi">🎯 ROI (maior primeiro)</option>
          <option value="risk">⚠️ Risco (menor primeiro)</option>
          <option value="price">💰 Preço (maior primeiro)</option>
        </select>
      </div>

      {/* Lista de oportunidades */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredOpportunities.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: theme.colors.textMuted }}>
            <p style={{ fontSize: '14px' }}>Nenhuma oportunidade encontrada</p>
            <p style={{ fontSize: '12px' }}>Tente ajustar os filtros</p>
          </div>
        ) : (
          filteredOpportunities.map((opp) => (
            <div
              key={opp.id}
              onClick={() => onSelectOpportunity(opp)}
              style={{
                padding: '15px',
                borderBottom: `1px solid ${theme.colors.accent}1A`,
                cursor: 'pointer',
                transition: theme.transition,
                background: theme.colors.background,
                color: theme.colors.textPrimary,
                fontFamily: theme.font,
                borderRadius: theme.borderRadius
              }}
              onMouseEnter={e => e.currentTarget.style.background = `${theme.colors.accent}10`}
              onMouseLeave={e => e.currentTarget.style.background = theme.colors.background}
            >
              {/* Header do card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
                    {opp.product}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: theme.colors.textMuted }}>
                    📍 {opp.city}, {opp.state}
                  </p>
                </div>
                <div style={{
                  background: `${getROIColor(opp.roi)}20`,
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: `2px solid ${getROIColor(opp.roi)}`,
                  boxShadow: theme.colors.cardGlow
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: getROIColor(opp.roi) }}>
                    {opp.roi}%
                  </span>
                </div>
              </div>

              {/* Informações */}
              <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '6px' }}>
                <span>💰 {formatPrice(opp.buyPrice)}/kg → </span>
                <span style={{ color: theme.colors.accent, fontWeight: '600' }}>{formatPrice(opp.sellPrice)}/kg</span>
              </div>

              <div style={{ fontSize: '11px', color: theme.colors.textMuted }}>
                <span>📦 {opp.volume}</span>
                <span style={{ margin: '0 8px' }}>•</span>
                <span>⚠️ Risco {opp.risk}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Sidebar;
