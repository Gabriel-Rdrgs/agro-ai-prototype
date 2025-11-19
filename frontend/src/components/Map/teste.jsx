// MapView.jsx - PARTE 1 (linhas 1-100)
// ---------------------------------------

import React, { useState, useImperativeHandle, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import theme from '../../styles/theme';
import { opportunities } from '../../data/mockOpportunities';
import { createRiskIcon } from '../../data/mapIcons';
import "../../styles/mapview.css"; //← novo CSS externo

// Fix Leaflet icon para React
delete L.Icon.Default.prototype._getIconUrl;

// Controlador do mapa para foco e animação
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
  // --- STATES PRINCIPAIS ---
  const [geojsonMunicipios, setGeojsonMunicipios] = useState(null);
  const [geojsonStates, setGeojsonStates] = useState(null);
  const [mapStyle, setMapStyle] = useState('padrao');
  const [mapCenter, setMapCenter] = useState(null);
  const [mapZoom, setMapZoom] = useState(4);
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [legendVisible, setLegendVisible] = useState(false); // ← state da legenda

  // --- REFERÊNCIA PARA O OBJETO DO MAPA ---
  const mapRef = useRef();

  // Posição aproximada do centro do Brasil
  const brazilCenter = [-14.235, -51.9253];

  // Carrega geojson de municípios
  useEffect(() => {
    fetch('/municipios.geojson')
      .then(resp => resp.json())
      .then(data => setGeojsonMunicipios(data));
  }, []);

  // Carrega geojson de estados
  useEffect(() => {
    fetch('/estados.geojson')
      .then(resp => resp.json())
      .then(data => setGeojsonStates(data));
  }, []);

  // Permite focus externo em uma oportunidade
  useImperativeHandle(ref, () => ({
    focusOpportunity: (opportunity) => {
      setMapCenter(opportunity.position);
      setMapZoom(10);
      setActiveMarkerId(opportunity.id);
      setSelectedOpportunity(opportunity);
      setSelectedState(opportunity.state);
    }
  }));

  // Redefine focus ao receber prop externa
  useEffect(() => {
    if (props.selectedOpportunity) {
      setMapCenter(props.selectedOpportunity.position);
      setMapZoom(10);
      setActiveMarkerId(props.selectedOpportunity.id);
      setSelectedOpportunity(props.selectedOpportunity);
      setSelectedState(props.selectedOpportunity.state);
    }
  }, [props.selectedOpportunity]);

  // Formata preço para BRL
  const formatPrice = (price) => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(price);

  // --- PATCH DO ZOOM: mantém ref sincronizada ---
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapZoom);
    }
  }, [mapZoom]);
// MapView.jsx - PARTE 2 (linhas aprox. 101-210)
// ---------------------------------------------

  // --- HANDLERS DE INTERAÇÃO MAPA ---
  const handleMapClick = (e) => {
    setActiveMarkerId(null);
    setSelectedOpportunity(null);
  };

  const handleMarkerClick = (opportunity) => {
    setActiveMarkerId(opportunity.id);
    setSelectedOpportunity(opportunity);
    setMapCenter(opportunity.position);
    setMapZoom(10);
  };

  // --- FILTRO DE OPORTUNIDADES ---
  const filteredOpportunities = opportunities.filter((op) =>
    !selectedState || op.state === selectedState
  );

  // --- PATCH PARA ZOOM CUSTOM ---
  const mapRef = useRef();
  useEffect(() => {
    if (mapRef.current) {
      mapRef.current.setZoom(mapZoom);
    }
  }, [mapZoom]);

  // --- JSX PRINCIPAL ---
  return (
    <div className="mapview-root" style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* CONTROLES DO MAPA */}
      <div
        className="map-controls"
        style={{
          position: 'absolute', top: 12, left: 12, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: '10px'
        }}
      >
        <button
          style={{
            width: '34px', height: '34px', background: theme.colors.background,
            color: theme.colors.accent, border: `2px solid ${theme.colors.accent}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: theme.colors.cardGlow
          }}
          onClick={() => setMapZoom(z => Math.min(z + 1, 12))}
          title="Aproximar"
        >+</button>

        <button
          style={{
            width: '34px', height: '34px', background: theme.colors.background,
            color: theme.colors.accent, border: `2px solid ${theme.colors.accent}`,
            borderRadius: '8px', cursor: 'pointer', fontSize: '22px', fontWeight: 'bold',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: theme.colors.cardGlow
          }}
          onClick={() => setMapZoom(z => Math.max(z - 1, 1))}
          title="Afastar"
        >−</button>

        {/* Adicione outros controles conforme necessário */}
      </div>
      
      {/* MAPA PRINCIPAL */}
      <MapContainer
        center={mapCenter || brazilCenter}
        zoom={mapZoom}
        style={{ width: '100%', height: '100vh' }}
        whenCreated={map => { mapRef.current = map; }}
        onclick={handleMapClick}
        scrollWheelZoom={true}
      >
        {/* Callback de controle do centro e zoom */}
        <MapController center={mapCenter || brazilCenter} zoom={mapZoom} />

        {/* Layer do Tile (pode customizar ou trocar estilo) */}
        <TileLayer
          attribution='&copy; OpenStreetMap contributors'
          url={`https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`}
        />

        {/* GeoJSON de municípios e estados (se disponíveis) */}
        {geojsonStates && (
          <GeoJSON
            data={geojsonStates}
            style={{ color: "#a78bfa", weight: 1, fillOpacity: 0.05 }}
          />
        )}

        {geojsonMunicipios && (
          <GeoJSON
            data={geojsonMunicipios}
            style={{ color: "#10b981", weight: 1, fillOpacity: 0.02 }}
          />
        )}

        {/* MARCADORES DE OPORTUNIDADE */}
        {filteredOpportunities.map((opp) => (
          <Marker
            key={opp.id}
            position={opp.position}
            icon={createRiskIcon(opp.risk)}
            eventHandlers={{
              click: () => handleMarkerClick(opp)
            }}
          >
            <Popup
              closeButton={false}
              autoClose={false}
              className={activeMarkerId === opp.id ? "active-popup" : ""}
            >
              <div>
                <h4>{opp.title}</h4>
                <p><strong>ROI:</strong> {opp.roi}% <br />
                  <strong>Volume:</strong> {opp.volume}t <br />
                  <strong>Preço:</strong> {formatPrice(opp.price)}
                </p>
                <p>📍 {opp.city}, {opp.state}</p>
                {/* Botão para selecionar/focar */}
                <button onClick={() => handleMarkerClick(opp)}>
                  Ver detalhes
                </button>
              </div>
            </Popup>
          </Marker>
        ))}

       // MapView.jsx - PARTE 3 (linhas aprox. 211-310)
// ---------------------------------------------

      {/* Modal de detalhes da oportunidade selecionada */}
      {selectedOpportunity && (
        <div
          className="opportunity-modal"
          style={{
            position: 'absolute',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            minWidth: 340,
            background: 'rgba(40,42,68,0.97)',
            borderRadius: '16px',
            boxShadow: '0 2px 18px rgba(160,174,255,0.20)',
            padding: '22px 32px 18px 18px',
            zIndex: 3000,
            color: '#fff',
          }}
        >
          <button
            style={{
              position: 'absolute',
              right: 14,
              top: 10,
              background: '#ef4444',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 'bold',
              padding: '2px 9px',
              cursor: 'pointer'
            }}
            onClick={() => setSelectedOpportunity(null)}
            title="Fechar"
          >✕</button>
          <h3 style={{ marginBottom: 8, color: "#00d9ff" }}>{selectedOpportunity.title}</h3>
          <p><strong>Estado:</strong> {selectedOpportunity.state}</p>
          <p><strong>Cidade:</strong> {selectedOpportunity.city}</p>
          <p><strong>ROI:</strong> {selectedOpportunity.roi}%</p>
          <p><strong>Volume:</strong> {selectedOpportunity.volume}t</p>
          <p><strong>Preço:</strong> {formatPrice(selectedOpportunity.price)}</p>
          <p><strong>Risco:</strong> {selectedOpportunity.risk}</p>
          {selectedOpportunity.extraInfo && (
            <p>{selectedOpportunity.extraInfo}</p>
          )}
        </div>
      )}

      {/* Loader/exemplo de feedback visual para dados do mapa */}
      {(!geojsonStates || !geojsonMunicipios) && (
        <div
          style={{
            position: 'absolute', top: '45%', left: '50%',
            transform: 'translate(-50%,-50%)',
            padding: '26px', background: 'rgba(30,32,60,0.88)',
            borderRadius: 11, color: '#a4a4ff', zIndex: 2200,
            fontSize: 17, boxShadow: '0 4px 16px #22233d88'
          }}
        >
          Carregando dados geográficos do mapa...
        </div>
      )}

      {/* Opções de mapa e visualização extra */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: legendVisible ? 220 : 18,
          zIndex: 2005,
          background: 'rgba(53,54,84,0.98)',
          borderRadius: 13,
          padding: '12px 24px'
        }}
      >
        <h4 style={{ color: "#10b981", fontSize: 15, marginBottom: 10 }}>Estilo do mapa</h4>
        <div style={{ display: 'flex', gap: 9 }}>
          <button
            style={{
              background: mapStyle === 'padrao' ? "#10b981" : '#252746',
              color: "#fff",
              border: 'none', borderRadius: 6, fontSize: 14, padding: '6px 10px', cursor: 'pointer'
            }}
            onClick={() => setMapStyle('padrao')}
          >
            Padrão
          </button>
          <button
            style={{
              background: mapStyle === 'satellite' ? "#10b981" : '#252746',
              color: "#fff",
              border: 'none', borderRadius: 6, fontSize: 14, padding: '6px 10px', cursor: 'pointer'
            }}
            onClick={() => setMapStyle('satellite')}
          >
            Satélite
          </button>
        </div>
      </div>
      <div
        className={`map-legend ${legendVisible ? 'active' : 'inactive'}`}
        style={{
          position: 'absolute',
          right: 18,
          top: 18,
          background: 'rgba(30,30,54,0.85)',
          color: '#fff',
          borderRadius: '14px',
          boxShadow: '0 2px 24px rgba(160,174,255,0.12)',
          padding: '14px 22px',
          zIndex: 2100,
          transition: '0.3s cubic-bezier(0.66,0.18,0.28,0.99)',
          opacity: legendVisible ? 1 : 0.6,
          cursor: 'pointer'
        }}
        onMouseEnter={() => setLegendVisible(true)}
        onMouseLeave={() => setLegendVisible(false)}
        onClick={() => setLegendVisible(v => !v)}
        title="Legenda – toque ou passe o mouse para destacar"
      >
        <h5 style={{ marginBottom: 6, fontWeight: 'bold', fontSize: 16 }}>
          📋 Legenda dos Marcadores
        </h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: 13 }}>
          <span style={{ color: '#10b981' }}>🟢 Baixo risco (ROI &gt; 25%)</span>
          <span style={{ color: '#fbbf24' }}>🟡 Médio risco (15% - 25%)</span>
          <span style={{ color: '#ef4444' }}>🔴 Alto risco (&lt; 15%)</span>
          <span style={{ color: '#a78bfa' }}>🟣 ROI Especial</span>
        </div>
        <hr style={{ borderColor: '#4c4c7a', marginTop: 10, marginBottom: 8 }} />
        <small style={{ color: '#a4a4ff', lineHeight: 1.4 }}>
          Clique em um marcador para ver detalhes completos da oportunidade.
        </small>
      </div>

      {/* SIDEBAR COM FILTROS - responsivo para mobile e desktop */}
      <div
        className="sidebar-filters"
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          background: 'rgba(20,22,40,0.97)',
          borderRadius: '10px',
          zIndex: 2001,
          padding: '16px 14px',
          minWidth: 180,
          boxShadow: '0 2px 14px rgba(0,0,0,0.3)'
        }}
      >
        <h4 style={{ fontSize: 14, color: "#a78bfa", marginBottom: 12, fontWeight: 'bold' }}>
          🎯 Filtros
        </h4>

        {/* Filtro por estado */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: '#fff', display: 'block', marginBottom: 4 }}>
            Estado:
          </label>
          <select
            value={selectedState || ''}
            style={{
              fontSize: 13, padding: '6px 8px', borderRadius: 6, width: '100%',
              border: '1px solid #a78bfa', background: '#22264a', color: '#fff',
              cursor: 'pointer'
            }}
            onChange={e => setSelectedState(e.target.value || null)}
          >
            <option value=''>Todos os estados</option>
            {[...new Set(opportunities.map(op => op.state))]
              .sort()
              .map(st => (
                <option key={st} value={st}>{st}</option>
              ))}
          </select>
        </div>

        {/* Filtro por tipo de cultura/produto */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontSize: 12, color: '#fff', display: 'block', marginBottom: 4 }}>
            Cultura:
          </label>
          <select
            style={{
              fontSize: 13, padding: '6px 8px', borderRadius: 6, width: '100%',
              border: '1px solid #a78bfa', background: '#22264a', color: '#fff',
              cursor: 'pointer'
            }}
          >
            <option>Todas as culturas</option>
            <option>Soja</option>
            <option>Milho</option>
            <option>Trigo</option>
            <option>Algodão</option>
          </select>
        </div>

        {/* Botão para limpar filtros */}
        <button
          onClick={() => {
            setSelectedState(null);
            setActiveMarkerId(null);
            setSelectedOpportunity(null);
          }}
          style={{
            background: "#a78bfa", color: "#fff", border: "none",
            borderRadius: 7, fontSize: 12, padding: "6px 10px", width: '100%',
            cursor: "pointer", fontWeight: 'bold', marginTop: 8
          }}
        >
          Limpar Filtros
        </button>

        {/* Info do filtro ativo */}
        {selectedState && (
          <p style={{ fontSize: 11, color: '#10b981', marginTop: 10, textAlign: 'center' }}>
            ✓ Filtrando: <strong>{selectedState}</strong>
          </p>
        )}
      </div>

      {/* OPÇÕES DE ESTILO DO MAPA - top right */}
      <div
        style={{
          position: 'absolute',
          top: 18,
          right: 18,
          zIndex: 2005,
          background: 'rgba(53,54,84,0.98)',
          borderRadius: 13,
          padding: '12px 16px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.2)'
        }}
      >
        <h4 style={{ color: "#10b981", fontSize: 13, marginBottom: 8, fontWeight: 'bold' }}>
          🗺️ Estilo
        </h4>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{
              background: mapStyle === 'padrao' ? "#10b981" : '#252746',
              color: "#fff",
              border: 'none', borderRadius: 6, fontSize: 12, padding: '6px 10px', cursor: 'pointer'
            }}
            onClick={() => setMapStyle('padrao')}
          >
            Padrão
          </button>
          <button
            style={{
              background: mapStyle === 'satellite' ? "#10b981" : '#252746',
              color: "#fff",
              border: 'none', borderRadius: 6, fontSize: 12, padding: '6px 10px', cursor: 'pointer'
            }}
            onClick={() => setMapStyle('satellite')}
          >
            Satélite
          </button>
        </div>
      </div>

      {/* FOOTER INFO - informação ao usuário */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          background: 'rgba(30,30,54,0.80)',
          color: '#a4a4ff',
          borderRadius: 8,
          padding: '8px 16px',
          fontSize: 12,
          zIndex: 1500,
          boxShadow: '0 1px 8px rgba(0,0,0,0.2)',
          maxWidth: '90%',
          textAlign: 'center'
        }}
      >
        📍 {filteredOpportunities.length} oportunidade(s) encontrada(s)
        {selectedState && ` em ${selectedState}`}
      </div>

    </div>
  );
});

// Definir display name para debugging
MapView.displayName = 'MapView';

// Exportar o componente como padrão
export default MapView;
