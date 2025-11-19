import { opportunities } from '../data/mockOpportunities';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Função auxiliar para calcular distância entre duas coordenadas (Haversine)
// Retorna distância em KM
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Raio da terra em km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Coordenadas de destinos comuns (Mockados para cálculo)
const DESTINATIONS = {
  'São Paulo': { lat: -23.5505, lng: -46.6333 },
  'Mato Grosso': { lat: -15.6014, lng: -56.0979 },
  'Rio de Janeiro': { lat: -22.9068, lng: -43.1729 },
  'Exportação (Porto Santos)': { lat: -23.9608, lng: -46.3331 }
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

  // AGORA A CALCULADORA É INTELIGENTE 🧠
  calculateROI: async ({ 
    buyPrice, 
    sellPrice, 
    volume, // toneladas
    productName,
    originCoords, // [lat, lng] do produto selecionado
    destinationName, // string
    
    // Novos Parâmetros Avançados (com valores default)
    dieselPrice = 6.50, // R$/litro
    truckConsumption = 3.5, // km/l
    spoilageRate = 0, // % de perda (ex: 5%)
    storageDays = 0, // dias
    storageCostPerDay = 15 // R$/ton/dia
  }) => {
    await delay(600); // Simula cálculo pesado da IA

    // 1. Cálculo de Receita Bruta
    const volumeKg = volume * 1000;
    const grossRevenue = sellPrice * volumeKg;

    // 2. Cálculo do Custo da Mercadoria (CMV)
    const grossCost = buyPrice * volumeKg;

    // 3. Cálculo Inteligente de Frete (Baseado em Distância)
    let freightCost = 0;
    let distanceKm = 0;

    // Tenta achar coordenadas do destino, senão usa um padrão de 1500km
    const destCoords = DESTINATIONS[destinationName] || { lat: -23.55, lng: -46.63 };
    
    if (originCoords && originCoords.length === 2) {
      distanceKm = calculateDistance(originCoords[0], originCoords[1], destCoords.lat, destCoords.lng);
      // Custo Diesel = (Distancia / Consumo) * Preço Diesel * (2 pernas: ida e volta ou ajuste de frete retorno)
      // Vamos considerar ida cheia + 20% de taxa de retorno vazio/logística
      const litersNeeded = distanceKm / truckConsumption;
      freightCost = (litersNeeded * dieselPrice) * 1.2; 
      
      // Ajuste por volume (precisa de mais caminhões?)
      // Assumindo caminhão truck de 25 ton
      const trucksNeeded = Math.ceil(volume / 25);
      freightCost = freightCost * trucksNeeded;
    } else {
      freightCost = 2000 * (volume / 10); // Fallback simples
    }

    // 4. Cálculo de Perdas (Quebra)
    // Se perder 5%, perde receita, mas já pagou o custo e o frete
    const lostRevenue = grossRevenue * (spoilageRate / 100);
    const netRevenue = grossRevenue - lostRevenue;

    // 5. Custo de Armazenagem
    const totalStorageCost = storageDays * storageCostPerDay * volume;

    // TOTALIZAÇÃO
    const totalOperationalCost = grossCost + freightCost + totalStorageCost;
    const profit = netRevenue - totalOperationalCost;
    const roi = (profit / totalOperationalCost) * 100;

    return {
      roi: parseFloat(roi.toFixed(1)),
      profit: parseFloat(profit.toFixed(2)),
      totalCost: parseFloat(totalOperationalCost.toFixed(2)),
      details: {
        freightCost: parseFloat(freightCost.toFixed(2)),
        distanceKm: Math.round(distanceKm),
        spoilageLoss: parseFloat(lostRevenue.toFixed(2)),
        storageCost: parseFloat(totalStorageCost.toFixed(2))
      },
      isHighRisk: roi < 10 || spoilageRate > 15
    };
  }
};
