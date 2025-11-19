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
// REMOVIDO: import { opportunities } ...
import { sortByROI } from "../../data/mockOpportunities"; // Mantivemos APENAS a função auxiliar se ela estiver lá, se não, podemos mover para utils.
// Se sortByROI for uma função exportada do mock, ok manter. Se não, a lógica vai quebrar. 
// Mas como 'sortByROI' é uma função utilitária, vamos assumir que ela está lá.
// O IMPORTANTE É: O array 'opportunities' agora vem via props.

import "../../styles/dashboard.css";

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

// ADICIONADO 'opportunities' aqui
const Dashboard = ({ setSelectedOpportunity, setActiveTab, opportunities = [] }) => {
  // Filtro por cultura
  const [selectedCrop, setSelectedCrop] = useState("");
  
  // Usa a prop opportunities para gerar a lista única
  const uniqueCrops = [...new Set(opportunities.map(o => o.product))];

  // ... (Lógica de Alerta mantida igual) ...
  const [newOpAlert, setNewOpAlert] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);

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

  const barRef = useRef();

  // Dados filtrados por cultura (Usando a prop opportunities)
  const cropFilteredOpps = opportunities.filter(
    o => !selectedCrop || o.product === selectedCrop
  );

  // Estatísticas
  const totalOpportunities = cropFilteredOpps.length;
  const avgROI = cropFilteredOpps.length
    ? (
        cropFilteredOpps.reduce((sum, opp) => sum + opp.roi, 0) / totalOpportunities
      ).toFixed(1)
    : 0;
  const highRiskCount = cropFilteredOpps.filter(opp => opp.riskLevel === 3).length;
  const totalVolume = cropFilteredOpps.reduce((sum, opp) => {
    const volMatch = String(opp.volume).match(/\d+/);
    return sum + (volMatch ? parseInt(volMatch[0], 10) : 0);
  }, 0);

  // Top 5 por ROI
  // Nota: Se sortByROI precisar do array original, você pode recriar a lógica aqui ou importar a função.
  // Assumindo que sortByROI é apenas uma função de ordenação:
  const topOpportunities = [...cropFilteredOpps].sort((a, b) => b.roi - a.roi).slice(0, 5);

  // Gráfico de barras
  const barChartData = {
    labels: topOpportunities.map(opp => opp.product),
    datasets: [
      {
        label: "ROI",
        data: topOpportunities.map(opp => opp.roi),
        backgroundColor: topOpportunities.map(opp =>
          opp.roi > 100
            ? "rgba(0,217,255,0.6)"
            : opp.roi > 50
            ? "rgba(124,58,237,0.6)"
            : "rgba(239,68,68,0.6)"
        ),
        borderColor: topOpportunities.map(opp =>
          opp.roi > 100 ? "#00d9ff" : opp.roi > 50 ? "#7c3aed" : "#ef4444"
        ),
        borderWidth: 2,
        borderRadius: 8,
      },
    ],
  };

  // ... (Manter barChartOptions, priceTrendData, lineChartOptions igual) ...
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
        callbacks: { label: ctx => `ROI: ${ctx.raw}` },
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
          callback: v => v,
        },
        beginAtZero: true,
      },
    },
  };

  const priceTrendData = {
      labels: ["Jun", "Jul", "Ago", "Set", "Out", "Nov"],
      datasets: [
        {
          label: "Preço Médio",
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

  const handleBarClick = nativeEvent => {
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
      if (opp) setSelectedOpportunity && setSelectedOpportunity(opp);
      if (setActiveTab) setActiveTab("map");
    }
  };

  return (
    <div className="dashboard-container">
      {/* Alerta nova oportunidade */}
      {newOpAlert && alertVisible && (
        <div className="dashboard-alert">
          Nova oportunidade detectada!
        </div>
      )}
      {/* Filtro por cultura */}
      <div className="dashboard-crop-filter">
        <select
          value={selectedCrop}
          onChange={e => setSelectedCrop(e.target.value)}
        >
          <option value="">Todas culturas</option>
          {uniqueCrops.map(crop => (
            <option key={crop} value={crop}>
              {crop}
            </option>
          ))}
        </select>
      </div>
      {/* Cards de estatísticas */}
      <div className="dashboard-cards">
        <div className="card oportunidades">
          <h3>Oportunidades</h3>
          <p className="count">{totalOpportunities}</p>
          <small>Monitoradas em tempo real</small>
        </div>
        <div className="card roi">
          <h3>ROI Médio</h3>
          <p className="roi">{avgROI}</p>
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
      {/* Gráficos */}
      <div className="dashboard-charts">
        <div>
          <Bar
            ref={barRef}
            data={barChartData}
            options={barChartOptions}
            height={220}
            onClick={e => handleBarClick(e.nativeEvent)}
          />
        </div>
        <div>
          <Line
            data={priceTrendData}
            options={lineChartOptions}
            height={220}
          />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;