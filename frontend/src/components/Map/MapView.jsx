import React, { useState, useImperativeHandle, useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, GeoJSON, Polyline, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import theme from '../../styles/theme';
import { createRiskIcon } from '../../data/mapIcons';
import { OpportunityService } from '../../services/opportunityService';
import { getPlantingSeasonStatus } from '../../utils/plantingCalendar';
import OpportunityModal from './OpportunityModal';
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
  const lastCenterRef = React.useRef(null);
  const lastZoomRef = React.useRef(null);
  
  useEffect(() => {
    if (bounds) {
      map.flyToBounds(bounds, { padding: [50, 50], animate: true, duration: 1.5 });
    } else if (center) {
      // ✅ CORRIGIDO: Só atualiza se realmente mudou (evita fechar popup)
      const centerChanged = !lastCenterRef.current || 
        (Math.abs(center[0] - lastCenterRef.current[0]) > 0.01 || 
         Math.abs(center[1] - lastCenterRef.current[1]) > 0.01);
      const zoomChanged = zoom !== lastZoomRef.current;
      
      if (centerChanged || zoomChanged) {
        // ✅ CORRIGIDO: Usa panTo sempre que possível (não fecha popup)
        // Só usa setView se for a primeira vez ou mudança muito grande
        if (lastCenterRef.current) {
          // Já tem um centro anterior, usa panTo (mais suave, não fecha popup)
          // Mas só se a mudança for significativa (evita micro-movimentos)
          if (centerChanged) {
            const distance = map.distance(
              lastCenterRef.current,
              center
            );
            // Só move se a distância for > 5km (evita micro-ajustes)
            if (distance > 5000) {
              map.panTo(center, { animate: true, duration: 0.5 });
            }
          }
          if (zoomChanged && Math.abs(zoom - (lastZoomRef.current || 4)) > 1) {
            // Só muda zoom se a diferença for > 1 nível
            map.setZoom(zoom || 8, { animate: true });
          }
        } else {
          // Primeira vez, pode usar setView
          map.setView(center, zoom || 8, { animate: true, duration: 0.5 });
        }
        
        lastCenterRef.current = center;
        lastZoomRef.current = zoom;
      }
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
  
  // eslint-disable-next-line no-unused-vars
  const [activeMarkerId, setActiveMarkerId] = useState(null); // Mantido para uso futuro
  
  const [selectedOpportunity, setSelectedOpportunity] = useState(null);
  const [selectedState, setSelectedState] = useState(null);
  const [legendVisible, setLegendVisible] = useState(false); 
  
  const [weatherData, setWeatherData] = useState(null);
  
  // Modal state
  const [modalOpportunity, setModalOpportunity] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // 1. Estado para saber se o mouse está em cima da linha
  const [hoveredFlowId, setHoveredFlowId] = useState(null);
  const [timeHorizon, setTimeHorizon] = useState(0); // 0 = Hoje (preço atual) / 7 e 30 dias = previsão Prophet
  const [isBatchLoading, setIsBatchLoading] = useState(false); // ✅ Loading das projeções de 7d/30d
  
// --- LÓGICA DO SLIDER TEMPORAL (CORRIGIDA) ---

  // Estado para eventos extremos por oportunidade
  const [extremeEventsMap, setExtremeEventsMap] = useState({});
  
  // ✅ NOVO: Estado para regiões comprometidas (heatmap)
  const [showSupplyRisk, setShowSupplyRisk] = useState(false);
  
  // ✅ NOVO: Recebe filtros via props (compartilhados com Sidebar)
  const filters = props.filters || {
    roiMin: 0, // ✅ CORRIGIDO: Padrão de 0% (mas permite negativos)
    roiMax: 1000,
    rainMin: 0,
    rainMax: 500,
    selectedStates: [],
    riskLevels: [],
    products: [],
    plantingSeasons: [] // ✅ NOVO: Filtro de safra/época de plantio
  };
  
  // ✅ NOVO: Callback para atualizar filtros (compartilhado com Sidebar)
  // eslint-disable-next-line no-unused-vars
  const onFiltersChange = props.onFiltersChange || (() => {});
  
  // ✅ NOVO: Recebe dados de IA e risco via props (compartilhados)
  const aiPredictions = props.aiPredictions || {};
  // Memoiza supplyRiskData para evitar mudanças desnecessárias nas dependências do useEffect
  const supplyRiskData = useMemo(() => props.supplyRiskData || {}, [props.supplyRiskData]);
  
  // ✅ NOVO: Callbacks para atualizar dados de IA e risco
  // Usa useRef para manter referência estável e evitar re-renders
  const setAiPredictionsRef = useRef(props.setAiPredictions || (() => {}));
  const setSupplyRiskDataRef = useRef(props.setSupplyRiskData || (() => {}));
  
  // Atualiza refs quando props mudam (sem dependências para evitar re-renders)
  // Refs são atualizadas diretamente, não precisam estar nas dependências
  if (props.setAiPredictions) setAiPredictionsRef.current = props.setAiPredictions;
  if (props.setSupplyRiskData) setSupplyRiskDataRef.current = props.setSupplyRiskData;

  // ✅ OTIMIZADO: Debounce para evitar múltiplas requisições simultâneas
  const fetchTimeoutRef = useRef(null);
  const lastOpportunitiesRef = useRef(null);
  
  // Carrega previsões com debounce
  useEffect(() => {
    // Limpa timeout anterior se houver
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    
    // Verifica se as oportunidades realmente mudaram
    const opportunitiesKey = JSON.stringify(opportunities.map(opp => ({
      id: opp.id,
      product: opp.product,
      state: opp.state
    })));
    
    if (opportunitiesKey === lastOpportunitiesRef.current) {
      return; // Não mudou, não precisa buscar novamente
    }
    
    if (opportunities.length > 0) {
      // Debounce de 500ms (aguarda usuário parar de interagir)
      fetchTimeoutRef.current = setTimeout(async () => {
        try {
          setIsBatchLoading(true); // ⏳ Inicia loading das projeções
          // Chama o serviço atualizado
          const preds = await OpportunityService.calculateBatchAI(opportunities);
          if (preds) {
            setAiPredictionsRef.current(preds);
            lastOpportunitiesRef.current = opportunitiesKey; // Marca como processado
          }
        } catch (err) {
          console.error("Erro buscando previsões:", err);
        } finally {
          setIsBatchLoading(false); // ✅ Finaliza loading (sucesso ou erro)
        }
      }, 500); // 500ms de debounce
    }
    
    // Cleanup: limpa timeout se componente desmontar ou opportunities mudar
    return () => {
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [opportunities]);
  
  // ✅ NOVO: Carrega risco de abastecimento para todas as oportunidades (para heatmap)
  // ✅ OTIMIZADO: Cache e processamento mais eficiente
  const supplyRiskLoadingRef = useRef(false);
  const [supplyRiskLoading, setSupplyRiskLoading] = useState(false);
  const [supplyRiskProgress, setSupplyRiskProgress] = useState({ loaded: 0, total: 0 });
  
  // ✅ NOVO: Ref para rastrear oportunidades já processadas para supply risk
  const processedSupplyRiskRef = useRef(new Set());
  
  useEffect(() => {
    if (showSupplyRisk && opportunities.length > 0 && !supplyRiskLoadingRef.current) {
      supplyRiskLoadingRef.current = true;
      setSupplyRiskLoading(true);
      
      const fetchSupplyRisks = async () => {
        // ✅ OTIMIZADO: Cache local no frontend para evitar requisições duplicadas
        const localCacheKey = `supply_risk_${opportunities.map(o => o.id).sort().join('_')}`;
        const cached = sessionStorage.getItem(localCacheKey);
        if (cached) {
          try {
            const cachedData = JSON.parse(cached);
            const cacheTime = cachedData.timestamp;
            const now = Date.now();
            // Cache válido por 30 minutos no frontend
            if (now - cacheTime < 30 * 60 * 1000) {
              console.debug(`✅ Cache HIT no frontend para supply risk`);
              setSupplyRiskDataRef.current(cachedData.data);
              setSupplyRiskLoading(false);
              supplyRiskLoadingRef.current = false;
              return;
            }
          } catch (e) {
            // Cache inválido, continua normalmente
          }
        }
        
        // ✅ NOVO: Verifica se já temos dados para todas as oportunidades (evita requisições desnecessárias)
        const oppsWithCoords = opportunities.filter(opp => opp.coords?.lat && opp.coords?.lng);
        const oppsNeedingData = oppsWithCoords.filter(opp => {
          const hasData = supplyRiskData[opp.id] && supplyRiskData[opp.id].risk_level;
          const wasProcessed = processedSupplyRiskRef.current.has(opp.id);
          return !hasData && !wasProcessed;
        });
        
        if (oppsNeedingData.length === 0) {
          // Já temos todos os dados necessários
          setSupplyRiskLoading(false);
          supplyRiskLoadingRef.current = false;
          return;
        }
        
        const riskData = { ...supplyRiskData }; // ✅ NOVO: Preserva dados existentes
        
        // ✅ OTIMIZADO: Processa apenas oportunidades que precisam de dados
        const total = oppsNeedingData.length;
        setSupplyRiskProgress({ loaded: 0, total });
        
        console.debug(`📊 Iniciando carregamento de risco para ${total} oportunidades (cache agressivo ativo)`);
        
        // ✅ OTIMIZADO: Processa em batches para evitar sobrecarga (mesmo com cache)
        // Cache ajuda, mas muitas requisições simultâneas ainda podem sobrecarregar
        const batchSize = 8; // ✅ Balanceado: 8 por vez para velocidade sem sobrecarga
        const loadedCountRef = { current: Object.keys(riskData).length }; // ✅ NOVO: Começa com dados existentes
        const initialTotal = Object.keys(riskData).length;
        
        for (let i = 0; i < oppsNeedingData.length; i += batchSize) {
          const batch = oppsNeedingData.slice(i, i + batchSize);
          
          const batchResults = await Promise.allSettled(
            batch.map(async (opp) => {
              try {
                // ✅ NOVO: Marca como processado antes de fazer a requisição (evita duplicatas)
                processedSupplyRiskRef.current.add(opp.id);
                
                const risk = await OpportunityService.getSupplyRisk(
                  opp.coords.lat,
                  opp.coords.lng,
                  opp.product || 'Tomate',
                  16
                );
                loadedCountRef.current++;
                setSupplyRiskProgress({ loaded: loadedCountRef.current, total: initialTotal + total });
                return { oppId: opp.id, risk };
              } catch (err) {
                console.debug(`Erro ao buscar risco para ${opp.id}:`, err.message);
                processedSupplyRiskRef.current.delete(opp.id); // ✅ NOVO: Remove se falhar para permitir retry
                loadedCountRef.current++;
                setSupplyRiskProgress({ loaded: loadedCountRef.current, total: initialTotal + total });
                return { oppId: opp.id, risk: null };
              }
            })
          );
          
          // ✅ CORRIGIDO: Coleta resultados do batch
          batchResults.forEach(result => {
            if (result.status === 'fulfilled' && result.value?.risk && result.value.risk.risk_level) {
              riskData[result.value.oppId] = result.value.risk;
            }
          });
          
          // ✅ Pequeno delay entre batches para não sobrecarregar (mesmo com cache)
          if (i + batchSize < oppsNeedingData.length) {
            await new Promise(resolve => setTimeout(resolve, 50)); // Delay mínimo
          }
        }
        
        // ✅ Salva no cache local do frontend
        sessionStorage.setItem(localCacheKey, JSON.stringify({
          data: riskData,
          timestamp: Date.now()
        }));
        
        console.debug(`📊 Total de riscos carregados: ${Object.keys(riskData).length}`);
        setSupplyRiskDataRef.current(riskData);
        setSupplyRiskLoading(false);
        supplyRiskLoadingRef.current = false;
      };
      
      // ✅ REDUZIDO: Debounce mínimo (100ms apenas para evitar múltiplas chamadas simultâneas)
      const timeout = setTimeout(() => {
        fetchSupplyRisks();
      }, 100);
      
      return () => {
        clearTimeout(timeout);
        supplyRiskLoadingRef.current = false;
        setSupplyRiskLoading(false);
      };
    } else if (!showSupplyRisk) {
      // Limpa os dados quando o toggle é desativado
      setSupplyRiskDataRef.current({});
      setSupplyRiskLoading(false);
      setSupplyRiskProgress({ loaded: 0, total: 0 });
      supplyRiskLoadingRef.current = false;
    }
  }, [showSupplyRisk, opportunities, supplyRiskData]);
  
  // ✅ NOVO: Limpa cache do frontend quando toggle é desativado
  useEffect(() => {
    if (!showSupplyRisk) {
      // Limpa cache do sessionStorage quando desativa
      Object.keys(sessionStorage).forEach(key => {
        if (key.startsWith('supply_risk_')) {
          sessionStorage.removeItem(key);
        }
      });
    }
  }, [showSupplyRisk]);
  
  // ✅ MELHORADO: Carrega eventos extremos para oportunidades visíveis (com cache e debounce)
  // Busca sob demanda quando popup abre, mas também pré-carrega para oportunidades visíveis
  const fetchingEventsRef = useRef(new Set()); // ✅ NOVO: Rastreia requisições em andamento
  
  const fetchExtremeEventsForOpportunity = async (oppId, lat, lng) => {
    // Se já temos os dados, não busca novamente
    if (extremeEventsMap[oppId]) {
      return extremeEventsMap[oppId];
    }
    
    // ✅ NOVO: Evita requisições duplicadas simultâneas
    const requestKey = `${oppId}-${lat}-${lng}`;
    if (fetchingEventsRef.current.has(requestKey)) {
      return null; // Já está buscando, não faz outra requisição
    }
    
    fetchingEventsRef.current.add(requestKey);
    
    try {
      const eventsData = await OpportunityService.getExtremeEvents(lat, lng, 16);
      if (eventsData) {
        setExtremeEventsMap(prev => ({
          ...prev,
          [oppId]: eventsData
        }));
        return eventsData;
      }
    } catch (err) {
      console.debug(`Erro ao buscar eventos para ${oppId}:`, err.message);
    } finally {
      fetchingEventsRef.current.delete(requestKey);
    }
    return null;
  };


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
                    // DEBUG: Loga no console para inspecionar comportamento do slider
                    if (opp.id === (selectedOpportunity?.id || opp.id)) {
                      console.debug(
                        `[SLIDER][${timeHorizon}d] Oportunidade ${opp.id} (${opp.product}/${opp.origin?.state || opp.state})`,
                        {
                          currentRoi: opp.financials?.roi,
                          predictedRoi,
                          predictedSellPrice: typeof predData === 'object' ? predData.sellPrice : undefined
                        }
                      );
                    }

                    // 1. Atualiza o ROI na simulação (vem do Python)
                    newFinancials.roi = parseFloat(predictedRoi);

                    // 2. ✅ SellPrice também vem do Python (não recalcula no frontend)
                    // Se o Python retornou sellPrice, usa ele. Caso contrário, mantém o original
                    if (typeof predData === 'object' && predData.sellPrice) {
                        newFinancials.sellPrice = parseFloat(predData.sellPrice);
                    }
                    // Se não tiver sellPrice do Python, mantém o que já existe (vem do banco)

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

  // Aplica simulação temporal
  const simulatedOpportunities = getSimulatedOpportunities();
  
  // ✅ NOVO: Aplica filtros nas oportunidades
  const applyFilters = (opps) => {
    return opps.filter(opp => {
      // ✅ IMPORTANTE: Nunca esconda a oportunidade atualmente selecionada
      // Isso evita que o popup feche sozinho quando o slider muda ROI / filtros.
      if (selectedOpportunity && opp.id === selectedOpportunity.id) {
        return true;
      }

      // 1. Filtro de ROI
      const pred = Array.isArray(aiPredictions) 
        ? aiPredictions.find(p => p.id === opp.id)
        : aiPredictions?.[opp.id];
      const roi = pred?.roi || opp.financials?.roi || 0;
      
      if (roi < filters.roiMin || roi > filters.roiMax) {
        return false;
      }
      
      // 2. Filtro de Estado
      const state = opp.origin?.state || opp.state;
      if (filters.selectedStates?.length > 0 && !filters.selectedStates.includes(state)) {
        return false;
      }
      
      // 3. Filtro de Nível de Risco (baseado em supplyRiskData)
      if (filters.riskLevels?.length > 0) {
        const riskData = supplyRiskData[opp.id];
        const riskLevel = riskData?.risk_level || 'low';
        if (!filters.riskLevels.includes(riskLevel)) {
          return false;
        }
      }
      
      // 4. Filtro de Produto (para futuro)
      if (filters.products?.length > 0 && !filters.products.includes(opp.product)) {
        return false;
      }
      
      // ✅ NOVO: 5. Filtro de Safra/Época de Plantio
      if (filters.plantingSeasons && filters.plantingSeasons.length > 0) {
        const product = opp.product || '';
        const state = opp.origin?.state || opp.state || '';
        const seasonStatus = getPlantingSeasonStatus(product, state);
        
        // Se dados não disponíveis, inclui apenas se "unknown" estiver selecionado
        if (seasonStatus === null) {
          if (!filters.plantingSeasons.includes('unknown')) {
            return false;
          }
        } else {
          // Se dados disponíveis, verifica se o status está nos filtros selecionados
          if (!filters.plantingSeasons.includes(seasonStatus)) {
            return false;
          }
        }
      }
      
      // 6. Filtro de Chuva (TODO: implementar quando dados de chuva estiverem disponíveis)
      // Por enquanto, sempre passa
      
      return true;
    });
  };
  
  const currentOpportunities = applyFilters(simulatedOpportunities);

  // ✅ MELHORADO: Pré-carrega eventos extremos para oportunidades visíveis (com debounce e cache)
  const processedOpportunitiesRef = useRef(new Set()); // ✅ NOVO: Rastreia oportunidades já processadas
  
  useEffect(() => {
    if (currentOpportunities.length === 0) return;
    
    // Debounce: aguarda 1.5 segundos após mudanças nas oportunidades
    const timeoutId = setTimeout(async () => {
      // Busca eventos para as primeiras 10 oportunidades visíveis (evita sobrecarga)
      const opportunitiesToCheck = currentOpportunities.slice(0, 10);
      const promises = [];
      
      for (const opp of opportunitiesToCheck) {
        if (opp.coords?.lat && opp.coords?.lng) {
          // ✅ NOVO: Verifica cache e se já foi processado
          if (!extremeEventsMap[opp.id] && !processedOpportunitiesRef.current.has(opp.id)) {
            processedOpportunitiesRef.current.add(opp.id);
            promises.push(
              fetchExtremeEventsForOpportunity(opp.id, opp.coords.lat, opp.coords.lng).catch(() => {
                // Ignora erros silenciosamente (já logado no fetchExtremeEventsForOpportunity)
                processedOpportunitiesRef.current.delete(opp.id); // Remove se falhar para permitir retry
              })
            );
          }
        }
      }
      
      // Executa todas as buscas em paralelo (mas limitado pelo fetchingEventsRef)
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }
    }, 1500); // 1.5 segundos de debounce (aumentado para evitar requisições excessivas)
    
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentOpportunities.length]); // ✅ MELHORADO: Só re-executa quando o número de oportunidades muda

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
  const handleSelection = (opp, skipZoom = false) => {
      setWeatherData(null); // Reseta clima anterior
      
      // ✅ CORRIGIDO: Usa coords se disponível, senão position
      const coords = opp.coords || (opp.position ? { lat: opp.position[0], lng: opp.position[1] } : null);
      
      // ✅ CORRIGIDO: Só faz zoom/pan se não for skipZoom (evita fechar popup)
      if (!skipZoom) {
        if (coords) {
          setMapCenter([coords.lat || coords[0], coords.lng || coords[1]]);
        } else if (opp.position && opp.position.length === 2) {
          setMapCenter(opp.position);
        }
        setMapZoom(6);
        setMapBounds(null);
      }
      
      setActiveMarkerId(opp.id);
      setSelectedOpportunity(opp);
      
      // ✅ CORRIGIDO: Restaura destaque de estado
      const state = opp.origin?.state || opp.state;
      if (state) {
        setSelectedState(state);
      }

      // Busca dados climáticos
      if (coords) {
        OpportunityService.getCurrentWeather(coords.lat || coords[0], coords.lng || coords[1])
          .then(data => setWeatherData(data));
      } else if (opp.position && opp.position.length === 2) {
        OpportunityService.getCurrentWeather(opp.position[0], opp.position[1])
          .then(data => setWeatherData(data));
      }
  };
  
  // ✅ NOVO: Função para limpar seleção quando popup fecha
  const handleDeselection = () => {
    setSelectedOpportunity(null);
    setSelectedState(null);
    setActiveMarkerId(null);
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
            {isBatchLoading && (
              <div style={{ 
                marginTop: '6px', 
                fontSize: '10px', 
                color: '#94a3b8',
                textAlign: 'center'
              }}>
                ⏳ Calculando projeções com IA...
              </div>
            )}
        </div>
      )}
      
      {/* ✅ NOVO: Toggle para mostrar/ocultar heatmap de regiões comprometidas */}
      <div style={{
        position: 'absolute',
        top: legendVisible ? '350px' : '210px', // ✅ CORRIGIDO: Mais abaixo para não sobrepor a legenda (legenda expandida tem ~270px de altura)
        right: '20px', // ✅ CORRIGIDO: Alinhado com a legenda (mesmo right)
        zIndex: 1000,
        background: `${theme.colors.background}F2`,
        padding: '10px',
        borderRadius: '8px',
        boxShadow: theme.colors.cardGlow,
        border: `1px solid ${theme.colors.accent}40`,
        transition: 'top 0.3s ease', // Animação suave quando a legenda expande/contrai
        minWidth: '200px' // ✅ CORRIGIDO: Mesma largura mínima da legenda para alinhamento
      }}>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          cursor: 'pointer',
          fontSize: '12px',
          color: theme.colors.textPrimary,
          fontFamily: theme.font
        }}>
          <input
            type="checkbox"
            checked={showSupplyRisk}
            onChange={(e) => setShowSupplyRisk(e.target.checked)}
            style={{ cursor: 'pointer', accentColor: theme.colors.accent }}
          />
          <span>🔥 Regiões Comprometidas</span>
        </label>
        {showSupplyRisk && (
          <div style={{ marginTop: '8px', fontSize: '10px', color: theme.colors.textMuted }}>
            <div>🔴 Extremo | 🟠 Alto | 🟡 Moderado | 🟢 Baixo</div>
          </div>
        )}
      </div>
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
                // ✅ CORRIGIDO: Tenta origin.city primeiro, depois city
                const cityNome = (selectedOpportunity.origin?.city || selectedOpportunity.city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
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
        
        {/* ✅ NOVO: Destaque de Municípios Comprometidos (em vez de círculos) */}
        {showSupplyRisk && !customRoute && geojsonMunicipios && (
          <>
            {/* ✅ MELHORADO: Indicador de progresso com feedback visual */}
            {supplyRiskLoading && (
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                background: 'linear-gradient(135deg, rgba(0, 217, 255, 0.15) 0%, rgba(0, 217, 255, 0.05) 100%)',
                backdropFilter: 'blur(10px)',
                color: '#00d9ff',
                padding: '24px 32px',
                borderRadius: '12px',
                border: '1px solid rgba(0, 217, 255, 0.3)',
                zIndex: 2000,
                fontSize: '14px',
                textAlign: 'center',
                boxShadow: '0 8px 32px rgba(0, 217, 255, 0.2)',
                minWidth: '280px'
              }}>
                <div style={{ marginBottom: '12px', fontSize: '24px' }}>⏳</div>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                  Carregando Regiões Comprometidas...
                </div>
                {supplyRiskProgress.total > 0 && (
                  <div style={{ 
                    marginTop: '12px',
                    fontSize: '12px',
                    color: '#94a3b8'
                  }}>
                    {supplyRiskProgress.loaded} / {supplyRiskProgress.total} regiões
                    <div style={{
                      marginTop: '8px',
                      width: '100%',
                      height: '4px',
                      background: 'rgba(0, 217, 255, 0.2)',
                      borderRadius: '2px',
                      overflow: 'hidden'
                    }}>
                      <div style={{
                        width: `${(supplyRiskProgress.loaded / supplyRiskProgress.total) * 100}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #00d9ff 0%, #00a8cc 100%)',
                        transition: 'width 0.3s ease',
                        boxShadow: '0 0 8px rgba(0, 217, 255, 0.5)'
                      }} />
                    </div>
                  </div>
                )}
              </div>
            )}
            {Object.entries(supplyRiskData).map(([oppId, riskData]) => {
              // ✅ CORRIGIDO: Busca a oportunidade original pelo ID (não usa currentOpportunities que pode ter IDs diferentes)
              const opp = opportunities.find(o => o.id === parseInt(oppId));
              if (!opp || !opp.origin?.city) {
                console.debug(`⚠️ Oportunidade não encontrada para ID ${oppId} ou sem cidade`);
                return null;
              }
              
              // ✅ CORRIGIDO: Extrai risk_level corretamente (pode estar em riskData diretamente ou dentro de um objeto)
              const riskLevel = riskData?.risk_level || 'low';
              const riskScore = riskData?.risk_score || 0;
              
              // ✅ DEBUG: Log para verificar os dados recebidos
              console.debug(`🎨 Renderizando risco para ${opp.origin?.city}: level=${riskLevel}, score=${riskScore}, data=`, riskData);
              
              // Cores baseadas no nível de risco
              const getRiskColor = (level) => {
                switch (level) {
                  case 'extreme': return '#dc2626'; // Vermelho
                  case 'high': return '#f59e0b'; // Laranja
                  case 'moderate': return '#eab308'; // Amarelo
                  default: return '#22c55e'; // Verde
                }
              };
              
              // Filtra o município específico
              const cityGeoJSON = {
                ...geojsonMunicipios,
                features: geojsonMunicipios.features.filter(f => {
                  const geoNome = (f.properties.name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                  const cityNome = (opp.origin?.city || '').normalize('NFD').replace(/[\u0300-\u036f]/g, "").toLowerCase();
                  return geoNome === cityNome;
                })
              };
              
              if (cityGeoJSON.features.length === 0) {
                console.debug(`⚠️ Município não encontrado no GeoJSON: ${opp.origin?.city}`);
                return null;
              }
              
              return (
                <GeoJSON
                  key={`risk-municipio-${oppId}`}
                  data={cityGeoJSON}
                  style={() => ({
                    fillColor: getRiskColor(riskLevel),
                    color: getRiskColor(riskLevel),
                    weight: 3,
                    fillOpacity: 0.4,
                    opacity: 0.8,
                    filter: `drop-shadow(0 0 8px ${getRiskColor(riskLevel)})`
                  })}
                >
                  <Tooltip>
                    <div style={{ textAlign: 'center', padding: '4px' }}>
                      <strong>{opp.product} - {opp.origin?.city}</strong><br/>
                      <span style={{ color: getRiskColor(riskLevel), fontWeight: 'bold' }}>
                        Risco: {riskLevel.toUpperCase()} ({riskScore.toFixed(1)}%)
                      </span>
                    </div>
                  </Tooltip>
                </GeoJSON>
              );
            })}
            {Object.keys(supplyRiskData).length > 0 && (
              <div style={{
                position: 'absolute',
                bottom: '20px',
                right: '20px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                zIndex: 1000
              }}>
                ✅ {Object.keys(supplyRiskData).length} região(ões) analisada(s)
              </div>
            )}
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
           {currentOpportunities.map((opp) => {
              // Verifica se há eventos extremos para esta oportunidade
              const extremeEvents = extremeEventsMap[opp.id];
              const hasExtremeEvents = extremeEvents?.events && extremeEvents.events.length > 0;
              const extremeSeverity = hasExtremeEvents 
                ? extremeEvents.events.some(e => e.severity === 'extreme') ? 'extreme'
                  : extremeEvents.events.some(e => e.severity === 'high') ? 'high'
                  : 'moderate'
                : null;
              
              return (
              <Marker
                key={opp.id}
                // 1. CORREÇÃO: Coordenadas em 'coords'
                position={[opp.coords?.lat || 0, opp.coords?.lng || 0]}
                
                // 2. CORREÇÃO: Risco e ROI nos novos endereços + eventos extremos
                icon={createRiskIcon(
                  opp.financials?.roi || 0, 
                  opp.details?.riskLevel || 1,
                  hasExtremeEvents,
                  extremeSeverity
                )}
                
                eventHandlers={{
                  // ✅ REMOVIDO: click handler - deixa o Leaflet gerenciar o popup naturalmente
                  popupopen: () => {
                    // ✅ CORRIGIDO: Atualiza seleção quando popup abre (sem zoom)
                    handleSelection(opp, true);
                    
                    // Busca eventos extremos quando o popup é aberto (sob demanda)
                    if (opp.coords?.lat && opp.coords?.lng && !extremeEventsMap[opp.id]) {
                      fetchExtremeEventsForOpportunity(opp.id, opp.coords.lat, opp.coords.lng);
                    }
                  },
                  popupclose: () => {
                    // ✅ NOVO: Limpa destaque quando popup fecha
                    handleDeselection();
                  }
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
                    {(() => {
                      const roiValue = opp.financials?.roi;
                      const roi = (roiValue !== null && roiValue !== undefined && !isNaN(roiValue) && typeof roiValue === 'number') 
                        ? parseFloat(roiValue) 
                        : null;
                      const bgColor = roi !== null && !isNaN(roi) 
                        ? (roi >= 100 ? '#dcfce7' : roi >= 50 ? '#fef3c7' : '#fee2e2')
                        : '#e0e7ff';
                      const textColor = roi !== null && !isNaN(roi)
                        ? (roi >= 100 ? '#15803d' : roi >= 50 ? '#b45309' : '#dc2626')
                        : '#6366f1';
                      const roiText = roi !== null && !isNaN(roi) && typeof roi === 'number'
                        ? `${roi.toFixed(1)}% ROI`
                        : '⏳ ROI não calculado';
                      
                      return (
                        <div style={{background: bgColor, padding:'8px 12px', borderRadius:'6px', marginBottom:'12px', textAlign:'center'}}>
                          <span style={{fontSize:'20px', fontWeight:'bold', color: textColor}}>
                            🎯 {roiText}
                          </span>
                          {/* 🔄 Loading específico do ROI quando o slider está em projeção */}
                          {timeHorizon > 0 && isBatchLoading && (
                            <div style={{ 
                              marginTop: '4px', 
                              fontSize: '10px', 
                              color: '#64748b'
                            }}>
                              ⏳ Calculando projeção de ROI...
                            </div>
                          )}
                        </div>
                      );
                    })()}

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

                    {/* Botão para abrir modal com detalhes */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalOpportunity(opp);
                        setIsModalOpen(true);
                      }}
                      style={{
                        width: '100%',
                        marginTop: '12px',
                        padding: '10px',
                        background: `linear-gradient(135deg, ${theme.colors.accent} 0%, ${theme.colors.secondary} 100%)`,
                        border: 'none',
                        borderRadius: '8px',
                        color: theme.colors.background,
                        fontSize: '13px',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        transition: theme.transition,
                        fontFamily: theme.font,
                        letterSpacing: '0.5px'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 4px 12px rgba(0, 217, 255, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      📋 Ver Detalhes Completos
                    </button>
                    
                    {/* ✅ MELHORADO: Badge de Eventos Extremos no Popup - mais informativo */}
                    {hasExtremeEvents && (
                      <div style={{
                        marginTop: '10px',
                        padding: '12px',
                        background: extremeSeverity === 'extreme' 
                          ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 100%)'
                          : extremeSeverity === 'high'
                          ? 'linear-gradient(135deg, rgba(251, 146, 60, 0.25) 0%, rgba(251, 146, 60, 0.15) 100%)'
                          : 'linear-gradient(135deg, rgba(250, 204, 21, 0.25) 0%, rgba(250, 204, 21, 0.15) 100%)',
                        borderRadius: '8px',
                        border: `2px solid ${
                          extremeSeverity === 'extreme' ? '#ef4444' :
                          extremeSeverity === 'high' ? '#fb923c' :
                          '#facc15'
                        }`,
                        boxShadow: `0 0 12px ${
                          extremeSeverity === 'extreme' ? 'rgba(239, 68, 68, 0.4)' :
                          extremeSeverity === 'high' ? 'rgba(251, 146, 60, 0.4)' :
                          'rgba(250, 204, 21, 0.4)'
                        }`
                      }}>
                        <div style={{ 
                          fontSize: '12px', 
                          fontWeight: 'bold', 
                          color: theme.colors.textPrimary,
                          marginBottom: '6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}>
                          {extremeSeverity === 'extreme' ? '🚨' : extremeSeverity === 'high' ? '⚠️' : '⚡'}
                          Eventos Extremos Detectados
                        </div>
                        <div style={{ fontSize: '11px', color: theme.colors.textMuted, marginBottom: '4px' }}>
                          {extremeEvents.events.length} evento(s) nos próximos 16 dias
                        </div>
                        {/* Tipos de eventos detectados */}
                        {extremeEvents.events.length > 0 && (
                          <div style={{ 
                            fontSize: '10px', 
                            color: theme.colors.textMuted,
                            marginTop: '6px',
                            paddingTop: '6px',
                            borderTop: `1px solid ${
                              extremeSeverity === 'extreme' ? 'rgba(239, 68, 68, 0.3)' :
                              extremeSeverity === 'high' ? 'rgba(251, 146, 60, 0.3)' :
                              'rgba(250, 204, 21, 0.3)'
                            }`
                          }}>
                            {[...new Set(extremeEvents.events.map(e => {
                              if (e.type === 'heat' || e.type === 'heat_wave') return '🔥 Onda de Calor';
                              if (e.type === 'cold' || e.type === 'cold_wave') return '❄️ Onda de Frio';
                              if (e.type === 'tropical_storm') return '🌀 Tempestade Tropical';
                              if (e.type === 'hail') return '🌨️ Granizo';
                              return '🌧️ Chuva Extrema';
                            }))].join(' • ')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
            })}
          </MarkerClusterGroup>
        )}

      </MapContainer>

      {/* Modal com Abas */}
      <OpportunityModal
        opportunity={modalOpportunity}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setModalOpportunity(null);
        }}
      />
    </div>
  );
});

export default MapView;
