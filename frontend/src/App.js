import React, { useState, useRef, useEffect } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';

function App() {
  // Sidebar começa aberta só em desktop
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('map');
  const mapRef = useRef(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Ajusta automaticamente ao redimensionar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectOpportunity = (opportunity) => {
    console.log('Oportunidade selecionada:', opportunity);
    if (mapRef.current) {
      mapRef.current.focusOpportunity(opportunity);
    }
    setSelectedOpportunity(opportunity);
  };

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  return (
    <div className="app">
      {/* Cabeçalho SEMPRE visível */}
      <header className="app-header">
        <h1>🚀Sistema de Inteligência de Arbitragem Agrícola</h1>
        <p>Protótipo v0.1 - Mapa de Oportunidades</p>
      </header>

      {/* Conteúdo principal */}
      <div className="main-content">

        {/* Overlay escuro mobile – TEM QUE VIR ANTES da sidebar */}
        {showSidebar && activeTab === 'map' && window.innerWidth <= 768 && (
          <div 
            className="mobile-overlay" 
            onClick={toggleSidebar}
            style={{ zIndex: 9998 }} // garante que fique atrás da sidebar
          />
        )}

        {/* Sidebar com drawer mobile – agora fica por cima do overlay */}
        {showSidebar && activeTab === 'map' && (
          <div className={`sidebar-container ${showSidebar ? 'show-mobile' : ''}`}>
            <div className="sidebar-header">
              <div>
                <h2>🌿 Oportunidades</h2>
                <p>12 de 12 exibidas</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="sidebar-toggle-btn"
                title="Ocultar lista"
                aria-label="Fechar sidebar"
              >
                ✕
              </button>
            </div>

            <div className="sidebar-content">
              <Sidebar
                onSelectOpportunity={handleSelectOpportunity}
                hideHeader={true}
              />
            </div>
          </div>
        )}

        {/* Área principal (mapa + dashboard) */}
        <div className="content-wrapper">

          {/* Abas */}
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

          {/* Conteúdo da aba */}
          <div className="tab-content">

            {/* Botão flutuante mobile */}
            {activeTab === 'map' && !showSidebar && (
              <button
                onClick={toggleSidebar}
                className="mobile-show-sidebar-btn"
                aria-label="Abrir lista de oportunidades"
              >
                <span className="icon">📋</span>
                <span className="text">Lista</span>
              </button>
            )}

            {/* Mapa */}
            {activeTab === 'map' && (
              <div className="map-container">
                <MapView ref={mapRef} selectedOpportunity={selectedOpportunity} />
              </div>
            )}

            {/* Dashboard */}
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