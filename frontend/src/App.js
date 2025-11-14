import React, { useState, useRef } from 'react';
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
    
    // Centraliza o mapa na oportunidade selecionada
    if (mapRef.current) {
      mapRef.current.focusOpportunity(opportunity);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="App" style={{ display: 'flex', height: '100vh', overflow: 'hidden', flexDirection: 'column' }}>
      {/* Header fixo no topo */}
      <header style={{
        backgroundColor: '#2c5f2d',
        padding: '20px',
        color: 'white',
        textAlign: 'center',
        zIndex: 100,
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }}>
        <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>
          🌾 Sistema de Inteligência de Arbitragem Agrícola
        </h1>
        <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
          Protótipo v0.1 - Mapa de Oportunidades
        </p>
      </header>

      {/* Container principal com sidebar e mapa/dashboard */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar (apenas visível na aba de mapa) */}
        {showSidebar && activeTab === 'map' && (
          <div style={{ display: 'flex', flexDirection: 'column', width: '350px' }}>
            {/* Header verde da sidebar */}
            <div style={{
              padding: '15px 20px',
              backgroundColor: '#2c5f2d',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
            }}>
              <div>
                <h2 style={{ margin: '0 0 5px 0', fontSize: '18px', fontWeight: 'bold' }}>
                  🌾 Oportunidades
                </h2>
                <p style={{ margin: 0, fontSize: '13px', opacity: 0.9 }}>
                  12 de 12 exibidas
                </p>
              </div>
              <button
                onClick={toggleSidebar}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: 'white',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: '36px',
                  height: '36px'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.3)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'rgba(255,255,255,0.2)'}
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
            backgroundColor: '#0a0e27',
            borderBottom: '2px solid rgba(0, 217, 255, 0.2)',
            padding: '0 20px',
            position: 'relative',
            zIndex: 50
          }}>
            <button
              onClick={() => setActiveTab('map')}
              style={{
                backgroundColor: activeTab === 'map' ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'map' ? '2px solid #00d9ff' : '2px solid transparent',
                color: activeTab === 'map' ? '#00d9ff' : 'rgba(255, 255, 255, 0.6)',
                padding: '15px 25px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                marginBottom: '-2px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'map') e.target.style.color = '#00d9ff';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'map') e.target.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
            >
              🗺️ MAPA
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              style={{
                backgroundColor: activeTab === 'dashboard' ? 'rgba(0, 217, 255, 0.1)' : 'transparent',
                border: 'none',
                borderBottom: activeTab === 'dashboard' ? '2px solid #00d9ff' : '2px solid transparent',
                color: activeTab === 'dashboard' ? '#00d9ff' : 'rgba(255, 255, 255, 0.6)',
                padding: '15px 25px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'all 0.3s ease',
                marginBottom: '-2px'
              }}
              onMouseEnter={(e) => {
                if (activeTab !== 'dashboard') e.target.style.color = '#00d9ff';
              }}
              onMouseLeave={(e) => {
                if (activeTab !== 'dashboard') e.target.style.color = 'rgba(255, 255, 255, 0.6)';
              }}
            >
              📊 DASHBOARD
            </button>
          </div>

          {/* Container do conteúdo com scroll */}
          <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
            {/* Botão Mostrar Lista (apenas no mapa quando sidebar oculta) */}
            {!showSidebar && activeTab === 'map' && (
              <button
                onClick={toggleSidebar}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  zIndex: 1100,
                  backgroundColor: '#2c5f2d',
                  color: 'white',
                  border: 'none',
                  padding: '12px 18px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#1f4520';
                  e.target.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#2c5f2d';
                  e.target.style.transform = 'scale(1)';
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
