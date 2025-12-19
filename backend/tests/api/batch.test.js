// backend/tests/api/batch.test.js
/**
 * Testes para o endpoint /api/ai/batch
 * 
 * Testa:
 * - Validação de payload
 * - Sanitização de dados
 * - Integração com Python
 * - Tratamento de erros
 */

const request = require('supertest');
const axios = require('axios');
const { getAuthHeaders } = require('../helpers/authHelper');

// Mock de dependências
jest.mock('axios');
jest.mock('../../utils/prisma', () => require('../__mocks__/prisma'));

let app;
beforeAll(() => {
  const express = require('express');
  app = express();
  app.use(express.json());
  
  const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }
    req.user = { id: 'test-user-id', email: 'test@agro.com', role: 'user' };
    next();
  };
  
  // Rota de teste (simula /api/ai/batch)
  app.post('/api/ai/batch', verifyToken, async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: 'req.body não disponível' });
      }
      
      if (!req.body.items || !Array.isArray(req.body.items)) {
        return res.status(400).json({ error: "Payload inválido: 'items' obrigatório" });
      }
      
      const sanitizedItems = req.body.items.map(item => {
        const financials = item.financials || {};
        const origin = item.origin || {};
        const coords = item.coords || {};
        
        return {
          id: parseInt(item.id),
          product: item.product || 'Tomate',
          state: origin.state || 'SP',
          lat: Number(coords.lat) || 0.0,
          lng: Number(coords.lng) || 0.0,
          accumulated_rainfall: 0.0,
          storage_cost_per_day: 0.03,
          current_price: Number(financials.sellPrice) || 0.0,
          buy_price: Number(financials.buyPrice) || 0.0
        };
      });
      
      // Chama Python
      const response = await axios.post(
        `${process.env.PYTHON_API_URL || 'http://localhost:8000'}/api/v1/predict/batch`,
        { items: sanitizedItems },
        { timeout: 60000 }
      );
      
      res.json(response.data);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: 'Serviço Python indisponível',
          details: 'O serviço de IA não está respondendo.'
        });
      }
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ 
          error: 'Timeout ao processar batch',
          details: 'O serviço demorou muito para responder (60s)'
        });
      }
      res.status(500).json({ 
        error: 'Erro ao processar batch',
        details: error.message
      });
    }
  });
});

describe('POST /api/ai/batch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('deve retornar 401 sem token', async () => {
    const response = await request(app)
      .post('/api/ai/batch')
      .send({ items: [] })
      .expect(401);
    
    expect(response.body.error).toContain('Token de autenticação');
  });
  
  test('deve retornar 400 se items não for array', async () => {
    const response = await request(app)
      .post('/api/ai/batch')
      .set(getAuthHeaders())
      .send({ items: 'not-an-array' })
      .expect(400);
    
    expect(response.body.error).toContain("'items' obrigatório");
  });
  
  test('deve retornar 400 se items não existir', async () => {
    const response = await request(app)
      .post('/api/ai/batch')
      .set(getAuthHeaders())
      .send({})
      .expect(400);
    
    expect(response.body.error).toContain("'items' obrigatório");
  });
  
  test('deve sanitizar dados corretamente', async () => {
    const mockPythonResponse = {
      data: {
        results: [
          {
            id: 1,
            forecast: { price: 4.5, confidence: 0.8 }
          }
        ]
      }
    };
    
    axios.post.mockResolvedValue(mockPythonResponse);
    
    const payload = {
      items: [
        {
          id: '1', // String será convertida para int
          product: 'Tomate',
          origin: { state: 'SP' },
          coords: { lat: '-23.5505', lng: '-46.6333' }, // Strings serão convertidas
          financials: {
            buyPrice: '2.5', // String será convertida
            sellPrice: '4.0'
          }
        }
      ]
    };
    
    const response = await request(app)
      .post('/api/ai/batch')
      .set(getAuthHeaders())
      .send(payload)
      .expect(200);
    
    // Verifica que Python foi chamado com dados sanitizados
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/predict/batch'),
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            id: 1, // Convertido para int
            product: 'Tomate',
            state: 'SP',
            lat: -23.5505, // Convertido para número
            lng: -46.6333,
            current_price: 4.0, // Convertido
            buy_price: 2.5
          })
        ])
      }),
      expect.any(Object)
    );
    
    expect(response.body.results).toBeDefined();
  });
  
  test('deve usar valores padrão quando campos faltarem', async () => {
    const mockPythonResponse = { data: { results: [] } };
    axios.post.mockResolvedValue(mockPythonResponse);
    
    const payload = {
      items: [
        {
          id: 1
          // Sem product, origin, coords, financials
        }
      ]
    };
    
    await request(app)
      .post('/api/ai/batch')
      .set(getAuthHeaders())
      .send(payload)
      .expect(200);
    
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        items: expect.arrayContaining([
          expect.objectContaining({
            product: 'Tomate', // Padrão
            state: 'SP', // Padrão
            lat: 0.0, // Padrão
            lng: 0.0,
            accumulated_rainfall: 0.0,
            storage_cost_per_day: 0.03
          })
        ])
      }),
      expect.any(Object)
    );
  });
  
  test('deve tratar erro quando Python não está disponível', async () => {
    axios.post.mockRejectedValue({ code: 'ECONNREFUSED' });
    
    const response = await request(app)
      .post('/api/ai/batch')
      .set(getAuthHeaders())
      .send({ items: [{ id: 1 }] })
      .expect(503);
    
    expect(response.body.error).toBe('Serviço Python indisponível');
  });
  
  test('deve tratar timeout do Python', async () => {
    axios.post.mockRejectedValue({ code: 'ECONNABORTED' });
    
    const response = await request(app)
      .post('/api/ai/batch')
      .set(getAuthHeaders())
      .send({ items: [{ id: 1 }] })
      .expect(504);
    
    expect(response.body.error).toBe('Timeout ao processar batch');
  });
});

