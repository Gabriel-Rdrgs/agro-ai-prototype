import React, { useState, useEffect } from 'react';
import theme from '../../styles/theme';
import { AlertService } from '../../services/alertService';

const AlertsManager = () => {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAlert, setNewAlert] = useState({
    type: 'roi_threshold',
    config: {},
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
      await AlertService.create(newAlert);
      setShowCreateModal(false);
      setNewAlert({ type: 'roi_threshold', config: {}, channels: ['email'] });
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
    if (!confirm('Tem certeza que deseja remover este alerta?')) return;

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
    const { type, config } = alert;

    switch (type) {
      case 'roi_threshold':
        return (
          <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
            ROI {config.direction === 'above' ? 'acima' : 'abaixo'} de {config.threshold}%
            {config.product && ` • Produto: ${config.product}`}
            {config.state && ` • Estado: ${config.state}`}
          </div>
        );
      case 'price_change':
        return (
          <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
            Mudança de {config.threshold_percent}% em {config.time_window_hours}h
            {config.product && ` • Produto: ${config.product}`}
            {config.state && ` • Estado: ${config.state}`}
          </div>
        );
      case 'extreme_weather':
        return (
          <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
            Severidade: {config.severity?.join(', ') || 'Todas'}
            {config.regions?.length > 0 && ` • Regiões: ${config.regions.join(', ')}`}
          </div>
        );
      case 'new_opportunity':
        return (
          <div style={{ fontSize: '12px', color: theme.colors.textMuted }}>
            ROI mínimo: {config.min_roi || 0}%
            {config.product && ` • Produto: ${config.product}`}
            {config.state && ` • Estado: ${config.state}`}
          </div>
        );
      default:
        return null;
    }
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
  const updateConfig = (key, value) => {
    setNewAlert(prev => ({
      ...prev,
      config: { ...prev.config, [key]: value }
    }));
  };

  const toggleChannel = (channel) => {
    setNewAlert(prev => ({
      ...prev,
      channels: prev.channels.includes(channel)
        ? prev.channels.filter(c => c !== channel)
        : [...prev.channels, channel]
    }));
  };

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

        {/* Tipo de Alerta */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            Tipo de Alerta
          </label>
          <select
            value={newAlert.type}
            onChange={(e) => setNewAlert(prev => ({ ...prev, type: e.target.value, config: {} }))}
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
            <option value="roi_threshold">ROI Mínimo/Máximo</option>
            <option value="price_change">Mudança de Preço</option>
            <option value="extreme_weather">Eventos Climáticos</option>
            <option value="new_opportunity">Nova Oportunidade</option>
          </select>
        </div>

        {/* Configurações específicas por tipo */}
        {newAlert.type === 'roi_threshold' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
                ROI Mínimo (%)
              </label>
              <input
                type="number"
                value={newAlert.config.threshold || ''}
                onChange={(e) => updateConfig('threshold', parseFloat(e.target.value))}
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
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
                Direção
              </label>
              <select
                value={newAlert.config.direction || 'above'}
                onChange={(e) => updateConfig('direction', e.target.value)}
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
                <option value="above">Acima de</option>
                <option value="below">Abaixo de</option>
              </select>
            </div>
          </>
        )}

        {newAlert.type === 'price_change' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
                Produto
              </label>
              <input
                type="text"
                value={newAlert.config.product || ''}
                onChange={(e) => updateConfig('product', e.target.value)}
                placeholder="Ex: Tomate"
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
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
                Mudança Mínima (%)
              </label>
              <input
                type="number"
                value={newAlert.config.threshold_percent || ''}
                onChange={(e) => updateConfig('threshold_percent', parseFloat(e.target.value))}
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
          </>
        )}

        {newAlert.type === 'new_opportunity' && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
              ROI Mínimo (%)
            </label>
            <input
              type="number"
              value={newAlert.config.min_roi || ''}
              onChange={(e) => updateConfig('min_roi', parseFloat(e.target.value))}
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
        )}

        {/* Canais de Notificação */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '14px', color: theme.colors.textMuted, marginBottom: '8px' }}>
            Canais de Notificação
          </label>
          <div style={{ display: 'flex', gap: '12px' }}>
            {['email', 'whatsapp', 'push'].map(channel => (
              <label key={channel} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={newAlert.channels.includes(channel)}
                  onChange={() => toggleChannel(channel)}
                />
                <span style={{ fontSize: '14px', color: theme.colors.textPrimary }}>
                  {channel === 'email' ? '📧 Email' : channel === 'whatsapp' ? '💬 WhatsApp' : '🔔 Push'}
                </span>
              </label>
            ))}
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

