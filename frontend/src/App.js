import React, { useState, useRef } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import './App.css';

function App() {
  const [showSidebar, setShowSidebar] = useState(true);
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

      {/* Container principal com sidebar e mapa */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden', position: 'relative' }}>
        {/* Sidebar com header verde integrado */}
        {showSidebar && (
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

            {/* Conteúdo da sidebar (sem header, só filtros e lista) */}
            <Sidebar 
              onSelectOpportunity={handleSelectOpportunity} 
              hideHeader={true}
            />

          </div>
        )}

        {/* Container do mapa */}
        <div style={{ flex: 1, position: 'relative' }}>
          {/* Botão flutuante para MOSTRAR sidebar - REPOSICIONADO ACIMA DOS CONTROLES DE ZOOM */}
          {!showSidebar && (
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

          {/* Mapa */}
          <MapView ref={mapRef} />
        </div>
      </div>
    </div>
  );
}

export default App;
