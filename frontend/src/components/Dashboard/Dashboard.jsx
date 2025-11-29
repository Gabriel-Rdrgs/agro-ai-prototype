// frontend/src/components/Dashboard/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { OpportunityService } from '../../services/opportunityService';
import { PdfService } from '../../services/pdfService'; // 🔙 Trazendo o PDF de volta
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  BarElement, 
  LineElement,    
  PointElement,   
  Title, 
  Tooltip, 
  Legend 
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import '../../styles/dashboard.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend);

const Dashboard = () => {
  // Estado
  const [stats, setStats] = useState({
    dollar: 0,
    dieselAvg: 0,
    opportunitiesCount: 0,
    lastUpdate: '-'
  });
  // Função para chamar a correção
  const handleFixData = async () => {
    if(!window.confirm("Isso vai redistribuir os destinos e ajustar preços no banco. Continuar?")) return;
    
    try {
      const token = localStorage.getItem('token');
      await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/admin/fix-data`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      alert("✅ Dados corrigidos com sucesso! Recarregue a página.");
      window.location.reload();
    } catch (e) {
      alert("Erro ao corrigir dados.");
    }
  };
  const [opportunities, setOpportunities] = useState([]); // 🔙 Lista Completa para a Tabela
  const [fuelData, setFuelData] = useState(null);
  const [trendData, setTrendData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [opps, fuel, trend] = await Promise.all([
          OpportunityService.getAll(),
          OpportunityService.getFuelPrices(),
          OpportunityService.getPriceTrend()
        ]);

        // 1. Processa Estatísticas e Lista
        const dollarRate = opps.length > 0 ? opps[0].dollarRate : 5.50;
        
        // Ordena oportunidades por ROI (do maior para o menor) para a tabela
        const sortedOpps = [...opps].sort((a, b) => b.roi - a.roi);
        setOpportunities(sortedOpps);

        // 2. Processa Combustível
        let dieselVal = 0;
        let chartLabels = [];
        let chartValues = [];

        if (fuel && fuel.data && fuel.data.precos) {
            const dieselRaw = fuel.data.precos.diesel.br || fuel.data.precos.diesel.sp;
            dieselVal = parseFloat(dieselRaw.replace(',', '.'));
            
            const states = ['SP', 'MT', 'GO', 'BA', 'RS'];
            chartLabels = states;
            chartValues = states.map(uf => {
                const val = fuel.data.precos.diesel[uf.toLowerCase()] || '0';
                return parseFloat(val.replace(',', '.'));
            });
        }

        setStats({
            dollar: dollarRate,
            dieselAvg: dieselVal,
            opportunitiesCount: opps.length,
            lastUpdate: new Date().toLocaleTimeString()
        });

        setFuelData({ labels: chartLabels, values: chartValues });

        // 3. Processa Gráfico de Tendência
        if (trend && trend.labels) {
            setTrendData({
                labels: trend.labels,
                datasets: [{
                    label: 'Tendência de Preços (Média Geral)',
                    data: trend.data,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.2)',
                    tension: 0.4,
                    fill: true
                }]
            });
        }

      } catch (error) {
        console.error("Erro ao carregar Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // 🔙 Função para Gerar o PDF Geral do Dashboard
  const handleExportDashboard = () => {
    // Cálculo seguro do Volume Total (Remove texto como 'sc', 'cx')
    const totalVolume = opportunities.reduce((acc, curr) => {
        const volString = String(curr.volume || '0'); 
        const volNumber = parseFloat(volString.replace(/[^0-9.]/g, '')) || 0;
        return acc + volNumber;
    }, 0);

    const dashboardData = {
        kpis: {
            total: stats.opportunitiesCount,
            avgROI: (opportunities.reduce((acc, curr) => acc + curr.roi, 0) / (opportunities.length || 1)).toFixed(1),
            highRisk: opportunities.filter(o => o.riskLevel >= 2).length,
            volume: totalVolume // Agora vai como número limpo
        },
        // 👇 NOVOS DADOS DE MERCADO (Que faltavam)
        market: {
            dollar: stats.dollar,
            dieselAvg: stats.dieselAvg,
            fuelByState: fuelData // Passamos os dados do gráfico para fazer tabela
        },
        top5: opportunities.slice(0, 5),
        saved: opportunities
    };

    PdfService.generateDashboardReport(dashboardData, 'Gestor Agro');
  };

  // Opções dos Gráficos
  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  const fuelChartData = {
    labels: fuelData?.labels || [],
    datasets: [{
        label: 'Preço Diesel',
        data: fuelData?.values || [],
        backgroundColor: '#3b82f6',
        borderRadius: 4
    }]
  };

  if (loading) return <div className="dashboard-loading">🚀 Carregando Torre de Controle...</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div>
            <h2>Torre de Controle</h2>
            <p>Visão geral do mercado e logística em tempo real.</p>
        </div>
        <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
            <div className="last-update">Atualizado às {stats.lastUpdate}</div>
            
            {/* 🔙 BOTÃO DE EXPORTAR VOLTOU */}
            <button 
                onClick={handleExportDashboard}
                style={{
                    background: 'linear-gradient(45deg, #00d9ff, #00b8d9)',
                    color: '#0f172a',
                    border: 'none',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                }}
            >
                📄 Exportar Panorama
            </button>
            {/* 👇 BOTÃO DE CORREÇÃO (TEMPORÁRIO) */}
            <button 
                onClick={handleFixData}
                style={{
                    background: 'rgba(239, 68, 68, 0.1)', 
                    color: '#ef4444', 
                    border: '1px solid #ef4444',
                    padding: '8px 16px', 
                    borderRadius: '6px', 
                    fontWeight: 'bold', 
                    cursor: 'pointer'
                }}
            >
                🔧 Corrigir Banco
            </button>
        </div>
      </header>

      {/* --- KPIS --- */}
      <div className="kpi-grid">
        <div className="kpi-card">
            <div className="kpi-icon">💵</div>
            <div className="kpi-info">
                <span>Dólar PTAX</span>
                <strong>R$ {stats.dollar.toFixed(3)}</strong>
            </div>
        </div>
        <div className="kpi-card">
            <div className="kpi-icon">⛽</div>
            <div className="kpi-info">
                <span>Diesel Médio (BR)</span>
                <strong>R$ {stats.dieselAvg.toFixed(2)}</strong>
                <small className="trend-indicator text-red">▲ ANP</small>
            </div>
        </div>
        <div className="kpi-card">
            <div className="kpi-icon">📊</div>
            <div className="kpi-info">
                <span>Oportunidades</span>
                <strong>{stats.opportunitiesCount}</strong>
            </div>
        </div>
      </div>

      <div className="dashboard-main">
        {/* --- GRÁFICOS --- */}
        <div className="charts-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '30px' }}>
            <div className="chart-section">
                <h4 style={{margin: '0 0 15px 0', color: '#94a3b8', fontSize: '0.9rem'}}>⛽ Diesel por Estado (R$/L)</h4>
                <div style={{height: '220px'}}>
                    <Bar data={fuelChartData} options={commonOptions} />
                </div>
            </div>
            <div className="chart-section">
                <h4 style={{margin: '0 0 15px 0', color: '#94a3b8', fontSize: '0.9rem'}}>📈 Tendência de Preços</h4>
                <div style={{height: '220px'}}>
                    {trendData ? (
                        <Line data={trendData} options={commonOptions} />
                    ) : (
                        <div className="placeholder">Sem dados históricos</div>
                    )}
                </div>
            </div>
        </div>

        {/* --- 🔙 TABELA DE MONITORAMENTO DE OPORTUNIDADES (A TUA LISTA DE VOLTA) --- */}
        <div className="highlight-section" style={{background: 'var(--bg-card)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)'}}>
            <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                <h3 style={{margin: 0, color: 'var(--text-primary)', fontSize: '1.1rem'}}>📡 Monitoramento de Oportunidades (Top ROI)</h3>
            </div>
            
            <div style={{overflowX: 'auto'}}>
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
                    <thead>
                        <tr style={{textAlign: 'left', color: '#94a3b8', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                            <th style={{padding: '12px'}}>Produto</th>
                            <th style={{padding: '12px'}}>Origem</th>
                            <th style={{padding: '12px'}}>Destino</th>
                            <th style={{padding: '12px'}}>Compra</th>
                            <th style={{padding: '12px'}}>Venda</th>
                            <th style={{padding: '12px'}}>Lucro Liq.</th>
                            <th style={{padding: '12px'}}>ROI</th>
                        </tr>
                    </thead>
                    <tbody>
                        {opportunities.slice(0, 8).map((op, idx) => (
                            <tr key={idx} style={{borderBottom: '1px solid rgba(255,255,255,0.05)', color: 'var(--text-primary)'}}>
                                <td style={{padding: '12px', fontWeight: 'bold'}}>{op.product}</td>
                                <td style={{padding: '12px'}}>{op.city} - {op.state}</td>
                                <td style={{padding: '12px'}}>{op.sellLocation}</td>
                                <td style={{padding: '12px'}}>R$ {op.buyPrice.toFixed(2)}</td>
                                <td style={{padding: '12px'}}>R$ {op.sellPrice.toFixed(2)}</td>
                                <td style={{padding: '12px', color: (op.sellPrice - op.buyPrice) > 0 ? '#10b981' : '#ef4444'}}>
                                    R$ {((op.sellPrice - op.buyPrice) * 1000).toLocaleString()} {/* Est. p/ 1000 un */}
                                </td>
                                <td style={{padding: '12px'}}>
                                    <span style={{
                                        background: op.roi > 20 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                                        color: op.roi > 20 ? '#10b981' : '#f59e0b',
                                        padding: '4px 8px',
                                        borderRadius: '4px',
                                        fontWeight: 'bold',
                                        fontSize: '0.8rem'
                                    }}>
                                        {op.roi}%
                                    </span>
                                </td>
                            </tr>
                        ))}
                        {opportunities.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{padding: '20px', textAlign: 'center', color: '#64748b'}}>
                                    Nenhuma oportunidade mapeada. Use a Calculadora para criar cenários.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;