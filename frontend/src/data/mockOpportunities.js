// Dados mockados de oportunidades de arbitragem agrícola
// Cada oportunidade representa uma análise de compra/venda entre regiões
// src/data/mockOpportunities.js

export const opportunities = [
  // REGIÃO NORDESTE
  {
    id: 1,
    name: 'Tomate - Pernambuco',
    state: 'PE',
    stateName: 'Pernambuco',
    city: 'Petrolina',
    position: [-9.3891, -40.5006], // Origem: Petrolina
    product: 'Tomate',
    category: 'Hortaliça',
    buyPrice: 2.50,
    sellPrice: 7.00,
    sellLocation: 'Mato Grosso',
    // ADICIONADO: Coordenada do destino (Cuiabá/MT para referência)
    sellPosition: [-15.6014, -56.0979], 
    roi: 180,
    volume: '50 toneladas',
    risk: 'Baixo',
    riskLevel: 1,
    climate: 'Estável - Irrigação garantida',
    season: 'Novembro',
    transportCost: 1800,
    description: 'Tomate de mesa cultivado no Vale do São Francisco. Previsão de granizo em MT aumenta demanda.'
  },
  {
    id: 2,
    name: 'Cebola - Bahia',
    state: 'BA',
    stateName: 'Bahia',
    city: 'Irecê',
    position: [-11.3039, -41.8564], 
    product: 'Cebola',
    category: 'Hortaliça',
    buyPrice: 1.80,
    sellPrice: 4.20,
    sellLocation: 'São Paulo',
    sellPosition: [-23.5505, -46.6333], // SP Capital
    roi: 133,
    volume: '80 toneladas',
    risk: 'Baixo',
    riskLevel: 1,
    climate: 'Seca favorável',
    season: 'Outubro-Novembro',
    transportCost: 2200,
    description: 'Safra recorde em Irecê. Baixa produção em SP por excesso de chuva cria oportunidade.'
  },
  {
    id: 3,
    name: 'Melão - Ceará',
    state: 'CE',
    stateName: 'Ceará',
    city: 'Mossoró',
    position: [-5.1878, -37.3444], 
    product: 'Melão',
    category: 'Fruta',
    buyPrice: 3.20,
    sellPrice: 8.50,
    sellLocation: 'Rio de Janeiro',
    sellPosition: [-22.9068, -43.1729], // RJ Capital
    roi: 166,
    volume: '30 toneladas',
    risk: 'Médio',
    riskLevel: 2,
    climate: 'Calor intenso - acelera maturação',
    season: 'Novembro',
    transportCost: 2800,
    description: 'Melão amarelo para exportação. Mercado interno aquecido por festas de fim de ano.'
  },

  // REGIÃO CENTRO-OESTE
  {
    id: 4,
    name: 'Soja - Mato Grosso',
    state: 'MT',
    stateName: 'Mato Grosso',
    city: 'Sorriso',
    position: [-12.5436, -55.7142],
    product: 'Soja',
    category: 'Grão',
    buyPrice: 120.00,
    sellPrice: 145.00,
    sellLocation: 'Porto de Santos (Exportação)',
    sellPosition: [-23.9608, -46.3331], // Porto de Santos
    roi: 21,
    volume: '5000 toneladas',
    risk: 'Baixo',
    riskLevel: 1,
    climate: 'Safra confirmada',
    season: 'Fevereiro-Março',
    transportCost: 15000,
    description: 'Soja para exportação. Dólar alto favorece negócio. Volume grande compensa ROI menor.'
  },
  {
    id: 5,
    name: 'Milho - Goiás',
    state: 'GO',
    stateName: 'Goiás',
    city: 'Rio Verde',
    position: [-17.7997, -50.9264],
    product: 'Milho',
    category: 'Grão',
    buyPrice: 45.00,
    sellPrice: 68.00,
    sellLocation: 'Santa Catarina (Avicultura)',
    sellPosition: [-27.5954, -48.5480], // Florianópolis (ref)
    roi: 51,
    volume: '200 toneladas',
    risk: 'Médio',
    riskLevel: 2,
    climate: 'Chuvas acima da média',
    season: 'Novembro',
    transportCost: 5000,
    description: 'Milho safrinha. Alta demanda de granjas em SC. Transporte rodoviário direto.'
  },

  // REGIÃO SUDESTE
  {
    id: 6,
    name: 'Café - Minas Gerais',
    state: 'MG',
    stateName: 'Minas Gerais',
    city: 'Patrocínio',
    position: [-18.9413, -46.9931],
    product: 'Café Arábica',
    category: 'Grão',
    buyPrice: 850.00,
    sellPrice: 1200.00,
    sellLocation: 'Exportação (Europa)',
    sellPosition: [-23.9608, -46.3331], // Escoamento via Santos
    roi: 41,
    volume: '100 sacas (60kg)',
    risk: 'Baixo',
    riskLevel: 1,
    climate: 'Clima ideal para colheita',
    season: 'Maio-Agosto',
    transportCost: 3500,
    description: 'Café especial pontuação 85+. Mercado europeu aquecido. Contrato futuro garantido.'
  },
  {
    id: 7,
    name: 'Laranja - São Paulo',
    state: 'SP',
    stateName: 'São Paulo',
    city: 'Bebedouro',
    position: [-20.9494, -48.4794],
    product: 'Laranja Pera',
    category: 'Fruta',
    buyPrice: 25.00,
    sellPrice: 42.00,
    sellLocation: 'Indústria de Suco',
    sellPosition: [-21.7946, -48.1766], // Araraquara (Polo de suco)
    roi: 68,
    volume: '150 toneladas',
    risk: 'Alto',
    riskLevel: 3,
    climate: 'Risco de greening e seca',
    season: 'Setembro-Dezembro',
    transportCost: 800,
    description: 'Laranja para suco. Safra reduzida por doença aumenta preços. Risco fitossanitário.'
  },

  // REGIÃO SUL
  {
    id: 8,
    name: 'Maçã - Santa Catarina',
    state: 'SC',
    stateName: 'Santa Catarina',
    city: 'Fraiburgo',
    position: [-27.0261, -50.9208],
    product: 'Maçã Fuji',
    category: 'Fruta',
    buyPrice: 4.50,
    sellPrice: 9.00,
    sellLocation: 'Nordeste',
    sellPosition: [-8.0476, -34.8770], // Recife (Hub Nordeste)
    roi: 100,
    volume: '40 toneladas',
    risk: 'Médio',
    riskLevel: 2,
    climate: 'Frio adequado - boa qualidade',
    season: 'Março-Abril',
    transportCost: 4500,
    description: 'Maçã premium. Nordeste paga mais por qualidade superior. Armazenamento em câmara fria.'
  },
  {
    id: 9,
    name: 'Uva - Rio Grande do Sul',
    state: 'RS',
    stateName: 'Rio Grande do Sul',
    city: 'Bento Gonçalves',
    position: [-29.1717, -51.5194],
    product: 'Uva Niágara',
    category: 'Fruta',
    buyPrice: 6.00,
    sellPrice: 12.50,
    sellLocation: 'Rio de Janeiro',
    sellPosition: [-22.9068, -43.1729],
    roi: 108,
    volume: '25 toneladas',
    risk: 'Médio',
    riskLevel: 2,
    climate: 'Chuvas no fim da colheita',
    season: 'Janeiro-Fevereiro',
    transportCost: 3200,
    description: 'Uva de mesa. Festas de verão aumentam demanda. Qualidade excepcional da safra.'
  },

  // REGIÃO NORTE
  {
    id: 10,
    name: 'Açaí - Pará',
    state: 'PA',
    stateName: 'Pará',
    city: 'Belém',
    position: [-1.4558, -48.4902],
    product: 'Açaí',
    category: 'Fruta',
    buyPrice: 18.00,
    sellPrice: 35.00,
    sellLocation: 'Sul e Sudeste',
    sellPosition: [-23.5505, -46.6333], // SP como hub
    roi: 94,
    volume: '10 toneladas (polpa)',
    risk: 'Alto',
    riskLevel: 3,
    climate: 'Entressafra - oferta reduzida',
    season: 'Dezembro-Janeiro',
    transportCost: 5500,
    description: 'Açaí premium congelado. Entressafra eleva preços. Demanda alta por alimentação saudável.'
  },

  // OPORTUNIDADES ADICIONAIS
  {
    id: 11,
    name: 'Banana - São Paulo',
    state: 'SP',
    stateName: 'São Paulo',
    city: 'Registro',
    position: [-24.4875, -47.8433],
    product: 'Banana Prata',
    category: 'Fruta',
    buyPrice: 2.20,
    sellPrice: 5.00,
    sellLocation: 'Paraná',
    sellPosition: [-25.4284, -49.2733], // Curitiba
    roi: 127,
    volume: '60 toneladas',
    risk: 'Baixo',
    riskLevel: 1,
    climate: 'Clima estável',
    season: 'Ano todo',
    transportCost: 1200,
    description: 'Banana de primeira. Mercado paranaense paga premium por qualidade e proximidade.'
  },
  {
    id: 12,
    name: 'Feijão - Paraná',
    state: 'PR',
    stateName: 'Paraná',
    city: 'Londrina',
    position: [-23.3045, -51.1696],
    product: 'Feijão Carioca',
    category: 'Grão',
    buyPrice: 180.00,
    sellPrice: 260.00,
    sellLocation: 'Rio de Janeiro',
    sellPosition: [-22.9068, -43.1729],
    roi: 44,
    volume: '100 sacas',
    risk: 'Baixo',
    riskLevel: 1,
    climate: 'Safra garantida',
    season: 'Abril-Maio',
    transportCost: 2000,
    description: 'Feijão tipo 1. Entressafra em outras regiões cria janela de oportunidade.'
  }
];

// Funções auxiliares (mantidas iguais)
export const getOpportunitiesByState = (state) => {
  return opportunities.filter(opp => opp.state === state);
};

export const getOpportunitiesByMinROI = (minROI) => {
  return opportunities.filter(opp => opp.roi >= minROI);
};

export const getOpportunitiesByRisk = (riskLevel) => {
  return opportunities.filter(opp => opp.riskLevel === riskLevel);
};

export const sortByROI = (opportunities) => {
  return [...opportunities].sort((a, b) => b.roi - a.roi);
};