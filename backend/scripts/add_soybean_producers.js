// scripts/add_soybean_producers.js
// Script para adicionar os 20 maiores produtores de soja

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Coordenadas dos 20 maiores produtores de soja
const topSoybeanProducers = [
  { city: 'Sorriso', state: 'MT', lat: -12.5428, lng: -55.7106, production: 2.01, desc: 'Maior produtor de soja do Brasil' },
  { city: 'Formosa do Rio Preto', state: 'BA', lat: -11.0478, lng: -45.1931, production: 1.855, desc: 'Oeste baiano - Alta produtividade' },
  { city: 'São Desidério', state: 'BA', lat: -12.3578, lng: -44.9769, production: 1.65, desc: 'Oeste baiano - Expansão recente' },
  { city: 'Rio Verde', state: 'GO', lat: -17.7947, lng: -50.9192, production: 1.476, desc: 'Sudoeste goiano - Alta tecnologia' },
  { city: 'Nova Mutum', state: 'MT', lat: -13.8381, lng: -56.0831, production: 1.337, desc: 'Mato Grosso - Polo produtor' },
  { city: 'Sapezal', state: 'MT', lat: -12.9911, lng: -58.7642, production: 1.319, desc: 'Mato Grosso - Alta produtividade' },
  { city: 'Diamantino', state: 'MT', lat: -14.4058, lng: -56.4458, production: 1.315, desc: 'Mato Grosso - Tradicional' },
  { city: 'Campo Novo do Parecis', state: 'MT', lat: -13.6758, lng: -57.8931, production: 1.304, desc: 'Mato Grosso - Expansão' },
  { city: 'Nova Ubiratã', state: 'MT', lat: -12.9831, lng: -55.2556, production: 1.301, desc: 'Mato Grosso - Novo polo' },
  { city: 'Querência', state: 'MT', lat: -12.6081, lng: -52.1831, production: 1.298, desc: 'Mato Grosso - Fronteira agrícola' },
  { city: 'Maracaju', state: 'MS', lat: -21.6139, lng: -55.1681, production: 1.115, desc: 'Mato Grosso do Sul - Alta produtividade' },
  { city: 'Jataí', state: 'GO', lat: -17.8814, lng: -51.7147, production: 1.078, desc: 'Sudoeste goiano - Tecnologia' },
  { city: 'Canarana', state: 'MT', lat: -13.5519, lng: -52.2706, production: 1.053, desc: 'Mato Grosso - Fronteira' },
  { city: 'Ponta Porã', state: 'MS', lat: -22.5361, lng: -55.7256, production: 1.045, desc: 'Mato Grosso do Sul - Fronteira' },
  { city: 'Cristalina', state: 'GO', lat: -16.7681, lng: -47.6131, production: 0.993, desc: 'Goiás - Alta tecnologia' },
  { city: 'Primavera do Leste', state: 'MT', lat: -15.5619, lng: -54.3011, production: 0.939, desc: 'Mato Grosso - Polo consolidado' },
  { city: 'Sidrolândia', state: 'MS', lat: -20.9319, lng: -54.9619, production: 0.931, desc: 'Mato Grosso do Sul - Expansão' },
  { city: 'Brasnorte', state: 'MT', lat: -12.1478, lng: -57.9831, production: 0.851, desc: 'Mato Grosso - Novo polo' },
  { city: 'Campo Verde', state: 'MT', lat: -15.5458, lng: -55.1681, production: 0.846, desc: 'Mato Grosso - Alta produtividade' },
  { city: 'Barreiras', state: 'BA', lat: -12.1431, lng: -44.9969, production: 0.831, desc: 'Oeste baiano - Polo consolidado' }
];

// Preços regionais para soja (R$/kg)
const SOYBEAN_REGIONAL_PRICING = {
  'MT': 2.15, // Mato Grosso - maior produtor, preços competitivos
  'BA': 2.25, // Bahia - oeste baiano, frete mais caro
  'GO': 2.20, // Goiás - sudoeste, boa logística
  'MS': 2.18  // Mato Grosso do Sul - competitivo
};

function getSoybeanPrice(state) {
  const base = SOYBEAN_REGIONAL_PRICING[state] || 2.17; // Preço base médio
  const variation = (Math.random() * 0.10) - 0.05; // Variação de ±5 centavos
  return parseFloat((base + variation).toFixed(2));
}

async function main() {
  console.log('🌾 Adicionando 20 maiores produtores de soja...');

  let created = 0;
  let skipped = 0;

  for (const producer of topSoybeanProducers) {
    try {
      // Verifica se já existe
      const existing = await prisma.opportunity.findFirst({
        where: {
          product: 'Soja',
          city: producer.city,
          state: producer.state
        }
      });

      if (existing) {
        console.log(`⏭️  ${producer.city}/${producer.state} já existe, pulando...`);
        skipped++;
        continue;
      }

      const buyPrice = getSoybeanPrice(producer.state);
      // Margem de lucro para soja (menor que tomate, pois é commodity)
      const freightFactor = 1.15; // 15% de margem
      const sellPrice = parseFloat((buyPrice * freightFactor).toFixed(2));

      await prisma.opportunity.create({
        data: {
          product: 'Soja',
          category: 'Grãos',
          city: producer.city,
          state: producer.state,
          lat: producer.lat,
          lng: producer.lng,
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          sellLocation: 'Porto de Santos - SP',
          volume: `${Math.floor(producer.production * 1000)} ton`, // Converte milhões para toneladas
          riskLevel: 1,
          climate: 'Aguardando Satélite',
          description: `${producer.desc}. Produção: ${producer.production} milhões de toneladas`,
          season: 'Safra Principal'
        }
      });

      created++;
      console.log(`✅ ${producer.city}/${producer.state} adicionado`);
    } catch (error) {
      console.error(`❌ Erro ao adicionar ${producer.city}/${producer.state}:`, error.message);
    }
  }

  console.log(`\n✅ Concluído! ${created} novos registros, ${skipped} já existiam.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

