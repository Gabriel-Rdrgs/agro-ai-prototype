import React, { useState, useImperativeHandle, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, Polyline, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import theme from '../../styles/theme';
import { createRiskIcon } from '../../data/mapIcons';
import { OpportunityService } from '../../services/opportunityService';
import "../../styles/mapview.css"; 

// Fix Leaflet icon
delete L.Icon.Default.prototype._getIconUrl;

// --- 1. ÍCONES PERSONALIZADOS ---
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

// --- HELPER: Tradutor de Clima ---
const getWeatherDesc = (code) => {
    if (code === undefined) return { icon: '🌤️', text: 'Buscando...' };
    if (code <= 3) return { icon: '☀️', text: 'Céu Limpo/Parcial' };
    if (code <= 48) return { icon: '🌫️', text: 'Neblina' };
    if (code <= 67) return { icon: '🌧️', text: 'Chuva Leve/Mod' };
    if (code <= 77) return { icon: '❄️', text: 'Granizo/Neve' };
    if (code <= 82) return { icon: '⛈️', text: 'Chuva Forte' };
    if (code <= 99) return { icon: '⚡', text: 'Tempestade' };
    return { icon: '☁️', text: 'Nublado' };
};

// --- 2. CONTROLADOR DE MAPA ---
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

  // Estados
  const [geojsonMunicipios, setGeojsonMunicipios] = useState(null);
  const [geojsonStates, setGeojsonStates] = useState(null);
  const [mapStyle, setMapStyle] = useState('padrao');
  const [mapCenter, setMapCenter] = useState([-14.235, -51.9253]);
  const [mapZoom, setMapZoom] = useState(4);
  const [mapBounds, setMapBounds] = useState(null);
  
  const [activeMarkerId, setActiveMarkerId] = useState(null);
  
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [legendVisible, setLegendVisible] = useState(false); 
  
  const [weatherData, setWeatherData] = useState(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  
  // 1. Estado para saber se o mouse está em cima da linha
  const [hoveredFlowId, setHoveredFlowId] = useState(null);
  const [timeHorizon, setTimeHorizon] = useState(0); // 0 = Hoje, 7 = +7d, 30 = +30d
  
// --- LÓGICA DO SLIDER TEMPORAL (CORRIGIDA) ---

  // Estado para guardar as previsões reais da IA (Batch)
  const [aiPredictions, setAiPredictions] = useState({});

  // Carrega previsões
  useEffect(() => {
    if (opportunities.length > 0) {
        const fetchPredictions = async () => {
            try {
                // Chama o serviço atualizado
                const preds = await OpportunityService.calculateBatchAI(opportunities);
                if (preds) setAiPredictions(preds);
            } catch (err) {
                console.error("Erro buscando previsões:", err);
            }
        };
        fetchPredictions();
    }
  }, [opportunities]);

  // --- LÓGICA DO SLIDER (CONECTADA À IA) ---
  const getSimulatedOpportunities = () => {
    // 1. Se o slider estiver em 0 (Hoje), retorna os dados originais sem mexer
    if (timeHorizon === 0) return opportunities;

    // 2. Mapeia cada oportunidade para aplicar a simulação
    return opportunities.map(opp => {
        let prediction = null;

        // CORREÇÃO CRÍTICA: Detecta se aiPredictions é Array (Lista) ou Objeto
        // O Python costuma retornar lista, o que quebrava o acesso direto [id]
        if (Array.isArray(aiPredictions)) {
             prediction = aiPredictions.find(p => p.id === opp.id);
        } else {
             prediction = aiPredictions[opp.id];
        }

        // Clona os dados para não alterar o original
        let newFinancials = { ...(opp.financials || {}) };
        let newDetails = { ...(opp.details || {}) };

        if (prediction) {
            // LÓGICA DE SNAP:
            // O slider tem 30 passos, mas a IA só tem 2 cenários (d7 e d30).
            // Se slider <= 10 dias -> Usa previsão de 7 dias (Curto Prazo)
            // Se slider > 10 dias -> Usa previsão de 30 dias (Médio Prazo)
            const targetKey = timeHorizon <= 10 ? 'd7' : 'd30';
            
            // Tenta buscar 'd7' ou '7' (para garantir compatibilidade)
            const predData = prediction[targetKey] || prediction[targetKey.replace('d', '')];

            // Se encontrou dados de previsão...
            if (predData) {
                // Extrai o ROI (pode vir como objeto {roi: 20} ou número direto 20)
                const predictedRoi = typeof predData === 'object' ? predData.roi : predData;

                if (predictedRoi !== undefined && predictedRoi !== null) {
                    // 1. Atualiza o ROI na simulação
                    newFinancials.roi = parseFloat(predictedRoi);

                    // 2. Recalcula o Preço de Venda Estimado
                    // Fórmula: Venda = Custo * (1 + ROI/100)
                    const buyPrice = newFinancials.buyPrice || 0;
                    if (buyPrice > 0) {
                        newFinancials.sellPrice = buyPrice * (1 + newFinancials.roi / 100);
                    }

                    // 3. Marca visualmente como "Projeção"
                    newDetails.isOptimized = true; 
                    
                    // 4. Ajuste Visual de Risco (Se o ROI cair muito no futuro, alerta risco)
                    if (newFinancials.roi < 0) newDetails.riskLevel = 3;
                }
            }
        }

        // Retorna a oportunidade com os dados financeiros simulados
        return {
            ...opp,
            financials: newFinancials,
            details: newDetails
        };
    });
  };

  const currentOpportunities = getSimulatedOpportunities();

  

  // 2. Filtra as melhores oportunidades (>50% ROI) para mostrar linhas automáticas
  // Só mostra se não tiver nenhuma rota customizada ou seleção ativa
  const topFlows = !customRoute && !selectedOpportunity 
    ? opportunities.filter(op => op.roi > 50 && op.sellPosition) 
    : [];

  // 3. Define a cor e estilo da linha (Verde Neon ou Amarelo)
  const getFlowStyle = (flow, isHovered) => {
      const isHighRoi = flow.roi > 100;
      return {
          color: isHighRoi ? '#39ff14' : '#ffd700', // #39ff14 = Neon Green
          weight: isHovered ? 4 : 2, // Fica mais grossa no hover
          opacity: isHovered ? 1 : 0.5, // Fica mais opaca no hover
          dashArray: isHovered ? null : '5, 10' // Tracejado normal, sólida no hover
      };
  };
  
  const brazilCenter = [-14.235, -51.9253];

  // Carrega GeoJSONs
  useEffect(() => { fetch('/municipios.geojson').then(r=>r.json()).then(setGeojsonMunicipios); }, []);
  useEffect(() => { fetch('/estados.geojson').then(r=>r.json()).then(setGeojsonStates); }, []);

  // Efeito Rota
  useEffect(() => {
    if (customRoute) {
      const bounds = L.latLngBounds([customRoute.origin, customRoute.destination]);
      setMapBounds(bounds);
      setSelectedOpportunity(null);
      setSelectedState(null);
    } else {
      setMapBounds(null);
    }
  }, [customRoute]);

  // --- EFEITO: SELEÇÃO MANUAL E CLIMA ---
  useEffect(() => {
    if (props.selectedOpportunity) {
        // Se veio via props (clique no dashboard)
        handleSelection(props.selectedOpportunity);
    }
  }, [props.selectedOpportunity]);

  // Função centralizada de seleção
  const handleSelection = (opp) => {
      setWeatherData(null); // Reseta clima anterior
      setMapCenter(opp.position);
      setMapZoom(6);
      setActiveMarkerId(opp.id);
      setSelectedOpportunity(opp);
      setSelectedState(opp.state);
      setMapBounds(null);

      if (opp.position && opp.position.length === 2) {
          OpportunityService.getWeather(opp.position[0], opp.position[1])
            .then(data => setWeatherData(data));
      }
  };

  // Efeito Seleção via Props
  useEffect(() => {
    if (props.selectedOpportunity) {
        handleSelection(props.selectedOpportunity);
    }
  }, [props.selectedOpportunity]);

  useImperativeHandle(ref, () => ({
    focusOpportunity: (opportunity) => {
      handleSelection(opportunity);
    }
  }));

  const formatPrice = (price) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);
return (
    <div style={{
      height: '100%', 
      width: '100%',
      position: 'relative',
      background: theme.colors.background,
      fontFamily: theme.font,
      color: theme.colors.textPrimary
    }}>
      
      {/* --- CARD FLUTUANTE DA ROTA --- */}
      {customRoute && (
        <div className="route-info-card fade-in" style={{
            position: 'absolute', top: 20, right: 20, width: 280, zIndex: 2000,
            background: '#0f172ae6', backdropFilter: 'blur(10px)', border: '1px solid #00d9ff',
            borderRadius: 12, padding: 16, boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
        }}>
            <button 
              onClick={onClearRoute}
              style={{
                position: 'absolute', top: 10, right: 10,
                background: 'transparent', border: 'none', color: '#94a3b8',
                cursor: 'pointer', fontSize: '16px', fontWeight: 'bold',
                padding: '5px', lineHeight: 1
              }}
              title="Fechar rota"
            >✕</button>

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

      {/* LEGENDA */}
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

      {/* CONTROLE DE VISUALIZAÇÃO */}
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
{/* 🚀 SLIDER TEMPORAL (NOVO) */}
      {!customRoute && (
        <div className="time-slider-container fade-in" style={{
            position: 'absolute', bottom: 30, left: '50%', transform: 'translateX(-50%)',
            width: '90%', maxWidth: '400px', zIndex: 2000,
            background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(8px)',
            borderRadius: '16px', padding: '15px 20px', border: '1px solid #334155',
            boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', textTransform: 'uppercase' }}>
                <span style={{ color: timeHorizon === 0 ? '#00d9ff' : 'inherit' }}>Hoje</span>
                <span style={{ color: timeHorizon === 7 ? '#00d9ff' : 'inherit' }}>+7 Dias</span>
                <span style={{ color: timeHorizon === 30 ? '#00d9ff' : 'inherit' }}>+30 Dias</span>
            </div>
            <input 
                type="range" min="0" max="30" step="7"
                value={timeHorizon}
                onChange={(e) => {
                    const val = Number(e.target.value);
                    // "Snap" para valores fixos para melhor demo
                    if (val < 4) setTimeHorizon(0);
                    else if (val < 20) setTimeHorizon(7);
                    else setTimeHorizon(30);
                }}
                style={{ width: '100%', cursor: 'pointer', accentColor: '#00d9ff' }}
            />
            <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: '#00d9ff' }}>
                {timeHorizon === 0 ? '⚡ Dados em Tempo Real' : `🔮 Projeção Futura: +${timeHorizon} dias`}
            </div>
        </div>
      )}
      <MapContainer
        center={brazilCenter} // 🔥 Usa a constante definida na Parte 1
        zoom={4}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={true} 
        zoomControl={false}
      >
        <MapController center={mapCenter} zoom={mapZoom} bounds={mapBounds} />

        {/* CAMADA DE ESTADOS (GEOJSON) */}
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

        {/* BOTÕES DE ZOOM MANUAIS */}
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

        <TileLayer attribution='&copy; OpenStreetMap' url={mapStyle === 'padrao' ? 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' : mapStyle === 'dark' ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png' : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'} />

        {/* 🔥 DESTAQUE DO MUNICÍPIO SELECIONADO (CORREÇÃO) 🔥 */}
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
              fillColor: theme.colors.secondary, // Amarelo/Laranja do tema
              color: theme.colors.secondary,
              weight: 5,
              fillOpacity: 0.28,
              filter: 'drop-shadow(0 0 8px ' + theme.colors.secondary + ')',
              transition: 'all 0.3s'
            })}
          />
        )}
        {/* 🔥 TRADE FLOW: LINHAS AUTOMÁTICAS 🔥 */}
        {topFlows.map(flow => (
          <Polyline 
            key={`flow-${flow.id}`}
            positions={[flow.position, flow.sellPosition]}
            pathOptions={getFlowStyle(flow, hoveredFlowId === flow.id)}
            eventHandlers={{
                mouseover: () => setHoveredFlowId(flow.id),
                mouseout: () => setHoveredFlowId(null),
                click: () => {
                   // Ao clicar na linha, foca na oportunidade
                   // Usa a mesma lógica que você já tem no handleSelection
                   // Se a função handleSelection estiver definida acima, chame-a:
                   // handleSelection(flow);
                   
                   // Se não tiver acesso direto à handleSelection aqui por escopo, 
                   // copie a lógica de setMapCenter, etc.
                   ref.current.focusOpportunity(flow);
                }
            }}
          >
             <Tooltip sticky direction="top" opacity={1}>
               <div style={{ textAlign: 'center', fontFamily: theme.font, padding: '4px' }}>
                 <strong style={{ color: theme.colors.textPrimary }}>{flow.product}</strong><br/>
                 <span style={{ color: flow.roi > 100 ? '#39ff14' : '#ffd700', fontWeight: 'bold' }}>
                    Lucro Est: R$ {((flow.sellPrice - flow.buyPrice) * 1000).toLocaleString()}
                 </span>
               </div>
             </Tooltip>
          </Polyline>
        ))}
        {/* 🔥 FIM DO TRADE FLOW 🔥 */}
        {/* ROTA CUSTOMIZADA (Simulador) */}
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

        {/* ROTA MANUAL (Correção do MARK) */}
        {!customRoute && selectedOpportunity && selectedOpportunity.sellPosition && (
          <>
            <Polyline 
                positions={[selectedOpportunity.position, selectedOpportunity.sellPosition]} 
                pathOptions={{ color: theme.colors.accent, dashArray: '10, 10', weight: 3, opacity: 0.8 }} 
            />
            {/* Ícone Corrigido e Popup Estilizado */}
            <Marker position={selectedOpportunity.sellPosition} icon={destIcon}>
                <Popup>
                  <div style={{
                    padding: '10px',
                    fontFamily: theme.font,
                    background: `${theme.colors.background}F2`,
                    color: theme.colors.textPrimary,
                    borderRadius: '8px',
                    textAlign: 'center',
                    minWidth: '120px',
                    boxShadow: theme.colors.cardGlow
                  }}>
                    <strong style={{color: '#ef4444', fontSize: '14px', display: 'block', marginBottom: '4px'}}>
                      🏁 Destino Previsto
                    </strong>
                    <span style={{fontSize: '13px', color: theme.colors.textMuted}}>
                      {selectedOpportunity.sellLocation}
                    </span>
                  </div>
                </Popup>
            </Marker>
          </>
        )}
        
        {/* 🔥 MARCADORES PRINCIPAIS (COM CLUSTERING) 🔥 */}
        {!customRoute && (
          <MarkerClusterGroup
            chunkedLoading
            showCoverageOnHover={false}
            spiderfyOnMaxZoom={true}
            polygonOptions={{
                fillColor: theme.colors.accent,
                color: theme.colors.accent,
                weight: 1,
                opacity: 0.5,
                fillOpacity: 0.2
            }}
          >
           {currentOpportunities.map((opp) => (
              <Marker
                key={opp.id}
                // 1. CORREÇÃO: Coordenadas em 'coords'
                position={[opp.coords?.lat || 0, opp.coords?.lng || 0]}
                
                // 2. CORREÇÃO: Risco e ROI nos novos endereços
                icon={createRiskIcon(opp.financials?.roi || 0, opp.details?.riskLevel || 1)}
                
                eventHandlers={{
                  click: () => { handleSelection(opp); }
                }}
              >
                <Popup maxWidth={350} minWidth={250} autoPanPadding={[50, 50]}>
                  <div style={{padding:'8px',fontFamily:theme.font,background:`${theme.colors.background}F2`,color:theme.colors.textPrimary,borderRadius:'12px',boxShadow:theme.colors.cardGlow}}>
                    
                    <div style={{borderBottom:`2px solid ${theme.colors.accent}`,paddingBottom:'10px',marginBottom:'12px'}}>
                      <h3 style={{margin:'0 0 5px 0',color:theme.colors.accent,fontSize:'16px',fontWeight:'bold',letterSpacing:'1.5px'}}>
                          {opp.product}
                          {/* Flag de IA */}
                          {opp.details?.isOptimized && <span title="Otimizado por IA" style={{fontSize:'0.8em'}}> 🤖</span>}
                      </h3>
                      {/* 3. CORREÇÃO: Origem */}
                      <p style={{margin:'0',fontSize:'13px',color:theme.colors.textMuted}}>📍 {opp.origin?.city}, {opp.origin?.state}</p>
                    </div>

                    {/* 4. CORREÇÃO: ROI */}
                    <div style={{background:(opp.financials?.roi || 0)>=100?'#dcfce7':(opp.financials?.roi || 0)>=50?'#fef3c7':'#fee2e2',padding:'8px 12px',borderRadius:'6px',marginBottom:'12px',textAlign:'center'}}>
                      <span style={{fontSize:'20px',fontWeight:'bold',color:(opp.financials?.roi || 0)>=100?'#15803d':(opp.financials?.roi || 0)>=50?'#b45309':'#dc2626'}}>
                        🎯 {(opp.financials?.roi || 0).toFixed(1)}% ROI
                      </span>
                    </div>

                    <div style={{marginBottom:'12px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px',padding:'6px',background:`${theme.colors.background}99`,borderRadius:'4px'}}>
                          <span style={{fontSize:'12px',fontWeight:'600',color:theme.colors.textPrimary}}>💰 Compra:</span>
                          {/* 5. CORREÇÃO: Preço Compra */}
                          <span style={{fontSize:'12px',fontWeight:'bold',color:'#22c55e'}}>{formatPrice(opp.financials?.buyPrice)}/kg</span>
                      </div>
                      
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px',padding:'6px',background:`${theme.colors.background}99`,borderRadius:'4px'}}>
                        <span style={{fontSize:'12px',fontWeight:'600',color:theme.colors.textPrimary}}>💵 Venda:</span>
                        <div style={{textAlign: 'right'}}>
                          <span style={{fontSize:'12px',fontWeight:'bold',color:theme.colors.accent}}>
                            {/* 6. CORREÇÃO: Preço Venda */}
                            {formatPrice(opp.financials?.sellPrice)}/kg
                          </span>
                          {/* Lógica do Slider mantida */}
                          {timeHorizon > 0 && (
                            <span style={{display: 'block', fontSize: '9px', color: '#00d9ff', fontStyle: 'italic', marginTop: '2px'}}>
                              🤖 Projetado (+{timeHorizon}d)
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:'8px',padding:'6px',background:`${theme.colors.background}99`,borderRadius:'4px'}}>
                          <span style={{fontSize:'12px',fontWeight:'600',color:theme.colors.textPrimary}}>🚛 Destino:</span>
                          {/* 7. CORREÇÃO: Destino */}
                          <span style={{fontSize:'12px',color:theme.colors.textMuted}}>{opp.destination?.name}</span>
                      </div>
                    </div>

                    {/* 8. CORREÇÃO: Risco */}
                    <div style={{ padding: '8px', background: (opp.details?.riskLevel || 1) === 1 ? '#22c55e20' : (opp.details?.riskLevel || 1) === 2 ? `${theme.colors.secondary}20` : '#fee2e2', borderLeft: `4px solid ${(opp.details?.riskLevel || 1) === 1 ? '#22c55e' : (opp.details?.riskLevel || 1) === 2 ? theme.colors.secondary : '#dc2626'}`, borderRadius: '4px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: theme.colors.textPrimary }}>⚠️ Risco: {opp.details?.riskLevel || 1}</span>
                    </div>

                    {/* Clima mantido (não mudou pois usa selectedOpportunity) */}
                    <div style={{ padding: '8px', background: '#eff6ff', borderRadius: '4px', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', color: '#1e40af' }}>
                        {selectedOpportunity && selectedOpportunity.id === opp.id && weatherData 
                            ? `${getWeatherDesc(weatherData.code).icon} ${weatherData.temp}°C • ${getWeatherDesc(weatherData.code).text}`
                            : `🌤️ Análise Climática` 
                        }
                      </span>
                    </div>

                    {/* 9. CORREÇÃO: Detalhes */}
                    <div style={{fontSize:'11px',color:theme.colors.textMuted,lineHeight:'1.4',marginTop:'10px',padding:'8px',background:`${theme.colors.background}99`,borderRadius:'4px'}}>
                        {opp.description || opp.product}
                    </div>
                    <div style={{marginTop:'12px',paddingTop:'10px',borderTop:`1px solid ${theme.colors.textMuted}`,display:'flex',justifyContent:'space-between',fontSize:'11px',color:theme.colors.textMuted}}>
                        <span>📂 {opp.details?.volume}</span>
                        <span>📅 {opp.details?.season}</span>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MarkerClusterGroup>
        )}

      </MapContainer>
    </div>
  );
});

export default MapView;
