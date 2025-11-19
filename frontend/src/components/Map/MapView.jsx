import React, { useState, useImperativeHandle, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import theme from '../../styles/theme';
import { createRiskIcon } from '../../data/mapIcons';
import "../../styles/mapview.css"; 

// Fix Leaflet icon para React
delete L.Icon.Default.prototype._getIconUrl;

// --- 1. NOVOS ÍCONES PARA A ROTA ---
const originIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

const destIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34], shadowSize: [41, 41]
});

// --- 2. CONTROLADOR DO MAPA ATUALIZADO ---
// Agora aceita 'bounds' para focar na rota inteira
const MapController = ({ center, zoom, bounds }) => {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
    } else if (center) {
      map.setView(center, zoom || 8, { animate: true, duration: 1 });
    }
  }, [center, zoom, bounds, map]);
  return null;
};

const MapView = React.forwardRef((props, ref) => {
  const { opportunities = [], customRoute, onClearRoute } = props;

  const [geojsonMunicipios, setGeojsonMunicipios] = useState(null);
  const [geojsonStates, setGeojsonStates] = useState(null);
  const [mapStyle, setMapStyle] = useState('padrao');
  const [mapCenter, setMapCenter] = useState([-14.235, -51.9253]); // Centro do Brasil padrão
  const [mapZoom, setMapZoom] = useState(4);
  const [mapBounds, setMapBounds] = useState(null); // Novo estado para limites

  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [legendVisible, setLegendVisible] = useState(false); 

  const brazilCenter = [-14.235, -51.9253];

  useEffect(() => {
    fetch('/municipios.geojson')
      .then(resp => resp.json())
      .then(data => setGeojsonMunicipios(data));
  }, []);

  useEffect(() => {
    fetch('/estados.geojson')
      .then(resp => resp.json())
      .then(data => setGeojsonStates(data));
  }, []);

  // --- 3. EFEITO PARA ROTA CUSTOMIZADA ---
  useEffect(() => {
    if (customRoute) {
      // Cria um retângulo visual (bounds) que engloba origem e destino
      const bounds = L.latLngBounds([customRoute.origin, customRoute.destination]);
      setMapBounds(bounds);
      
      // Limpa seleções individuais para focar na simulação
      setSelectedOpportunity(null);
      setSelectedState(null);
    } else {
      setMapBounds(null);
    }
  }, [customRoute]);

  useImperativeHandle(ref, () => ({
    focusOpportunity: (opportunity) => {
      setMapCenter(opportunity.position);
      setMapZoom(6);
      setActiveMarkerId(opportunity.id);
      setSelectedOpportunity(opportunity);
      setSelectedState(opportunity.state);
      setMapBounds(null); // Reseta bounds se for foco manual
    }
  }));

  useEffect(() => {
    if (props.selectedOpportunity) {
      setMapCenter(props.selectedOpportunity.position);
      setMapZoom(6);
      setActiveMarkerId(props.selectedOpportunity.id);
      setSelectedOpportunity(props.selectedOpportunity);
      setSelectedState(props.selectedOpportunity.state);
      setMapBounds(null);
    }
  }, [props.selectedOpportunity]);

  const formatPrice = (price) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <div style={{
      height: '100%', // 🔍 ALTERADO DE '100vh' PARA '100%'
      width: '100%',
      position: 'relative',
      background: theme.colors.background,
      fontFamily: theme.font,
      color: theme.colors.textPrimary,
      zIndex: 1 // Garante base de pilha
    }}>
      
      {/* --- CARD FLUTUANTE DA ROTA (ATUALIZADO COM BOTÃO FECHAR) --- */}
      {customRoute && (
        <div className="route-info-card fade-in" style={{
            position: 'absolute', top: 80, right: 20, width: 280, zIndex: 2000,
            background: '#0f172ae6', backdropFilter: 'blur(10px)', border: '1px solid #00d9ff',
            borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
            {/* --- BOTÃO FECHAR (X) --- */}
            <button 
              onClick={onClearRoute}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'transparent', border: 'none', color: '#94a3b8',
                cursor: 'pointer', fontSize: '16px', fontWeight: 'bold',
                padding: '5px', lineHeight: 1
              }}
              title="Fechar rota e voltar"
              onMouseEnter={(e) => e.target.style.color = '#ef4444'}
              onMouseLeave={(e) => e.target.style.color = '#94a3b8'}
            >
              ✕
            </button>

            <h4 style={{ margin: '0 0 10px 0', color: '#00d9ff', borderBottom: '1px solid #334155', paddingBottom: 8, paddingRight: 20 }}>
                🚚 Rota Simulada
            </h4>
            <div style={{ fontSize: '13px', marginBottom: 6 }}>
                <strong style={{color: '#22c55e'}}>🟢 De:</strong> {customRoute.originName}
            </div>
            <div style={{ fontSize: '13px', marginBottom: 12 }}>
                <strong style={{color: '#ef4444'}}>🔴 Para:</strong> {customRoute.destinationName}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, background: '#1e293b', padding: 8, borderRadius: 6 }}>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>DISTÂNCIA</span>
                    <span style={{ fontWeight: 'bold', color: 'white' }}>{Math.round(customRoute.details.distance)} km</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                    <span style={{ display: 'block', fontSize: '10px', color: '#94a3b8' }}>LUCRO LIQ.</span>
                    <span style={{ fontWeight: 'bold', color: '#22c55e' }}>{formatPrice(customRoute.details.profit)}</span>
                </div>
            </div>
            <div style={{ marginTop: 10, textAlign: 'center' }}>
                <span style={{ fontSize: '24px', fontWeight: '800', color: customRoute.details.roi >= 20 ? '#22c55e' : '#facc15' }}>
                    {customRoute.details.roi}% ROI
                </span>
            </div>
        </div>
      )}

      {/* Legenda (Mantida Original) */}
      <div 
        className={`map-legend ${legendVisible ? 'visible' : ''}`}
        onClick={() => setLegendVisible(v => !v)}
        onMouseEnter={() => !legendVisible && setLegendVisible(true)}
        onMouseLeave={(e) => !e.buttons && setLegendVisible(false)}
      >
        <h4 className="legend-title">
          📊 Legenda ROI {legendVisible ? '' : '(pressione para ver)'}
        </h4>
        {legendVisible && (
          <div className="legend-content">
            <div className="legend-item"><div className="legend-dot high" /> Alto (&gt;100%)</div>
            <div className="legend-item"><div className="legend-dot medium" /> Médio (50-100%)</div>
            <div className="legend-item"><div className="legend-dot low" /> Baixo (&lt;50%)</div>
            <hr />
            <div className="legend-risk">🔴 Borda vermelha = Alto risco</div>
          </div>
        )}
      </div>

      {/* Seletor de Estilo (Mantido Original) */}
      <div style={{
        position: 'absolute', top: 22, left: 80, zIndex: 2000, background: theme.colors.background,
        borderRadius: theme.borderRadius, boxShadow: theme.colors.cardGlow, padding: '6px 14px'
      }}>
        <label style={{color: theme.colors.textPrimary, fontWeight: 600, fontSize: 13, marginRight: 8}}>
          Visualização:
        </label>
        <select
          value={mapStyle}
          onChange={e => setMapStyle(e.target.value)}
          style={{
            border: `1.5px solid ${theme.colors.accent}`, borderRadius: 8, padding: '5px 8px',
            background: theme.colors.background, color: theme.colors.textPrimary, fontFamily: theme.font
          }}
        >
          <option value="padrao">Padrão</option>
          <option value="dark">Noturno</option>
          <option value="satelite">Satélite</option>
        </select>
      </div>

      <MapContainer
        center={brazilCenter}
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true}
        zoomControl={false}
      >
        {/* Passamos mapBounds para o controller */}
        <MapController center={mapCenter} zoom={mapZoom} bounds={mapBounds} />

        {/* Estados */}
        {geojsonStates && (
          <GeoJSON
            data={geojsonStates}
            style={feature => ({
              fillColor: feature.properties.sigla === selectedState ? theme.colors.accent : `${theme.colors.accent}05`,
              color: feature.properties.sigla === selectedState ? theme.colors.accent : theme.colors.textMuted,
              weight: feature.properties.sigla === selectedState ? 7 : 1,
              fillOpacity: feature.properties.sigla === selectedState ? 0.38 : 0.10,
              filter: feature.properties.sigla === selectedState ? 'drop-shadow(0 0 10px #00d9ff)' : 'none',
              transition: 'all 0.3s'
            })}
            eventHandlers={{
              click: (e) => {
                const layer = e.target;
                const map = layer._map;
                const feature = layer.feature;
                if (feature && feature.geometry && feature.geometry.type === 'Polygon') {
                  const latlngs = feature.geometry.coordinates[0].map(([lng, lat]) => [lat, lng]);
                  const bounds = L.latLngBounds(latlngs);
                  setSelectedState(feature.properties.sigla);
                  map.flyToBounds(bounds, { animate: true, duration: 1.2 });
                }
              }
            }}
          />
        )}

        {/* Botões de Zoom Manuais (Mantidos do seu código original) */}
        <div style={{
          position: 'absolute', top: '20px', left: '20px', zIndex: 1000,
          display: 'flex', flexDirection: 'column', gap: '5px'
        }}>
          <button
            style={{ width: '34px', height: '34px', background: theme.colors.background, color: theme.colors.accent, border: `2px solid ${theme.colors.accent}`, borderRadius: '8px', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: theme.colors.cardGlow }}
            onClick={() => setMapZoom(z => Math.min(z + 1, 12))}
          >+</button>
          <button
            style={{ width: '34px', height: '34px', background: theme.colors.background, color: theme.colors.accent, border: `2px solid ${theme.colors.accent}`, borderRadius: '8px', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: theme.colors.cardGlow }}
            onClick={() => setMapZoom(z => Math.max(z - 1, 1))}
          >−</button>
        </div>

        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url={
            mapStyle === 'padrao'
              ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
              : mapStyle === 'dark'
              ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          }
        />

        {/* Destaque do município selecionado (Mantido Original) */}
        {geojsonMunicipios && selectedOpportunity && (
          <GeoJSON
            key={selectedOpportunity.id || selectedOpportunity.city}
            data={{
              ...geojsonMunicipios,
              features: geojsonMunicipios.features.filter(f => {
                const geoNome = (f.properties.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                const cityNome = (selectedOpportunity.city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                return geoNome === cityNome;
              })
            }}
            style={() => ({
              fillColor: theme.colors.secondary,
              color: theme.colors.secondary,
              weight: 5,
              fillOpacity: 0.28,
              filter: 'drop-shadow(0 0 8px ' + theme.colors.secondary + ')',
              transition: 'all 0.3s'
            })}
          />
        )}

        {/* --- 5. ROTA CUSTOMIZADA (Visualização da Calculadora) --- */}
        {customRoute && (
            <>
                <Polyline 
                    positions={[customRoute.origin, customRoute.destination]} 
                    pathOptions={{ color: '#00d9ff', dashArray: '15, 15', weight: 5, opacity: 0.9 }} 
                />
                <Marker position={customRoute.origin} icon={originIcon}>
                    <Popup><strong>Origem:</strong> {customRoute.originName}</Popup>
                </Marker>
                <Marker position={customRoute.destination} icon={destIcon}>
                    <Popup><strong>Destino:</strong> {customRoute.destinationName}</Popup>
                </Marker>
            </>
        )}

        {/* --- ROTA MANUAL (Clique na lista) --- */}
        {!customRoute && selectedOpportunity && selectedOpportunity.sellPosition && (
          <>
            <Polyline 
                positions={[selectedOpportunity.position, selectedOpportunity.sellPosition]} 
                pathOptions={{ color: theme.colors.accent, dashArray: '10, 10', weight: 3, opacity: 0.8 }} 
            />
            <Marker position={selectedOpportunity.sellPosition}>
                <Popup>
                  <div style={{color: 'black', textAlign: 'center'}}>
                    <strong>🏁 Destino</strong><br/>
                    {selectedOpportunity.sellLocation}
                  </div>
                </Popup>
            </Marker>
          </>
        )}
        
        {/* Marcadores das oportunidades (Mantido Original) */}
        {!customRoute && opportunities.map((opp) => (
          <Marker
            key={opp.id}
            position={opp.position}
            icon={createRiskIcon(opp.roi, opp.riskLevel)}
            eventHandlers={{
              click: () => {
                setSelectedOpportunity(opp);
                setActiveMarkerId(opp.id);
                setSelectedState(opp.state);
                setMapCenter(opp.position);
                setMapZoom(6);
              }
            }}
          >
            <Popup maxWidth={350} minWidth={250}>
              <div style={{
                padding: '8px',
                fontFamily: theme.font,
                background: `${theme.colors.background}F2`,
                color: theme.colors.textPrimary,
                borderRadius: '12px',
                boxShadow: theme.colors.cardGlow
              }}>
                {/* Header */}
                <div style={{ borderBottom: `2px solid ${theme.colors.accent}`, paddingBottom: '10px', marginBottom: '12px' }}>
                  <h3 style={{ margin: '0 0 5px 0', color: theme.colors.accent, fontSize: '16px', fontWeight: 'bold', letterSpacing: '1.5px' }}>
                    {opp.product}
                  </h3>
                  <p style={{ margin: '0', fontSize: '13px', color: theme.colors.textMuted }}>
                    📍 {opp.city}, {opp.state}
                  </p>
                </div>

                {/* ROI Badge */}
                <div style={{ background: opp.roi >= 100 ? '#dcfce7' : opp.roi >= 50 ? '#fef3c7' : '#fee2e2', padding: '8px 12px', borderRadius: '6px', marginBottom: '12px', textAlign: 'center' }}>
                  <span style={{ fontSize: '20px', fontWeight: 'bold', color: opp.roi >= 100 ? '#15803d' : opp.roi >= 50 ? '#b45309' : '#dc2626' }}>
                    🎯 {opp.roi}% ROI
                  </span>
                </div>

                {/* Informações principais */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '6px', background: `${theme.colors.background}99`, borderRadius: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>💰 Compra:</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#22c55e' }}>{formatPrice(opp.buyPrice)}/kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '6px', background: `${theme.colors.background}99`, borderRadius: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>💵 Venda:</span>
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.accent }}>{formatPrice(opp.sellPrice)}/kg</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '6px', background: `${theme.colors.background}99`, borderRadius: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>🚛 Destino:</span>
                    <span style={{ fontSize: '12px', color: theme.colors.textMuted }}>{opp.sellLocation}</span>
                  </div>
                </div>

                {/* Risco */}
                <div style={{ padding: '8px', background: opp.riskLevel === 1 ? '#22c55e20' : opp.riskLevel === 2 ? `${theme.colors.secondary}20` : '#fee2e2', borderLeft: `4px solid ${opp.riskLevel === 1 ? '#22c55e' : opp.riskLevel === 2 ? theme.colors.secondary : '#dc2626'}`, borderRadius: '4px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>⚠️ Risco: {opp.risk}</span>
                </div>

                {/* Clima */}
                <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '4px', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', color: '#1e40af' }}>🌤️ {opp.climate}</span>
                </div>

                {/* Descrição */}
                <div style={{ fontSize: '11px', color: theme.colors.textMuted, lineHeight: '1.4', marginTop: '10px', padding: '8px', background: `${theme.colors.background}99`, borderRadius: '4px' }}>
                  {opp.description}
                </div>

                {/* Footer */}
                <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: `1px solid ${theme.colors.textMuted}`, display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: theme.colors.textMuted }}>
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