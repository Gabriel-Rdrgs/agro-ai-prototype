import React, { useState, useEffect } from 'react';
import theme from '../../styles/theme';
import { AlertService } from '../../services/alertService';

const AlertsManager = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'opportunity',
    product: '',
    minRoi: null,
    minProfit: null,
    regions: [],
    channels: ['email']
  });

  useEffect(() => {
    fetchAlerts();
  }, []);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await AlertService.getAll();
      setAlerts(data);
    } catch (error) {
      console.error('Erro ao buscar alertas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAlert = async () => {
    try {
      // Validação básica
      if (!newAlert.minRoi && !newAlert.minProfit) {
        alert('Por favor, defina pelo menos um ROI mínimo ou lucro mínimo.');
        return;
      }

      await AlertService.create(newAlert);
      setShowCreateModal(false);
      setNewAlert({ 
        type: 'opportunity', 
        product: '', 
        minRoi: null, 
        minProfit: null, 
        regions: [], 
        channels: ['email'] 
      });
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao criar alerta:', error);
      alert('Erro ao criar alerta. Verifique os dados e tente novamente.');
    }
  };

  const handleToggleActive = async (alertId, isActive) => {
    try {
      await AlertService.update(alertId, { isActive: !isActive });
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao atualizar alerta:', error);
    }
  };

  const handleDelete = async (alertId) => {
    if (!window.confirm('Tem certeza que deseja remover este alerta?')) return;

    try {
      await AlertService.delete(alertId);
      fetchAlerts();
    } catch (error) {
      console.error('Erro ao remover alerta:', error);
    }
  };

  const getAlertTypeLabel = (type) => {
    const labels = {
      roi_threshold: 'ROI Mínimo/Máximo',
      price_change: 'Mudança de Preço',
      extreme_weather: 'Eventos Climáticos',
      new_opportunity: 'Nova Oportunidade'
    };
    return labels[type] || type;
  };

  const getAlertTypeIcon = (type) => {
    const icons = {
      roi_threshold: '💰',
      price_change: '📈',
      extreme_weather: '🌦️',
      new_opportunity: '🆕'
    };
    return icons[type] || '🔔';
  };

  const renderAlertConfig = (alert) => {
    // ✅ FASE B - B2: Usa novos campos diretos
    const parts = [];
    
    if (alert.product) {
      parts.push(`Produto: ${alert.product}`);
    } else {
      parts.push('Produto: Todos');
    }
    
    if (alert.minRoi !== null && alert.minRoi !== undefined) {
      parts.push(`ROI mínimo: ${alert.minRoi}%`);
    }
    
    if (alert.minProfit !== null && alert.minProfit !== undefined) {
      parts.push(`Lucro mínimo: R$ ${alert.minProfit.toFixed(2)}`);
    }
    
    if (alert.regions && alert.regions.length > 0) {
      parts.push(`Estados: ${alert.regions.join(', ')}`);
    } else {
      parts.push('Estados: Todos');
    }

    return (
      <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
        {parts.join(' • ')}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: theme.colors.textMuted }}>
        <div style={{ fontSize: '32px', marginBottom: '16px' }}>⏳</div>
        <div>Carregando alertas...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', color: theme.colors.textPrimary }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h2 style={{ color: theme.colors.accent, margin: 0 }}>🔔 Sistema de Alertas</h2>
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
          + Novo Alerta
        </button>
      </div>

      {alerts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: theme.colors.textMuted }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔔</div>
          <div style={{ fontSize: '18px', marginBottom: '8px' }}>Nenhum alerta configurado</div>
          <div style={{ fontSize: '14px' }}>Crie alertas para ser notificado sobre oportunidades importantes</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '16px' }}>
          {alerts.map((alert) => (
            <div
              key={alert.id}
              style={{
                padding: '20px',
                background: alert.isActive 
                  ? `linear-gradient(135deg, ${theme.colors.background} 0%, rgba(0, 217, 255, 0.1) 100%)`
                  : 'rgba(255, 255, 255, 0.05)',
                borderRadius: theme.borderRadius,
                border: `2px solid ${alert.isActive ? theme.colors.accent : 'rgba(255, 255, 255, 0.2)'}`,
                opacity: alert.isActive ? 1 : 0.6
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '24px' }}>{getAlertTypeIcon(alert.type)}</span>
                    <div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: theme.colors.textPrimary }}>
                        {getAlertTypeLabel(alert.type)}
                      </div>
                      {renderAlertConfig(alert)}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '8px' }}>
                    Canais: {alert.channels?.join(', ') || 'Nenhum'}
                    {alert.lastTriggered && (
                      <span style={{ marginLeft: '12px' }}>
                        • Último disparo: {new Date(alert.lastTriggered).toLocaleString('pt-BR')}
                      </span>
                    )}
                    {alert.triggerCount > 0 && (
                      <span style={{ marginLeft: '12px' }}>
                        • Disparado {alert.triggerCount} vez(es)
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => handleToggleActive(alert.id, alert.isActive)}
                    style={{
                      padding: '6px 12px',
                      background: alert.isActive ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                      border: `1px solid ${alert.isActive ? '#ef4444' : '#10b981'}`,
                      borderRadius: theme.borderRadius,
                      color: alert.isActive ? '#ef4444' : '#10b981',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    {alert.isActive ? 'Desativar' : 'Ativar'}
                  </button>
                  <button
                    onClick={() => handleDelete(alert.id)}
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

      {/* Modal de Criação */}
      {showCreateModal && (
        <CreateAlertModal
          newAlert={newAlert}
          setNewAlert={setNewAlert}
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateAlert}
        />
      )}
    </div>
  );
};

