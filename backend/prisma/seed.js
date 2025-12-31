// backend/prisma/seed.js
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

// --- INTELIGÊNCIA DE MERCADO (MATRIZ REGIONAL) ---
// Define um preço base médio (R$/kg) por Estado, simulando a realidade local
const REGIONAL_PRICING = {
  'GO': 3.80, // Baixo custo, alto volume (Cristalina, Rio Verde)
  'SP': 4.50, // Referência de mercado (Itapeva, Mogi)
  'MG': 4.20, // Competitivo (Jaíba, Araguari)
  'BA': 5.10, // Tomate premium irrigado / Frete longo (Mucugê)
  'PE': 4.90, // Polo agreste, nicho regional (Bezerros)
  'SC': 4.30, // Safra de verão específica (Caçador)
  'PR': 4.10, // Alta produtividade (Reserva)
  'ES': 4.60, // Montanha, qualidade (Venda Nova)
  'RJ': 4.70  // Próximo ao Rio, custo alto
};

// Função para gerar variação natural do mercado (+- 10%)
function getRegionalPrice(state) {
  const base = REGIONAL_PRICING[state] || 4.00; // Padrão 4.00 se não achar o estado
  const variation = (Math.random() * 0.80) - 0.40; // Varia entre -0.40 e +0.40 centavos
  return parseFloat((base + variation).toFixed(2));
}

async function main() {
  console.log('🍅 Iniciando Seed com PRECIFICAÇÃO REGIONAL INTELIGENTE...');

  // 1. Limpa o banco (A ORDEM IMPORTA: Apagar filhos antes dos pais)
  console.log('🧹 Limpando histórico antigo...');
  await prisma.priceHistory.deleteMany(); // <--- ADICIONE ISTO PRIMEIRO!
  
  console.log('🧹 Limpando tabelas principais...');
  await prisma.refreshToken.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.user.deleteMany();
  
  console.log('✨ Banco limpo e preparado.');

  // 2. Admin
  const hashedPassword = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin Agro',
      email: 'admin@agro.com',
      password: hashedPassword,
      role: 'admin'
    }
  });
  console.log(`👤 Usuário criado: ${admin.email}`);

  // 3. Lista dos 20 Maiores Produtores
  const topProducers = [
    // CENTRO-OESTE (Goiás domina no volume/indústria -> Preços menores)
    { city: 'Cristalina', state: 'GO', lat: -16.76, lng: -47.61, desc: 'Irrigação de pivô central.', season: 'Safra de Inverno' },
    { city: 'Goianápolis', state: 'GO', lat: -16.51, lng: -49.02, desc: 'Capital do tomate em GO.', season: 'Safra Atual' },
    { city: 'Rio Verde', state: 'GO', lat: -17.79, lng: -50.92, desc: 'Alta tecnologia aplicada.', season: 'Safra Atual' },
    { city: 'Morrinhos', state: 'GO', lat: -17.73, lng: -49.09, desc: 'Foco em tomate industrial.', season: 'Safra Industrial' },

    // SUDESTE (SP é referência, MG competitivo)
    { city: 'Itapeva', state: 'SP', lat: -23.98, lng: -48.87, desc: 'Maior produtor de SP.', season: 'Safra de Verão' },
    { city: 'Mogi Guaçu', state: 'SP', lat: -22.37, lng: -46.94, desc: 'Logística estratégica.', season: 'Safra Atual' },
    { city: 'Ribeirão Branco', state: 'SP', lat: -24.22, lng: -48.76, desc: 'Tomate de mesa premium.', season: 'Safra de Verão' },
    { city: 'Sumaré', state: 'SP', lat: -22.82, lng: -47.26, desc: 'Abastecimento RMC.', season: 'Safra Atual' },
    { city: 'Jaíba', state: 'MG', lat: -15.34, lng: -43.67, desc: 'Projeto Jaíba (Irrigado).', season: 'Safra Anual' },
    { city: 'Araguari', state: 'MG', lat: -18.64, lng: -48.18, desc: 'Processamento e sucos.', season: 'Safra Industrial' },
    { city: 'Carmópolis de Minas', state: 'MG', lat: -20.53, lng: -44.63, desc: 'Tradicional mineiro.', season: 'Safra Atual' },
    { city: 'Venda Nova do Imigrante', state: 'ES', lat: -20.33, lng: -41.13, desc: 'Polo serrano capixaba.', season: 'Safra de Montanha' },
    { city: 'São José de Ubá', state: 'RJ', lat: -21.35, lng: -41.94, desc: 'Principal polo do RJ.', season: 'Safra Atual' },

    // NORDESTE (Custo logístico e irrigação -> Preços base maiores)
    { city: 'Mucugê', state: 'BA', lat: -13.00, lng: -41.37, desc: 'Chapada Diamantina (Altitude).', season: 'Safra de Inverno' },
    { city: 'Ibicoara', state: 'BA', lat: -13.41, lng: -41.28, desc: 'Alta produtividade/ha.', season: 'Safra de Inverno' },
    { city: 'Ituaçu', state: 'BA', lat: -13.81, lng: -41.29, desc: 'Expansão recente.', season: 'Safra Atual' },
    { city: 'Bezerros', state: 'PE', lat: -8.23, lng: -35.79, desc: 'Maior do agreste PE.', season: 'Safra Local' },
    { city: 'Camocim de São Félix', state: 'PE', lat: -8.35, lng: -35.76, desc: 'Polo tomateiro PE.', season: 'Safra Local' },

    // SUL
    { city: 'Caçador', state: 'SC', lat: -26.77, lng: -51.01, desc: 'Safra de verão tardia.', season: 'Safra de Verão' },
    { city: 'Reserva', state: 'PR', lat: -24.65, lng: -50.85, desc: 'Maior produtor do PR.', season: 'Safra Atual' },
  ];

  for (const place of topProducers) {
    // 🧠 APLICAÇÃO DA LÓGICA: Preço calculado por região
    const buyPrice = getRegionalPrice(place.state);
    
    // Margem de lucro também varia levemente (Frete SP exige margem maior de longe)
    const freightFactor = (place.state === 'BA' || place.state === 'PE' || place.state === 'GO') ? 1.45 : 1.30;
    const sellPrice = parseFloat((buyPrice * freightFactor).toFixed(2));

    await prisma.opportunity.create({
      data: {
        product: 'Tomate',
        category: 'Hortifruti',
        city: place.city,
        state: place.state,
        lat: place.lat,
        lng: place.lng,
        
        // Financeiro
        buyPrice: buyPrice,
        sellPrice: sellPrice,
        sellLocation: 'CEAGESP - SP', 
        volume: `${Math.floor(200 + Math.random() * 400)} cx`,
        
        // Status
        riskLevel: 1,
        climate: 'Aguardando Satélite',
        description: place.desc,
        season: place.season
      }
    });
  }

  console.log(`✅ ${topProducers.length} polos de tomate inseridos com preços ajustados à realidade local!`);

  // 4. Lista dos 20 Maiores Produtores de SOJA
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

  for (const producer of topSoybeanProducers) {
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
  }

  console.log(`✅ ${topSoybeanProducers.length} polos de soja inseridos com preços ajustados à realidade local!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });