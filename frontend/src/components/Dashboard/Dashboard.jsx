import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { opportunities, sortByROI } from '../../data/mockOpportunities';

// Registrar componentes do Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler);

const Dashboard = ({ setSelectedOpportunity }) => {
  // Filtro por cultura
  const [selectedCrop, setSelectedCrop] = useState('');
  const uniqueCrops = [...new Set(opportunities.map(o => o.crop))];

  // Badge simulação de nova oportunidade
  const [newOpAlert, setNewOpAlert] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setNewOpAlert(true), 12000); // Simula alerta
    return () => clearTimeout(timer);
  }, []);

  // Estatísticas
  const cropFilteredOpps = opportunities.filter(o => !selectedCrop || o.crop === selectedCrop);
  const totalOpportunities = cropFilteredOpps.length;
  const avgROI = (cropFilteredOpps.reduce((sum, opp) => sum + opp.roi, 0) / (totalOpportunities || 1)).toFixed(1);
  const highRiskCount = cropFilteredOpps.filter(opp => opp.riskLevel === 3).length;
  const totalVolume = cropFilteredOpps.reduce((sum, opp) => {
    const vol = parseInt(opp.volume);
    return sum + (isNaN(vol) ? 0 : vol);
  }, 0);

  // Top por ROI
  const topOpportunities = sortByROI(cropFilteredOpps).slice(0, 5);

  // Bar Chart (TOP ROI)
  const barChartData = {
    labels: topOpportunities.map(opp => opp.product),
    datasets: [{
      label: 'ROI (%)',
      data: topOpportunities.map(opp => opp.roi),
      backgroundColor: topOpportunities.map(opp => opp.roi >= 100 ? 'rgba(0,217,255,0.6)' : opp.roi >= 50 ? 'rgba(124,58,237,0.6)' : 'rgba(239,68,68,0.6)'),
      borderColor: topOpportunities.map(opp => opp.roi >= 100 ? '#00d9ff' : opp.roi >= 50 ? '#7c3aed' : '#ef4444'),
      borderWidth: 2,
      borderRadius: 8
    }]
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '🎯 Top 5 Oportunidades por ROI',
        color: '#00d9ff',
        font: { size: 16, weight: 'bold' },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(10,14,39,0.95)',
        titleColor: '#00d9ff',
        bodyColor: '#fff',
        borderColor: '#00d9ff',
        borderWidth: 1,
        callbacks: {
          label: ctx => `ROI: ${ctx.raw}%`
        }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(0,217,255,0.1)' }, ticks: { color: '#00d9ff' } },
      y: { grid: { color: 'rgba(0,217,255,0.1)' }, ticks: { color: '#00d9ff', callback: v => v + '%' }, beginAtZero: true }
    },
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const idx = elements[0].index;
        const opp = topOpportunities[idx];
        if (opp && setSelectedOpportunity) setSelectedOpportunity(opp);
      }
    }
  };

  // LineChart de Tendência de Preços (dados fixos de exemplo, pode trocar)
  const priceTrendData = {
    labels: ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'],
    datasets: [{
      label: 'Preço Médio',
      data: [4.2, 4.8, 5.1, 4.5, 5.3, 5.8],
      borderColor: '#00d9ff',
      backgroundColor: 'rgba(0,217,255,0.1)',
      borderWidth: 3,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#00d9ff',
      pointBorderColor: '#0a0e27',
      pointBorderWidth: 2,
      pointRadius: 6
    }]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: '📈 Tendência de Preços',
        color: '#00d9ff',
        font: { size: 16, weight: 'bold' },
        padding: 20
      },
      tooltip: {
        backgroundColor: 'rgba(10,14,39,0.95)',
        titleColor: '#00d9ff',
        bodyColor: '#fff',
        borderColor: '#00d9ff',
        borderWidth: 1,
        callbacks: {
          label: ctx => `R$ ${ctx.raw.toFixed(2)}`
        }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(0,217,255,0.1)' }, ticks: { color: '#00d9ff' } },
      y: { grid: { color: 'rgba(0,217,255,0.1)' }, ticks: { color: '#00d9ff', callback: v => 'R$ ' + v.toFixed(2) } }
    }
  };

  return (
    <div className="dashboard-container">
      {newOpAlert && (
        <span style={{
          background: "linear-gradient(90deg,#00d9ff,#a78bfa)",
          color: "#fff",
          padding: "6px 12px",
          borderRadius: "6px",
          fontWeight: "bold",
          marginBottom: "16px",
          display: "inline-block",
          animation: "blink 1.5s infinite"
        }}>
          Nova oportunidade detectada!
        </span>
      )}

      <select
        value={selectedCrop}
        onChange={e => setSelectedCrop(e.target.value)}
        style={{
          marginBottom: "16px",
          padding: "8px",
          borderRadius: "8px",
          background: "#15192c",
          color: "#00d9ff"
        }}
      >
        <option value="">Todas culturas</option>
        {uniqueCrops.map(crop => (
          <option key={crop} value={crop}>{crop}</option>
        ))}
      </select>

      <div className="dashboard-cards">
        <div className="card oportunidades">
          <h3>🌿 Oportunidades</h3>
          <p style={{ fontSize: "2em", fontWeight: "bold", color: "#00d9ff" }}>{totalOpportunities}</p>
          <small>Monitoradas em tempo real</small>
        </div>
        <div className="card ">
          <h3>📊 ROI Médio</h3>
          <p style={{ fontSize: "2em", fontWeight: "bold", color: "#a78bfa" }}>{avgROI}%</p>
          <small>Retorno sobre investimento</small>
        </div>
        <div className="card ">
          <h3>⚠️ Alto Risco</h3>
          <p style={{ fontSize: "2em", fontWeight: "bold", color: "#ef4444" }}>{highRiskCount}</p>
          <small>Requer atenção especial</small>
        </div>
        <div className="card ">
          <h3>🧺 Volume total</h3>
          <p style={{ fontSize: "2em", fontWeight: "bold", color: "#10b981" }}>{totalVolume}t</p>
          <small>Toneladas disponíveis</small>
        </div>
      </div>

      <div className="dashboard-charts" style={{ display: 'flex', gap: '30px', marginTop: '30px' }}>
        <div style={{ flex: 1, background: '#15192c', padding: '16px', borderRadius: '16px', minHeight: '280px' }}>
          <Bar data={barChartData} options={barChartOptions} height={220} />
        </div>
        <div style={{ flex: 1, background: '#15192c', padding: '16px', borderRadius: '16px', minHeight: '280px' }}>
          <Line data={priceTrendData} options={lineChartOptions} height={220} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;