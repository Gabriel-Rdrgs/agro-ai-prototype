import React, { useState } from 'react';
import { OpportunityService } from '../../services/opportunityService';
import '../../styles/MarketRadar.css';
const MarketRadar = () => {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  
  // Estado do Formulário
  const [formData, setFormData] = useState({
    product: 'Soja',
    originState: 'GO',
    volume: 1000
  });

  const handleScan = async () => {
    setLoading(true);
    setResults(null);
    try {
      // Chama o nosso novo serviço
      const data = await OpportunityService.scanMarket(
        formData.product, 
        formData.originState, 
        parseFloat(formData.volume)
      );
      setResults(data);
    } catch (error) {
      alert("Erro ao conectar com o Radar de Mercado.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="radar-container">
      <header className="radar-header">
        <h2>📡 Radar de Oportunidades</h2>
        <p>Descubra o destino mais lucrativo para a sua carga agora.</p>
      </header>

      {/* --- FILTROS --- */}
      <div className="radar-filters">
        <div className="form-group">
          <label>Produto</label>
          <select 
            value={formData.product}
            onChange={(e) => setFormData({...formData, product: e.target.value})}
          >
            <option value="Soja">Soja</option>
            <option value="Milho">Milho</option>
            <option value="Tomate">Tomate</option>
          </select>
        </div>

        <div className="form-group">
          <label>Origem (Onde está a carga?)</label>
          <select 
            value={formData.originState}
            onChange={(e) => setFormData({...formData, originState: e.target.value})}
          >
            <option value="GO">Goiás (GO)</option>
            <option value="MT">Mato Grosso (MT)</option>
            <option value="SP">São Paulo (SP)</option>
            <option value="MG">Minas Gerais (MG)</option>
            <option value="BA">Bahia (BA)</option>
            <option value="RS">Rio Grande do Sul (RS)</option>
            <option value="PR">Paraná (PR)</option>
          </select>
        </div>

        <div className="form-group">
          <label>Volume (Unidades)</label>
          <input 
            type="number" 
            value={formData.volume}
            onChange={(e) => setFormData({...formData, volume: e.target.value})}
          />
        </div>

        <button 
          className="scan-btn" 
          onClick={handleScan} 
          disabled={loading}
        >
          {loading ? 'Escaneando...' : '🔍 Escanear Mercado'}
        </button>
      </div>

      {/* --- RESULTADOS --- */}
      {results && (
        <div className="radar-results animate-fade-in">
          <div className="best-choice-card">
            <h3>🏆 Melhor Destino: {results.best_opportunity.destination}</h3>
            <div className="best-stats">
              <span>Lucro: R$ {results.best_opportunity.net_profit.toLocaleString('pt-BR')}</span>
              <span className="highlight-roi">ROI: {results.best_opportunity.roi}%</span>
            </div>
          </div>

          <table className="radar-table">
            <thead>
              <tr>
                <th>Destino</th>
                <th>Distância</th>
                <th>Diesel Ref.</th>
                <th>Preço Venda</th>
                <th>Custo Logística</th>
                <th>Lucro Líq.</th>
                <th>ROI</th>
              </tr>
            </thead>
            <tbody>
              {results.ranking.map((item, index) => (
                <tr key={index} className={index === 0 ? 'row-winner' : ''}>
                  <td><strong>{item.destination}</strong></td>
                  <td>{item.distance_km} km</td>
                  <td className="text-small">{item.diesel_ref}</td>
                  <td>R$ {item.sell_price.toFixed(2)}</td>
                  <td className="text-red">- R$ {item.logistics_cost.toLocaleString('pt-BR')}</td>
                  <td className={item.net_profit > 0 ? 'text-green' : 'text-red'}>
                    R$ {item.net_profit.toLocaleString('pt-BR')}
                  </td>
                  <td>
                    <span className={`roi-badge ${item.roi > 15 ? 'roi-high' : 'roi-low'}`}>
                      {item.roi}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MarketRadar;