const CreateAlertModal = ({ newAlert, setNewAlert, onClose, onCreate }) => {
  const toggleChannel = (channel) => {
    setNewAlert(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

  const toggleRegion = (region) => {
    setNewAlert(prev => ({
      ...prev,
      regions: prev.regions.includes(region)
        ? prev.regions.filter(r => r !== region)
        : [...prev.regions, region]
    }));
  };

  const brazilianStates = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
    'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
    'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
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
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: theme.colors.background,
          borderRadius: theme.borderRadius,
          width: '100%',
          maxWidth: '600px',
          padding: '24px',
          boxShadow: theme.colors.cardGlow,
          border: `2px solid ${theme.colors.accent}`
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ color: theme.colors.accent, marginBottom: '20px' }}>Criar Novo Alerta</h3>

        {/* ✅ FASE B - B2: Formulário simplificado com novos campos */}
        
        {/* Produto */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            Produto (opcional - deixe vazio para todos)
          </label>
          <select
            value={newAlert.product || ''}
            onChange={(e) => setNewAlert(prev => ({ ...prev, product: e.target.value || null }))}
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              borderRadius: theme.borderRadius,
              color: theme.colors.textPrimary,
              fontSize: '14px'
            }}
          >
            <option value="">Todos os produtos</option>
            <option value="Tomate">Tomate</option>
            <option value="Soja">Soja</option>
            <option value="Milho">Milho</option>
          </select>
        </div>

        {/* ROI Mínimo */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            ROI Mínimo (%) (opcional)
          </label>
          <input
            type="number"
            step="0.1"
            value={newAlert.minRoi || ''}
            onChange={(e) => setNewAlert(prev => ({ 
              ...prev, 
              minRoi: e.target.value ? parseFloat(e.target.value) : null 
            }))}
            placeholder="Ex: 15.5"
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              borderRadius: theme.borderRadius,
              color: theme.colors.textPrimary,
              fontSize: '14px'
            }}
          />
        </div>

        {/* Lucro Mínimo */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            Lucro Mínimo (R$) (opcional)
          </label>
          <input
            type="number"
            step="0.01"
            value={newAlert.minProfit || ''}
            onChange={(e) => setNewAlert(prev => ({ 
              ...prev, 
              minProfit: e.target.value ? parseFloat(e.target.value) : null 
            }))}
            placeholder="Ex: 10000.00"
            style={{
              width: '100%',
              padding: '10px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              borderRadius: theme.borderRadius,
              color: theme.colors.textPrimary,
              fontSize: '14px'
            }}
          />
        </div>

        {/* Estados */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            Estados (opcional - deixe vazio para todos)
          </label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', 
            gap: '8px',
            maxHeight: '150px',
            overflowY: 'auto',
            padding: '8px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: theme.borderRadius
          }}>
            {brazilianStates.map(state => (
              <label key={state} style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', fontSize: '12px' }}>
                <input
                  type="checkbox"
                  checked={newAlert.regions.includes(state)}
                  onChange={() => toggleRegion(state)}
                />
                <span style={{ color: theme.colors.textPrimary }}>{state}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Canais de Notificação */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            Canais de Notificação
          </label>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {['email', 'telegram', 'whatsapp'].map(channel => (
              <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newAlert.channels.includes(channel)}
                  onChange={() => toggleChannel(channel)}
                />
                <span style={{ fontSize: '14px', color: theme.colors.textPrimary }}>
                  {channel === 'email' ? '📧 Email' : channel === 'telegram' ? '📱 Telegram' : '💬 WhatsApp'}
                </span>
              </label>
            ))}
          </div>
          <div style={{ fontSize: '12px', color: theme.colors.textMuted, marginTop: '8px' }}>
            💡 Configure Telegram/WhatsApp nas configurações do perfil para receber alertas por esses canais
          </div>
        </div>

        {/* Botões */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{
              padding: '10px 20px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: `1px solid rgba(255, 255, 255, 0.2)`,
              borderRadius: theme.borderRadius,
              color: theme.colors.textPrimary,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onCreate}
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
            Criar Alerta
          </button>
        </div>
      </div>
    </div>
  );
};

export default AlertsManager;

