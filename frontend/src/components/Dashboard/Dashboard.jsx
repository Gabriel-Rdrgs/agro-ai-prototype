import React, { useState, useEffect, useRef } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import { StorageService } from '../../services/storageService';
import { PdfService } from '../../services/pdfService';
import "../../styles/dashboard.css";

// Registro dos componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard = ({ setSelectedOpportunity, setActiveTab, opportunities = [], onLoadScenario, currentDollar }) => {
  // --- ESTADOS ---
  const [selectedCrop, setSelectedCrop] = useState("");
  const [newOpAlert, setNewOpAlert] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [savedScenarios, setSavedScenarios] = useState([]);

  const barRef = useRef();

  // --- EFEITOS ---

  // 1. Carregar cenários salvos ao iniciar
  useEffect(() => {
    setSavedScenarios(StorageService.getAll());
  }, []);

  // 2. Simulação de Alerta "Nova Oportunidade" (Timer)
  useEffect(() => {
    const timer = setTimeout(() => setNewOpAlert(true), 12000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (newOpAlert) {
      setAlertVisible(true);
      const hideTimer = setTimeout(() => setAlertVisible(false), 3500);
      const offTimer = setTimeout(() => setNewOpAlert(false), 4200);
      return () => {
        clearTimeout(hideTimer);
        clearTimeout(offTimer);
      };
    }
  }, [newOpAlert]);

  // --- LÓGICA DE DADOS ---

  // Filtro por cultura
  const uniqueCrops = [...new Set(opportunities.map(o => o.product))];
  
  const cropFilteredOpps = opportunities.filter(
    o => !selectedCrop || o.product === selectedCrop
  );

  // Estatísticas (KPIs)
  const totalOpportunities = cropFilteredOpps.length;
  const avgROI = cropFilteredOpps.length
    ? (cropFilteredOpps.reduce((sum, opp) => sum + opp.roi, 0) / totalOpportunities).toFixed(1)
    : 0;
  const highRiskCount = cropFilteredOpps.filter(opp => opp.riskLevel === 3).length;
  
  // Extração de números da string de volume (ex: "50 toneladas" -> 50)
  const totalVolume = cropFilteredOpps.reduce((sum, opp) => {
    const volMatch = String(opp.volume).match(/\d+/);
    return sum + (volMatch ? parseInt(volMatch[0], 10) : 0);
  }, 0);

  // Top 5 Oportunidades (Ordenadas por ROI)
  const topOpportunities = [...cropFilteredOpps]
    .sort((a, b) => b.roi - a.roi)
    .slice(0, 5);

  // Função para deletar cenário salvo
  const handleDeleteScenario = (id) => {
    const updated = StorageService.delete(id);
    setSavedScenarios(updated);
  };

  // Função para Exportar PDF
  const handleExportDashboard = () => {
    const dashboardData = {
        kpis: {
            total: totalOpportunities,
            avgROI: avgROI,
            highRisk: highRiskCount,
            volume: totalVolume
        },
        top5: topOpportunities,
        saved: savedScenarios
    };

    PdfService.generateDashboardReport(dashboardData, "Paulo (Sócio)");
  };

  // --- CONFIGURAÇÃO DOS GRÁFICOS ---

  const barChartData = {
    labels: topOpportunities.map(opp => opp.product),
    datasets: [
      {
        label: "ROI (%)",
        data: topOpportunities.map(opp => opp.roi),
        backgroundColor: topOpportunities.map(opp =>
          opp.roi > 100 ? "rgba(0,217,255,0.6)" : opp.roi > 50 ? "rgba(124,58,237,0.6)" : "rgba(239,68,68,0.6)"
        ),
        borderColor: topOpportunities.map(opp =>
          opp.roi > 100 ? "#00d9ff" : opp.roi > 50 ? "#7c3aed" : "#ef4444"
        ),
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Top 5 Oportunidades por ROI",
        color: "#00d9ff",
        font: { size: 16, weight: "bold" },
        padding: 20,
      },
      tooltip: {
        backgroundColor: "rgba(10,14,39,0.95)",
        titleColor: "#00d9ff",
        bodyColor: "#fff",
        borderColor: "#00d9ff",
        borderWidth: 1,
        callbacks: { label: ctx => `ROI: ${ctx.raw}%` },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0,217,255,0.1)" },
        ticks: { color: "#00d9ff" },
      },
      y: {
        grid: { color: "rgba(0,217,255,0.1)" },
        ticks: { color: "#00d9ff" },
        beginAtZero: true,
      },
    },
  };

  // Dados Mockados para Tendência
  const priceTrendData = {
    labels: ["Jun", "Jul", "Ago", "Set", "Out", "Nov"],
    datasets: [
      {
        label: "Preço Médio (R$)",
        data: [4.2, 4.8, 5.1, 4.5, 5.3, 5.8],
        borderColor: "#00d9ff",
        backgroundColor: "rgba(0,217,255,0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: "#00d9ff",
        pointBorderColor: "#0a0e27",
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Tendência de Preços",
        color: "#00d9ff",
        font: { size: 16, weight: "bold" },
        padding: 20,
      },
      tooltip: {
        backgroundColor: "rgba(10,14,39,0.95)",
        titleColor: "#00d9ff",
        bodyColor: "#fff",
        borderColor: "#00d9ff",
        borderWidth: 1,
        callbacks: { label: ctx => `R$ ${ctx.raw.toFixed(2)}` },
      },
    },
    scales: {
      x: {
        grid: { color: "rgba(0,217,255,0.1)" },
        ticks: { color: "#00d9ff" },
      },
      y: {
        grid: { color: "rgba(0,217,255,0.1)" },
        ticks: {
          color: "#00d9ff",
          callback: v => `R$ ${v.toFixed(2)}`,
        },
      },
    },
  };

  // Clique no gráfico de barras -> Leva ao Mapa
  const handleBarClick = (nativeEvent) => {
    const chart = barRef.current;
    if (!chart) return;
    const points = chart.getElementsAtEventForMode(
      nativeEvent,
      "nearest",
      { intersect: true },
      false
    );
    if (points?.length) {
      const idx = points[0].index;
      const opp = topOpportunities[idx];
      if (opp) {
        setSelectedOpportunity(opp);
        setActiveTab("map");
      }
    }
  };

  return (
    <div className="dashboard-container">
      {/* ALERTA FLUTUANTE */}
      {newOpAlert && alertVisible && (
        <div className="dashboard-alert">
          Nova oportunidade detectada!
        </div>
      )}

      {/* HEADER: FILTROS, DÓLAR E BOTÃO EXPORTAR */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {/* Filtro */}
              <div className="dashboard-crop-filter" style={{marginBottom: 0}}>
                <select value={selectedCrop} onChange={e => setSelectedCrop(e.target.value)}>
                  <option value="">Todas culturas</option>
                  {uniqueCrops.map(crop => (<option key={crop} value={crop}>{crop}</option>))}
                </select>
              </div>

              {/* Badge do Dólar */}
              {currentDollar > 0 && (
                  <div style={{ 
                      background: 'rgba(16, 185, 129, 0.1)', 
                      border: '1px solid #10b981', 
                      color: '#10b981',
                      padding: '8px 12px', 
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                  }}>
                      <span>🇺🇸 USD PTAX:</span>
                      <span style={{ color: '#fff' }}>R$ {currentDollar.toFixed(4)}</span>
                  </div>
              )}
          </div>

          {/* Botão Exportar PDF */}
          <button 
            onClick={handleExportDashboard}
            style={{
                background: '#1e293b',
                color: '#facc15', // Amarelo
                border: '1px solid #facc15',
                padding: '8px 16px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(250, 204, 21, 0.1)'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#1e293b'}
          >
            📄 Relatório Gerencial
          </button>
      </div>

      {/* CARDS (KPIs) */}
      <div className="dashboard-cards">
        <div className="card oportunidades">
          <h3>Oportunidades</h3>
          <p className="count">{totalOpportunities}</p>
          <small>Monitoradas em tempo real</small>
        </div>
        <div className="card roi">
          <h3>ROI Médio</h3>
          <p className="roi">{avgROI}%</p>
          <small>Retorno sobre investimento</small>
        </div>
        <div className="card high-risk">
          <h3>Alto Risco</h3>
          <p className="high-risk">{highRiskCount}</p>
          <small>Requer atenção especial</small>
        </div>
        <div className="card volume">
          <h3>Volume total</h3>
          <p className="volume">{totalVolume}t</p>
          <small>Toneladas disponíveis</small>
        </div>
      </div>

      {/* ÁREA DE CENÁRIOS SALVOS */}
      {savedScenarios.length > 0 && (
        <div style={{ marginBottom: '30px' }}>
            <h3 style={{ color: '#fff', marginBottom: '15px', borderLeft: '4px solid #10b981', paddingLeft: '10px' }}>
                📂 Cenários Simulados (Clique para Carregar)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '15px' }}>
                {savedScenarios.map(scenario => (
                    <div 
                        key={scenario.id} 
                        // AÇÃO: CLIQUE NO CARD PARA CARREGAR NA CALCULADORA
                        onClick={() => onLoadScenario && onLoadScenario(scenario)}
                        style={{ 
                            background: '#15192c', 
                            padding: '20px', 
                            borderRadius: '12px', 
                            border: '1px solid #334155', 
                            position: 'relative', 
                            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
                            cursor: 'pointer', 
                            transition: 'transform 0.2s, border-color 0.2s'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.borderColor = '#00d9ff'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.borderColor = '#334155'; }}
                    >
                        <button 
                          onClick={(e) => {
                              e.stopPropagation(); // Impede o clique de carregar ao deletar
                              handleDeleteScenario(scenario.id);
                          }} 
                          style={{ position: 'absolute', top: 10, right: 10, background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '16px', zIndex: 2 }}
                          title="Remover cenário"
                        >
                          ✕
                        </button>
                        
                        <h4 style={{ color: '#00d9ff', margin: '0 0 8px 0', fontSize: '16px' }}>{scenario.input.product}</h4>
                        
                        <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px'}}>
                           <span style={{fontSize: '12px', color: '#cbd5e1'}}>Para:</span>
                           <strong style={{fontSize: '13px', color: '#fff'}}>{scenario.input.destinationName}</strong>
                        </div>

                        <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px dashed #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '20px', fontWeight: 'bold', color: scenario.result.roi >= 20 ? '#10b981' : '#facc15' }}>
                                ROI {scenario.result.roi}%
                            </span>
                            <span style={{ fontSize: '11px', color: '#64748b' }}>
                                {new Date(scenario.savedAt).toLocaleDateString()}
                            </span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}

      {/* GRÁFICOS */}
      <div className="dashboard-charts">
        <div className="chart-container">
          <Bar
            ref={barRef}
            data={barChartData}
            options={barChartOptions}
            onClick={e => handleBarClick(e.nativeEvent)}
          />
        </div>
        <div className="chart-container">
          <Line
            data={priceTrendData}
            options={lineChartOptions}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;