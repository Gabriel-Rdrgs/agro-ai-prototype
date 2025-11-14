import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para os ícones do Leaflet não aparecerem
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

const MapView = () => {
  // Coordenadas do centro do Brasil
  const brazilCenter = [-14.235, -51.9253];
  
  // Dados de exemplo: Oportunidades
  const opportunities = [
    {
      id: 1,
      name: 'Tomate - Pernambuco',
      position: [-8.0476, -34.8770], // Recife, PE
      buyPrice: 2.50,
      sellPrice: 7.00,
      roi: 180,
      product: 'Tomate',
      risk: 'Baixo'
    },
    {
      id: 2,
      name: 'Tomate - Mato Grosso',
      position: [-15.6014, -56.0979], // Cuiabá, MT
      buyPrice: 7.00,
      sellPrice: 12.50,
      roi: 78,
      product: 'Tomate',
      risk: 'Alto (Granizo previsto)'
    }
  ];

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <MapContainer 
        center={brazilCenter} 
        zoom={4} 
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {opportunities.map((opp) => (
          <Marker key={opp.id} position={opp.position}>
            <Popup>
              <div style={{ padding: '10px' }}>
                <h3 style={{ margin: '0 0 10px 0' }}>{opp.name}</h3>
                <p><strong>Produto:</strong> {opp.product}</p>
                <p><strong>Preço de Compra:</strong> R$ {opp.buyPrice.toFixed(2)}/kg</p>
                <p><strong>Preço de Venda:</strong> R$ {opp.sellPrice.toFixed(2)}/kg</p>
                <p><strong>ROI:</strong> {opp.roi}%</p>
                <p><strong>Risco:</strong> {opp.risk}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default MapView;