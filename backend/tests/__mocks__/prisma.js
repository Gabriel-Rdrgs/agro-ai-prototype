// backend/tests/__mocks__/prisma.js
/**
 * Mock do Prisma Client para testes
 */

const mockPrisma = {
  opportunity: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  ceasaPrice: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  },
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn()
  },
  auditLog: {
    create: jest.fn(),
    findMany: jest.fn()
  },
  priceHistory: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  $disconnect: jest.fn(),
  $connect: jest.fn()
};

module.exports = {
  PrismaClient: jest.fn(() => mockPrisma),
  mockPrisma
};

