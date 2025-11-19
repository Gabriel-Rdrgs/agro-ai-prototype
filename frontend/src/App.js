import React, { useState, useRef, useEffect } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import { OpportunityService } from './services/opportunityService';
import RoiCalculator from './components/Calculator/RoiCalculator';
import Login from './components/Auth/Login'; // <--- IMPORTAR LOGIN

function App() {
  // 🔐 ESTADO DE AUTENTICAÇÃO
  const [user, setUser] = useState(null); // null = não logado

  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(false); // Começa false pois o login vem primeiro
  const [customRoute, setCustomRoute] = useState(null);
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('map');
  const mapRef = useRef(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Carrega dados APENAS quando o usuário loga
  useEffect(() => {
    if (user) {
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
    }
  }, [user]); // Dependência: user

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) setShowSidebar(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSelectOpportunity = (opportunity) => {
    setCustomRoute(null);
    if (mapRef.current) {
      mapRef.current.focusOpportunity(opportunity);
    }
    setSelectedOpportunity(opportunity);
  };

  const handleVisualizeRoute = (routeData) => {
    setCustomRoute(routeData);
    setActiveTab('map');
    if (window.innerWidth <= 768) setShowSidebar(false);
  };

  const handleClearRoute = () => {
    setCustomRoute(null);
  };

  const toggleSidebar = () => setShowSidebar(prev => !prev);

  // 🔐 FUNÇÃO DE LOGIN
  const handleLogin = (userData) => {
    setUser(userData);
  };

  // 🔐 FUNÇÃO DE LOGOUT
  const handleLogout = () => {
    setUser(null);
    setCustomRoute(null);
    setActiveTab('map');
  };

  // 🛑 SE NÃO TIVER USER, MOSTRA TELA DE LOGIN
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 🛑 SE TIVER USER MAS ESTIVER CARREGANDO DADOS
  if (isLoading) {
    return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a0e27', color: '#00d9ff', fontFamily: 'sans-serif' }}><h3>🚀 Carregando Inteligência...</h3></div>;
  }

  return (
    <div className="app">
      <header className="app-header" style={{ 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', // Centraliza o título
        padding: '0 2rem',
        height: 'auto',
        minHeight: '70px' 
      }}>
        {/* Título Centralizado */}
        <div style={{ textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ fontSize: 'clamp(18px, 4vw, 24px)', margin: 0 }}>🚀 AgroArbitrage AI</h1>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>Protótipo v0.1</p>
        </div>
        
        {/* 👤 ÁREA DO USUÁRIO (Fixa na direita) */}
        <div style={{ 
            position: 'absolute', 
            right: '2rem', 
            top: '50%', 
            transform: 'translateY(-50%)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '15px',
            zIndex: 2
        }}>
            <div style={{ textAlign: 'right', display: window.innerWidth > 768 ? 'block' : 'none' }}>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold' }}>Olá, {user.name}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Analista Sênior</span>
            </div>
            <button 
                onClick={handleLogout}
                style={{
                    background: 'rgba(255,255,255,0.1)', 
                    border: '1px solid rgba(255,255,255,0.2)', 
                    color: 'white', 
                    padding: '8px 12px', 
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '600',
                    transition: 'all 0.2s'
                }}
                onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
                onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
            >
                Sair
            </button>
        </div>
      </header>

      <div className="main-content">
        {showSidebar && activeTab === 'map' && window.innerWidth <= 768 && (
          <div className="mobile-overlay" onClick={toggleSidebar} style={{ zIndex: 9998 }} />
        )}

        {showSidebar && activeTab === 'map' && (
          <div className={`sidebar-container ${showSidebar ? 'show-mobile' : ''}`}>
            <div className="sidebar-header">
              <div><h2>🌿 Oportunidades</h2><p>{opportunities.length} encontradas</p></div>
              <button onClick={toggleSidebar} className="sidebar-toggle-btn">✕</button>
            </div>
            <div className="sidebar-content">
              <Sidebar onSelectOpportunity={handleSelectOpportunity} hideHeader={true} opportunities={opportunities} />
            </div>
          </div>
        )}

        <div className="content-wrapper">
          <div className="tabs-nav">
            <button onClick={() => setActiveTab('map')} className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}>🗺️ MAPA</button>
            <button onClick={() => setActiveTab('dashboard')} className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}>📊 DASHBOARD</button>
            <button onClick={() => setActiveTab('calculator')} className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}>🧮 SIMULADOR</button>
          </div>

          <div className="tab-content">
            {activeTab === 'map' && !showSidebar && (
              <button onClick={toggleSidebar} className="mobile-show-sidebar-btn"><span className="icon">📋</span><span className="text">Lista</span></button>
            )}

            {activeTab === 'map' && (
              <div className="map-container">
                <MapView 
                  ref={mapRef} 
                  selectedOpportunity={selectedOpportunity}
                  opportunities={opportunities}
                  customRoute={customRoute}
                  onClearRoute={handleClearRoute} 
                />
              </div>
            )}

            {activeTab === 'dashboard' && (
              <Dashboard setSelectedOpportunity={setSelectedOpportunity} setActiveTab={setActiveTab} opportunities={opportunities} />
            )}

            {activeTab === 'calculator' && (
              <RoiCalculator onVisualizeRoute={handleVisualizeRoute} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;