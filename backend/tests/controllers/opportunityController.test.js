// backend/tests/controllers/opportunityController.test.js
/**
 * ✅ TEST-001: Testes unitários para OpportunityController
 * 
 * Testa:
 * - list (delegação para service, tratamento de erros)
 * - compare (validação, delegação para service)
 * - getHistory (validação, cálculo de estatísticas)
 */

const OpportunityController = require('../../controllers/opportunityController');
const OpportunityService = require('../../services/opportunityService');
const { validateOpportunityIds, validateId } = require('../../utils/validation');

// Mock de dependências
jest.mock('../../services/opportunityService');
jest.mock('../../utils/validation');
jest.mock('../../utils/logger', () => ({
  error: jest.fn(),
  warn: jest.fn(),
  info: jest.fn(),
  debug: jest.fn()
}));

describe('OpportunityController', () => {
  let controller;
  let mockPythonAxios;
  let mockGetDollarRate;
  let mockService;

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockPythonAxios = {
      post: jest.fn()
    };
    
    mockGetDollarRate = jest.fn().mockResolvedValue(5.50);
    
    // Mock do service
    mockService = {
      listOpportunities: jest.fn(),
      compareOpportunities: jest.fn(),
      getPriceHistory: jest.fn()
    };
    
    OpportunityService.mockImplementation(() => mockService);
    
    controller = new OpportunityController(mockPythonAxios, mockGetDollarRate);
  });

  describe('list', () => {
    test('deve retornar oportunidades do service', async () => {
      const mockOpportunities = [
        { id: 1, product: 'Tomate' },
        { id: 2, product: 'Soja' }
      ];
      
      mockService.listOpportunities.mockResolvedValue(mockOpportunities);
      
      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.list(req, res);
      
      expect(mockService.listOpportunities).toHaveBeenCalledWith({});
      expect(res.json).toHaveBeenCalledWith(mockOpportunities);
    });

    test('deve tratar erros e retornar 500', async () => {
      mockService.listOpportunities.mockRejectedValue(new Error('Database error'));
      
      const req = { query: {} };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.list(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Erro ao buscar oportunidades' });
    });
  });

  describe('compare', () => {
    test('deve validar opportunityIds e retornar comparação', async () => {
      const mockResult = {
        opportunities: [
          { id: 1, product: 'Tomate', recommendation: 'BUY' },
          { id: 2, product: 'Soja', recommendation: 'WAIT' }
        ],
        recommendations: {}
      };
      
      validateOpportunityIds.mockReturnValue({
        valid: true,
        ids: [1, 2]
      });
      
      mockService.compareOpportunities.mockResolvedValue(mockResult);
      
      const req = {
        body: { opportunityIds: [1, 2] }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.compare(req, res);
      
      expect(validateOpportunityIds).toHaveBeenCalledWith([1, 2]);
      expect(mockService.compareOpportunities).toHaveBeenCalledWith([1, 2]);
      expect(res.json).toHaveBeenCalledWith(mockResult.opportunities);
    });

    test('deve retornar 400 quando validação falhar', async () => {
      validateOpportunityIds.mockReturnValue({
        valid: false,
        error: 'opportunityIds deve ser um array não vazio'
      });
      
      const req = {
        body: { opportunityIds: [] }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.compare(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'opportunityIds deve ser um array não vazio'
      });
      expect(mockService.compareOpportunities).not.toHaveBeenCalled();
    });

    test('deve retornar 404 quando nenhuma oportunidade encontrada', async () => {
      validateOpportunityIds.mockReturnValue({
        valid: true,
        ids: [999]
      });
      
      mockService.compareOpportunities.mockResolvedValue({
        opportunities: [],
        recommendations: {}
      });
      
      const req = {
        body: { opportunityIds: [999] }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.compare(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Nenhuma oportunidade encontrada'
      });
    });

    test('deve tratar erros e retornar 500', async () => {
      validateOpportunityIds.mockReturnValue({
        valid: true,
        ids: [1, 2]
      });
      
      mockService.compareOpportunities.mockRejectedValue(new Error('Service error'));
      
      const req = {
        body: { opportunityIds: [1, 2] }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.compare(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erro ao comparar oportunidades'
      });
    });
  });

  describe('getHistory', () => {
    test('deve validar ID e retornar histórico com estatísticas', async () => {
      const mockResult = {
        opportunity: {
          id: 1,
          product: 'Tomate',
          state: 'SP',
          city: 'São Paulo',
          sellPrice: 4.0
        },
        history: [
          { id: 1, price: 3.5, createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) },
          { id: 2, price: 3.8, createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
          { id: 3, price: 4.0, createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000) }
        ]
      };
      
      validateId.mockReturnValue({
        valid: true,
        id: 1
      });
      
      mockService.getPriceHistory.mockResolvedValue(mockResult);
      
      const req = {
        params: { id: '1' },
        query: { days: '30' }
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.getHistory(req, res);
      
      expect(validateId).toHaveBeenCalledWith('1', 'ID de oportunidade');
      expect(mockService.getPriceHistory).toHaveBeenCalledWith(1, 30);
      expect(res.json).toHaveBeenCalled();
      
      const responseData = res.json.mock.calls[0][0];
      expect(responseData).toHaveProperty('labels');
      expect(responseData).toHaveProperty('prices');
      expect(responseData).toHaveProperty('avgPrice');
      expect(responseData).toHaveProperty('minPrice');
      expect(responseData).toHaveProperty('maxPrice');
      expect(responseData).toHaveProperty('currentPrice');
      expect(responseData).toHaveProperty('trend');
    });

    test('deve retornar 400 quando ID inválido', async () => {
      validateId.mockReturnValue({
        valid: false,
        error: 'ID de oportunidade deve ser um número positivo'
      });
      
      const req = {
        params: { id: 'invalid' },
        query: {}
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.getHistory(req, res);
      
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'ID de oportunidade deve ser um número positivo'
      });
      expect(mockService.getPriceHistory).not.toHaveBeenCalled();
    });

    test('deve retornar 404 quando oportunidade não encontrada', async () => {
      validateId.mockReturnValue({
        valid: true,
        id: 999
      });
      
      mockService.getPriceHistory.mockResolvedValue(null);
      
      const req = {
        params: { id: '999' },
        query: {}
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.getHistory(req, res);
      
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Oportunidade não encontrada'
      });
    });

    test('deve usar padrão de 30 dias quando days não especificado', async () => {
      const mockResult = {
        opportunity: {
          id: 1,
          product: 'Tomate',
          state: 'SP',
          city: 'São Paulo',
          sellPrice: 4.0
        },
        history: []
      };
      
      validateId.mockReturnValue({
        valid: true,
        id: 1
      });
      
      mockService.getPriceHistory.mockResolvedValue(mockResult);
      
      const req = {
        params: { id: '1' },
        query: {}
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.getHistory(req, res);
      
      expect(mockService.getPriceHistory).toHaveBeenCalledWith(1, 30);
    });

    test('deve tratar erros e retornar 500', async () => {
      validateId.mockReturnValue({
        valid: true,
        id: 1
      });
      
      mockService.getPriceHistory.mockRejectedValue(new Error('Service error'));
      
      const req = {
        params: { id: '1' },
        query: {}
      };
      const res = {
        json: jest.fn(),
        status: jest.fn().mockReturnThis()
      };
      
      await controller.getHistory(req, res);
      
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Erro ao buscar histórico de preços'
      });
    });
  });
});

