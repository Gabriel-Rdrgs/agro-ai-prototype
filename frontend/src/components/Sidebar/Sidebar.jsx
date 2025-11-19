import React, { useState } from 'react';
import '../../styles/sidebar.css';

// RECEBE 'opportunities' DO PAI AGORA
const Sidebar = ({ onSelectOpportunity, hideHeader = false, opportunities = [] }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('roi');
  const [searchTerm, setSearchTerm] = useState('');

  const getFilteredOpportunities = () => {
    // Usa a lista que veio do pai
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

  const formatPrice = (price) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);

  const getROIColor = (roi) => {
    if (roi >= 100) return 'high';
    if (roi >= 50) return 'medium';
    return 'low';
  };

  return (
    <>
      {/* Busca */}
      <div className="sidebar-search">
        <input
          type="text"
          placeholder="🔍 Buscar produto, estado ou cidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Filtros */}
      <div className="sidebar-filters">
        <label className="filter-label">📊 Filtrar por ROI</label>
        <div className="filter-buttons">
          <button
            onClick={() => setFilter('all')}
            className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('high')}
            className={`filter-btn ${filter === 'high' ? 'active' : ''}`}
          >
            Alto
          </button>
          <button
            onClick={() => setFilter('medium')}
            className={`filter-btn ${filter === 'medium' ? 'active' : ''}`}
          >
            Médio
          </button>
          <button
            onClick={() => setFilter('low')}
            className={`filter-btn ${filter === 'low' ? 'active' : ''}`}
          >
            Baixo
          </button>
        </div>

        <label className="filter-label">🔀 Ordenar por</label>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="sort-select"
        >
          <option value="roi">ROI maior primeiro</option>
          <option value="risk">Risco menor primeiro</option>
          <option value="price">Preço maior primeiro</option>
        </select>
      </div>

      {/* Lista de oportunidades */}
      <div className="opportunities-list">
        {filteredOpportunities.length === 0 ? (
          <div className="empty-state">
            <p>🔍 Nenhuma oportunidade encontrada</p>
            <p>Tente ajustar os filtros</p>
          </div>
        ) : (
          filteredOpportunities.map((opp) => (
            <div
              key={opp.id}
              className="opportunity-card"
              onClick={() => onSelectOpportunity(opp)}
            >
              <div className="opportunity-card-header">
                <div className="opportunity-card-title">
                  <h3>{opp.product}</h3>
                  <p>📍 {opp.city}, {opp.state}</p>
                </div>
                <div className={`roi-badge ${getROIColor(opp.roi)}`}>
                  {opp.roi}%
                </div>
              </div>

              <div className="opportunity-info">
                <span>
                  <strong className="opportunity-info-price">
                    {formatPrice(opp.buyPrice)}
                  </strong>
                </span>
                <span>
                  → <strong className="opportunity-info-price">{formatPrice(opp.sellPrice)}</strong>
                </span>
              </div>

              <div className="opportunity-details">
                <span>📦 {opp.volume}</span>
                <span>⚠️ Risco {opp.risk}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </>
  );
};

export default Sidebar;