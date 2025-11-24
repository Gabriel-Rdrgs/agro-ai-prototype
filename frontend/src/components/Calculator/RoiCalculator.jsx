import React, { useState, useEffect } from 'react';
import { OpportunityService } from '../../services/opportunityService';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import '../../styles/calculator.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

const RoiCalculator = () => {
  // Estados
  const [locations, setLocations] = useState([]); // Lista de Cidades disponíveis
  const [inputs, setInputs] = useState({
    product: 'Tomate',
    origin_city: '',      // Nome da Cidade (Ex: Cristalina)
    origin_state: 'SP',   // Estado (Automático)
    destination_state: 'SP',
    planting_month: 1,
    area: 100
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // 1. Carrega as Cidades Produtoras ao abrir a Calculadora
  useEffect(() => {
    const loadOrigins = async () => {
        const opportunities = await OpportunityService.getAll();
        
        // Filtra cidades únicas para não repetir no select
        const uniqueLocations = [];
        const seen = new Set();

        opportunities.forEach(op => {
            // Cria uma chave única (Cidade+Estado)
            const key = `${op.city}-${op.state}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueLocations.push({ city: op.city, state: op.state });
            }
        });

        // Ordena alfabeticamente
        uniqueLocations.sort((a, b) => a.city.localeCompare(b.city));
        
        setLocations(uniqueLocations);
        
        // Define um valor inicial se houver dados
        if (uniqueLocations.length > 0) {
            setInputs(prev => ({
                ...prev,
                origin_city: uniqueLocations[0].city,
                origin_state: uniqueLocations[0].state
            }));
        }
    };
    loadOrigins();
  }, []);

  // Handler inteligente para mudança de cidade
  const handleOriginChange = (e) => {
      const selectedCityName = e.target.value;
      const locationData = locations.find(l => l.city === selectedCityName);
      
      setInputs({
          ...inputs,
          origin_city: selectedCityName,
          origin_state: locationData ? locationData.state : 'SP' // Atualiza o estado automaticamente
      });
  };

  const handleCalculate = async () => {
    setLoading(true);
    
    // Chama a IA passando o Estado descoberto (pois o Python precisa do Estado)
    const data = await OpportunityService.calculateArbitrage({
      product: inputs.product,
      origin_state: inputs.origin_state, // A IA usa isso para clima/imposto
      destination_state: inputs.destination_state,
      planting_month: Number(inputs.planting_month),
      area_ha: Number(inputs.area)
    });

    if (data) {
      setResult(data);
    }
    setLoading(false);
  };

  // --- Configurações dos Gráficos (Mantidas iguais) ---
  const barData = result ? {
    labels: ['Cenário Previsto'],
    datasets: [
      {
        label: 'Custo Operacional',
        data: [result.financial.total_cost],
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
      {
        label: 'Receita Bruta',
        data: [result.market.gross_revenue],
        backgroundColor: '#3b82f6',
        borderRadius: 4,
      },
      {
        label: 'Lucro Líquido',
        data: [result.financial.net_profit],
        backgroundColor: result.financial.net_profit > 0 ? '#10b981' : '#f59e0b',
        borderRadius: 4,
      }
    ]
  } : null;

  const doughnutData = result ? {
    labels: ['Produção/Aquisição', 'Logística (Diesel/Manut)'],
    datasets: [
      {
        data: [result.production.total_production_cost, result.logistics.total_logistics_cost],
        backgroundColor: ['#6366f1', '#f59e0b'],
        borderColor: '#1e293b',
        borderWidth: 2
      }
    ]
  } : null;

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { labels: { color: '#94a3b8' } } },
    scales: {
        y: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
    }
  };

  return (
    <div className="calculator-container">
      <div className="calculator-header">
        <h2>🚚 Simulador de Arbitragem (IA)</h2>
        <p>Selecione uma praça produtora real para simular a operação.</p>
      </div>

      <div className="calculator-grid">
        <div className="controls-panel">
            {/* Produto */}
            <div className="input-group">
                <label>Produto</label>
                <select value={inputs.product} onChange={e => setInputs({...inputs, product: e.target.value})}>
                    <option value="Tomate">Tomate</option>
                    <option value="Soja">Soja</option>
                    <option value="Milho">Milho</option>
                </select>
            </div>

            {/* Origem: AGORA É UMA LISTA DE CIDADES REAIS */}
            <div className="input-group">
                <label>Origem (Cidade Produtora)</label>
                {locations.length > 0 ? (
                    <select value={inputs.origin_city} onChange={handleOriginChange}>
                        {locations.map((loc, index) => (
                            <option key={index} value={loc.city}>
                                {loc.city} - {loc.state}
                            </option>
                        ))}
                    </select>
                ) : (
                    <select disabled><option>Carregando cidades...</option></select>
                )}
            </div>

            {/* Destino */}
            <div className="input-group">
                <label>Destino (Venda)</label>
                <select value={inputs.destination_state} onChange={e => setInputs({...inputs, destination_state: e.target.value})}>
                    <option value="SP">São Paulo (Ceagesp)</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PE">Pernambuco</option>
                    <option value="BA">Bahia</option>
                    <option value="RS">Rio Grande do Sul</option>
                </select>
            </div>

            {/* Mês */}
            <div className="input-group">
                <label>Mês de Início</label>
                <select value={inputs.planting_month} onChange={e => setInputs({...inputs, planting_month: Number(e.target.value)})}>
                    <option value="1">Janeiro</option>
                    <option value="6">Junho</option>
                    <option value="11">Novembro</option>
                </select>
            </div>

            {/* Área */}
            <div className="input-group">
                <label>Volume / Área (ha)</label>
                <input type="number" value={inputs.area} onChange={e => setInputs({...inputs, area: e.target.value})}/>
                <small style={{color: '#64748b', fontSize: '0.75rem'}}>IA estima a produtividade local.</small>
            </div>

          <button className="btn-calculate" onClick={handleCalculate} disabled={loading}>
            {loading ? 'Consultando Mercado...' : 'Simular Operação'}
          </button>
        </div>

        <div className="results-panel">
          {!result ? (
            <div className="placeholder-state"><span>Configure a rota para ver a viabilidade econômica.</span></div>
          ) : (
            <>
              {/* Card de Resumo Financeiro */}
              <div className="summary-card" style={{borderLeft: `4px solid ${result.financial.roi > 0 ? '#10b981' : '#ef4444'}`}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '10px'}}>
                    {/* Mostra a Cidade selecionada na Origem */}
                    <span style={{color: '#94a3b8', fontSize: '0.9rem'}}>ORIGEM: <b style={{color: '#fff'}}>{inputs.origin_city} ({result.analysis.origin})</b></span>
                    <span style={{color: '#94a3b8', fontSize: '0.9rem'}}>DESTINO: <b style={{color: '#fff'}}>{result.analysis.destination}</b> ({result.analysis.distance_km}km)</span>
                </div>
                
                <h3>LUCRO LÍQUIDO PROJETADO</h3>
                <div className="roi-value" style={{color: result.financial.net_profit > 0 ? '#10b981' : '#ef4444', fontSize: '2.5rem'}}>
                    {result.financial.net_profit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </div>
                <p style={{color: result.financial.roi > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold'}}>
                    ROI: {result.financial.roi}%
                </p>
              </div>

              {/* Detalhes Automatizados pela IA */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <label>Produtividade IA</label>
                  <span>{result.production.productivity_ha}</span>
                  <small>un/ha ({inputs.origin_city})</small>
                </div>
                <div className="metric-card">
                  <label>Preço Venda IA</label>
                  <span className="text-green">R$ {result.market.predicted_sell_price}</span>
                  <small>por {inputs.product === 'Tomate' ? 'Caixa (20kg)' : 'Saca (60kg)'}</small>
                  <small style={{display: 'block', marginTop: '2px'}}>em {result.analysis.destination}</small>
                </div>
                 <div className="metric-card">
                  <label>Custo Logístico</label>
                  <span className="text-red">R$ {result.logistics.total_logistics_cost.toLocaleString()}</span>
                  <small>{result.logistics.trips_needed} Viagens</small>
                </div>
              </div>
            
              {/* Gráficos */}
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px'}}>
                  <div className="chart-container">
                    <Bar data={barData} options={commonOptions} />
                  </div>
                  <div className="chart-container" style={{position: 'relative'}}>
                    <h4 style={{position: 'absolute', top: 10, left: 10, fontSize: '0.8rem', color: '#94a3b8'}}>Custos</h4>
                    <Doughnut data={doughnutData} options={{plugins: {legend: {display: false}}}} />
                  </div>
              </div>

              {/* Avisos */}
              <div style={{marginTop: '10px', padding: '10px', background: 'rgba(0,0,0,0.2)', borderRadius: '8px'}}>
                 <small style={{color: '#64748b', display: 'block'}}>• Diesel Ref: R$ {result.logistics.diesel_price_ref.toFixed(2)}/L (Média ANP)</small>
                 {result.risks.map((note, i) => (
                    <small key={i} style={{color: '#f59e0b', display: 'block'}}>• {note}</small>
                 ))}
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoiCalculator;