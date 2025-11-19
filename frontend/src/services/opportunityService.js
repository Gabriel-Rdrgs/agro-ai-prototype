// frontend/src/services/opportunityService.js

// URL da sua API Node.js
// Se estiver rodando localmente, usa a porta 3001
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

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

export const OpportunityService = {
  // Busca todas as oportunidades do Backend
  getAll: async () => {
    try {
      const response = await fetch(`${API_URL}/opportunities`);
      if (!response.ok) throw new Error('Falha na conexão com API');
      
      const data = await response.json();

      return data.map(opp => {
        const buy = Number(opp.buyPrice);
        const sell = Number(opp.sellPrice);
        
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

  // 🚀 A FUNÇÃO QUE FALTAVA: BUSCAR CLIMA
  getWeather: async (lat, lng) => {
    try {
        const response = await fetch(`${API_URL}/weather?lat=${lat}&lng=${lng}`);
        if (!response.ok) return null;
        return await response.json();
    } catch (error) {
        console.error("Erro ao buscar clima:", error);
        return null;
    }
  },

  // Cálculo de ROI e Logística
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
      freightCost = singleTripCost * 1.1; 
      
      const trucksNeeded = Math.max(1, Math.ceil(volume / 25));
      freightCost = freightCost * trucksNeeded;
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
  }
};