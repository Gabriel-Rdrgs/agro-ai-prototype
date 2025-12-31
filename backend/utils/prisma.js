/**
 * Singleton Pattern para PrismaClient
 * Documentação: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */
const { PrismaClient } = require('@prisma/client');

// Função para criar instância com logs adequados ao ambiente
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
    // ✅ PERF-004: Connection pool configurado via DATABASE_URL
    // O Prisma gerencia o pool automaticamente via connection_limit no DATABASE_URL
    // Exemplo: postgresql://user:pass@host:5432/db?connection_limit=20&pool_timeout=10
  });
};

const globalForPrisma = global;

// Garante que usamos a mesma instância se ela já existir (essencial para desenvolvimento)
// ✅ CORREÇÃO: Força recriação se o modelo Favorite não estiver disponível
let prisma = globalForPrisma.prisma || prismaClientSingleton();

// Verifica se o modelo Favorite está disponível (indica que Prisma Client foi regenerado)
if (!prisma.favorite && globalForPrisma.prisma) {
  console.log('⚠️ Prisma Client antigo detectado (sem Favorite). Recriando...');
  // Desconecta instância antiga
  globalForPrisma.prisma.$disconnect().catch(() => {});
  // Recria
  prisma = prismaClientSingleton();
}

// Em desenvolvimento, salvamos a instância no objeto global
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Graceful shutdown (opcional, mas boa prática manter do seu código original)
if (process.env.NODE_ENV === 'production') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect();
    console.log('🔌 Prisma Client desconectado (Shutdown)');
  });
}

module.exports = prisma;