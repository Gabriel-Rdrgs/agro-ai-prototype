// frontend/src/services/opportunityService.js

// URL da sua API Node.js
// Se estiver rodando localmente, usa a porta 3001
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

// Fator de sinuosidade para cálculo de distância rodoviária
const ROAD_FACTOR = 1.35;

const DESTINATIONS = {
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Mato Grosso': { lat: -15.6014, lng: -56.0979 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  'Exportação (Porto Santos)': { lat: -23.9608, lng: -46.3331 },
  'Porto de Santos': { lat: -23.9608, lng: -46.3331 },
  'Santa Catarina': { lat: -27.5954, lng: -48.5480 },
  'Indústria de Suco': { lat: -21.7946, lng: -48.1766 },
  'Nordeste': { lat: -8.0476, lng: -34.8770 },
  'Sul e Sudeste': { lat: -23.5505, lng: -46.6333 },
  'Paraná': { lat: -25.4284, lng: -49.2733 }
};

// Helper para pegar o token de autenticação do localStorage
const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

// Função auxiliar para cálculo de distância linear (Haversine)
const calculateLinearDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; 
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};
// Função auxiliar para não repetir código
const handleAuthError = (response) => {
  if (response.status === 401 || response.status === 403) {
    alert("Sessão expirada. Faça login novamente.");
    localStorage.removeItem('token');
    window.location.href = '/login';
    return true; // Indica que houve erro
  }
  return false;
};

