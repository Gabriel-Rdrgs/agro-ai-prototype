import React from 'react';
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
  Filler
} from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import { opportunities, sortByROI } from '../../data/mockOpportunities';

// Registrar componentes do Chart.js
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

const Dashboard = () => {
  // Calcular estatísticas
  const totalOpportunities = opportunities.length;
  const avgROI = (opportunities.reduce((sum, opp) => sum + opp.roi, 0) / totalOpportunities).toFixed(1);
  const highRiskCount = opportunities.filter(opp => opp.riskLevel === 3).length;
  const totalVolume = opportunities.reduce((sum, opp) => {
    const vol = parseInt(opp.volume);
    return sum + (isNaN(vol) ? 0 : vol);
  }, 0);

  // Top 5 oportunidades por ROI
  const topOpportunities = sortByROI(opportunities).slice(0, 5);

  // Configuração do gráfico de barras
  const barChartData = {
    labels: topOpportunities.map(opp => opp.product),
    datasets: [{
      label: 'ROI (%)',
      data: topOpportunities.map(opp => opp.roi),
      backgroundColor: topOpportunities.map(opp => 
        opp.roi >= 100 ? 'rgba(0, 217, 255, 0.6)' : 
        opp.roi >= 50 ? 'rgba(124, 58, 237, 0.6)' : 
        'rgba(239, 68, 68, 0.6)'
      ),
      borderColor: topOpportunities.map(opp => 
        opp.roi >= 100 ? '#00d9ff' : 
        opp.roi >= 50 ? '#7c3aed' : 
        '#ef4444'
      ),
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
        backgroundColor: 'rgba(10, 14, 39, 0.95)',
        titleColor: '#00d9ff',
        bodyColor: '#ffffff',
        borderColor: '#00d9ff',
        borderWidth: 1,
        padding: 12
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(0, 217, 255, 0.1)' },
        ticks: { color: '#00d9ff' }
      },
      y: {
        grid: { color: 'rgba(0, 217, 255, 0.1)' },
        ticks: { color: '#00d9ff', callback: (value) => value + '%' },
        beginAtZero: true
      }
    }
  };

  // Dados de tendência de preços
  const priceTrendData = {
    labels: ['Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov'],
    datasets: [{
      label: 'Preço Médio',
      data: [4.2, 4.8, 5.1, 4.5, 5.3, 5.8],
      borderColor: '#00d9ff',
      backgroundColor: 'rgba(0, 217, 255, 0.1)',
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
        backgroundColor: 'rgba(10, 14, 39, 0.95)',
        titleColor: '#00d9ff',
        bodyColor: '#ffffff',
        borderColor: '#00d9ff',
        borderWidth: 1,
        padding: 12
      }
    },
    scales: {
      x: {
        grid: { color: 'rgba(0, 217, 255, 0.1)' },
        ticks: { color: '#00d9ff' }
      },
      y: {
        grid: { color: 'rgba(0, 217, 255, 0.1)' },
        ticks: { color: '#00d9ff', callback: (value) => 'R$ ' + value.toFixed(2) }
      }
    }
  };
  return (
    <div style={{
      width: '100%',
      height: '100%',
      backgroundColor: '#0a0e27',
      overflowY: 'auto',
      padding: '20px'
    }}>
      {/* Cards de Estatísticas */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '20px',
        marginBottom: '30px'
      }}>
        {/* Card 1 */}
        <div style={{
          backgroundColor: 'rgba(0, 217, 255, 0.05)',
          border: '1px solid rgba(0, 217, 255, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 0 20px rgba(0, 217, 255, 0.2)'
        }}>
          <div style={{ fontSize: '14px', color: '#00d9ff', marginBottom: '10px', fontWeight: '600' }}>
            🌾 OPORTUNIDADES
          </div>
          <div style={{ fontSize: '36px', color: '#ffffff', fontWeight: 'bold' }}>
            {totalOpportunities}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Monitoradas em tempo real
          </div>
        </div>

        {/* Card 2 */}
        <div style={{
          backgroundColor: 'rgba(124, 58, 237, 0.05)',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 0 20px rgba(124, 58, 237, 0.2)'
        }}>
          <div style={{ fontSize: '14px', color: '#7c3aed', marginBottom: '10px', fontWeight: '600' }}>
            📊 ROI MÉDIO
          </div>
          <div style={{ fontSize: '36px', color: '#ffffff', fontWeight: 'bold' }}>
            {avgROI}%
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Retorno sobre investimento
          </div>
        </div>

        {/* Card 3 */}
        <div style={{
          backgroundColor: 'rgba(239, 68, 68, 0.05)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 0 20px rgba(239, 68, 68, 0.2)'
        }}>
          <div style={{ fontSize: '14px', color: '#ef4444', marginBottom: '10px', fontWeight: '600' }}>
            ⚠️ ALTO RISCO
          </div>
          <div style={{ fontSize: '36px', color: '#ffffff', fontWeight: 'bold' }}>
            {highRiskCount}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Requer atenção especial
          </div>
        </div>

        {/* Card 4 */}
        <div style={{
          backgroundColor: 'rgba(16, 185, 129, 0.05)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 0 20px rgba(16, 185, 129, 0.2)'
        }}>
          <div style={{ fontSize: '14px', color: '#10b981', marginBottom: '10px', fontWeight: '600' }}>
            📦 VOLUME TOTAL
          </div>
          <div style={{ fontSize: '36px', color: '#ffffff', fontWeight: 'bold' }}>
            {totalVolume}t
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Toneladas disponíveis
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px'
      }}>
        {/* Gráfico de Barras */}
        <div style={{
          backgroundColor: 'rgba(0, 217, 255, 0.03)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          height: '400px',
          boxShadow: '0 0 20px rgba(0, 217, 255, 0.1)'
        }}>
          <Bar data={barChartData} options={barChartOptions} />
        </div>

        {/* Gráfico de Linha */}
        <div style={{
          backgroundColor: 'rgba(0, 217, 255, 0.03)',
          border: '1px solid rgba(0, 217, 255, 0.2)',
          borderRadius: '12px',
          padding: '20px',
          height: '400px',
          boxShadow: '0 0 20px rgba(0, 217, 255, 0.1)'
        }}>
          <Line data={priceTrendData} options={lineChartOptions} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
