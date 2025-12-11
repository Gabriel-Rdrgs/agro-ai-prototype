// backend/utils/prisma.js
/**
 * Singleton Pattern para PrismaClient
 * Evita múltiplas instâncias e controla pool de conexões
 */

const { PrismaClient } = require('@prisma/client');

let prisma;

// Em produção, cria uma única instância
// Em desenvolvimento, usa global para hot-reload
if (process.env.NODE_ENV === 'production') {
  // ✅ USA POOLER (DATABASE_URL com pgbouncer=true) para evitar bloqueio IPv4
  // O pooler gerencia múltiplas conexões sem esgotar limite IPv4 do Supabase
  let databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurada!');
    throw new Error('DATABASE_URL não configurada');
  }
  
  // Garante que está usando o pooler (pgbouncer=true)
  if (!databaseUrl.includes('pgbouncer=true')) {
    databaseUrl = databaseUrl.includes('?') 
      ? `${databaseUrl}&pgbouncer=true`
      : `${databaseUrl}?pgbouncer=true`;
  }
  
  // Limita conexões para não esgotar pool do Supabase
  // connection_limit baixo (3) para evitar esgotamento do pooler
  const urlWithParams = databaseUrl.includes('?') 
    ? `${databaseUrl}&connection_limit=3&pool_timeout=15&connect_timeout=10`
    : `${databaseUrl}?connection_limit=3&pool_timeout=15&connect_timeout=10`;
  
  prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: urlWithParams
      }
    }
  });
  
  console.log('✅ Prisma Client criado (PRODUÇÃO) - usando POOLER (pgbouncer) - connection_limit=3');
} else {
  // Desenvolvimento: usa global para evitar múltiplas instâncias no hot-reload
  if (!global.prisma) {
    // ✅ USA POOLER (DATABASE_URL com pgbouncer=true)
    let databaseUrl = process.env.DATABASE_URL;
    
    if (!databaseUrl) {
      console.error('❌ DATABASE_URL não configurada!');
      throw new Error('DATABASE_URL não configurada');
    }
    
    // Garante que está usando o pooler (pgbouncer=true)
    if (!databaseUrl.includes('pgbouncer=true')) {
      databaseUrl = databaseUrl.includes('?') 
        ? `${databaseUrl}&pgbouncer=true`
        : `${databaseUrl}?pgbouncer=true`;
    }
    
    // connection_limit baixo (3) para evitar esgotamento do pooler
    const urlWithParams = databaseUrl.includes('?') 
      ? `${databaseUrl}&connection_limit=3&pool_timeout=15&connect_timeout=10`
      : `${databaseUrl}?connection_limit=3&pool_timeout=15&connect_timeout=10`;
    
    global.prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: urlWithParams
        }
      }
    });
    
    console.log('✅ Prisma Client criado (DESENVOLVIMENTO) - usando POOLER (pgbouncer) - connection_limit=3');
  }
  prisma = global.prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('🔌 Prisma Client desconectado');
});

module.exports = prisma;
