import React, { useEffect, useState } from 'react';
import axios from 'axios';

function FuelPriceDisplay({ originState, destState }) {
  const [prices, setPrices] = useState(null);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const origin = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/fuel/price/${originState}`
        );
        const dest = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/fuel/price/${destState}`
        );
        
        setPrices({
          origin: origin.data.data,
          dest: dest.data.data
        });
      } catch (error) {
        console.error('Erro:', error);
      }
    };

    if (originState && destState) {
      fetchPrices();
    }
  }, [originState, destState]);

  if (!prices) return null;

  return (
    <div className="fuel-prices" style={{
      background: '#f8f9fa',
      padding: '15px',
      borderRadius: '8px',
      marginTop: '10px'
    }}>
      <h4>⛽ Preços de Diesel</h4>
      <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
        <div>
          <strong>{prices.origin.state}:</strong> R$ {prices.origin.price_per_liter.toFixed(2)}/L
        </div>
        <div>
          <strong>{prices.dest.state}:</strong> R$ {prices.dest.price_per_liter.toFixed(2)}/L
        </div>
      </div>
      <small style={{ color: '#666', marginTop: '5px', display: 'block' }}>
        Atualizado: {prices.origin.data_coleta}
      </small>
    </div>
  );
}

export default FuelPriceDisplay;
