import React, { useState, useEffect } from 'react';
import { OpportunityService } from '../../services/opportunityService';
import { opportunities } from '../../data/mockOpportunities';
import { StorageService } from '../../services/storageService';
import '../../styles/calculator.css';

const RoiCalculator = ({ onVisualizeRoute, initialData }) => {
  // --- ESTADOS ---
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  // Estado do formulário com valores padrão
  const [formData, setFormData] = useState({
    product: 'Tomate',
    buyPrice: 2.50,
    sellPrice: 7.00,
    volume: 10, // toneladas
    destinationName: 'Mato Grosso', 
    dieselPrice: 6.50,
    truckConsumption: 3.5, // km/l
    spoilageRate: 5, // % de perda
    storageDays: 0,
    storageCostPerDay: 15
  });

  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Guarda a origem calculada para uso no mapa/salvamento
  const [calculatedOrigin, setCalculatedOrigin] = useState(null);

  // --- EFEITO: CARREGAR DADOS DO DASHBOARD ---
  useEffect(() => {
    if (initialData) {
      console.log("Calculadora carregando cenário:", initialData);
      
      // 1. Preenche o formulário com os dados salvos
      setFormData(initialData.input);
      
      // 2. Restaura o resultado calculado
      setResult(initialData.result);
      
      // 3. Restaura a origem (importante para o mapa funcionar)
      setCalculatedOrigin(initialData.origin);

      // 4. UX: Se tiver dados avançados relevantes, abre a aba automaticamente
      if (initialData.input.spoilageRate > 0 || initialData.input.dieselPrice !== 6.50 || initialData.input.storageDays > 0) {
          setShowAdvanced(true);
      }
    }
  }, [initialData]);

  // --- HANDLERS ---

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let finalValue = value;
    
    // Validação: Evita valores negativos em campos numéricos
    if (e.target.type === 'number' && parseFloat(value) < 0) {
       finalValue = 0;
    }

    setFormData(prev => ({
      ...prev,
      [name]: finalValue
    }));
  };

  const handleCalculate = async (e) => {
    e.preventDefault();
    
    const diesel = parseFloat(formData.dieselPrice);
    const consumption = parseFloat(formData.truckConsumption);
    const buy = parseFloat(formData.buyPrice);

    if (diesel < 0 || consumption <= 0 || buy < 0) {
      alert("❌ Erro: Verifique os valores.\n- O consumo não pode ser zero.\n- Preços não podem ser negativos.");
      return;
    }

    setLoading(true);
    
    try {
      // 1. Identifica a Origem baseada no Produto (Mock)
      const productOrigin = opportunities.find(op => op.product === formData.product);
      // Fallback para coordenadas centrais se não achar
      const originCoords = productOrigin ? productOrigin.position : [-15.7975, -47.8919];
      const originName = productOrigin ? `${productOrigin.city} - ${productOrigin.state}` : 'Origem Padrão';
      
      setCalculatedOrigin({ coords: originCoords, name: originName });

      // 2. Chama a Inteligência de Cálculo
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
      alert("Erro ao calcular. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  const handleShowRoute = () => {
    if (!result || !calculatedOrigin) return;

    // Coordenadas de Destino (Fallback simples para demo)
    const DESTINATIONS = {
        'Mato Grosso': [-15.6014, -56.0979],
        'São Paulo': [-23.5505, -46.6333],
        'Rio de Janeiro': [-22.9068, -43.1729],
        'Exportação (Porto Santos)': [-23.9608, -46.3331]
    };
    const destCoords = DESTINATIONS[formData.destinationName] || [-15.0, -50.0];

    // Envia para o App.js
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

  const handleSaveScenario = () => {
    if (!result) return;
    
    const scenarioToSave = {
      input: formData,
      result: result,
      origin: calculatedOrigin
    };

    StorageService.save(scenarioToSave);
    alert("✅ Cenário salvo com sucesso! Veja na aba Dashboard.");
  };

  const formatMoney = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  return (
    <div className="calculator-container">
      <div className="calculator-card">
        <div className="calculator-header">
          <h2>🧮 Simulador de Arbitragem & Logística</h2>
          <p>Simule cenários reais considerando frete, quebra de safra e armazenamento.</p>
        </div>

        <div className="calculator-body">
          <form onSubmit={handleCalculate} className="calculator-form">
            {/* --- INPUTS --- */}
            <div className="form-group">
              <label>Produto</label>
              <select name="product" value={formData.product} onChange={handleInputChange}>
                <option value="Tomate">Tomate</option>
                <option value="Soja">Soja</option>
                <option value="Milho">Milho</option>
                <option value="Café">Café</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Preço Compra (kg)</label>
                <input type="number" min="0" step="0.01" name="buyPrice" value={formData.buyPrice} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Preço Venda (kg)</label>
                <input type="number" min="0" step="0.01" name="sellPrice" value={formData.sellPrice} onChange={handleInputChange} required />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Volume (ton)</label>
                <input type="number" min="0.1" step="0.1" name="volume" value={formData.volume} onChange={handleInputChange} required />
              </div>
              <div className="form-group">
                <label>Destino</label>
                <select name="destinationName" value={formData.destinationName} onChange={handleInputChange}>
                  <option value="Mato Grosso">Mato Grosso</option>
                  <option value="São Paulo">São Paulo</option>
                  <option value="Rio de Janeiro">Rio de Janeiro</option>
                  <option value="Exportação (Porto Santos)">Exportação</option>
                </select>
              </div>
            </div>

            {/* --- SEÇÃO AVANÇADA --- */}
            <button 
              type="button" 
              className={`advanced-toggle-btn ${showAdvanced ? 'active' : ''}`}
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              ⚙️ Parâmetros Avançados {showAdvanced ? '▲' : '▼'}
            </button>

            {showAdvanced && (
              <div className="advanced-section fade-in">
                <div className="form-row">
                  <div className="form-group">
                    <label>Diesel (R$/L)</label>
                    <input type="number" min="0" step="0.01" name="dieselPrice" value={formData.dieselPrice} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Consumo (km/L)</label>
                    <input type="number" min="0.1" step="0.1" name="truckConsumption" value={formData.truckConsumption} onChange={handleInputChange} />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Quebra/Perda (%)</label>
                    <input type="number" min="0" max="100" step="0.1" name="spoilageRate" value={formData.spoilageRate} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Dias Armazenado</label>
                    <input type="number" min="0" name="storageDays" value={formData.storageDays} onChange={handleInputChange} />
                  </div>
                </div>
              </div>
            )}

            <button type="submit" className="calculate-btn" disabled={loading}>
              {loading ? 'Calculando Logística...' : '🚀 Simular Operação'}
            </button>
          </form>

          {/* --- RESULTADOS --- */}
          <div className="calculator-results">
            {!result ? (
              <div className="empty-result">
                <span>Configure os parâmetros para simular a operação</span>
              </div>
            ) : (
              <div className="result-content fade-in">
                <div className={`roi-display ${result.roi >= 20 ? 'positive' : result.roi > 0 ? 'neutral' : 'negative'}`}>
                  <span className="roi-label">ROI Projetado</span>
                  <span className="roi-value">{result.roi}%</span>
                </div>

                <div className="metrics-grid">
                  <div className="metric-item">
                    <span className="label">Lucro Líquido</span>
                    <span className={`value ${result.profit > 0 ? 'highlight' : 'negative'}`}>
                      {formatMoney(result.profit)}
                    </span>
                  </div>
                  <div className="metric-item">
                    <span className="label">Custo Total</span>
                    <span className="value">{formatMoney(result.totalCost)}</span>
                  </div>
                </div>

                <div className="costs-breakdown">
                  <h4>📉 Composição de Custos</h4>
                  <div className="breakdown-item">
                    <span>🚚 Frete ({result.details.distanceKm}km)</span>
                    <span>{formatMoney(result.details.freightCost)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>🥀 Perda ({formData.spoilageRate}%)</span>
                    <span>{formatMoney(result.details.spoilageLoss)}</span>
                  </div>
                  <div className="breakdown-item">
                    <span>🏭 Armazenagem</span>
                    <span>{formatMoney(result.details.storageCost)}</span>
                  </div>
                </div>
                
                {/* BOTÕES DE AÇÃO */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
                    <button 
                        onClick={handleShowRoute} 
                        className="view-route-btn"
                        style={{ flex: 1, margin: 0 }}
                    >
                        🗺️ Ver Rota
                    </button>
                    <button 
                        onClick={handleSaveScenario} 
                        className="view-route-btn"
                        style={{ flex: 1, margin: 0, borderColor: '#10b981', color: '#10b981' }}
                    >
                        💾 Salvar
                    </button>
                </div>

                {result.isHighRisk && (
                   <div className="risk-alert">
                     ⚠️ Alerta: Margem de risco elevada. Verifique perdas e frete.
                   </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoiCalculator;