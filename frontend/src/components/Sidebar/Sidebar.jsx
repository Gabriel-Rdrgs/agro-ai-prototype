import React, { useState } from 'react';
import { opportunities, sortByROI } from '../../data/mockOpportunities';

const Sidebar = ({ onSelectOpportunity, onToggle, hideHeader = false }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('roi');
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar oportunidades
  const getFilteredOpportunities = () => {
    let filtered = [...opportunities];

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(opp =>
        opp.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.stateName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        opp.city.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filtro por ROI
    if (filter === 'high') {
      filtered = filtered.filter(opp => opp.roi >= 100);
    } else if (filter === 'medium') {
      filtered = filtered.filter(opp => opp.roi >= 50 && opp.roi < 100);
    } else if (filter === 'low') {
      filtered = filtered.filter(opp => opp.roi < 50);
    }

    // Ordenação
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

  // Formatação de preço
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Cor do badge de ROI
  const getROIColor = (roi) => {
    if (roi >= 100) return '#22c55e';
    if (roi >= 50) return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div style={{
      width: '350px',
      height: '100vh',
      backgroundColor: '#ffffff',
      borderRight: '2px solid #e5e7eb',
      overflowY: 'auto',
      display: 'flex',
      flexDirection: 'column'
    }}>
           
      {/* Busca */}
      <div style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
        <input
          type="text"
          placeholder="🔍 Buscar produto, estado ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{
            width: '100%',
            padding: '10px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none',
            transition: 'border-color 0.2s',
            boxSizing: 'border-box'
          }}
          onFocus={(e) => e.target.style.borderColor = '#2c5f2d'}
          onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
        />
      </div>

      {/* Filtros */}
      <div style={{ padding: '15px', borderBottom: '1px solid #e5e7eb' }}>
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
          FILTRAR POR ROI:
        </label>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
          <button
            onClick={() => setFilter('all')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: filter === 'all' ? '2px solid #2c5f2d' : '2px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: filter === 'all' ? '#f0fdf4' : 'white',
              fontSize: '12px',
              fontWeight: filter === 'all' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('high')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: filter === 'high' ? '2px solid #22c55e' : '2px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: filter === 'high' ? '#dcfce7' : 'white',
              fontSize: '12px',
              fontWeight: filter === 'high' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Alto
          </button>
          <button
            onClick={() => setFilter('medium')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: filter === 'medium' ? '2px solid #f59e0b' : '2px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: filter === 'medium' ? '#fef3c7' : 'white',
              fontSize: '12px',
              fontWeight: filter === 'medium' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Médio
          </button>
          <button
            onClick={() => setFilter('low')}
            style={{
              flex: 1,
              padding: '8px 12px',
              border: filter === 'low' ? '2px solid #ef4444' : '2px solid #e5e7eb',
              borderRadius: '6px',
              backgroundColor: filter === 'low' ? '#fee2e2' : 'white',
              fontSize: '12px',
              fontWeight: filter === 'low' ? 'bold' : 'normal',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            Baixo
          </button>
        </div>

        <label style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px', display: 'block' }}>
          ORDENAR POR:
        </label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '2px solid #e5e7eb',
            borderRadius: '6px',
            fontSize: '13px',
            backgroundColor: 'white',
            cursor: 'pointer',
            outline: 'none'
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
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#9ca3af' }}>
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
                borderBottom: '1px solid #e5e7eb',
                cursor: 'pointer',
                transition: 'background-color 0.2s',
                backgroundColor: 'white'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
            >
              {/* Header do card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ margin: '0 0 4px 0', fontSize: '15px', fontWeight: 'bold', color: '#1f2937' }}>
                    {opp.product}
                  </h3>
                  <p style={{ margin: 0, fontSize: '12px', color: '#6b7280' }}>
                    📍 {opp.city}, {opp.state}
                  </p>
                </div>
                <div style={{
                  backgroundColor: getROIColor(opp.roi) + '20',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: `2px solid ${getROIColor(opp.roi)}`
                }}>
                  <span style={{ fontSize: '13px', fontWeight: 'bold', color: getROIColor(opp.roi) }}>
                    {opp.roi}%
                  </span>
                </div>
              </div>

              {/* Informações */}
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                <span>💰 {formatPrice(opp.buyPrice)}/kg → </span>
                <span style={{ color: '#059669', fontWeight: '600' }}>{formatPrice(opp.sellPrice)}/kg</span>
              </div>

              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
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
