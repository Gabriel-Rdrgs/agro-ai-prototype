/**
 * Singleton Pattern para PrismaClient
 * Documentação: https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
 */
const { PrismaClient } = require('@prisma/client');

// Função para criar instância com logs adequados ao ambiente
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });
};

const globalForPrisma = global;

// Garante que usamos a mesma instância se ela já existir (essencial para desenvolvimento)
const prisma = globalForPrisma.prisma || prismaClientSingleton();

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