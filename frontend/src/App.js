import React, { useState, useRef, useEffect } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import { OpportunityService } from './services/opportunityService';
import RoiCalculator from './components/Calculator/RoiCalculator';

function App() {
  // Estados de dados e carregamento
  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const handleClearRoute = () => {
    setCustomRoute(null); // Limpa a rota e volta ao mapa normal
  };
  // 🚀 NOVO ESTADO: Rota customizada vinda da Calculadora
  const [customRoute, setCustomRoute] = useState(null);

  // Estados de UI
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('map');
  const mapRef = useRef(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Effect que busca os dados ao iniciar
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
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

  // Effect de resize
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
    
    // 🚀 ATUALIZAÇÃO: Limpa a rota customizada ao selecionar item da lista
    setCustomRoute(null);

    if (mapRef.current) {
      mapRef.current.focusOpportunity(opportunity);
    }
    setSelectedOpportunity(opportunity);
  };

  // 🚀 NOVA FUNÇÃO: Recebe os dados da rota da Calculadora
  const handleVisualizeRoute = (routeData) => {
    console.log("Visualizando rota calculada:", routeData);
    setCustomRoute(routeData); // Salva a rota
    setActiveTab('map'); // Força a ida para o mapa
    
    // Fecha sidebar no mobile para priorizar o mapa
    if (window.innerWidth <= 768) {
      setShowSidebar(false);
    }
  };

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

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
            <button
              onClick={() => setActiveTab('calculator')}
              className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}
            >
              🧮 SIMULADOR
            </button>
          </div>

          <div className="tab-content">
            {/* Botão flutuante mobile */}
            {activeTab === 'map' && !showSidebar && (
              <button
                onClick={toggleSidebar}
                className="mobile-show-sidebar-btn"
              >
                <span className="icon">📋</span>
                <span className="text">Lista</span>
              </button>
            )}

            {/* Mapa */}
            {activeTab === 'map' && (
              <div className="map-container">
                <MapView 
                  ref={mapRef} 
                  selectedOpportunity={selectedOpportunity}
                  opportunities={opportunities}
                  customRoute={customRoute}
                  // ADICIONAR ESTA LINHA 👇
                  onClearRoute={handleClearRoute} 
                />
              </div>
            )}

            {/* Dashboard */}
            {activeTab === 'dashboard' && (
              <Dashboard
                setSelectedOpportunity={setSelectedOpportunity}
                setActiveTab={setActiveTab}
                opportunities={opportunities}
              />
            )}

            {/* Calculadora */}
            {activeTab === 'calculator' && (
              <RoiCalculator 
                 // 🚀 Passando a função de callback
                 onVisualizeRoute={handleVisualizeRoute}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;