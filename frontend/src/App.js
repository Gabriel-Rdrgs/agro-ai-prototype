import React, { useState, useRef, useEffect } from 'react';
import MapView from './components/Map/MapView';
import Sidebar from './components/Sidebar/Sidebar';
import Dashboard from './components/Dashboard/Dashboard';
import { OpportunityService } from './services/opportunityService';
import RoiCalculator from './components/Calculator/RoiCalculator';
import Login from './components/Auth/Login';
import WeatherDashboard from './components/Weather/WeatherDashboard';
// import MarketRadar from './components/Market/MarketRadar'; // TODO: Implementar quando necessário
import AgronomicChat from './components/Chat/AgronomicChat';

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
  
  // ✅ NOVO: Estado para filtros do mapa (compartilhado entre Sidebar e MapView)
  // Carrega filtros salvos do localStorage ou usa valores padrão
  const loadSavedFilters = () => {
    try {
      const saved = localStorage.getItem('agro_ai_map_filters');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          roiMin: parsed.roiMin ?? 0,
          roiMax: parsed.roiMax ?? 1000,
          rainMin: parsed.rainMin ?? 0,
          rainMax: parsed.rainMax ?? 500,
          selectedStates: Array.isArray(parsed.selectedStates) ? parsed.selectedStates : [],
          riskLevels: Array.isArray(parsed.riskLevels) ? parsed.riskLevels : [],
          products: Array.isArray(parsed.products) ? parsed.products : [],
          plantingSeasons: Array.isArray(parsed.plantingSeasons) ? parsed.plantingSeasons : []
        };
      }
    } catch (error) {
      console.warn('⚠️ Erro ao carregar filtros salvos:', error);
    }
    // Valores padrão se não houver salvos ou erro
    return {
      roiMin: 0,
      roiMax: 1000,
      rainMin: 0,
      rainMax: 500,
      selectedStates: [],
      riskLevels: [],
      products: [],
      plantingSeasons: []
    };
  };

  const [mapFilters, setMapFilters] = useState(loadSavedFilters);
  
  // ✅ NOVO: Estado para dados de IA e risco (compartilhado)
  const [aiPredictions, setAiPredictions] = useState({});
  const [supplyRiskData, setSupplyRiskData] = useState({});
  
  // ✅ NOVO: Salva filtros no localStorage sempre que mudarem
  useEffect(() => {
    try {
      localStorage.setItem('agro_ai_map_filters', JSON.stringify(mapFilters));
    } catch (error) {
      console.warn('⚠️ Erro ao salvar filtros:', error);
    }
  }, [mapFilters]);

  // ✅ NOVO: Inicializa valores máximos dos filtros quando os dados chegam (mínimo sempre 0 por padrão)
  const filtersInitialized = useRef(false);
  useEffect(() => {
    if (!filtersInitialized.current && opportunities.length > 0) {
      const roiValues = opportunities
        .map(opp => {
          const pred = Array.isArray(aiPredictions) 
            ? aiPredictions.find(p => p.id === opp.id)
            : aiPredictions?.[opp.id];
          return pred?.roi || opp.financials?.roi || 0;
        })
        .filter(v => !isNaN(v) && isFinite(v));
      
      if (roiValues.length > 0) {
        const maxROI = Math.max(...roiValues);
        
        // ✅ CORRIGIDO: Só atualiza o máximo se não houver filtro salvo, mantém mínimo em 0
        setMapFilters(prev => {
          // Se já tem um roiMax salvo (diferente de 1000 padrão), mantém
          if (prev.roiMax !== 1000) {
            return prev;
          }
          return {
            ...prev,
            roiMax: Math.ceil(maxROI)
          };
        });
        filtersInitialized.current = true;
      }
    }
  }, [opportunities, aiPredictions]);

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
              <Sidebar 
                onSelectOpportunity={handleSelectOpportunity} 
                hideHeader={true} 
                opportunities={opportunities}
                filters={mapFilters}
                onFiltersChange={setMapFilters}
                aiPredictions={aiPredictions}
                supplyRiskData={supplyRiskData}
              />
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
            <button onClick={() => setActiveTab('chat')} className={`tab-btn ${activeTab === 'chat' ? 'active' : ''}`}>🤖 IA</button>
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
                  filters={mapFilters}
                  onFiltersChange={setMapFilters}
                  aiPredictions={aiPredictions}
                  setAiPredictions={setAiPredictions}
                  supplyRiskData={supplyRiskData}
                  setSupplyRiskData={setSupplyRiskData}
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

            {/* RENDERIZAÇÃO DO CHAT */}
            {activeTab === 'chat' && (
              <AgronomicChat />
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
        {/* NOVO BOTÃO MOBILE */}
        <button onClick={() => setActiveTab('chat')} className={`nav-item ${activeTab === 'chat' ? 'active' : ''}`}>
          <span className="icon">🤖</span>
          <span className="label">IA</span>
        </button>
      </div>

    </div>
  );
}

export default App;