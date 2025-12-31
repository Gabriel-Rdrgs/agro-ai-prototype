// frontend/src/components/Dashboard/BestOpportunitiesSection.jsx
import React, { useState, useEffect } from 'react';
import { OpportunityService } from '../../services/opportunityService';
import theme from '../../styles/theme';

// Função auxiliar para formatar preço
const formatPrice = (price) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(price || 0);
};

const BestOpportunitiesSection = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    products: null,  // null = todos
    max_results: 10,
    min_roi: null,
    month: null
  });
  const [scanStats, setScanStats] = useState(null);

  const fetchBestOpportunities = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await OpportunityService.getBestOpportunities(filters);
      setOpportunities(data.opportunities || []);
      setScanStats({
        total_scanned: data.total_scanned,
        duration: data.scan_duration_seconds
      });
    } catch (err) {
      setError(err.message || 'Erro ao buscar melhores oportunidades. Tente novamente mais tarde.');
      console.error('Erro ao buscar melhores oportunidades:', err);
    } finally {
      setLoading(false);
    }
  };

  // ✅ OTIMIZAÇÃO: NÃO carrega automaticamente (muito pesado)
  // useEffect(() => {
  //   fetchBestOpportunities();
  // }, []);

  const getROIColor = (roi) => {
    if (roi >= 50) return '#10b981'; // Verde
    if (roi >= 20) return '#3b82f6'; // Azul
    if (roi >= 0) return '#f59e0b'; // Amarelo
    return '#ef4444'; // Vermelho
  };

  return (
    <div className="highlight-section" style={{
      background: 'var(--bg-card)',
      padding: '20px',
      borderRadius: '12px',
      border: '1px solid rgba(255,255,255,0.05)',
      marginBottom: '30px'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px'
      }}>
        <h3 style={{
          color: theme.colors.accent,
          margin: 0,
          fontSize: '1.2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          🎯 Melhores Oportunidades de Negócio
        </h3>
        <button
          onClick={fetchBestOpportunities}
          disabled={loading}
          style={{
            padding: '6px 12px',
            background: loading ? 'rgba(0, 217, 255, 0.3)' : 'rgba(0, 217, 255, 0.1)',
            border: '1px solid #00d9ff',
            borderRadius: '6px',
            color: '#00d9ff',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '0.85rem',
            transition: 'all 0.2s'
          }}
        >
          {loading ? '🔄 Escaneando...' : '🔄 Atualizar'}
        </button>
      </div>

      {/* ✅ NOVO: Informação sobre origem dos dados */}
      {opportunities.length > 0 && (
        <div style={{
          marginBottom: '20px',
          padding: '10px 12px',
          background: 'rgba(59, 130, 246, 0.1)',
          borderRadius: '6px',
          border: '1px solid rgba(59, 130, 246, 0.2)',
          fontSize: '0.8rem',
          color: '#94a3b8',
          lineHeight: '1.4'
        }}>
          <strong style={{ color: '#60a5fa' }}>ℹ️ Sobre os Valores:</strong>
          <div style={{ marginTop: '6px' }}>
            • <strong>Preço de Compra:</strong> Último preço registrado na origem (banco de dados)
            <br />
            • <strong>Preço de Venda:</strong> Último preço registrado no destino (banco de dados)
            <br />
            • <strong>ROI:</strong> Calculado considerando custos de produção, frete, perdas na viagem e margem de comercialização
            <br />
            • <strong>Área Base:</strong> {opportunities[0]?.area_ha || 10.0} hectares (padrão). ROI e lucro são proporcionais à área.
            <br />
            • <strong>Datas:</strong> Exibidas abaixo de cada preço (referência do último registro)
            <br />
            <br />
            <strong style={{ color: '#10b981' }}>✅ Consistência Garantida:</strong>
            <br />
            • <strong>Dashboard:</strong> Usa mesma lógica do banco (find_best_route) - mostra apenas o melhor destino para cada origem
            <br />
            • <strong>Mapa:</strong> Mostra ROI do melhor destino já calculado (mesma lógica)
            <br />
            • <strong>Tabela "Monitoramento":</strong> Mostra dados do banco (mesma lógica)
            <br />
            • <strong>Simulador:</strong> Calcula ROI para origem/destino específicos escolhidos pelo usuário
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '10px',
        marginBottom: '20px',
        padding: '15px',
        background: 'rgba(0, 217, 255, 0.05)',
        borderRadius: '8px'
      }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
            Produtos
          </label>
          <select
            value={filters.products ? filters.products.join(',') : 'all'}
            onChange={(e) => setFilters({
              ...filters,
              products: e.target.value === 'all' ? null : e.target.value.split(',')
            })}
            style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          >
            <option value="all">Todos</option>
            <option value="Tomate">Tomate</option>
            <option value="Soja">Soja</option>
            <option value="Milho">Milho</option>
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
            ROI Mínimo (%)
          </label>
          <input
            type="number"
            value={filters.min_roi || ''}
            onChange={(e) => setFilters({
              ...filters,
              min_roi: e.target.value ? parseFloat(e.target.value) : null
            })}
            placeholder="Qualquer"
            style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </div>
        
        <div>
          <label style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
            Máx. Resultados
          </label>
          <input
            type="number"
            value={filters.max_results}
            onChange={(e) => setFilters({
              ...filters,
              max_results: parseInt(e.target.value) || 10
            })}
            min="1"
            max="50"
            style={{
              width: '100%',
              padding: '6px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              color: 'var(--text-primary)',
              fontSize: '0.85rem'
            }}
          />
        </div>
      </div>

      {/* Estatísticas do Scan */}
      {scanStats && (
        <div style={{
          fontSize: '0.8rem',
          color: '#94a3b8',
          marginBottom: '15px',
          padding: '8px',
          background: 'rgba(0, 217, 255, 0.05)',
          borderRadius: '4px'
        }}>
          📊 Escaneadas {scanStats.total_scanned} combinações em {scanStats.duration}s
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
          <div style={{ fontSize: '2rem', marginBottom: '10px' }}>⏳</div>
          <p style={{ fontSize: '1rem', marginBottom: '10px' }}>
            Escaneando combinações de origem/destino...
          </p>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Analisando top 15 origens × 8 destinos principais
          </p>
          <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '8px', fontStyle: 'italic' }}>
            ⚡ Processamento otimizado em paralelo (pode levar 30-60 segundos)
          </p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div style={{
          padding: '20px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          textAlign: 'center'
        }}>
          <p>{error}</p>
          <button
            onClick={fetchBestOpportunities}
            style={{
              marginTop: '10px',
              padding: '8px 16px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              borderRadius: '6px',
              color: '#ef4444',
              cursor: 'pointer'
            }}
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Lista de Oportunidades */}
      {!loading && !error && opportunities.length > 0 && (
        <div style={{ display: 'grid', gap: '12px' }}>
          {opportunities.map((opp, idx) => (
            <div
              key={idx}
              style={{
                background: 'rgba(0, 217, 255, 0.05)',
                padding: '16px',
                borderRadius: '8px',
                border: `1px solid ${getROIColor(opp.roi)}40`,
                borderLeft: `4px solid ${getROIColor(opp.roi)}`,
                transition: 'all 0.2s',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 217, 255, 0.1)';
                e.currentTarget.style.transform = 'translateX(4px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(0, 217, 255, 0.05)';
                e.currentTarget.style.transform = 'translateX(0)';
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '12px'
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '4px'
                  }}>
                    <h4 style={{
                      margin: 0,
                      color: 'var(--text-primary)',
                      fontSize: '1rem'
                    }}>
                      {opp.product}
                    </h4>
                    {idx === 0 && (
                      <span style={{
                        background: '#10b981',
                        color: 'white',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.7rem',
                        fontWeight: 'bold'
                      }}>
                        #1 MELHOR
                      </span>
                    )}
                  </div>
                  <p style={{
                    margin: 0,
                    color: '#94a3b8',
                    fontSize: '0.85rem'
                  }}>
                    📍 {opp.origin_city}, {opp.origin_state} → {opp.destination_name}
                  </p>
                </div>
                <div style={{
                  textAlign: 'right',
                  padding: '8px 12px',
                  background: `${getROIColor(opp.roi)}20`,
                  borderRadius: '6px',
                  border: `1px solid ${getROIColor(opp.roi)}40`
                }}>
                  <div style={{
                    color: getROIColor(opp.roi),
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    lineHeight: 1
                  }}>
                    {opp.roi.toFixed(1)}%
                  </div>
                  <div style={{
                    color: '#94a3b8',
                    fontSize: '0.7rem',
                    marginTop: '4px'
                  }}>
                    ROI
                  </div>
                </div>
              </div>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: '10px',
                marginTop: '12px',
                paddingTop: '12px',
                borderTop: '1px solid rgba(255,255,255,0.05)'
              }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Compra:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: '4px', display: 'block' }}>
                    {formatPrice(opp.buy_price)}/kg
                  </strong>
                  {opp.buy_price_date && (
                    <span style={{ color: '#64748b', fontSize: '0.65rem', display: 'block', marginTop: '2px' }}>
                      📅 {new Date(opp.buy_price_date).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Venda:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: '4px', display: 'block' }}>
                    {formatPrice(opp.sell_price)}/kg
                  </strong>
                  {opp.sell_price_date && (
                    <span style={{ color: '#64748b', fontSize: '0.65rem', display: 'block', marginTop: '2px' }}>
                      📅 {new Date(opp.sell_price_date).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Lucro:</span>
                  <strong style={{
                    color: opp.net_profit > 0 ? '#10b981' : '#ef4444',
                    marginLeft: '4px',
                    display: 'block'
                  }}>
                    R$ {opp.net_profit.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </strong>
                </div>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>Distância:</span>
                  <strong style={{ color: 'var(--text-primary)', marginLeft: '4px', display: 'block' }}>
                    {opp.distance_km} km
                  </strong>
                </div>
              </div>

              {/* ✅ NOVO: Informações sobre origem dos dados e quando comprar/vender */}
              <div style={{
                marginTop: '12px',
                padding: '10px',
                background: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '6px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
                fontSize: '0.75rem',
                color: '#94a3b8'
              }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#60a5fa' }}>📊 Fonte dos Dados:</strong>
                  <span style={{ marginLeft: '6px' }}>
                    {opp.price_source || 'Banco de Dados (Último registro disponível)'}
                  </span>
                </div>
                <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(59, 130, 246, 0.2)' }}>
                  <strong style={{ color: '#60a5fa' }}>💡 Quando Comprar/Vender:</strong>
                  <div style={{ marginTop: '4px', lineHeight: '1.4' }}>
                    • <strong>Compra:</strong> Preço atual na origem ({opp.origin_city}, {opp.origin_state})
                    {opp.buy_price_date && ` (referência: ${new Date(opp.buy_price_date).toLocaleDateString('pt-BR')})`}
                    <br />
                    • <strong>Venda:</strong> Preço atual no destino ({opp.destination_name})
                    {opp.sell_price_date && ` (referência: ${new Date(opp.sell_price_date).toLocaleDateString('pt-BR')})`}
                    <br />
                    • <strong>ROI:</strong> Calculado considerando custos de produção, frete e perdas na viagem
                    <br />
                    • <strong>Área Base:</strong> {opp.area_ha || 10.0} hectares (padrão). ROI e lucro são proporcionais à área.
                  </div>
                </div>
                {opp.calculation_note && (
                  <div style={{ marginTop: '6px', paddingTop: '6px', borderTop: '1px solid rgba(59, 130, 246, 0.2)', fontSize: '0.7rem', fontStyle: 'italic' }}>
                    ℹ️ {opp.calculation_note}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State / Initial State */}
      {!loading && !error && opportunities.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '40px',
          color: '#94a3b8'
        }}>
          <div style={{ fontSize: '3rem', marginBottom: '10px' }}>🎯</div>
          <p style={{ fontSize: '1rem', marginBottom: '10px' }}>
            Clique em "🔄 Atualizar" para escanear as melhores oportunidades de negócio.
          </p>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            O scan analisa combinações de origem/destino e pode levar alguns segundos.
          </p>
        </div>
      )}
    </div>
  );
};

export default BestOpportunitiesSection;


