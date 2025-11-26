const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Salvar preço
async function saveCeasaPrice(priceData) {
  try {
    const result = await prisma.ceasaPrice.upsert({
      where: {
        ceasa_region_product_name_price_date: {
          ceasa_region: priceData.ceasa_region,
          product_name: priceData.product_name,
          price_date: priceData.price_date
        }
      },
      update: {
        price_min: priceData.price_min,
        price_max: priceData.price_max,
        price_avg: priceData.price_avg,
        sync_timestamp: new Date()
      },
      create: priceData
    });
    return result;
  } catch (error) {
    console.error('Erro ao salvar preço CEASA:', error);
  }
}

// Registrar log de sincronização
async function logCeasaSync(source, status, recordsCount, errorMsg) {
  await prisma.ceasaSyncLog.create({
    data: {
      source,
      status,
      records_synced: recordsCount,
      error_message: errorMsg
    }
  });
}

// Buscar preços mais recentes
async function getLatestCeasaPrices(product = 'Tomate') {
  const prices = await prisma.ceasaPrice.findMany({
    where: {
      product_name: {
        contains: product,
        mode: 'insensitive'
      }
    },
    orderBy: {
      price_date: 'desc'
    },
    take: 50  // Últimos 50 registros
  });
  return prices;
}

// Buscar por região
async function getPricesByRegion(region, product = 'Tomate') {
  const prices = await prisma.ceasaPrice.findMany({
    where: {
      ceasa_region: region,
      product_name: {
        contains: product,
        mode: 'insensitive'
      }
    },
    orderBy: {
      price_date: 'desc'
    }
  });
  return prices;
}

module.exports = {
  saveCeasaPrice,
  logCeasaSync,
  getLatestCeasaPrices,
  getPricesByRegion
};
