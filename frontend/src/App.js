import React, { useState, useRef } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  const [showSidebar, setShowSidebar] = useState(true);
  const [activeTab, setActiveTab] = useState('map'); // 'map' ou 'dashboard'
  const mapRef = useRef(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  const handleSelectOpportunity = (opportunity) => {
    console.log('Oportunidade selecionada:', opportunity);
    if (mapRef.current) {
      mapRef.current.focusOpportunity(opportunity);
    }
    setSelectedOpportunity(opportunity);
  };

  const toggleSidebar = () => {
    setShowSidebar(!showSidebar);
  };

  return (
    <div className="app">
      {/* Header fixo no topo */}
      <header className="app-header">
        <h1>🚀 Sistema de Inteligência de Arbitragem Agrícola</h1>
        <p>Protótipo v0.1 - Mapa de Oportunidades</p>
      </header>

      {/* Conteúdo principal */}
      <div className="main-content">
        {/* Sidebar - Visível apenas na aba de mapa */}
        {showSidebar && activeTab === 'map' && (
          <div className="sidebar-container">
            {/* Header da sidebar */}
            <div className="sidebar-header">
              <div>
                <h2>🌿 Oportunidades</h2>
                <p>12 de 12 exibidas</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="sidebar-toggle-btn"
                title="Ocultar lista"
              >
                ✕
              </button>
            </div>

            {/* Conteúdo da sidebar */}
            <div className="sidebar-content">
              <Sidebar
                onSelectOpportunity={handleSelectOpportunity}
                hideHeader={true}
              />
            </div>
          </div>
        )}

        {/* Container do mapa/dashboard */}
        <div className="content-wrapper">
          {/* Abas de navegação */}
          <div className="tabs-nav">
            <button
              onClick={() => setActiveTab('map')}
              className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}
            >
              🗺️ MAPA
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
            >
              📊 DASHBOARD
            </button>
          </div>

          {/* Conteúdo principal */}
          <div className="tab-content">
            {/* Botão para mostrar sidebar quando escondida */}
            {!showSidebar && activeTab === 'map' && (
              <button
                onClick={toggleSidebar}
                className="show-sidebar-btn"
              >
                📋 Mostrar Lista
              </button>
            )}

            {/* Barra lateral decorativa quando sidebar está oculta */}
            {!showSidebar && activeTab === 'map' && (
              <div className="sidebar-indicator">
                <span>📍</span>
              </div>
            )}

            {/* Mapa ou Dashboard */}
            {activeTab === 'map' && (
              <div className="map-container">
                <MapView ref={mapRef} selectedOpportunity={selectedOpportunity} />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                setSelectedOpportunity={setSelectedOpportunity}
                setActiveTab={setActiveTab}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;