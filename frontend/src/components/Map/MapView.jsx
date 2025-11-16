import React, { useState, useImperativeHandle, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import theme from '../../styles/theme';
import { opportunities } from '../../data/mockOpportunities';
import { createRiskIcon } from '../../data/mapIcons';

// Fix Leaflet icon para React
delete L.Icon.Default.prototype._getIconUrl;

const MapController = ({ center, zoom }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, zoom || 8, { animate: true, duration: 1 });
    }
  }, [center, zoom, map]);
  return null;
};

const MapView = React.forwardRef((props, ref) => {
  const [geojsonMunicipios, setGeojsonMunicipios] = useState(null);
    useEffect(() => {
    fetch('/municipios.geojson')
    .then(resp => resp.json())
    .then(data => setGeojsonMunicipios(data));
  }, []);
  const brazilCenter = [-14.235, -51.9253];
  const [mapStyle, setMapStyle] = useState('padrao');
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(4);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [geojsonStates, setGeojsonStates] = useState(null);

  useEffect(() => {
    fetch('/estados.geojson')
      .then(resp => resp.json())
      .then(data => setGeojsonStates(data));
  }, []);

  useImperativeHandle(ref, () => ({
    focusOpportunity: (opportunity) => {
      setMapCenter(opportunity.position);
      setMapZoom(10);
      setActiveMarkerId(opportunity.id);
      setSelectedOpportunity(opportunity);
      setSelectedState(opportunity.state);
    }
  }));
  // Integração via prop (dashboard)
useEffect(() => {
  if (props.selectedOpportunity) {
    setMapCenter(props.selectedOpportunity.position);
    setMapZoom(10);
    setActiveMarkerId(props.selectedOpportunity.id);
    setSelectedOpportunity(props.selectedOpportunity);
    setSelectedState(props.selectedOpportunity.state);
  }
}, [props.selectedOpportunity]);

console.log("Selected opportunity:", selectedOpportunity);

  const formatPrice = (price) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  const getRiskBadge = (risk, riskLevel) => {
    const colors = { 1: '#22c55e', 2: theme.colors.secondary, 3: theme.colors.warning };
    return { color: colors[riskLevel], text: risk };
  };
  return (
    <div style={{
      height: '100vh',
      width: '100%',
      position: 'relative',
      background: theme.colors.background,
      fontFamily: theme.font,
      color: theme.colors.textPrimary
    }}>
      {/* Legenda Neon */}
      <div style={{
        position: 'absolute',
        top: '80px',
        right: '20px',
        background: `${theme.colors.background}EE`,
        color: theme.colors.textPrimary,
        boxShadow: theme.colors.cardGlow,
        border: `1.5px solid ${theme.colors.accent}55`,
        padding: '15px',
        borderRadius: '12px',
        minWidth: '180px',
        zIndex: 1000
      }}>
        <h4 style={{
          margin: '0 0 10px 0',
          fontSize: '14px',
          fontWeight: 'bold',
          color: theme.colors.accent,
          textShadow: '0 0 8px #00d9ff66',
          letterSpacing: '1px'
        }}>📊 Legenda - ROI</h4>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '20px', height: '20px', backgroundColor: '#22c55e',
            borderRadius: '50%', marginRight: '10px', border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
          <span style={{ fontSize: '12px' }}>Alto (&gt;100%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '20px', height: '20px', backgroundColor: theme.colors.secondary,
            borderRadius: '50%', marginRight: '10px', border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
          <span style={{ fontSize: '12px' }}>Médio (50-100%)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <div style={{
            width: '20px', height: '20px', backgroundColor: theme.colors.warning,
            borderRadius: '50%', marginRight: '10px', border: '2px solid white',
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
          }} />
          <span style={{ fontSize: '12px' }}>Baixo (&lt;50%)</span>
        </div>
        <hr style={{ margin: '10px 0', border: 'none', borderTop: `1px solid ${theme.colors.textMuted}` }} />
        <div style={{ fontSize: '11px', color: theme.colors.warning }}>
          🔴 Borda vermelha = Alto risco
        </div>
      </div>
      {/* CONTROLES de visualização */}
      <div style={{
        position: 'absolute', top: 22, left: 80, zIndex: 2000, background: theme.colors.background,
        borderRadius: theme.borderRadius, boxShadow: theme.colors.cardGlow, padding: '6px 14px'
      }}>
        <label style={{color: theme.colors.textPrimary, fontWeight: 600, fontSize: 13, marginRight: 8}}>Visualização:</label>
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
        <MapController center={mapCenter} zoom={mapZoom} />
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
        {/* Botões de Zoom personalizados */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          gap: '5px'
        }}>
          <button style={{
            width: '34px',
            height: '34px',
            background: theme.colors.background,
            color: theme.colors.accent,
            border: `2px solid ${theme.colors.accent}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '22px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: theme.colors.cardGlow,
            marginBottom: '4px'
          }}
            onClick={() => setMapZoom(z => Math.min(z + 1, 12))}
            title="Aproximar"
          >
            +
          </button>
          <button style={{
            width: '34px',
            height: '34px',
            background: theme.colors.background,
            color: theme.colors.accent,
            border: `2px solid ${theme.colors.accent}`,
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '22px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: theme.colors.cardGlow
          }}
            onClick={() => setMapZoom(z => Math.max(z - 1, 1))}
            title="Afastar"
          >
            −
          </button>
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
{geojsonMunicipios && selectedOpportunity && (
  <GeoJSON
    key={selectedOpportunity.id || selectedOpportunity.city}
    data={{
      ...geojsonMunicipios,
      features: geojsonMunicipios.features.filter(f => {
        const geoNome = (f.properties.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const cityNome = (selectedOpportunity.city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
        return !!geoNome && !!cityNome && geoNome === cityNome;
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


        {opportunities.map((opp) => (
  <Marker
    key={opp.id}
    position={opp.position}
    icon={createRiskIcon(opp.roi, opp.riskLevel)}
    eventHandlers={{
      click: () => {
        setSelectedOpportunity(opp); // ESSENCIAL: atualiza o município destacado
        setActiveMarkerId(opp.id);
        setSelectedState(opp.state);
        setMapCenter(opp.position);
        setMapZoom(8);
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
        <div style={{
          borderBottom: `2px solid ${theme.colors.accent}`,
          paddingBottom: '10px',
          marginBottom: '12px'
        }}>
          <h3 style={{
            margin: '0 0 5px 0',
            color: theme.colors.accent,
            fontSize: '16px',
            fontWeight: 'bold',
            letterSpacing: '1.5px'
          }}>
            {opp.product}
          </h3>
          <p style={{
            margin: '0',
            fontSize: '13px',
            color: theme.colors.textMuted
          }}>
            📍 {opp.city}, {opp.state}
          </p>
        </div>
        {/* ROI Badge */}
        <div style={{
          background: opp.roi >= 100 ? '#dcfce7' : opp.roi >= 50 ? '#fef3c7' : '#fee2e2',
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
            background: `${theme.colors.background}99`,
            borderRadius: '4px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>
              💰 Compra:
            </span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#22c55e' }}>
              {formatPrice(opp.buyPrice)}/kg
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            padding: '6px',
            background: `${theme.colors.background}99`,
            borderRadius: '4px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>
              💵 Venda:
            </span>
            <span style={{ fontSize: '12px', fontWeight: 'bold', color: theme.colors.accent }}>
              {formatPrice(opp.sellPrice)}/kg
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            padding: '6px',
            background: `${theme.colors.background}99`,
            borderRadius: '4px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>
              📦 Volume:
            </span>
            <span style={{ fontSize: '12px', color: theme.colors.textMuted }}>
              {opp.volume}
            </span>
          </div>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '8px',
            padding: '6px',
            background: `${theme.colors.background}99`,
            borderRadius: '4px'
          }}>
            <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>
              🚛 Destino:
            </span>
            <span style={{ fontSize: '12px', color: theme.colors.textMuted }}>
              {opp.sellLocation}
            </span>
          </div>
        </div>
        {/* Risco */}
        <div style={{
          padding: '8px',
          background: opp.riskLevel === 1
            ? '#22c55e20'
            : opp.riskLevel === 2
            ? `${theme.colors.secondary}20`
            : '#fee2e2',
          borderLeft: `4px solid ${
            opp.riskLevel === 1
              ? '#22c55e'
              : opp.riskLevel === 2
              ? theme.colors.secondary
              : '#dc2626'
          }`,
          borderRadius: '4px',
          marginBottom: '10px'
        }}>
          <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>
            ⚠️ Risco: {opp.risk}
          </span>
        </div>
        {/* Clima */}
        <div style={{
          padding: '8px',
          background: '#eff6ff',
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
          color: theme.colors.textMuted,
          lineHeight: '1.4',
          marginTop: '10px',
          padding: '8px',
          background: `${theme.colors.background}99`,
          borderRadius: '4px'
        }}>
          {opp.description}
        </div>
        {/* Footer */}
        <div style={{
          marginTop: '12px',
          paddingTop: '10px',
          borderTop: `1px solid ${theme.colors.textMuted}`,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: '11px',
          color: theme.colors.textMuted
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
