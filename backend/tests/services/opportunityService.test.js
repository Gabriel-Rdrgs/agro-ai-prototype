// backend/tests/services/opportunityService.test.js
/**
 * ✅ TEST-001: Testes unitários para OpportunityService
 * 
 * Testa:
 * - listOpportunities (cache, formatação, limites)
 * - compareOpportunities (batch recommendations)
 * - getPriceHistory (estatísticas, tendências)
 */

const OpportunityService = require('../../services/opportunityService');
const prisma = require('../../utils/prisma');
const { dbCircuitBreaker } = require('../../utils/circuitBreaker');

// Mock de dependências
jest.mock('../../utils/prisma', () => require('../__mocks__/prisma'));
jest.mock('../../utils/cache', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn()
}));
jest.mock('../../utils/circuitBreaker', () => ({
  dbCircuitBreaker: {
    execute: jest.fn((fn) => fn())
  }
}));
jest.mock('../../utils/logger', () => ({
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
}));

const { mockPrisma } = require('../__mocks__/prisma');
const cache = require('../../utils/cache');

describe('OpportunityService', () => {
  let service;
  let mockPythonAxios;
  let mockGetDollarRate;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Garante que prisma usa o mock
    Object.assign(prisma, mockPrisma);
    
    // Mock do axios do Python
    mockPythonAxios = {
      post: jest.fn()
    };
    
    // Mock da função getDollarRate
    mockGetDollarRate = jest.fn().mockResolvedValue(5.50);
    
    service = new OpportunityService(mockPythonAxios, mockGetDollarRate);
  });

  describe('listOpportunities', () => {
    test('deve retornar dados do cache quando disponível', async () => {
      const cachedData = [
        { id: 1, product: 'Tomate', dollarRate: 5.50 }
      ];
      
      cache.get.mockReturnValue(cachedData);
      
      const result = await service.listOpportunities();
      
      expect(result).toEqual(cachedData);
      expect(cache.get).toHaveBeenCalledWith(expect.stringMatching(/^opportunities/));
      expect(mockPrisma.opportunity.findMany).not.toHaveBeenCalled();
    });

    test('deve buscar do banco quando cache não disponível', async () => {
      const mockOpportunities = [
        {
          id: 1,
          product: 'Tomate',
          city: 'São Paulo',
          state: 'SP',
          lat: -23.5505,
          lng: -46.6333,
          buyPrice: 2.5,
          sellPrice: 4.0,
          sellLocation: 'CEASA - SP',
          roi: 60,
          freight: 0.5,
          riskLevel: 1,
          volume: '1000 kg',
          season: 'Verão',
          category: 'Hortifruti',
          climate: 'Tropical',
          description: 'Tomate de alta qualidade',
          createdAt: new Date()
        }
      ];
      
      cache.get.mockReturnValue(null);
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);
      
      // Mock do prisma.opportunity.findMany diretamente
      prisma.opportunity = mockPrisma.opportunity;
      
      const result = await service.listOpportunities();
      
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].product).toBe('Tomate');
      expect(result[0].dollarRate).toBe(5.50);
      expect(result[0].financials.buyPrice).toBe(2.5);
      expect(mockGetDollarRate).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
    });

    test('deve respeitar limite de registros', async () => {
      cache.get.mockReturnValue(null);
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      
      await service.listOpportunities({ limit: '50' });
      
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50
        })
      );
    });

    test('deve limitar máximo a 1000 registros', async () => {
      cache.get.mockReturnValue(null);
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      
      await service.listOpportunities({ limit: '2000' });
      
      expect(mockPrisma.opportunity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 1000
        })
      );
    });

    test('deve validar preços suspeitos', async () => {
      const mockOpportunities = [
        {
          id: 1,
          product: 'Tomate',
          city: 'São Paulo',
          state: 'SP',
          lat: -23.5505,
          lng: -46.6333,
          buyPrice: 25.0, // Preço suspeito (> 20)
          sellPrice: 4.0,
          sellLocation: 'CEASA - SP',
          roi: 60,
          freight: 0.5,
          riskLevel: 1,
          volume: '1000 kg',
          season: 'Verão',
          category: 'Hortifruti',
          climate: 'Tropical',
          description: 'Tomate de alta qualidade',
          createdAt: new Date()
        }
      ];
      
      cache.get.mockReturnValue(null);
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);
      
      const result = await service.listOpportunities();
      
      expect(result[0].financials.buyPrice).toBe(25.0); // Ainda retorna, mas valida
    });
  });

  describe('compareOpportunities', () => {
    test('deve buscar oportunidades e recomendações em lote', async () => {
      const mockOpportunities = [
        {
          id: 1,
          product: 'Tomate',
          state: 'SP',
          city: 'São Paulo',
          lat: -23.5505,
          lng: -46.6333,
          buyPrice: 2.5,
          sellPrice: 4.0,
          sellLocation: 'CEASA - SP',
          destLat: -23.5505,
          destLng: -46.6333,
          roi: 60,
          freight: 0.5,
          riskLevel: 1,
          volume: '1000 kg',
          season: 'Verão',
          createdAt: new Date()
        },
        {
          id: 2,
          product: 'Soja',
          state: 'MT',
          city: 'Sorriso',
          lat: -12.5505,
          lng: -55.6333,
          buyPrice: 2.0,
          sellPrice: 3.5,
          sellLocation: 'CEASA - SP',
          destLat: -23.5505,
          destLng: -46.6333,
          roi: 75,
          freight: 0.8,
          riskLevel: 2,
          volume: '5000 kg',
          season: 'Verão',
          createdAt: new Date()
        }
      ];
      
      const mockRecommendations = {
        '0': { action: 'BUY', confidence_score: 85.5 },
        '1': { action: 'WAIT', confidence_score: 72.3 }
      };
      
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);
      mockPythonAxios.post.mockResolvedValue({
        data: { recommendations: mockRecommendations }
      });
      
      const result = await service.compareOpportunities([1, 2]);
      
      expect(result.opportunities).toHaveLength(2);
      expect(result.opportunities[0].recommendation).toBe('BUY');
      expect(result.opportunities[1].recommendation).toBe('WAIT');
      expect(mockPythonAxios.post).toHaveBeenCalledWith(
        '/api/v1/predict/recommendations/batch',
        expect.any(Object),  // ✅ Aceita qualquer payload
        expect.objectContaining({ timeout: 90000 })  // ✅ 90s
      );
    });

    test('deve retornar array vazio quando nenhuma oportunidade encontrada', async () => {
      mockPrisma.opportunity.findMany.mockResolvedValue([]);
      
      const result = await service.compareOpportunities([999]);
      
      expect(result.opportunities).toHaveLength(0);
      expect(result.recommendations).toEqual({});
    });

    test('deve continuar mesmo se recomendações falharem', async () => {
      const mockOpportunities = [
        {
          id: 1,
          product: 'Tomate',
          state: 'SP',
          city: 'São Paulo',
          lat: -23.5505,
          lng: -46.6333,
          buyPrice: 2.5,
          sellPrice: 4.0,
          sellLocation: 'CEASA - SP',
          destLat: -23.5505,
          destLng: -46.6333,
          roi: 60,
          freight: 0.5,
          riskLevel: 1,
          volume: '1000 kg',
          season: 'Verão',
          createdAt: new Date()
        }
      ];
      
      mockPrisma.opportunity.findMany.mockResolvedValue(mockOpportunities);
      mockPythonAxios.post.mockRejectedValue(new Error('Python service error'));
      
      const result = await service.compareOpportunities([1]);
      
      expect(result.opportunities).toHaveLength(1);
      expect(result.opportunities[0].recommendation).toBeNull();
    });
  });

  describe('getPriceHistory', () => {
    test('deve retornar histórico de preços com estatísticas', async () => {
      const mockOpportunity = {
        id: 1,
        product: 'Tomate',
        state: 'SP',
        city: 'São Paulo',
        sellPrice: 4.0
      };
      
      const mockHistory = [
        { id: 1, price: 3.5, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
        { id: 2, price: 3.8, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
        { id: 3, price: 4.0, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
      ];
      
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.priceHistory.findMany.mockResolvedValue(mockHistory);
      
      const result = await service.getPriceHistory(1, 30);
      
      expect(result).not.toBeNull();
      expect(result.opportunity.id).toBe(1);
      expect(result.history).toHaveLength(3);
      expect(mockPrisma.priceHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            opportunityId: 1
          })
        })
      );
    });

    test('deve retornar null quando oportunidade não encontrada', async () => {
      mockPrisma.opportunity.findUnique.mockResolvedValue(null);
      
      const result = await service.getPriceHistory(999, 30);
      
      expect(result).toBeNull();
      expect(mockPrisma.priceHistory.findMany).not.toHaveBeenCalled();
    });

    test('deve respeitar parâmetro days', async () => {
      const mockOpportunity = {
        id: 1,
        product: 'Tomate',
        state: 'SP',
        city: 'São Paulo',
        sellPrice: 4.0
      };
      
      mockPrisma.opportunity.findUnique.mockResolvedValue(mockOpportunity);
      mockPrisma.priceHistory.findMany.mockResolvedValue([]);
      
      await service.getPriceHistory(1, 90);
      
      const callArgs = mockPrisma.priceHistory.findMany.mock.calls[0][0];
      const dateLimit = callArgs.where.createdAt.gte;
      const expectedDate = new Date();
      expectedDate.setDate(expectedDate.getDate() - 90);
      
      // Verifica se a data limite está próxima (dentro de 1 hora de diferença)
      expect(Math.abs(dateLimit - expectedDate)).toBeLessThan(60 * 60 * 1000);
    });
  });
});

