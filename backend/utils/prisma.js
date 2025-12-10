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
  const databaseUrl = process.env.DIRECT_URL || 
    process.env.DATABASE_URL?.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '') || 
    process.env.DATABASE_URL;
  
  // Limita conexões para não esgotar pool do Supabase
  const urlWithParams = databaseUrl.includes('?') 
    ? `${databaseUrl}&connection_limit=5&pool_timeout=20`
    : `${databaseUrl}?connection_limit=5&pool_timeout=20`;
  
  prisma = new PrismaClient({
    log: ['error'],
    datasources: {
      db: {
        url: urlWithParams
      }
    }
  });
  
  console.log('✅ Prisma Client criado (PRODUÇÃO) - connection_limit=5');
} else {
  // Desenvolvimento: usa global para evitar múltiplas instâncias no hot-reload
  if (!global.prisma) {
    const databaseUrl = process.env.DIRECT_URL || 
      process.env.DATABASE_URL?.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '') || 
      process.env.DATABASE_URL;
    
    const urlWithParams = databaseUrl.includes('?') 
      ? `${databaseUrl}&connection_limit=5&pool_timeout=20`
      : `${databaseUrl}?connection_limit=5&pool_timeout=20`;
    
    global.prisma = new PrismaClient({
      log: ['error', 'warn'],
      datasources: {
        db: {
          url: urlWithParams
        }
      }
    });
    
    console.log('✅ Prisma Client criado (DESENVOLVIMENTO) - connection_limit=5');
  }
  prisma = global.prisma;
}

// Graceful shutdown
process.on('beforeExit', async () => {
  await prisma.$disconnect();
  console.log('🔌 Prisma Client desconectado');
});

module.exports = prisma;
