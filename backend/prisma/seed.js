// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const opportunities = [
  // REGIÃO NORDESTE
  {
    product: 'Tomate',
    category: 'Hortaliça',
    city: 'Petrolina', state: 'PE',
    lat: -9.3891, lng: -40.5006,
    buyPrice: 2.50, sellPrice: 7.00,
    sellLocation: 'Mato Grosso',
    destLat: -15.6014, destLng: -56.0979,
    volume: '50 toneladas',
    riskLevel: 1,
    climate: 'Estável - Irrigação garantida',
    season: 'Novembro',
    description: 'Tomate de mesa cultivado no Vale do São Francisco. Previsão de granizo em MT aumenta demanda.'
  },
  {
    product: 'Cebola',
    category: 'Hortaliça',
    city: 'Irecê', state: 'BA',
    lat: -11.3039, lng: -41.8564,
    buyPrice: 1.80, sellPrice: 4.20,
    sellLocation: 'São Paulo',
    destLat: -23.5505, destLng: -46.6333,
    volume: '80 toneladas',
    riskLevel: 1,
    climate: 'Seca favorável',
    season: 'Outubro-Novembro',
    description: 'Safra recorde em Irecê. Baixa produção em SP por excesso de chuva cria oportunidade.'
  },
  {
    product: 'Melão',
    category: 'Fruta',
    city: 'Mossoró', state: 'CE',
    lat: -5.1878, lng: -37.3444,
    buyPrice: 3.20, sellPrice: 8.50,
    sellLocation: 'Rio de Janeiro',
    destLat: -22.9068, destLng: -43.1729,
    volume: '30 toneladas',
    riskLevel: 2,
    climate: 'Calor intenso',
    season: 'Novembro',
    description: 'Melão amarelo para exportação. Mercado interno aquecido por festas de fim de ano.'
  },
  // CENTRO-OESTE
  {
    product: 'Soja',
    category: 'Grão',
    city: 'Sorriso', state: 'MT',
    lat: -12.5436, lng: -55.7142,
    buyPrice: 120.00, sellPrice: 145.00,
    sellLocation: 'Porto de Santos',
    destLat: -23.9608, destLng: -46.3331,
    volume: '5000 toneladas',
    riskLevel: 1,
    climate: 'Safra confirmada',
    season: 'Fevereiro-Março',
    description: 'Soja para exportação. Dólar alto favorece negócio.'
  },
  {
    product: 'Milho',
    category: 'Grão',
    city: 'Rio Verde', state: 'GO',
    lat: -17.7997, lng: -50.9264,
    buyPrice: 45.00, sellPrice: 68.00,
    sellLocation: 'Santa Catarina',
    destLat: -27.5954, destLng: -48.5480,
    volume: '200 toneladas',
    riskLevel: 2,
    climate: 'Chuvas acima da média',
    season: 'Novembro',
    description: 'Milho safrinha. Alta demanda de granjas em SC.'
  },
  // SUDESTE
  {
    product: 'Café Arábica',
    category: 'Grão',
    city: 'Patrocínio', state: 'MG',
    lat: -18.9413, lng: -46.9931,
    buyPrice: 850.00, sellPrice: 1200.00,
    sellLocation: 'Exportação (Europa)',
    destLat: -23.9608, destLng: -46.3331,
    volume: '100 sacas',
    riskLevel: 1,
    climate: 'Clima ideal',
    season: 'Maio-Agosto',
    description: 'Café especial pontuação 85+. Mercado europeu aquecido.'
  },
  {
    product: 'Laranja Pera',
    category: 'Fruta',
    city: 'Bebedouro', state: 'SP',
    lat: -20.9494, lng: -48.4794,
    buyPrice: 25.00, sellPrice: 42.00,
    sellLocation: 'Indústria de Suco',
    destLat: -21.7946, destLng: -48.1766,
    volume: '150 toneladas',
    riskLevel: 3,
    climate: 'Risco de greening',
    season: 'Setembro-Dezembro',
    description: 'Laranja para suco. Safra reduzida por doença aumenta preços.'
  },
  // SUL
  {
    product: 'Maçã Fuji',
    category: 'Fruta',
    city: 'Fraiburgo', state: 'SC',
    lat: -27.0261, lng: -50.9208,
    buyPrice: 4.50, sellPrice: 9.00,
    sellLocation: 'Nordeste',
    destLat: -8.0476, destLng: -34.8770,
    volume: '40 toneladas',
    riskLevel: 2,
    climate: 'Frio adequado',
    season: 'Março-Abril',
    description: 'Maçã premium. Nordeste paga mais por qualidade superior.'
  },
  {
    product: 'Uva Niágara',
    category: 'Fruta',
    city: 'Bento Gonçalves', state: 'RS',
    lat: -29.1717, lng: -51.5194,
    buyPrice: 6.00, sellPrice: 12.50,
    sellLocation: 'Rio de Janeiro',
    destLat: -22.9068, destLng: -43.1729,
    volume: '25 toneladas',
    riskLevel: 2,
    climate: 'Chuvas no fim',
    season: 'Janeiro-Fevereiro',
    description: 'Uva de mesa. Festas de verão aumentam demanda.'
  },
  // NORTE
  {
    product: 'Açaí',
    category: 'Fruta',
    city: 'Belém', state: 'PA',
    lat: -1.4558, lng: -48.4902,
    buyPrice: 18.00, sellPrice: 35.00,
    sellLocation: 'Sul e Sudeste',
    destLat: -23.5505, destLng: -46.6333,
    volume: '10 toneladas',
    riskLevel: 3,
    climate: 'Entressafra',
    season: 'Dezembro-Janeiro',
    description: 'Açaí premium congelado. Entressafra eleva preços.'
  },
  // EXTRAS
  {
    product: 'Banana Prata',
    category: 'Fruta',
    city: 'Registro', state: 'SP',
    lat: -24.4875, lng: -47.8433,
    buyPrice: 2.20, sellPrice: 5.00,
    sellLocation: 'Paraná',
    destLat: -25.4284, destLng: -49.2733,
    volume: '60 toneladas',
    riskLevel: 1,
    climate: 'Clima estável',
    season: 'Ano todo',
    description: 'Banana de primeira. Mercado paranaense paga premium.'
  },
  {
    product: 'Feijão Carioca',
    category: 'Grão',
    city: 'Londrina', state: 'PR',
    lat: -23.3045, lng: -51.1696,
    buyPrice: 180.00, sellPrice: 260.00,
    sellLocation: 'Rio de Janeiro',
    destLat: -22.9068, destLng: -43.1729,
    volume: '100 sacas',
    riskLevel: 1,
    climate: 'Safra garantida',
    season: 'Abril-Maio',
    description: 'Feijão tipo 1. Entressafra em outras regiões cria oportunidade.'
  }
];

async function main() {
  console.log('🌱 Iniciando seed do banco de dados...');
  
  // Limpa o banco antes de inserir (para não duplicar se rodar 2x)
  await prisma.opportunity.deleteMany({});

  for (const opp of opportunities) {
    const created = await prisma.opportunity.create({
      data: opp
    });
    console.log(`✅ Criado: ${created.product} em ${created.city}`);
  }
  
  console.log('🏁 Seed finalizado com sucesso!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });