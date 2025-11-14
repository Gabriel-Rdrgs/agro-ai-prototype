import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { opportunities } from '../../data/mockOpportunities';
import { createRiskIcon } from '../../data/mapIcons';

// Fix para os ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;

// Componente auxiliar para controlar o mapa programaticamente
const MapController = ({ center, zoom }) => {
  const map = useMap();
  
  React.useEffect(() => {
    if (center) {
      map.setView(center, zoom || 8, {
        animate: true,
        duration: 1
      });
    }
  }, [center, zoom, map]);
  
  return null;
};

const MapView = React.forwardRef((props, ref) => {
  // Coordenadas do centro do Brasil
  const brazilCenter = [-14.235, -51.9253];
  
  // Estados para controlar o mapa
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(4);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);

  // Expõe métodos para o componente pai
  React.useImperativeHandle(ref, () => ({
    focusOpportunity: (opportunity) => {
      setMapCenter(opportunity.position);
      setMapZoom(10);
      setActiveMarkerId(opportunity.id);
      setSelectedOpportunity(opportunity);
    }
  }));

  // Função para formatar preço em reais
  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Função para obter badge de risco
  const getRiskBadge = (risk, riskLevel) => {
    const colors = {
      1: '#22c55e',
      2: '#f59e0b',
      3: '#ef4444'
    };
    
    return {
      color: colors[riskLevel],
      text: risk
    };
  };

  return (
    <div style={{ height: '100vh', width: '100%', position: 'relative' }}>
      {/* Legenda de cores - REPOSICIONADA */}
      <div style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        backgroundColor: 'white',
        padding: '15px',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        zIndex: 1000,
        minWidth: '180px'
      }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: '14px', fontWeight: 'bold' }}>
          📊 Legenda - ROI
        </h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#22c55e',
            borderRadius: '50%',
            marginRight: '10px',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}></div>
          <span style={{ fontSize: '12px' }}>Alto (&gt;100%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#f59e0b',
            borderRadius: '50%',
            marginRight: '10px',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}></div>
          <span style={{ fontSize: '12px' }}>Médio (50-100%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '20px',
            height: '20px',
            backgroundColor: '#ef4444',
            borderRadius: '50%',
            marginRight: '10px',
            border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }}></div>
          <span style={{ fontSize: '12px' }}>Baixo (&lt;50%)</span>
        </div>
        <hr style={{ margin: '10px 0', border: 'none', borderTop: '1px solid #e5e7eb' }} />
        <div style={{ fontSize: '11px', color: '#6b7280' }}>
          🔴 Borda vermelha = Alto risco
        </div>
      </div>

      <MapContainer 
        center={brazilCenter} 
        zoom={4} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Controlador do mapa */}
        <MapController center={mapCenter} zoom={mapZoom} />

        {/* Controle de zoom customizado */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '5px'
        }}>
          <button
            onClick={() => {}}
            style={{
              width: '34px',
              height: '34px',
              backgroundColor: 'white',
              border: '2px solid rgba(0,0,0,0.2)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 5px rgba(0,0,0,0.2)'
            }}
          >
            +
          </button>
          <button
            onClick={() => {}}
            style={{
              width: '34px',
              height: '34px',
              backgroundColor: 'white',
              border: '2px solid rgba(0,0,0,0.2)',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 1px 5px rgba(0,0,0,0.2)'
            }}
          >
            −
          </button>
        </div>

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {opportunities.map((opp) => (
          <Marker 
            key={opp.id} 
            position={opp.position}
            icon={createRiskIcon(opp.roi, opp.riskLevel)}
            eventHandlers={{
              click: () => {
                setSelectedOpportunity(opp);
                setActiveMarkerId(opp.id);
              }
            }}
          >
            <Popup maxWidth={350} minWidth={250}>
              <div style={{ padding: '8px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {/* Header */}
                <div style={{ 
                  borderBottom: '2px solid #22c55e', 
                  paddingBottom: '10px',
                  marginBottom: '12px'
                }}>
                  <h3 style={{ 
                    margin: '0 0 5px 0', 
                    color: '#1f2937',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}>
                    {opp.product}
                  </h3>
                  <p style={{ 
                    margin: '0', 
                    fontSize: '13px', 
                    color: '#6b7280'
                  }}>
                    📍 {opp.city}, {opp.stateName}
                  </p>
                </div>

                {/* ROI Badge */}
                <div style={{
                  backgroundColor: opp.roi >= 100 ? '#dcfce7' : opp.roi >= 50 ? '#fef3c7' : '#fee2e2',
                  padding: '8px 12px',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  textAlign: 'center'
                }}>
                  <span style={{ 
                    fontSize: '20px', 
                    fontWeight: 'bold',
                    color: opp.roi >= 100 ? '#15803d' : opp.roi >= 50 ? '#b45309' : '#dc2626'
                  }}>
                    🎯 {opp.roi}% ROI
                  </span>
                </div>

                {/* Informações principais */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    padding: '6px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                      💰 Compra:
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#059669' }}>
                      {formatPrice(opp.buyPrice)}/kg
                    </span>
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    padding: '6px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                      💵 Venda:
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#0891b2' }}>
                      {formatPrice(opp.sellPrice)}/kg
                    </span>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    padding: '6px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                      📦 Volume:
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {opp.volume}
                    </span>
                  </div>

                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between',
                    marginBottom: '8px',
                    padding: '6px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '4px'
                  }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                      🚛 Destino:
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      {opp.sellLocation}
                    </span>
                  </div>
                </div>

                {/* Risco */}
                <div style={{
                  padding: '8px',
                  backgroundColor: getRiskBadge(opp.risk, opp.riskLevel).color + '20',
                  borderLeft: `4px solid ${getRiskBadge(opp.risk, opp.riskLevel).color}`,
                  borderRadius: '4px',
                  marginBottom: '10px'
                }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: '#374151' }}>
                    ⚠️ Risco: {opp.risk}
                  </span>
                </div>

                {/* Clima */}
                <div style={{
                  padding: '8px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '4px',
                  marginBottom: '10px'
                }}>
                  <span style={{ fontSize: '12px', color: '#1e40af' }}>
                    🌤️ {opp.climate}
                  </span>
                </div>

                {/* Descrição */}
                <div style={{
                  fontSize: '11px',
                  color: '#6b7280',
                  lineHeight: '1.4',
                  marginTop: '10px',
                  padding: '8px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '4px'
                }}>
                  {opp.description}
                </div>

                {/* Footer com categoria e temporada */}
                <div style={{
                  marginTop: '12px',
                  paddingTop: '10px',
                  borderTop: '1px solid #e5e7eb',
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '11px',
                  color: '#9ca3af'
                }}>
                  <span>📂 {opp.category}</span>
                  <span>📅 {opp.season}</span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
});

export default MapView;
