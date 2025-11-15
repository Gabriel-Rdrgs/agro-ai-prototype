import React, { useState, useRef } from 'react';
import theme from './styles/theme';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import './App.css';

function App() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('map'); // 'map' ou 'dashboard'
  const mapRef = useRef(null);

  const handleSelectOpportunity = (opportunity) => {
    console.log('Oportunidade selecionada:', opportunity);

    if (mapRef.current) {
      mapRef.current.focusOpportunity(opportunity);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div
      className="App"
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        flexDirection: 'column',
        background: theme.colors.background,
        fontFamily: theme.font,
        color: theme.colors.textPrimary
      }}
    >
      {/* Header fixo no topo */}
      <header style={{
        background: `linear-gradient(90deg, ${theme.colors.background} 60%, ${theme.colors.accent}22 100%)`,
        padding: '20px',
        color: theme.colors.textPrimary,
        textAlign: 'center',
        zIndex: 100,
        boxShadow: theme.colors.cardGlow,
        borderBottom: `2px solid ${theme.colors.accent}66`
      }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '24px', letterSpacing: '1.5px', fontFamily: theme.font }}>
          🌾 Sistema de Inteligência de Arbitragem Agrícola
        </h1>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
          Protótipo v0.1 - Mapa de Oportunidades
        </p>
      </header>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar (apenas visível na aba de mapa) */}
        {showSidebar && activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '350px' }}>
            {/* Header da sidebar */}
            <div style={{
              padding: '15px 20px',
              background: theme.colors.background,
              color: theme.colors.textPrimary,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: theme.colors.cardGlow
            }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                  🌾 Oportunidades
                </h2>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.9, color: theme.colors.textMuted }}>
                  12 de 12 exibidas
                </p>
              </div>
              <button
                onClick={toggleSidebar}
                style={{
                  background: 'none',
                  border: `2px solid ${theme.colors.accent}`,
                  color: theme.colors.accent,
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  transition: theme.transition,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '36px',
                  height: '36px',
                  boxShadow: theme.colors.cardGlow
                }}
                title="Ocultar lista"
              >
                ◀
              </button>
            </div>
            {/* Conteúdo da sidebar */}
            <Sidebar 
              onSelectOpportunity={handleSelectOpportunity} 
              hideHeader={true}
            />
          </div>
        )}

        {/* Container do mapa/dashboard */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Abas de navegação - FIXAS NO TOPO */}
          <div style={{
            display: 'flex',
            background: theme.colors.background,
            borderBottom: `2px solid ${theme.colors.accent}33`,
            padding: '0 20px',
            position: 'relative',
            zIndex: 50
          }}>
            <button
              onClick={() => setActiveTab('map')}
              style={{
                background: activeTab === 'map' ? `${theme.colors.accent}1A` : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'map' ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
                color: activeTab === 'map' ? theme.colors.accent : theme.colors.textMuted,
                padding: '15px 25px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: theme.transition,
                marginBottom: '-2px',
                letterSpacing: '1px'
              }}
            >
              🗺️ MAPA
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                background: activeTab === 'dashboard' ? `${theme.colors.accent}1A` : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'dashboard' ? `2px solid ${theme.colors.accent}` : '2px solid transparent',
                color: activeTab === 'dashboard' ? theme.colors.accent : theme.colors.textMuted,
                padding: '15px 25px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: theme.transition,
                marginBottom: '-2px',
                letterSpacing: '1px'
              }}
            >
              📊 DASHBOARD
            </button>
          </div>

          {/* Conteúdo principal */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {!showSidebar && activeTab === 'map' && (
              <button
                onClick={toggleSidebar}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  zIndex: 1100,
                  background: theme.colors.background,
                  color: theme.colors.accent,
                  border: `2px solid ${theme.colors.accent}`,
                  padding: '12px 18px',
                  borderRadius: theme.borderRadius,
                  cursor: 'pointer',
                  boxShadow: theme.colors.cardGlow,
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: theme.transition,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                ▶ Mostrar Lista
              </button>
            )}
            {/* Conteúdo (Mapa ou Dashboard) */}
            {activeTab === 'map' ? (
              <MapView ref={mapRef} />
            ) : (
              <div style={{ width: '100%', height: '100%', overflow: 'auto' }}>
                <Dashboard />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