export const OpportunityService = {
  // 1. GET ALL (O que estava falhando no log)
  getAll: async () => {
    try {
      const response = await fetch(`${API_URL}/api/opportunities`, {
        headers: getAuthHeaders()
      });

      if (handleAuthError(response)) return []; // 🛡️ Bloqueio

      if (!response.ok) throw new Error('Falha na conexão com API');
      
      const data = await response.json();

      // ADAPTER: Transforma os dados do Banco para o formato do Frontend
      return data.map(opp => {
        const buy = Number(opp.buyPrice);
        const sell = Number(opp.sellPrice);
        
        // Calcula o ROI dinamicamente
        let calculatedRoi = 0;
        if (buy > 0) {
            calculatedRoi = ((sell - buy) / buy) * 100;
        }

        return {
          ...opp,
          position: [opp.lat, opp.lng],
          sellPosition: (opp.destLat && opp.destLng) ? [opp.destLat, opp.destLng] : null,
          buyPrice: buy,
          sellPrice: sell,
          roi: Math.round(calculatedRoi),
          priceUsd: opp.priceUsd, 
          currentDollar: opp.dollarRate 
        };
      });
    } catch (error) {
      console.error("Erro ao buscar oportunidades:", error);
      return [];
    }
  },
  

  getById: async (id) => {
    const all = await OpportunityService.getAll();
    return all.find(op => op.id === id);
  },

  // --- 2. INTEGRAÇÃO CLIMÁTICA (OpenMeteo) ---
  getWeather: async (lat, lng) => {
    try {
        const response = await fetch(`${API_URL}/api/weather?lat=${lat}&lng=${lng}`, {
            headers: getAuthHeaders()
        });
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar clima:", error);
        return null;
    }
  },

  getForecast: async (lat, lng) => {
    try {
      // Pega dados detalhados para os próximos 16 dias
      const params = [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_sum',
        'windspeed_10m_max',
        'shortwave_radiation_sum'
      ].join(',');

      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=${params}&timezone=America%2FSao_Paulo&forecast_days=16`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
          console.error("Erro API OpenMeteo:", response.status, await response.text());
          return null;
      }
      
      const data = await response.json();
      
      return data.daily.time.map((date, index) => ({
        date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        fullDate: date,
        tempMax: data.daily.temperature_2m_max[index],
        tempMin: data.daily.temperature_2m_min[index],
        rain: data.daily.precipitation_sum[index],
        wind: data.daily.windspeed_10m_max[index],
        soil: 0, 
        sun: data.daily.shortwave_radiation_sum[index]
      }));
    } catch (error) {
      console.error("Erro ao buscar previsão:", error);
      return null;
    }
  },

  // --- 3. SIMULADOR (LÓGICA LOCAL) ---
  calculateROI: async ({ 
    buyPrice, sellPrice, volume, originCoords, destinationName, 
    dieselPrice = 6.50, truckConsumption = 3.5, spoilageRate = 0, 
    storageDays = 0, storageCostPerDay = 15 
  }) => {
    await new Promise(resolve => setTimeout(resolve, 400)); 

    const volumeKg = volume * 1000;
    const grossRevenue = sellPrice * volumeKg;
    const grossCost = buyPrice * volumeKg;

    let freightCost = 0;
    let roadDistanceKm = 0;

    const destCoords = DESTINATIONS[destinationName] || { lat: -23.55, lng: -46.63 };
    
    if (originCoords && originCoords.length === 2) {
      const linearDist = calculateLinearDistance(originCoords[0], originCoords[1], destCoords.lat, destCoords.lng);
      roadDistanceKm = linearDist * ROAD_FACTOR;

      const litersNeeded = roadDistanceKm / truckConsumption;
      const singleTripCost = litersNeeded * dieselPrice;
      let tripCost = singleTripCost * 1.1; 
      
      const trucksNeeded = Math.max(1, Math.ceil(volume / 25));
      freightCost = tripCost * trucksNeeded;
    } else {
      freightCost = 2000 * (volume / 10); 
      roadDistanceKm = 1500;
    }

    const lostRevenue = grossRevenue * (spoilageRate / 100);
    const netRevenue = grossRevenue - lostRevenue;
    const totalStorageCost = storageDays * storageCostPerDay * volume;
    const totalOperationalCost = grossCost + freightCost + totalStorageCost;
    const profit = netRevenue - totalOperationalCost;
    const roi = (profit / totalOperationalCost) * 100;

    return {
      roi: parseFloat(roi.toFixed(1)),
      profit: parseFloat(profit.toFixed(2)),
      totalCost: parseFloat(totalOperationalCost.toFixed(2)),
      details: {
        freightCost: parseFloat(freightCost.toFixed(2)),
        distanceKm: Math.round(roadDistanceKm),
        spoilageLoss: parseFloat(lostRevenue.toFixed(2)),
        storageCost: parseFloat(totalStorageCost.toFixed(2))
      },
      isHighRisk: roi < 10 || spoilageRate > 15
    };
  },

 // --- 4. IA MULTIVARIÁVEL (ARMAZENAMENTO) ---
 // --- 4. IA MULTIVARIÁVEL (AGORA COM GPS REAL) ---
  getStorageAnalysis: async (product, state, currentPrice, buyPrice, riskLevel = 1, dailyRain = [], dailyTempMax = [], dailySun = [], dailyTempMin = [], lat = null, lng = null, accumulatedRain = 500) => {
    try {
        const riskMap = { 1: 0.1, 2: 0.5, 3: 0.9 };
        const riskFactor = riskMap[riskLevel] || 0.1;

        const payload = {
            product: product,
            state: state || 'SP',
            lat: lat,
            lng: lng,
            current_price: Number(currentPrice),
            buy_price: Number(buyPrice),
            accumulated_rainfall: Number(accumulatedRain), // 👈 Enviando para o Backend
            storage_cost_per_day: 0.05,
            risk_factor: riskFactor,
            daily_rain: dailyRain,
            daily_temp_max: dailyTempMax,
            daily_temp_min: dailyTempMin,
            daily_sun: dailySun
        };

        const response = await fetch(`${API_URL}/api/ai/storage`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`Erro IA: ${response.status}`);
        
        return await response.json();

    } catch (error) {
        console.error("❌ Falha na IA:", error);
        return null; 
    }
  },  
// --- 5. SIMULADOR DE ARBITRAGEM (IA COMPLETA) ---
  calculateArbitrage: async (payload) => {
    try {
      // O SEGREDO ESTÁ AQUI: method: 'POST'
      const response = await fetch(`${API_URL}/calc/arbitrage`, {
        method: 'POST', // <--- Se faltar isto, ele vira GET e dá 404
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // 🛡️ BLOCO DE SEGURANÇA (Logout se token expirou)
      if (response.status === 403 || response.status === 401) {
        alert("Sua sessão expirou. Por favor, faça login novamente.");
        localStorage.removeItem('token');
        window.location.href = '/login';
        return null;
      }

      if (!response.ok) throw new Error('Erro ao calcular Arbitragem');
      
      return await response.json();
    } catch (error) {
      console.error("Erro calc arbitragem:", error);
      return null;
    }
  },
  // --- 6. RADAR DE OPORTUNIDADES (NOVO) ---
  scanMarket: async (product, originState, volume = 1000, month = null) => {
    try {
      // Envia o mês no payload
      const payload = { product, origin_state: originState, volume, month };
      
      const response = await fetch(`${API_URL}/market/scan`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error('Erro ao escanear mercado');
      
      return await response.json();
    } catch (error) {
      console.error("Erro no Radar de Mercado:", error);
      return null;
    }
  },
  // --- 6. PREVISÃO EM LOTE (MAPA) ---
  getBatchPredictions: async (opportunities) => {
    try {
        // Prepara o payload leve
        const items = opportunities.map(op => ({
            id: op.id,
            product: op.product,
            state: op.state,
            current_price: op.sellPrice, // Preço de venda atual no mercado
            buy_price: op.buyPrice
        }));

        const response = await fetch(`${API_URL}/api/ai/batch`, { // Vamos criar a ponte no server.js
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ items })
        });

        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Erro Batch AI:", error);
        return null;
    }
  },
  // --- 7. DADOS DE DASHBOARD ---
  getFuelPrices: async () => {
    try {
      const response = await fetch(`${API_URL}/api/fuel/current-prices`, { 
        headers: getAuthHeaders() 
      });
      
      if (handleAuthError(response)) return null; // 🛡️ Bloqueio
      
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Erro Fuel:", error);
      return null;
    }
  },
  // --- 8. HISTÓRICO DE TENDÊNCIA (GRÁFICO DE LINHA) ---
  getPriceTrend: async (product, city) => {
    try {
      // Constrói a URL com filtros opcionais
      let url = `${API_URL}/api/analytics/trend`;
      const params = new URLSearchParams();
      if (product) params.append('product', product);
      if (city) params.append('city', city);
      
      if (product || city) url += `?${params.toString()}`;

      const response = await fetch(url, { 
        headers: getAuthHeaders() 
      });
      
      if (handleAuthError(response)) return null; // 🛡️ Bloqueio
      
      if (!response.ok) return null;
      return await response.json();
    } catch (error) {
      console.error("Erro Trend:", error);
      return null;
    }
  }
};
