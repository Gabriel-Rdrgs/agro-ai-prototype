import React, { useState, useRef } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import './App.css';

function App() {
  const [showSidebar, setShowSidebar] = useState(true);
  const mapRef = useRef(null);

  const handleSelectOpportunity = (opportunity) => {
    console.log('Oportunidade selecionada:', opportunity);
    // Futuramente: centralizar mapa na oportunidade
  };

  return (
    <div className="App" style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Botão para mostrar/esconder sidebar */}
      <button
        onClick={() => setShowSidebar(!showSidebar)}
        style={{
          position: 'absolute',
          top: '100px',
          left: showSidebar ? '360px' : '10px',
          zIndex: 2000,
          backgroundColor: '#2c5f2d',
          color: 'white',
          border: 'none',
          padding: '10px 15px',
          borderRadius: '8px',
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          fontSize: '14px',
          fontWeight: 'bold',
          transition: 'left 0.3s ease'
        }}
      >
        {showSidebar ? '◀ Ocultar' : '▶ Mostrar'} Lista
      </button>

      {/* Sidebar */}
      {showSidebar && (
        <Sidebar onSelectOpportunity={handleSelectOpportunity} />
      )}

      {/* Container principal */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <header style={{
          backgroundColor: '#2c5f2d',
          padding: '20px',
          color: 'white',
          textAlign: 'center'
        }}>
          <h1 style={{ margin: '0 0 5px 0', fontSize: '24px' }}>
            🌾 Sistema de Inteligência de Arbitragem Agrícola
          </h1>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9 }}>
            Protótipo v0.1 - Mapa de Oportunidades
          </p>
        </header>

        {/* Mapa */}
        <div style={{ flex: 1 }}>
          <MapView ref={mapRef} />
        </div>
      </div>
    </div>
  );
}

export default App;
