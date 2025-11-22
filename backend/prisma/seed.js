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

  // 1. Limpa o banco
  await prisma.refreshToken.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.user.deleteMany();
  console.log('🧹 Banco limpo.');

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

  console.log(`✅ ${topProducers.length} polos inseridos com preços ajustados à realidade local!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });