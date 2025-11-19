import React, { useState, useRef, useEffect } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import { OpportunityService } from './services/opportunityService';
import RoiCalculator from './components/Calculator/RoiCalculator';
import Login from './components/Auth/Login';

function App() {
  // 🔐 ESTADO DE AUTENTICAÇÃO
  const [user, setUser] = useState(null); // null = não logado

  // Estados de Dados e Carregamento
  const [opportunities, setOpportunities] = useState([]);
  const [isLoading, setIsLoading] = useState(false); 

  // Estados de Navegação e Funcionalidades
  const [customRoute, setCustomRoute] = useState(null); // Rota vinda da Calculadora
  const [scenarioToLoad, setScenarioToLoad] = useState(null); // Cenário salvo vindo do Dashboard
  
  // 💵 Extrai a cotação atual (pega da primeira oportunidade ou usa fallback)
  const currentDollar = opportunities.length > 0 ? opportunities[0].dollarRate : 0;
  
  // Estados de UI
  const [showSidebar, setShowSidebar] = useState(window.innerWidth > 768);
  const [activeTab, setActiveTab] = useState('map');
  const mapRef = useRef(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // 1. Carrega dados APENAS quando o usuário loga
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

  // 2. Monitora redimensionamento da tela
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setShowSidebar(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- HANDLERS DE AÇÃO ---

  const handleSelectOpportunity = (opportunity) => {
    setCustomRoute(null); // Limpa rota se selecionar item da lista
    if (mapRef.current) {
      mapRef.current.focusOpportunity(opportunity);
    }
    setSelectedOpportunity(opportunity);
  };

  // Chamado pela Calculadora para mostrar a rota no mapa
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

  // Chamado pelo Dashboard para editar um cenário salvo
  const handleLoadScenario = (scenario) => {
    console.log("Carregando cenário:", scenario);
    setScenarioToLoad(scenario); // Envia dados para a calculadora
    setActiveTab('calculator');  // Muda a aba
    if (window.innerWidth <= 768) setShowSidebar(false);
  };

  const toggleSidebar = () => {
    setShowSidebar(prev => !prev);
  };

  // 🔐 LÓGICA DE LOGIN/LOGOUT
  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    setCustomRoute(null);
    setScenarioToLoad(null);
    setActiveTab('map');
  };

  // --- RENDERIZAÇÃO CONDICIONAL ---

  // 1. Se não estiver logado, mostra Login
  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  // 2. Se estiver carregando dados iniciais
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

  // 3. Aplicação Principal
  return (
    <div className="app">
      {/* Header com Layout Ajustado (Título Centralizado) */}
      <header className="app-header" style={{ 
        position: 'relative', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        padding: '0 2rem',
        height: 'auto',
        minHeight: '70px',
        flexShrink: 0 // Garante que o header não encolha no flex layout
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
        {/* Overlay Mobile */}
        {showSidebar && activeTab === 'map' && window.innerWidth <= 768 && (
          <div 
            className="mobile-overlay" 
            onClick={toggleSidebar}
            style={{ zIndex: 9998 }} 
          />
        )}

        {/* Sidebar (Lista de Oportunidades) */}
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

        {/* Área de Conteúdo (Abas) */}
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

            {/* --- CONTEÚDO DAS ABAS --- */}

            {/* 1. MAPA */}
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

            {/* 2. DASHBOARD */}
            {activeTab === 'dashboard' && (
              <Dashboard
                setSelectedOpportunity={setSelectedOpportunity}
                setActiveTab={setActiveTab}
                opportunities={opportunities}
                onLoadScenario={handleLoadScenario}
                // 🚀 NOVA PROP
                currentDollar={currentDollar} 
              />
            )}

            {/* 3. CALCULADORA */}
            {activeTab === 'calculator' && (
              <RoiCalculator 
                 onVisualizeRoute={handleVisualizeRoute} 
                 initialData={scenarioToLoad}
                 // 🚀 NOVA PROP
                 currentDollar={currentDollar}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;