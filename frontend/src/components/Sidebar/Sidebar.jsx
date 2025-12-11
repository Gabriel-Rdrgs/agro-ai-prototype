import React, { useState } from 'react';
import '../../styles/sidebar.css';
import { OpportunityService } from '../../services/opportunityService';

// RECEBE 'opportunities' DO PAI AGORA
const Sidebar = ({ onSelectOpportunity, hideHeader = false, opportunities = [], onRefresh }) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('roi');
  const [searchTerm, setSearchTerm] = useState('');
  const [calculatingROI, setCalculatingROI] = useState(false);

const getFilteredOpportunities = () => {
    let filtered = Array.isArray(opportunities) ? [...opportunities] : [];

    // 1. Filtro de Texto (Busca em Produto, Estado e Cidade)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(opp => {
        const product = opp.product?.toLowerCase() || '';
        const state = opp.origin?.state?.toLowerCase() || ''; // Novo endereço
        const city = opp.origin?.city?.toLowerCase() || '';   // Novo endereço
        return product.includes(term) || state.includes(term) || city.includes(term);
      });
    }

    // 2. Filtro de ROI (Busca em financials.roi)
    if (filter === 'high') {
      filtered = filtered.filter(opp => (opp.financials?.roi || 0) >= 100);
    } else if (filter === 'medium') {
      filtered = filtered.filter(opp => (opp.financials?.roi || 0) >= 50 && (opp.financials?.roi || 0) < 100);
    } else if (filter === 'low') {
      filtered = filtered.filter(opp => (opp.financials?.roi || 0) < 50);
    }

    // 3. Ordenação
    if (sortBy === 'roi') {
      filtered.sort((a, b) => (b.financials?.roi || 0) - (a.financials?.roi || 0));
    } else if (sortBy === 'risk') {
      filtered.sort((a, b) => (a.details?.riskLevel || 0) - (b.details?.riskLevel || 0));
    } else if (sortBy === 'price') {
      filtered.sort((a, b) => (a.financials?.buyPrice || 0) - (b.financials?.buyPrice || 0));
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
    if (roi === null || isNaN(roi) || typeof roi !== 'number') return 'low';
    if (roi >= 100) return 'high';
    if (roi >= 50) return 'medium';
    return 'low';
  };

  // Verifica se há oportunidades sem ROI
  const hasOpportunitiesWithoutROI = opportunities.some(opp => 
    !opp.financials?.roi || opp.financials.roi === 0 || opp.financials.roi === null
  );

  const handleCalculateAllROI = async () => {
    setCalculatingROI(true);
    try {
      await OpportunityService.calculateAllROI();
      alert('✅ ROIs calculados com sucesso! Recarregue a página para ver os resultados.');
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('❌ Erro ao calcular ROIs: ' + (error.response?.data?.error || error.message));
    } finally {
      setCalculatingROI(false);
    }
  };

  return (
    <>
      {/* Botão para calcular ROIs se necessário */}
      {hasOpportunitiesWithoutROI && (
        <div style={{
          padding: '12px',
          marginBottom: '12px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: '8px',
          textAlign: 'center'
        }}>
          <p style={{ margin: '0 0 8px 0', color: '#fff', fontSize: '0.9rem' }}>
            ⚠️ Algumas oportunidades não têm ROI calculado
          </p>
          <button
            onClick={handleCalculateAllROI}
            disabled={calculatingROI}
            style={{
              background: calculatingROI ? '#94a3b8' : '#fff',
              color: calculatingROI ? '#64748b' : '#667eea',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '6px',
              cursor: calculatingROI ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem',
              width: '100%'
            }}
          >
            {calculatingROI ? '🔄 Calculando...' : '🚀 Calcular Todos os ROIs'}
          </button>
        </div>
      )}

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
          filteredOpportunities.map((opp) => {
            // --- CORREÇÃO: Extração segura dos dados aninhados ---
            const financials = opp.financials || {};
            const origin = opp.origin || {};
            const details = opp.details || {};
            
            // Valores com fallback para evitar erros (NaN ou undefined)
            // Garante que roi seja um número válido ou null
            const roiRaw = financials.roi;
            const roi = (roiRaw !== null && roiRaw !== undefined && !isNaN(roiRaw) && typeof roiRaw === 'number') 
              ? parseFloat(roiRaw) 
              : null;
            const buyPrice = financials.buyPrice || 0;
            const sellPrice = financials.sellPrice || 0;
            const riskLevel = details.riskLevel || 1;
            const volume = details.volume || 'N/A';
            const needsCalculation = financials.needsCalculation || roi === null || roi === 0;

            return (
              <div
                key={opp.id}
                className={`opportunity-card ${details.isOptimized ? 'optimized' : ''}`}
                onClick={() => onSelectOpportunity && onSelectOpportunity(opp)}
              >
                <div className="opportunity-card-header">
                  <div className="opportunity-card-title">
                    <h3>
                        {opp.product}
                        {/* Ícone de Robô se for IA */}
                        {details.isOptimized && <span title="Otimizado por IA" style={{fontSize:'0.8em', marginLeft:'5px'}}> 🤖</span>}
                    </h3>
                    {/* Agora lê de 'origin' */}
                    <p>📍 {origin.city}, {origin.state}</p>
                  </div>
                  
                  {/* Agora usa a variável 'roi' extraída acima */}
                  <div className={`roi-badge ${roi !== null && !isNaN(roi) ? getROIColor(roi) : 'low'}`}>
                    {roi !== null && !isNaN(roi) && typeof roi === 'number' ? `${roi.toFixed(1)}%` : '⏳ N/A'}
                  </div>
                </div>

                <div className="opportunity-info">
                  <span>
                    <strong className="opportunity-info-price">
                      {/* Agora usa 'buyPrice' extraído */}
                      {formatPrice(buyPrice)}
                    </strong>
                  </span>
                  <span>
                    → <strong className="opportunity-info-price">{formatPrice(sellPrice)}</strong>
                  </span>
                </div>

                <div className="opportunity-details">
                  {/* Agora lê de 'details' */}
                  <span>📦 {volume}</span>
                  <span>⚠️ Risco {riskLevel}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </>
  );
};

export default Sidebar;