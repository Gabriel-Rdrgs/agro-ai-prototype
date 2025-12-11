// frontend/src/components/Calculator/RoiCalculator.jsx
import React, { useState, useEffect } from 'react';
import { OpportunityService } from '../../services/opportunityService';
import { PdfService } from '../../services/pdfService';
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
  const [locations, setLocations] = useState([]); 
  const [inputs, setInputs] = useState({
    product: 'Tomate',
    origin_city: '',      
    origin_state: 'SP',   
    destination_state: 'SP',
    planting_month: 1,
    area: 100
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false); // Novo estado para o botão "Mágico"
  const [scanMessage, setScanMessage] = useState(null); // Feedback da IA
  const [topOpportunities, setTopOpportunities] = useState([]); // 🆕 Lista Top 5


// 1. Carrega as Cidades Produtoras (Corrigido para ler op.origin)
  useEffect(() => {
    const loadOrigins = async () => {
        const opportunities = await OpportunityService.getAll();
        
        const uniqueLocations = [];
        const seen = new Set();

        opportunities.forEach(op => {
            // CORREÇÃO: Acessa city e state dentro de origin
            const city = op.origin?.city || 'Desconhecida';
            const state = op.origin?.state || 'BR';
            
            const key = `${city}-${state}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueLocations.push({ city, state });
            }
        });

        uniqueLocations.sort((a, b) => a.city.localeCompare(b.city));
        
        setLocations(uniqueLocations);
        
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

  const handleOriginChange = (e) => {
      const selectedCityName = e.target.value;
      const locationData = locations.find(l => l.city === selectedCityName);
      
      setInputs({
          ...inputs,
          origin_city: selectedCityName,
          origin_state: locationData ? locationData.state : 'SP'
      });
  };

  // --- 🌟 NOVA FUNÇÃO: O "CÉREBRO" QUE ESCOLHE O DESTINO ---
  const handleAutoSelectDestination = async () => {
    setScanning(true);
    setScanMessage(null);
    setTopOpportunities([]); // Limpa lista antiga

    try {
        const data = await OpportunityService.scanMarket(
            inputs.product, 
            inputs.origin_state, 
            1000,
            Number(inputs.planting_month)
        );

        if (data && data.best_opportunity) {
            const best = data.best_opportunity;
            
            setInputs(prev => ({
                ...prev,
                destination_state: best.destination
            }));

            setScanMessage(`🏆 IA: Melhor destino encontrado: ${best.destination} (ROI Est. ${best.roi}%)`);
            
            // 👇 CAPTURA O TOP 5 AQUI
            setTopOpportunities(data.ranking.slice(0, 5)); 

        } else {
            setScanMessage("⚠️ Nenhum destino vantajoso encontrado no momento.");
        }
    } catch (error) {
        console.error(error);
        setScanMessage("Erro ao consultar inteligência de mercado.");
    } finally {
        setScanning(false);
    }
  };

  const handleCalculate = async () => {
    setLoading(true);
    // Limpa mensagem antiga ao calcular manualmente
    if (!scanning) setScanMessage(null); 
  
    const data = await OpportunityService.calculateArbitrage({
        product: inputs.product,
        origin_state: inputs.origin_state,
        destination_state: inputs.destination_state,
        planting_month: Number(inputs.planting_month),
        area_ha: Number(inputs.area)
    });

    if (data) {
        setResult(data);
    }
    setLoading(false);
  };

  // --- Configurações dos Gráficos ---
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
        {/* --- COLUNA DA ESQUERDA: CONTROLES --- */}
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

            {/* Origem */}
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

            {/* Destino + Botão Mágico (IA) */}
            <div className="input-group">
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                    <label>Destino (Venda)</label>
                    
                    <button 
                        onClick={handleAutoSelectDestination} 
                        disabled={scanning}
                        style={{
                            background: 'none', 
                            border: 'none', 
                            color: '#00d9ff', 
                            cursor: 'pointer', 
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            textDecoration: 'underline',
                            transition: 'color 0.2s'
                        }}
                    >
                        {scanning ? '🤖 Analisando...' : '✨ Sugerir Melhor Destino'}
                    </button>
                </div>

                <select value={inputs.destination_state} onChange={e => setInputs({...inputs, destination_state: e.target.value})}>
                    <option value="SP">São Paulo (Ceagesp)</option>
                    <option value="RJ">Rio de Janeiro</option>
                    <option value="MG">Minas Gerais</option>
                    <option value="PE">Pernambuco</option>
                    <option value="BA">Bahia</option>
                    <option value="RS">Rio Grande do Sul</option>
                    <option value="GO">Goiás</option>
                    <option value="SC">Santa Catarina</option>
                    <option value="PR">Paraná</option>
                    <option value="MS">Mato Grosso do Sul</option>
                    <option value="MT">Mato Grosso</option>
                    <option value="CE">Ceará</option>
                </select>
                
                {/* Feedback da IA */}
                {scanMessage && (
                    <div style={{
                        marginTop: '8px', 
                        padding: '8px 12px', 
                        background: scanMessage.includes('🏆') ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', 
                        borderLeft: scanMessage.includes('🏆') ? '3px solid #10b981' : '3px solid #ef4444',
                        borderRadius: '4px',
                        color: scanMessage.includes('🏆') ? '#059669' : '#b91c1c',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        animation: 'fadeIn 0.5s ease-in-out'
                    }}>
                        {scanMessage}
                    </div>
                )}
            </div>

            {/* Mês */}
            <div className="input-group">
                <label>Mês de Início</label>
                <select value={inputs.planting_month} onChange={e => setInputs({...inputs, planting_month: Number(e.target.value)})}>
                    <option value="1">Janeiro</option>
                    <option value="2">Fevereiro</option>
                    <option value="3">Março</option>
                    <option value="4">Abril</option>
                    <option value="5">Maio</option>
                    <option value="6">Junho</option>
                    <option value="7">Julho</option>
                    <option value="8">Agosto</option>
                    <option value="9">Setembro</option>
                    <option value="10">Outubro</option>
                    <option value="11">Novembro</option>
                    <option value="12">Dezembro</option>
                </select>
            </div>

            {/* Área */}
            <div className="input-group">
                <label>Volume / Área (ha)</label>
                <input type="number" value={inputs.area} onChange={e => setInputs({...inputs, area: e.target.value})}/>
                <small style={{color: '#64748b', fontSize: '0.75rem', marginTop: '4px', display:'block'}}>IA estima a produtividade local.</small>
            </div>

          <button className="btn-calculate" onClick={handleCalculate} disabled={loading}>
            {loading ? 'Simulando Cenário...' : 'Calcular Viabilidade Detalhada'}
          </button>
        </div>

        {/* --- COLUNA DA DIREITA: RESULTADOS --- */}
        <div className="results-panel">
          {!result ? (
            <div className="placeholder-state">
                <span style={{fontSize: '3rem', display:'block', marginBottom:'15px'}}>📊</span>
                <span>Configure a rota e clique em calcular para ver a análise de IA.</span>
            </div>
          ) : (
            <>
              {/* 1. Card de Resumo Financeiro */}
              <div className="summary-card" style={{borderLeft: `5px solid ${result.financial.roi > 0 ? '#10b981' : '#ef4444'}`}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.1)'}}>
                    <span style={{color: '#94a3b8', fontSize: '0.85rem', letterSpacing: '0.5px'}}>ORIGEM: <b style={{color: '#e2e8f0'}}>{inputs.origin_city}</b></span>
                    <span style={{color: '#94a3b8', fontSize: '0.85rem', letterSpacing: '0.5px'}}>DESTINO: <b style={{color: '#e2e8f0'}}>{result.analysis.destination}</b> ({result.analysis.distance_km}km)</span>
                </div>
                
                <h3 style={{fontSize: '0.9rem', textTransform: 'uppercase', color: '#94a3b8', marginBottom: '5px'}}>Lucro Líquido Projetado</h3>
                <div className="roi-value" style={{color: result.financial.net_profit > 0 ? '#10b981' : '#ef4444', fontSize: '2.8rem', fontWeight: '800', letterSpacing: '-1px'}}>
                    {result.financial.net_profit.toLocaleString('pt-BR', {style: 'currency', currency: 'BRL'})}
                </div>
                
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '15px'}}>
                    <p style={{color: result.financial.roi > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '1.2rem', margin: 0}}>
                        ROI: {result.financial.roi}%
                    </p>
                    <button 
                      className="btn-export"
                      onClick={() => PdfService.generateRoiReport(result)}
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        color: '#fff',
                        padding: '8px 16px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                      onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                      onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                      <span>📄</span> Baixar PDF
                    </button>
                </div>
              </div>

              {/* 2. Detalhes Automatizados pela IA */}
              <div className="metrics-grid">
                <div className="metric-card">
                  <label>Produtividade IA</label>
                  <span>{result.production.productivity_ha}</span>
                  <small>un/ha</small>
                </div>
                <div className="metric-card">
                  <label>Preço Venda Estimado</label>
                  <span className="text-green">R$ {result.market.predicted_sell_price}</span>
                  <small>por kg</small>
                </div>
                 <div className="metric-card">
                  <label>Custo Logístico</label>
                  <span className="text-red">R$ {result.logistics.total_logistics_cost.toLocaleString()}</span>
                  <small>{result.logistics.trips_needed} Viagens</small>
                </div>
              </div>
            
              {/* 3. Gráficos */}
              <div style={{display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px', marginBottom: '20px'}}>
                  <div className="chart-container" style={{height: '220px'}}>
                    <Bar data={barData} options={commonOptions} />
                  </div>
                  <div className="chart-container" style={{position: 'relative', height: '220px'}}>
                    <h4 style={{position: 'absolute', top: 10, left: 10, fontSize: '0.75rem', color: '#94a3b8', margin: 0}}>Distribuição Custos</h4>
                    <div style={{height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: '15px'}}>
                        <Doughnut data={doughnutData} options={{plugins: {legend: {display: false}}}} />
                    </div>
                  </div>
              </div>

              {/* 4. 🚀 TABELA DE ALTERNATIVAS (TOP 5) - AGORA COM CLASSES CSS */}
              {topOpportunities.length > 0 && (
                  <div className="top-opportunities-panel">
                      <div className="top-opportunities-header">
                          <h4>🚀 Outras Oportunidades (Top 5)</h4>
                          <span>Baseado em Preço e Frete Atual</span>
                      </div>
                      <table className="opportunities-table">
                          <thead>
                              <tr>
                                  <th>Destino</th>
                                  <th>Lucro Liq.</th>
                                  <th>ROI</th>
                                  <th></th>
                              </tr>
                          </thead>
                          <tbody>
                              {topOpportunities.map((opp, idx) => (
                                  <tr key={idx} className={idx === 0 ? 'row-best' : ''}>
                                      <td>
                                        <strong>{opp.destination}</strong>
                                        {idx === 0 && <span className="badge-best">MELHOR</span>}
                                      </td>
                                      <td className={opp.net_profit > 0 ? 'text-green' : 'text-red'}>
                                          R$ {opp.net_profit.toLocaleString()}
                                      </td>
                                      <td><strong>{opp.roi}%</strong></td>
                                      <td style={{textAlign: 'right'}}>
                                          <button 
                                              className="btn-simulate"
                                              onClick={() => setInputs(prev => ({...prev, destination_state: opp.destination}))}
                                              title={`Simular cenário para ${opp.destination}`}
                                          >
                                              Simular ➡️
                                          </button>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}

              {/* 5. Avisos (Rodapé) */}
              <div style={{padding: '12px', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)'}}>
                 <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px'}}>
                    <span style={{fontSize: '1rem'}}>⛽</span>
                    <small style={{color: 'var(--text-muted)', fontWeight: '600'}}>Logística:</small>
                    <small style={{color: 'var(--text-primary)'}}>
                        {/* Tenta pegar o dado novo (fuel_breakdown) ou o antigo (legacy) */}
                        Diesel Ref: {
    (result.logistics.fuel_breakdown && result.logistics.fuel_breakdown.weighted_price_liter)
    ? `R$ ${Number(result.logistics.fuel_breakdown.weighted_price_liter).toFixed(2)}/L`
    : (result.logistics.diesel_price_ref || 'N/D')
}
                    </small>
                 </div>
                 
                 {/* Exibe data da coleta se disponível */}
                 {result.logistics.fuel_breakdown?.data_coleta && (
                    <div style={{display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px'}}>
                        <span style={{fontSize: '1rem'}}>📅</span>
                        <small style={{color: 'var(--text-muted)'}}>Atualizado em:</small>
                        <small style={{color: 'var(--text-primary)'}}>{result.logistics.fuel_breakdown.data_coleta}</small>
                    </div>
                 )}

                 {result.risks.length > 0 && (
                     <div style={{marginTop: '8px'}}>
                        {result.risks.map((note, i) => (
                            <small key={i} style={{color: '#d97706', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px'}}>
                                <span>⚠️</span> {note}
                            </small>
                        ))}
                     </div>
                 )}
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoiCalculator;