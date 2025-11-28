import React, { useState, useRef, useEffect } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import { OpportunityService } from './services/opportunityService';
import RoiCalculator from './components/Calculator/RoiCalculator';
import Login from './components/Auth/Login';
import WeatherDashboard from './components/Weather/WeatherDashboard';
import MarketRadar from './components/Market/MarketRadar';

function App() {
  // --- 1. ESTADOS GLOBAIS ---
  
  // Autenticação
  const [user, setUser] = useState(null);

  // Dados da API
  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 

  // Navegação e Funcionalidades
  const [customRoute, setCustomRoute] = useState(null); // Rota vinda da Calculadora
  const [scenarioToLoad, setScenarioToLoad] = useState(null); // Cenário salvo vindo do Dashboard
  
  // Cotação do Dólar (Extraído da primeira oportunidade ou 0)
  const currentDollar = opportunities.length > 0 ? opportunities[0].dollarRate : 0;
  
  // Interface (UI)
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('map');
  const mapRef = useRef(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // --- 2. EFEITOS (SIDE EFFECTS) ---

  // Carrega dados quando o usuário loga
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
  }, [user]);

  // Monitora redimensionamento da tela
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- 3. HANDLERS (FUNÇÕES DE AÇÃO) ---

  const handleSelectOpportunity = (opportunity) => {
    setCustomRoute(null); // Limpa rota customizada
    if (mapRef.current) {
      mapRef.current.focusOpportunity(opportunity);
    }
    setSelectedOpportunity(opportunity);
  };

  // Chamado pela Calculadora para mostrar a rota
  const handleVisualizeRoute = (routeData) => {
    console.log("Visualizando rota calculada:", routeData);
    setCustomRoute(routeData);
    setActiveTab('map');
    if (window.innerWidth <= 768) setShowSidebar(false);
  };

  // Chamado pelo Mapa para limpar a rota
  const handleClearRoute = () => {
    setCustomRoute(null);
  };

  // Chamado pelo Dashboard para carregar cenário
  const handleLoadScenario = (scenario) => {
    console.log("Carregando cenário:", scenario);
    setScenarioToLoad(scenario);
    setActiveTab('calculator');
    if (window.innerWidth <= 768) setShowSidebar(false);
  };

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  // Login
  const handleLogin = (userData) => {
    setUser(userData);
  };

  // Logout
  const handleLogout = () => {
    setUser(null);
    setCustomRoute(null);
    setScenarioToLoad(null);
    setActiveTab('map');
    localStorage.removeItem('token'); // Limpa o token
  };

  // --- 4. RENDERIZAÇÃO CONDICIONAL (LOGIN/LOADING) ---

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: '#0a0e27', color: '#00d9ff', fontFamily: 'sans-serif' }}>
        <h3>🚀 Carregando Inteligência Agrícola...</h3>
      </div>
    );
  }
// 3. Aplicação Principal
  return (
    <div className="app">
      {/* Header Fixo */}
      <header className="app-header" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 2rem', height: 'auto', minHeight: '70px', flexShrink: 0 }}>
        <div style={{ textAlign: 'center', zIndex: 1 }}>
            <h1 style={{ fontSize: 'clamp(18px, 4vw, 24px)', margin: 0 }}>🚀 AgroArbitrage AI</h1>
            <p style={{ fontSize: '12px', opacity: 0.8, margin: 0 }}>MVP v1.0</p>
        </div>
        
        {/* 👤 ÁREA DO USUÁRIO (Fixa na direita) */}
        <div style={{ position: 'absolute', right: '2rem', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', gap: '15px', zIndex: 2 }}>
            <div style={{ textAlign: 'right', display: window.innerWidth > 768 ? 'block' : 'none' }}>
                <span style={{ display: 'block', fontSize: '14px', fontWeight: 'bold' }}>Olá, {user.name}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>Analista Sênior</span>
            </div>
            <button onClick={handleLogout} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', padding: '8px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600', transition: 'all 0.2s' }} onMouseOver={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'} onMouseOut={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}>
                Sair
            </button>
        </div>
      </header>

      <div className="main-content">
        {/* Overlay Mobile */}
        {showSidebar && activeTab === 'map' && window.innerWidth <= 768 && (
          <div className="mobile-overlay" onClick={toggleSidebar} style={{ zIndex: 9998 }} />
        )}

        {/* Sidebar */}
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
          {/* --- NAVEGAÇÃO DESKTOP (ABAS NO TOPO) --- */}
          <div className="tabs-nav desktop-only">
            <button onClick={() => setActiveTab('map')} className={`tab-btn ${activeTab === 'map' ? 'active' : ''}`}>🗺️ MAPA</button>
            <button onClick={() => setActiveTab('dashboard')} className={`tab-btn ${activeTab === 'dashboard' ? 'active' : ''}`}>📊 DASHBOARD</button>
            <button onClick={() => setActiveTab('calculator')} className={`tab-btn ${activeTab === 'calculator' ? 'active' : ''}`}>🧮 SIMULADOR</button>
            <button onClick={() => setActiveTab('Weather')} className={`tab-btn ${activeTab === 'Weather' ? 'active' : ''}`}>⛈️ CLIMA</button>
          </div>

          <div className="tab-content">
            {/* Botão Lista Mobile */}
            {activeTab === 'map' && !showSidebar && (
              <button onClick={toggleSidebar} className="mobile-show-sidebar-btn"><span className="icon">📋</span><span className="text">Lista</span></button>
            )}

            {/* --- CONTEÚDO --- */}
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
              <Dashboard
                setSelectedOpportunity={setSelectedOpportunity}
                setActiveTab={setActiveTab}
                opportunities={opportunities}
                onLoadScenario={handleLoadScenario}
                currentDollar={currentDollar}
              />
            )}

            {activeTab === 'calculator' && (
              <RoiCalculator 
                 onVisualizeRoute={handleVisualizeRoute} 
                 initialData={scenarioToLoad}
                 currentDollar={currentDollar}
                 opportunities={opportunities}
              />
            )}
            {activeTab === 'Weather' && (
              <WeatherDashboard opportunities={opportunities} />
        )}
          </div>
        </div>
      </div>

      {/* --- 🚀 NAVEGAÇÃO MOBILE (RODAPÉ FIXO) --- */}
      <div className="mobile-bottom-nav">
        <button onClick={() => setActiveTab('map')} className={`nav-item ${activeTab === 'map' ? 'active' : ''}`}>
          <span className="icon">🗺️</span>
          <span className="label">Mapa</span>
        </button>
        <button onClick={() => setActiveTab('dashboard')} className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}>
          <span className="icon">📊</span>
          <span className="label">Dash</span>
        </button>
        <button onClick={() => setActiveTab('calculator')} className={`nav-item ${activeTab === 'calculator' ? 'active' : ''}`}>
          <span className="icon">🧮</span>
          <span className="label">Simular</span>
        </button>
        <button onClick={() => setActiveTab('Weather')} className={`nav-item ${activeTab === 'Weather' ? 'active' : ''}`}>
          <span className="icon">⛈️</span>
          <span className="label">Clima</span>
        </button>
      </div>

    </div>
  );
}

export default App;