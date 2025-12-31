import React, { useState } from 'react';
import '../../styles/sidebar.css';
import { OpportunityService } from '../../services/opportunityService';
import { getPlantingSeasonStatus } from '../../utils/plantingCalendar';
import FavoriteButton from '../Common/FavoriteButton'; // ✅ NOVO: Botão de favoritar

// RECEBE 'opportunities' DO PAI AGORA
const Sidebar = ({ 
  onSelectOpportunity, 
  hideHeader = false, 
  opportunities = [], 
  onRefresh,
  // ✅ NOVO: Props para filtros avançados
  filters = {},
  onFiltersChange,
  aiPredictions = {},
  supplyRiskData = {}
}) => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState('roi');
  const [searchTerm, setSearchTerm] = useState('');
  const [calculatingROI, setCalculatingROI] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

const getFilteredOpportunities = () => {
    let filtered = Array.isArray(opportunities) ? [...opportunities] : [];

    // 1. Filtro de Texto (Busca em Produto, Estado e Cidade)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(opp => {
        const product = opp.product?.toLowerCase() || '';
        const state = opp.origin?.state?.toLowerCase() || opp.state?.toLowerCase() || '';
        const city = opp.origin?.city?.toLowerCase() || '';
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

    // ✅ NOVO: 3. Filtro de ROI Min/Max (filtros avançados)
    if (filters.roiMin !== undefined && filters.roiMin !== null) {
      filtered = filtered.filter(opp => {
        const roi = opp.financials?.roi || 0;
        return roi >= filters.roiMin;
      });
    }
    if (filters.roiMax !== undefined && filters.roiMax !== null) {
      filtered = filtered.filter(opp => {
        const roi = opp.financials?.roi || 0;
        return roi <= filters.roiMax;
      });
    }

    // ✅ NOVO: 4. Filtro de Estado (filtros avançados)
    if (filters.selectedStates && filters.selectedStates.length > 0) {
      filtered = filtered.filter(opp => {
        const state = opp.origin?.state || opp.state || '';
        return filters.selectedStates.includes(state);
      });
    }

    // ✅ NOVO: 5. Filtro de Nível de Risco (filtros avançados)
    if (filters.riskLevels && filters.riskLevels.length > 0) {
      filtered = filtered.filter(opp => {
        const riskLevel = opp.details?.riskLevel || opp.riskLevel || 'low';
        // Mapeia numérico para string se necessário
        let riskStr = riskLevel;
        if (typeof riskLevel === 'number') {
          if (riskLevel >= 4) riskStr = 'extreme';
          else if (riskLevel >= 3) riskStr = 'high';
          else if (riskLevel >= 2) riskStr = 'moderate';
          else riskStr = 'low';
        }
        return filters.riskLevels.includes(riskStr);
      });
    }

    // ✅ NOVO: 6. Filtro de Produto (filtros avançados)
    if (filters.products && filters.products.length > 0) {
      filtered = filtered.filter(opp => {
        const product = opp.product || '';
        return filters.products.includes(product);
      });
    }

    // ✅ NOVO: 7. Filtro de Safra/Época de Plantio (filtros avançados)
    if (filters.plantingSeasons && filters.plantingSeasons.length > 0) {
      filtered = filtered.filter(opp => {
        const product = opp.product || '';
        const state = opp.origin?.state || opp.state || '';
        const seasonStatus = getPlantingSeasonStatus(product, state);
        
        // Se dados não disponíveis, inclui apenas se "outros" estiver selecionado
        if (seasonStatus === null) {
          return filters.plantingSeasons.includes('unknown');
        }
        
        return filters.plantingSeasons.includes(seasonStatus);
      });
    }

    // 8. Ordenação
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

      {/* Filtros Básicos */}
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
        
        {/* ✅ NOVO: Botão para Filtros Avançados */}
        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid rgba(0, 217, 255, 0.3)',
            background: showAdvancedFilters ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
            color: '#00d9ff',
            fontSize: '12px',
            fontWeight: '600',
            cursor: 'pointer',
            width: '100%',
            transition: 'all 0.2s ease'
          }}
        >
          {showAdvancedFilters ? '▼' : '▶'} Filtros Avançados
        </button>
      </div>
      
      {/* ✅ NOVO: Filtros Avançados (Colapsável) - ESTÉTICA MELHORADA */}
      {showAdvancedFilters && onFiltersChange && (
        <div style={{
          marginTop: '16px',
          padding: '16px',
          background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.08) 0%, rgba(0, 217, 255, 0.03) 100%)',
          borderRadius: '12px',
          border: '1px solid rgba(0, 217, 255, 0.25)',
          boxShadow: '0 4px 12px rgba(0, 217, 255, 0.1)',
          transition: 'all 0.3s ease'
        }}>
          {/* ROI Min/Max */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              fontWeight: '700', 
              color: '#00d9ff', 
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              💰 ROI (%)
            </label>
            <div style={{ 
              display: 'flex', 
              gap: '8px', 
              alignItems: 'center',
              justifyContent: 'flex-start'
            }}>
              <input
                type="number"
                value={filters.roiMin ?? 0}
                onChange={(e) => {
                  const value = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  // ✅ CORRIGIDO: Permite valores negativos e zero
                  if (!isNaN(value) && isFinite(value)) {
                    onFiltersChange({ ...filters, roiMin: value });
                  }
                }}
                style={{
                  width: '70px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 217, 255, 0.4)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  textAlign: 'center'
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid #00d9ff';
                  e.target.style.boxShadow = '0 0 8px rgba(0, 217, 255, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(0, 217, 255, 0.4)';
                  e.target.style.boxShadow = 'none';
                  // ✅ CORRIGIDO: Se campo ficar vazio, define como 0
                  if (e.target.value === '') {
                    onFiltersChange({ ...filters, roiMin: 0 });
                  }
                }}
                placeholder="Mín"
              />
              <span style={{ 
                color: '#94a3b8', 
                fontSize: '11px', 
                fontWeight: '500',
                padding: '0 2px'
              }}>
                até
              </span>
              <input
                type="number"
                value={filters.roiMax ?? 1000}
                onChange={(e) => onFiltersChange({ ...filters, roiMax: parseFloat(e.target.value) || 1000 })}
                style={{
                  width: '70px',
                  padding: '8px',
                  borderRadius: '6px',
                  border: '1px solid rgba(0, 217, 255, 0.4)',
                  background: 'rgba(15, 23, 42, 0.9)',
                  color: '#e2e8f0',
                  fontSize: '12px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  textAlign: 'center'
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid #00d9ff';
                  e.target.style.boxShadow = '0 0 8px rgba(0, 217, 255, 0.3)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(0, 217, 255, 0.4)';
                  e.target.style.boxShadow = 'none';
                }}
                placeholder="Máx"
              />
            </div>
          </div>
          
          {/* Estado */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              fontWeight: '700', 
              color: '#00d9ff', 
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🗺️ Estado
            </label>
            <select
              multiple
              value={filters.selectedStates || []}
              onChange={(e) => {
                const selected = Array.from(e.target.selectedOptions, option => option.value);
                onFiltersChange({ ...filters, selectedStates: selected });
              }}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 217, 255, 0.4)',
                background: 'rgba(15, 23, 42, 0.9)',
                color: '#e2e8f0',
                fontSize: '13px',
                minHeight: '80px',
                maxHeight: '120px',
                overflowY: 'auto',
                transition: 'all 0.2s ease',
                outline: 'none',
                cursor: 'pointer'
              }}
              onFocus={(e) => {
                e.target.style.border = '1px solid #00d9ff';
                e.target.style.boxShadow = '0 0 8px rgba(0, 217, 255, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.border = '1px solid rgba(0, 217, 255, 0.4)';
                e.target.style.boxShadow = 'none';
              }}
            >
              {[...new Set(opportunities.map(opp => opp.origin?.state || opp.state).filter(Boolean))].sort().map(state => (
                <option key={state} value={state} style={{ padding: '6px' }}>{state}</option>
              ))}
            </select>
            <div style={{ 
              fontSize: '10px', 
              color: '#64748b', 
              marginTop: '6px',
              fontStyle: 'italic'
            }}>
              💡 Segure Ctrl/Cmd para seleção múltipla
            </div>
          </div>
          
          {/* ✅ NOVO: Filtro de Produto */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              fontWeight: '700', 
              color: '#00d9ff', 
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🌾 Produto
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...new Set(opportunities.map(opp => opp.product).filter(Boolean))].sort().map(product => {
                const isChecked = Array.isArray(filters.products) && filters.products.includes(product);
                
                // Emoji e cor por produto
                const productStyles = {
                  'Tomate': { emoji: '🍅', color: '#ef4444' },
                  'Soja': { emoji: '🌾', color: '#fbbf24' },
                  'Milho': { emoji: '🌽', color: '#f59e0b' }
                };
                const style = productStyles[product] || { emoji: '🌱', color: '#22c55e' };
                
                const handleToggle = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!onFiltersChange) {
                    console.error('❌ onFiltersChange não está disponível!');
                    return;
                  }
                  const current = Array.isArray(filters.products) ? filters.products : [];
                  const updated = isChecked
                    ? current.filter(p => p !== product)
                    : [...current, product];
                  onFiltersChange({ ...filters, products: updated });
                };
                
                return (
                  <div
                    key={product}
                    onClick={handleToggle}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      cursor: 'pointer', 
                      fontSize: '13px', 
                      color: '#e2e8f0',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isChecked ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                      border: isChecked ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid transparent',
                      transition: 'all 0.2s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) {
                        e.currentTarget.style.background = 'rgba(0, 217, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div 
                      style={{
                        position: 'relative',
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: '2px solid rgba(0, 217, 255, 0.4)',
                        background: isChecked ? '#00d9ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        pointerEvents: 'none'
                      }}
                    >
                      {isChecked && (
                        <span style={{ color: '#0a0e27', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>
                    <span style={{ fontSize: '16px', pointerEvents: 'none' }}>{style.emoji}</span>
                    <span style={{ fontWeight: isChecked ? '600' : '400', pointerEvents: 'none' }}>{product}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Nível de Risco */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              fontWeight: '700', 
              color: '#00d9ff', 
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              ⚠️ Nível de Risco
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {['extreme', 'high', 'moderate', 'low'].map(level => {
                const colors = { 
                  extreme: '#dc2626', 
                  high: '#f59e0b', 
                  moderate: '#eab308', 
                  low: '#22c55e' 
                };
                const labels = { 
                  extreme: 'Extremo', 
                  high: 'Alto', 
                  moderate: 'Moderado', 
                  low: 'Baixo' 
                };
                const isChecked = Array.isArray(filters.riskLevels) && filters.riskLevels.includes(level);
                
                const handleToggle = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!onFiltersChange) {
                    console.error('❌ onFiltersChange não está disponível!');
                    return;
                  }
                  const current = Array.isArray(filters.riskLevels) ? filters.riskLevels : [];
                  const updated = isChecked
                    ? current.filter(l => l !== level)
                    : [...current, level];
                  console.debug(`🔄 Toggle risco ${level}:`, { 
                    isChecked, 
                    before: current, 
                    after: updated,
                    filters: filters 
                  });
                  onFiltersChange({ ...filters, riskLevels: updated });
                };
                
                return (
                  <div
                    key={level}
                    onClick={handleToggle}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      cursor: 'pointer', 
                      fontSize: '13px', 
                      color: '#e2e8f0',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isChecked ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                      border: isChecked ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid transparent',
                      transition: 'all 0.2s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) {
                        e.currentTarget.style.background = 'rgba(0, 217, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div 
                      style={{
                        position: 'relative',
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: '2px solid rgba(0, 217, 255, 0.4)',
                        background: isChecked ? '#00d9ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        pointerEvents: 'none'
                      }}
                    >
                      {isChecked && (
                        <span style={{ color: '#0a0e27', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>
                    <span style={{ 
                      width: '14px', 
                      height: '14px', 
                      borderRadius: '50%', 
                      background: colors[level], 
                      display: 'inline-block',
                      boxShadow: `0 0 8px ${colors[level]}40`,
                      flexShrink: 0,
                      pointerEvents: 'none'
                    }} />
                    <span style={{ fontWeight: isChecked ? '600' : '400', pointerEvents: 'none' }}>{labels[level]}</span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* ✅ NOVO: Filtro de Safra/Época de Plantio */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              fontWeight: '700', 
              color: '#00d9ff', 
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              🌱 Época de Plantio
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[
                { value: 'ideal', label: 'Ideal', color: '#22c55e', icon: '✅' },
                { value: 'risk', label: 'Risco', color: '#f59e0b', icon: '⚠️' },
                { value: 'out', label: 'Fora de Época', color: '#ef4444', icon: '❌' },
                { value: 'unknown', label: 'Sem Dados', color: '#64748b', icon: '❓' }
              ].map(season => {
                const isChecked = Array.isArray(filters.plantingSeasons) && filters.plantingSeasons.includes(season.value);
                
                const handleToggle = (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (!onFiltersChange) {
                    console.error('❌ onFiltersChange não está disponível!');
                    return;
                  }
                  const current = Array.isArray(filters.plantingSeasons) ? filters.plantingSeasons : [];
                  const updated = isChecked
                    ? current.filter(s => s !== season.value)
                    : [...current, season.value];
                  console.debug(`🔄 Toggle safra ${season.value}:`, { 
                    isChecked, 
                    before: current, 
                    after: updated,
                    filters: filters 
                  });
                  onFiltersChange({ ...filters, plantingSeasons: updated });
                };
                
                return (
                  <div
                    key={season.value}
                    onClick={handleToggle}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px', 
                      cursor: 'pointer', 
                      fontSize: '13px', 
                      color: '#e2e8f0',
                      padding: '8px 10px',
                      borderRadius: '6px',
                      background: isChecked ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                      border: isChecked ? '1px solid rgba(0, 217, 255, 0.3)' : '1px solid transparent',
                      transition: 'all 0.2s ease',
                      userSelect: 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (!isChecked) {
                        e.currentTarget.style.background = 'rgba(0, 217, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isChecked) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    <div 
                      style={{
                        position: 'relative',
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: '2px solid rgba(0, 217, 255, 0.4)',
                        background: isChecked ? '#00d9ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s ease',
                        flexShrink: 0,
                        pointerEvents: 'none'
                      }}
                    >
                      {isChecked && (
                        <span style={{ color: '#0a0e27', fontSize: '14px', fontWeight: 'bold' }}>✓</span>
                      )}
                    </div>
                    <span style={{ fontSize: '16px', pointerEvents: 'none' }}>{season.icon}</span>
                    <span style={{ 
                      width: '14px', 
                      height: '14px', 
                      borderRadius: '50%', 
                      background: season.color, 
                      display: 'inline-block',
                      boxShadow: `0 0 8px ${season.color}40`,
                      flexShrink: 0,
                      pointerEvents: 'none'
                    }} />
                    <span style={{ fontWeight: isChecked ? '600' : '400', pointerEvents: 'none' }}>{season.label}</span>
                  </div>
                );
              })}
            </div>
            <div style={{ 
              fontSize: '10px', 
              color: '#64748b', 
              marginTop: '6px',
              fontStyle: 'italic'
            }}>
              💡 Baseado no calendário ZARC/Embrapa
            </div>
          </div>
          
          {/* Botão Limpar */}
          {(filters.selectedStates?.length > 0 || filters.riskLevels?.length > 0 || filters.plantingSeasons?.length > 0 || (filters.roiMin && filters.roiMin !== 0) || (filters.roiMax && filters.roiMax !== 1000)) && (
            <button
              onClick={() => {
                const defaultFilters = {
                  roiMin: 0, // ✅ CORRIGIDO: Reset para 0 (não -100)
                  roiMax: 1000,
                  rainMin: 0,
                  rainMax: 500,
                  selectedStates: [],
                  riskLevels: [],
                  products: [],
                  plantingSeasons: []
                };
                // Limpa também do localStorage
                try {
                  localStorage.removeItem('agro_ai_map_filters');
                } catch (error) {
                  console.warn('⚠️ Erro ao limpar filtros salvos:', error);
                }
                onFiltersChange(defaultFilters);
              }}
              style={{
                width: '100%',
                padding: '10px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 217, 255, 0.4)',
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%)',
                color: '#00d9ff',
                fontSize: '12px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(0, 217, 255, 0.2) 0%, rgba(0, 217, 255, 0.1) 100%)';
                e.target.style.border = '1px solid #00d9ff';
                e.target.style.boxShadow = '0 0 12px rgba(0, 217, 255, 0.3)';
                e.target.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'linear-gradient(135deg, rgba(0, 217, 255, 0.1) 0%, rgba(0, 217, 255, 0.05) 100%)';
                e.target.style.border = '1px solid rgba(0, 217, 255, 0.4)';
                e.target.style.boxShadow = 'none';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              🗑️ Limpar Filtros Avançados
            </button>
          )}
        </div>
      )}

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
            // const needsCalculation = financials.needsCalculation || roi === null || roi === 0; // TODO: Usar quando necessário

            return (
              <div
                key={opp.id}
                className={`opportunity-card ${details.isOptimized ? 'optimized' : ''}`}
                onClick={() => onSelectOpportunity && onSelectOpportunity(opp)}
              >
                <div className="opportunity-card-header">
                  <div className="opportunity-card-title">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {opp.product}
                        {/* Ícone de Robô se for IA */}
                        {details.isOptimized && <span title="Otimizado por IA" style={{fontSize:'0.8em', marginLeft:'5px'}}> 🤖</span>}
                        {/* ✅ NOVO: Botão de favoritar */}
                        <FavoriteButton opportunityId={opp.id} size="small" />
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