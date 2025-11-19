import React, { useState, useRef, useEffect } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
// 1. Importamos nossa nova camada de serviço
import { OpportunityService } from './services/opportunityService';

function App() {
  // 2. Novos estados para controlar os dados e o carregamento
  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Estados originais de UI
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('map');
  const mapRef = useRef(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // 3. Effect que busca os dados ao iniciar (simulando o Backend)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        // Aqui acontece a mágica: o App pede ao Service, que pede aos dados (ou API futura)
        const data = await OpportunityService.getAll();
        setOpportunities(data);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Effect original de resize
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

  // Tela de carregamento simples
  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        backgroundColor: '#0a0e27', 
        color: '#00d9ff',
        fontFamily: 'sans-serif'
      }}>
        <h3>🚀 Carregando Inteligência Agrícola...</h3>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <h1>🚀 Sistema de Inteligência de Arbitragem Agrícola</h1>
        <p>Protótipo v0.1 - Mapa de Oportunidades</p>
      </header>

      <div className="main-content">
        {/* Overlay Mobile */}
        {showSidebar && activeTab === 'map' && window.innerWidth <= 768 && (
          <div 
            className="mobile-overlay" 
            onClick={toggleSidebar}
            style={{ zIndex: 9998 }} 
          />
        )}

        {/* Sidebar */}
        {showSidebar && activeTab === 'map' && (
          <div className={`sidebar-container ${showSidebar ? 'show-mobile' : ''}`}>
            <div className="sidebar-header">
              <div>
                <h2>🌿 Oportunidades</h2>
                {/* Mostra a contagem real baseada nos dados carregados */}
                <p>{opportunities.length} encontradas</p>
              </div>
              <button
                onClick={toggleSidebar}
                className="sidebar-toggle-btn"
                title="Ocultar lista"
              >
                ✕
              </button>
            </div>

            <div className="sidebar-content">
              <Sidebar
                onSelectOpportunity={handleSelectOpportunity}
                hideHeader={true}
                // 4. Passamos os dados para a Sidebar
                opportunities={opportunities}
              />
            </div>
          </div>
        )}

        <div className="content-wrapper">
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

          <div className="tab-content">
            {activeTab === 'map' && !showSidebar && (
              <button
                onClick={toggleSidebar}
                className="mobile-show-sidebar-btn"
              >
                <span className="icon">📋</span>
                <span className="text">Lista</span>
              </button>
            )}

            {activeTab === 'map' && (
              <div className="map-container">
                <MapView 
                  ref={mapRef} 
                  selectedOpportunity={selectedOpportunity}
                  // 4. Passamos os dados para o Mapa
                  opportunities={opportunities}
                />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <Dashboard
                setSelectedOpportunity={setSelectedOpportunity}
                setActiveTab={setActiveTab}
                // 4. Passamos os dados para o Dashboard
                opportunities={opportunities}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;