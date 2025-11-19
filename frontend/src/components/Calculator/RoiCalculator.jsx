import React, { useState } from 'react';
import { OpportunityService } from '../../services/opportunityService';
import { opportunities } from '../../data/mockOpportunities';
import '../../styles/calculator.css';

// 🔍 Recebemos a prop onVisualizeRoute
const RoiCalculator = ({ onVisualizeRoute }) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [formData, setFormData] = useState({
    product: 'Tomate',
    buyPrice: 2.50,
    sellPrice: 7.00,
    volume: 10,
    destinationName: 'Mato Grosso', 
    dieselPrice: 6.50,
    truckConsumption: 3.5,
    spoilageRate: 5,
    storageDays: 0,
    storageCostPerDay: 15
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  // Guardamos a origem calculada para poder enviar ao mapa depois
  const [calculatedOrigin, setCalculatedOrigin] = useState(null);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    if (e.target.type === 'number' && value < 0) finalValue = 0;
    setFormData(prev => ({ ...prev, [name]: finalValue }));
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    const diesel = parseFloat(formData.dieselPrice);
    const consumption = parseFloat(formData.truckConsumption);
    const buy = parseFloat(formData.buyPrice);

    if (diesel < 0 || consumption <= 0 || buy < 0) {
      alert("❌ Erro: Verifique os valores.");
      return;
    }

    setLoading(true);
    
    try {
      // Busca origem e coordenadas
      const productOrigin = opportunities.find(op => op.product === formData.product);
      const originCoords = productOrigin ? productOrigin.position : [-15.7975, -47.8919];
      const originName = productOrigin ? `${productOrigin.city} - ${productOrigin.state}` : 'Origem Padrão';

      // Salva no state para usar no botão "Ver Rota"
      setCalculatedOrigin({ coords: originCoords, name: originName });

      const data = await OpportunityService.calculateROI({
        ...formData,
        originCoords: originCoords,
        buyPrice: parseFloat(formData.buyPrice) || 0,
        sellPrice: parseFloat(formData.sellPrice) || 0,
        volume: parseFloat(formData.volume) || 0,
        dieselPrice: parseFloat(formData.dieselPrice) || 0,
        truckConsumption: parseFloat(formData.truckConsumption) || 1,
        spoilageRate: parseFloat(formData.spoilageRate) || 0,
        storageDays: parseFloat(formData.storageDays) || 0,
        storageCostPerDay: parseFloat(formData.storageCostPerDay) || 0
      });
      
      setResult(data);
    } catch (error) {
      console.error("Erro no cálculo", error);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 Ação do Botão "Ver Rota"
  const handleShowRoute = () => {
    if (!result || !calculatedOrigin) return;

    // Monta o objeto de rota para o mapa
    // Precisamos estimar a coordenada do destino baseada no nome (Mock simples)
    // Idealmente viria do OpportunityService, mas vamos replicar o dicionário aqui rápido ou buscar do mock
    // Vamos buscar do mockOpportunities se existir um destino igual
    
    // Fallback de destinos
    const DESTINATIONS = {
        'Mato Grosso': [-15.6014, -56.0979],
        'São Paulo': [-23.5505, -46.6333],
        'Rio de Janeiro': [-22.9068, -43.1729],
        'Exportação (Porto Santos)': [-23.9608, -46.3331]
    };
    const destCoords = DESTINATIONS[formData.destinationName] || [-15.0, -50.0];

    onVisualizeRoute({
        origin: calculatedOrigin.coords,
        originName: calculatedOrigin.name,
        destination: destCoords,
        destinationName: formData.destinationName,
        details: {
            product: formData.product,
            roi: result.roi,
            profit: result.profit,
            distance: result.details.distanceKm
        }
    });
  };

  const formatMoney = (value) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  return (
    <div className="calculator-container">
      <div className="calculator-card">
        <div className="calculator-header">
          <h2>🧮 Simulador de Arbitragem & Logística</h2>
          <p>Simule cenários reais considerando frete, quebra de safra e armazenamento.</p>
        </div>

        <div className="calculator-body">
          <form onSubmit={handleCalculate} className="calculator-form">
             {/* ... CAMPOS DO FORMULÁRIO (MANTIDOS IGUAIS) ... */}
             <div className="form-group"><label>Produto</label><select name="product" value={formData.product} onChange={handleInputChange}><option value="Tomate">Tomate</option><option value="Soja">Soja</option><option value="Milho">Milho</option><option value="Café">Café</option></select></div>
             <div className="form-row"><div className="form-group"><label>Preço Compra (kg)</label><input type="number" min="0" step="0.01" name="buyPrice" value={formData.buyPrice} onChange={handleInputChange} required /></div><div className="form-group"><label>Preço Venda (kg)</label><input type="number" min="0" step="0.01" name="sellPrice" value={formData.sellPrice} onChange={handleInputChange} required /></div></div>
             <div className="form-row"><div className="form-group"><label>Volume (ton)</label><input type="number" min="0.1" step="0.1" name="volume" value={formData.volume} onChange={handleInputChange} required /></div><div className="form-group"><label>Destino</label><select name="destinationName" value={formData.destinationName} onChange={handleInputChange}><option value="Mato Grosso">Mato Grosso</option><option value="São Paulo">São Paulo</option><option value="Rio de Janeiro">Rio de Janeiro</option><option value="Exportação (Porto Santos)">Exportação</option></select></div></div>
             
             <button type="button" className={`advanced-toggle-btn ${showAdvanced ? 'active' : ''}`} onClick={() => setShowAdvanced(!showAdvanced)}>⚙️ Parâmetros Avançados {showAdvanced ? '▲' : '▼'}</button>
             {showAdvanced && (
              <div className="advanced-section fade-in">
                <div className="form-row"><div className="form-group"><label>Diesel (R$/L)</label><input type="number" min="0" step="0.01" name="dieselPrice" value={formData.dieselPrice} onChange={handleInputChange} /></div><div className="form-group"><label>Consumo (km/L)</label><input type="number" min="0.1" step="0.1" name="truckConsumption" value={formData.truckConsumption} onChange={handleInputChange} /></div></div>
                <div className="form-row"><div className="form-group"><label>Quebra/Perda (%)</label><input type="number" min="0" max="100" step="0.1" name="spoilageRate" value={formData.spoilageRate} onChange={handleInputChange} /></div><div className="form-group"><label>Dias Armazenado</label><input type="number" min="0" name="storageDays" value={formData.storageDays} onChange={handleInputChange} /></div></div>
              </div>
            )}

            <button type="submit" className="calculate-btn" disabled={loading}>
              {loading ? 'Calculando Logística...' : '🚀 Simular Operação'}
            </button>
          </form>

          {/* --- RESULTADOS --- */}
          <div className="calculator-results">
            {!result ? (
              <div className="empty-result"><span>Configure os parâmetros para simular a operação</span></div>
            ) : (
              <div className="result-content fade-in">
                <div className={`roi-display ${result.roi >= 20 ? 'positive' : result.roi > 0 ? 'neutral' : 'negative'}`}>
                  <span className="roi-label">ROI Projetado</span>
                  <span className="roi-value">{result.roi}%</span>
                </div>
                <div className="metrics-grid">
                  <div className="metric-item"><span className="label">Lucro Líquido</span><span className={`value ${result.profit > 0 ? 'highlight' : 'negative'}`}>{formatMoney(result.profit)}</span></div>
                  <div className="metric-item"><span className="label">Custo Total</span><span className="value">{formatMoney(result.totalCost)}</span></div>
                </div>
                <div className="costs-breakdown">
                  <h4>📉 Composição de Custos</h4>
                  <div className="breakdown-item"><span>🚚 Frete ({result.details.distanceKm}km)</span><span>{formatMoney(result.details.freightCost)}</span></div>
                  <div className="breakdown-item"><span>🥀 Perda ({formData.spoilageRate}%)</span><span>{formatMoney(result.details.spoilageLoss)}</span></div>
                  <div className="breakdown-item"><span>🏭 Armazenagem</span><span>{formatMoney(result.details.storageCost)}</span></div>
                </div>
                
                {/* 🚀 BOTÃO NOVO AQUI */}
                <button onClick={handleShowRoute} className="view-route-btn">
                  🗺️ Visualizar Rota no Mapa
                </button>

                {result.isHighRisk && <div className="risk-alert">⚠️ Alerta: Margem de risco elevada. Verifique perdas e frete.</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoiCalculator;