import { opportunities } from '../data/mockOpportunities';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// FATOR DE SINUOSIDADE (BRASIL)
// Estradas não são linhas retas. Adicionamos ~35% de margem à distância linear
// para simular curvas e trajetos rodoviários reais.
const ROAD_FACTOR = 1.35; 

// Coordenadas de fallback para destinos comuns
const DESTINATIONS = {
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Mato Grosso': { lat: -15.6014, lng: -56.0979 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  'Exportação (Porto Santos)': { lat: -23.9608, lng: -46.3331 }
};

// Função Haversine (Distância em Linha Reta)
const calculateLinearDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const OpportunityService = {
  getAll: async () => {
    await delay(300);
    return [...opportunities];
  },

  getById: async (id) => {
    await delay(200);
    return opportunities.find(op => op.id === id);
  },

  // CÁLCULO INTELIGENTE
  calculateROI: async ({ 
    buyPrice, 
    sellPrice, 
    volume, 
    productName,
    originCoords, 
    destinationName, 
    dieselPrice = 6.50, 
    truckConsumption = 3.5, 
    spoilageRate = 0, 
    storageDays = 0, 
    storageCostPerDay = 15 
  }) => {
    await delay(600); 

    // 1. Receita e Custos Básicos
    const volumeKg = volume * 1000;
    const grossRevenue = sellPrice * volumeKg;
    const grossCost = buyPrice * volumeKg;

    // 2. Cálculo de Frete com Fator Rodoviário
    let freightCost = 0;
    let roadDistanceKm = 0;

    const destCoords = DESTINATIONS[destinationName] || { lat: -23.55, lng: -46.63 };
    
    if (originCoords && originCoords.length === 2) {
      // Calcula reta e multiplica pelo fator de estrada (1.35)
      const linearDist = calculateLinearDistance(originCoords[0], originCoords[1], destCoords.lat, destCoords.lng);
      roadDistanceKm = linearDist * ROAD_FACTOR;

      // Lógica de Diesel: (Distancia / Consumo) * Preço * 1.1 (taxa de retorno vazio/pedágio simplificado)
      const litersNeeded = roadDistanceKm / truckConsumption;
      const singleTripCost = litersNeeded * dieselPrice;
      
      // Consideramos ida + 10% de amortização de retorno
      freightCost = singleTripCost * 1.1;
      
      // Ajuste por volume (Caminhão Truck ~25ton)
      // Se volume > 25, precisa de mais viagens
      const trucksNeeded = Math.max(1, Math.ceil(volume / 25));
      freightCost = freightCost * trucksNeeded;

    } else {
      // Fallback seguro
      freightCost = 2000 * (volume / 10); 
      roadDistanceKm = 1500;
    }

    // 3. Perdas e Armazenamento
    const lostRevenue = grossRevenue * (spoilageRate / 100);
    const netRevenue = grossRevenue - lostRevenue;
    const totalStorageCost = storageDays * storageCostPerDay * volume;

    // 4. Totalização
    const totalOperationalCost = grossCost + freightCost + totalStorageCost;
    const profit = netRevenue - totalOperationalCost;
    const roi = (profit / totalOperationalCost) * 100;

    return {
      roi: parseFloat(roi.toFixed(1)),
      profit: parseFloat(profit.toFixed(2)),
      totalCost: parseFloat(totalOperationalCost.toFixed(2)),
      details: {
        freightCost: parseFloat(freightCost.toFixed(2)),
        distanceKm: Math.round(roadDistanceKm), // Retorna a distância "rodoviária" simulada
        spoilageLoss: parseFloat(lostRevenue.toFixed(2)),
        storageCost: parseFloat(totalStorageCost.toFixed(2))
      },
      isHighRisk: roi < 10 || spoilageRate > 15
    };
  }
};