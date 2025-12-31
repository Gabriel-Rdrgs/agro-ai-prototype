import React, { useState, useEffect } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import theme from '../../styles/theme';
import { PortfolioService } from '../../services/portfolioService';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

const PortfolioManager = () => {
  const [operations, setOperations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedOperation, setSelectedOperation] = useState(null);

  useEffect(() => {
    fetchData();
  }, [selectedStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [ops, statistics] = await Promise.all([
        PortfolioService.getOperations(selectedStatus === 'all' ? null : selectedStatus),
        PortfolioService.getStats()
      ]);
      setOperations(ops);
      setStats(statistics);
    } catch (error) {
      console.error('Erro ao buscar dados do portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateOperation = async (operationData) => {
    try {
      await PortfolioService.createOperation(operationData);
      setShowCreateModal(false);
      fetchData();
    } catch (error) {
      console.error('Erro ao criar operação:', error);
      alert('Erro ao criar operação. Verifique os dados e tente novamente.');
    }
  };

  const handleUpdateOperation = async (operationId, operationData) => {
    try {
      await PortfolioService.updateOperation(operationId, operationData);
      setSelectedOperation(null);
      fetchData();
    } catch (error) {
      console.error('Erro ao atualizar operação:', error);
    }
  };

  const handleDeleteOperation = async (operationId) => {
    if (!confirm('Tem certeza que deseja remover esta operação?')) return;

    try {
      await PortfolioService.deleteOperation(operationId);
      fetchData();
    } catch (error) {
      console.error('Erro ao remover operação:', error);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      planned: '#3b82f6',
      in_progress: '#f59e0b',
      completed: '#10b981',
      cancelled: '#ef4444'
    };
    return colors[status] || theme.colors.textMuted;
  };

  const getStatusLabel = (status) => {
    const labels = {
      planned: 'Planejada',
      in_progress: 'Em Andamento',
      completed: 'Concluída',
      cancelled: 'Cancelada'
    };
    return labels[status] || status;
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.colors.textMuted }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        <div>Carregando portfolio...</div>
      </div>
    );
  }

  // Dados para gráfico de ROI
  const completedOps = operations.filter(op => op.status === 'completed' && op.projectedROI && op.actualROI);
  const roiChartData = {
    labels: completedOps.map(op => op.product),
    datasets: [
      {
        label: 'ROI Projetado',
        data: completedOps.map(op => op.projectedROI),
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        borderColor: '#3b82f6',
        borderWidth: 2
      },
      {
        label: 'ROI Real',
        data: completedOps.map(op => op.actualROI),
        backgroundColor: 'rgba(16, 185, 129, 0.5)',
        borderColor: '#10b981',
        borderWidth: 2
      }
    ]
  };

  const roiChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: theme.colors.textPrimary }
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(1)}%`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: { color: theme.colors.textMuted },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      },
      x: {
        ticks: { color: theme.colors.textMuted },
        grid: { color: 'rgba(255, 255, 255, 0.1)' }
      }
    }
  };

  return (
    <div style={{ padding: '20px', color: theme.colors.textPrimary }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: theme.colors.accent, margin: 0 }}>💼 Portfolio Tracking</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          style={{
            padding: '10px 20px',
            background: `linear-gradient(135deg, ${theme.colors.accent} 0%, rgba(0, 217, 255, 0.8) 100%)`,
            border: `2px solid ${theme.colors.accent}`,
            borderRadius: theme.borderRadius,
            color: theme.colors.background,
            fontSize: '14px',
            fontWeight: 'bold',
            cursor: 'pointer'
          }}
        >
          + Nova Operação
        </button>
      </div>

      {/* Estatísticas */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px', background: 'rgba(0, 217, 255, 0.1)', borderRadius: theme.borderRadius, border: `1px solid rgba(0, 217, 255, 0.3)` }}>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>Total Investido</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: theme.colors.accent }}>
              R$ {stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: theme.borderRadius, border: `1px solid rgba(16, 185, 129, 0.3)` }}>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>Lucro Líquido</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: stats.netProfit >= 0 ? '#10b981' : '#ef4444' }}>
              R$ {stats.netProfit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(124, 58, 237, 0.1)', borderRadius: theme.borderRadius, border: `1px solid rgba(124, 58, 237, 0.3)` }}>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>Taxa de Acerto</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#7c3aed' }}>
              {stats.successRate.toFixed(1)}%
            </div>
          </div>
          <div style={{ padding: '16px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: theme.borderRadius, border: `1px solid rgba(239, 68, 68, 0.3)` }}>
            <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginBottom: '4px' }}>Operações</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#ef4444' }}>
              {stats.completed}/{stats.total}
            </div>
          </div>
        </div>
      )}

      {/* Gráfico de ROI */}
      {completedOps.length > 0 && (
        <div style={{ padding: '20px', background: 'rgba(0, 217, 255, 0.05)', borderRadius: theme.borderRadius, marginBottom: '24px' }}>
          <h3 style={{ color: theme.colors.accent, marginBottom: '16px' }}>ROI Projetado vs Real</h3>
          <div style={{ height: '300px' }}>
            <Bar data={roiChartData} options={roiChartOptions} />
          </div>
        </div>
      )}

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {['all', 'planned', 'in_progress', 'completed', 'cancelled'].map(status => (
          <button
            key={status}
            onClick={() => setSelectedStatus(status)}
            style={{
              padding: '8px 16px',
              background: selectedStatus === status 
                ? theme.colors.accent 
                : 'rgba(255, 255, 255, 0.1)',
              border: `1px solid ${selectedStatus === status ? theme.colors.accent : 'rgba(255, 255, 255, 0.2)'}`,
              borderRadius: theme.borderRadius,
              color: selectedStatus === status ? theme.colors.background : theme.colors.textPrimary,
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            {status === 'all' ? 'Todas' : getStatusLabel(status)}
          </button>
        ))}
      </div>

      {/* Lista de Operações */}
      {operations.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textMuted }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💼</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>Nenhuma operação registrada</div>
          <div style={{ fontSize: '14px' }}>Comece registrando uma compra ou venda</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {operations.map((operation) => (
            <div
              key={operation.id}
              style={{
                padding: '20px',
                background: `linear-gradient(135deg, ${theme.colors.background} 0%, ${getStatusColor(operation.status)}15 100%)`,
                borderRadius: theme.borderRadius,
                border: `2px solid ${getStatusColor(operation.status)}`,
                cursor: 'pointer'
              }}
              onClick={() => setSelectedOperation(operation)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{operation.type === 'buy' ? '📥' : '📤'}</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
                        {operation.product}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
                        {operation.origin} → {operation.destination}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '12px' }}>
                    <div>
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>Quantidade</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>{operation.quantity.toLocaleString('pt-BR')} kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>Preço</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>R$ {operation.price.toFixed(2)}/kg</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>Valor Total</div>
                      <div style={{ fontSize: '14px', fontWeight: 'bold' }}>R$ {operation.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</div>
                    </div>
                    {operation.projectedROI && (
                      <div>
                        <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>ROI Projetado</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#3b82f6' }}>{operation.projectedROI.toFixed(1)}%</div>
                      </div>
                    )}
                    {operation.actualROI !== null && (
                      <div>
                        <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>ROI Real</div>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: operation.actualROI >= (operation.projectedROI || 0) ? '#10b981' : '#ef4444' }}>
                          {operation.actualROI.toFixed(1)}%
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                  <div
                    style={{
                      padding: '6px 12px',
                      background: `${getStatusColor(operation.status)}20`,
                      border: `1px solid ${getStatusColor(operation.status)}`,
                      borderRadius: theme.borderRadius,
                      color: getStatusColor(operation.status),
                      fontSize: '12px',
                      fontWeight: 'bold'
                    }}
                  >
                    {getStatusLabel(operation.status)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteOperation(operation.id);
                    }}
                    style={{
                      padding: '6px 12px',
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid #ef4444',
                      borderRadius: theme.borderRadius,
                      color: '#ef4444',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    Remover
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modais */}
      {showCreateModal && (
        <CreateOperationModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateOperation}
        />
      )}

      {selectedOperation && (
        <EditOperationModal
          operation={selectedOperation}
          onClose={() => setSelectedOperation(null)}
          onUpdate={handleUpdateOperation}
        />
      )}
    </div>
  );
};

// Componentes de Modal (simplificados - podem ser expandidos)
const CreateOperationModal = ({ onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    type: 'buy',
    product: '',
    origin: '',
    destination: '',
    quantity: '',
    price: '',
    projectedROI: '',
    status: 'planned',
    notes: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate({
      ...formData,
      quantity: parseFloat(formData.quantity),
      price: parseFloat(formData.price),
      projectedROI: formData.projectedROI ? parseFloat(formData.projectedROI) : null
    });
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0, 0, 0, 0.75)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }} onClick={onClose}>
      <div style={{ background: theme.colors.background, borderRadius: theme.borderRadius, width: '100%', maxWidth: '600px', padding: '24px', boxShadow: theme.colors.cardGlow, border: `2px solid ${theme.colors.accent}` }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ color: theme.colors.accent, marginBottom: '20px' }}>Nova Operação</h3>
        <form onSubmit={handleSubmit}>
          {/* Campos do formulário aqui - simplificado por espaço */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '20px' }}>
            <button type="button" onClick={onClose} style={{ padding: '10px 20px', background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: theme.borderRadius, color: theme.colors.textPrimary, fontSize: '14px', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button type="submit" style={{ padding: '10px 20px', background: `linear-gradient(135deg, ${theme.colors.accent} 0%, rgba(0, 217, 255, 0.8) 100%)`, border: `2px solid ${theme.colors.accent}`, borderRadius: theme.borderRadius, color: theme.colors.background, fontSize: '14px', fontWeight: 'bold', cursor: 'pointer' }}>
              Criar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const EditOperationModal = ({ operation, onClose, onUpdate }) => {
  // Similar ao CreateOperationModal mas para edição
  return <div>Edit Modal (implementar)</div>;
};

export default PortfolioManager;

