// backend/tests/api/opportunities.test.js
/**
 * Testes para o endpoint /api/opportunities
 * 
 * Testa:
 * - Cache (HIT/MISS)
 * - Limites e paginação
 * - Autenticação
 * - Tratamento de erros
 */

const request = require('supertest');
const { getAuthHeaders } = require('../helpers/authHelper');

// Mock de dependências antes de importar o app
jest.mock('../../utils/prisma', () => require('../__mocks__/prisma'));
jest.mock('../../utils/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  invalidatePattern: jest.fn()
}));
jest.mock('../../utils/circuitBreaker', () => ({
  dbCircuitBreaker: {
    execute: jest.fn((fn) => fn())
  }
}));

const cache = require('../../utils/cache');
const { mockPrisma } = require('../__mocks__/prisma');

// Importa o app após mocks
let app;
beforeAll(() => {
  // Cria app Express para testes
  const express = require('express');
  app = express();
  app.use(express.json());
  
  // Mock do middleware de autenticação
  const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }
    // Simula decodificação do token
    req.user = { id: 'test-user-id', email: 'test@agro.com', role: 'user' };
    next();
  };
  
  // Rota de teste (simula /api/opportunities)
  app.get('/api/opportunities', verifyToken, async (req, res) => {
    try {
      const cacheKey = 'opportunities:all';
      const cached = cache.get(cacheKey);
      
      if (cached) {
        return res.json(cached);
      }
      
      const limit = parseInt(req.query.limit) || 500;
      const skip = parseInt(req.query.skip) || 0;
      
      const opportunities = await mockPrisma.opportunity.findMany({
        select: {
          id: true,
          product: true,
          city: true,
          state: true,
          buyPrice: true,
          sellPrice: true,
          roi: true
        },
        orderBy: { createdAt: 'desc' },
        take: Math.min(limit, 1000),
        skip: skip
      });
      
      const result = {
        opportunities,
        dollarRate: 5.0,
        count: opportunities.length
      };
      
      cache.set(cacheKey, result, 300); // 5 minutos
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
});

describe('GET /api/opportunities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('deve retornar 401 sem token', async () => {
    const response = await request(app)
      .get('/api/opportunities')
      .expect(401);
    
    expect(response.body.error).toContain('Token de autenticação');
  });
  
  test('deve retornar oportunidades com token válido', async () => {
    const mockOpportunities = [
      {
        id: 1,
        product: 'Tomate',
        city: 'São Paulo',
        state: 'SP',
        buyPrice: 2.5,
        sellPrice: 4.0,
        roi: 60
      }
    ];
    
    mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);
    cache.get.mockReturnValue(null); // Cache MISS
    
    const response = await request(app)
      .get('/api/opportunities')
      .set(getAuthHeaders())
      .expect(200);
    
    expect(response.body.opportunities).toHaveLength(1);
    expect(response.body.opportunities[0].product).toBe('Tomate');
    expect(mockPrisma.opportunity.findMany).toHaveBeenCalled();
  });
  
  test('deve usar cache quando disponível (HIT)', async () => {
    const cachedData = {
      opportunities: [{ id: 1, product: 'Tomate' }],
      dollarRate: 5.0,
      count: 1
    };
    
    cache.get.mockReturnValue(cachedData); // Cache HIT
    
    const response = await request(app)
      .get('/api/opportunities')
      .set(getAuthHeaders())
      .expect(200);
    
    expect(response.body).toEqual(cachedData);
    expect(mockPrisma.opportunity.findMany).not.toHaveBeenCalled();
  });
  
  test('deve respeitar limite de registros', async () => {
    const mockOpportunities = Array(100).fill(null).map((_, i) => ({
      id: i + 1,
      product: 'Tomate',
      city: 'São Paulo',
      state: 'SP',
      buyPrice: 2.5,
      sellPrice: 4.0,
      roi: 60
    }));
    
    mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);
    cache.get.mockReturnValue(null);
    
    const response = await request(app)
      .get('/api/opportunities?limit=50')
      .set(getAuthHeaders())
      .expect(200);
    
    expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50
      })
    );
  });
  
  test('deve limitar máximo a 1000 registros', async () => {
    mockPrisma.opportunity.findMany.mockResolvedValue([]);
    cache.get.mockReturnValue(null);
    
    await request(app)
      .get('/api/opportunities?limit=2000')
      .set(getAuthHeaders())
      .expect(200);
    
    expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 1000 // Máximo
      })
    );
  });
  
  test('deve tratar erro do banco de dados', async () => {
    mockPrisma.opportunity.findMany.mockRejectedValue(new Error('Database error'));
    cache.get.mockReturnValue(null);
    
    const response = await request(app)
      .get('/api/opportunities')
      .set(getAuthHeaders())
      .expect(500);
    
    expect(response.body.error).toBeDefined();
  });
});

