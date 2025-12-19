// backend/tests/api/chat.test.js
/**
 * Testes para o endpoint /api/ai/chat/query
 * 
 * Testa:
 * - Validação de question
 * - Proxy para Python
 * - Tratamento de erros
 */

const request = require('supertest');
const axios = require('axios');
const { getAuthHeaders } = require('../helpers/authHelper');

// Mock de dependências
jest.mock('axios');

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
  
  // Rota de teste (simula /api/ai/chat/query)
  app.post('/api/ai/chat/query', verifyToken, async (req, res) => {
    try {
      if (!req.body) {
        return res.status(400).json({ error: 'req.body não disponível' });
      }
      
      if (!req.body.question || typeof req.body.question !== 'string' || req.body.question.trim().length === 0) {
        return res.status(400).json({ 
          error: 'Campo "question" é obrigatório e deve ser uma string não vazia' 
        });
      }
      
      const safePayload = {
        question: req.body.question.trim()
      };
      
      // Chama Python
      const response = await axios.post(
        `${process.env.PYTHON_API_URL || 'http://localhost:8000'}/api/v1/chat/query`,
        safePayload,
        { timeout: 60000 }
      );
      
      const pythonData = response.data || {};
      
      res.json({
        answer: pythonData.answer || 'Desculpe, não consegui gerar uma resposta.',
        sources: pythonData.sources || []
      });
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        return res.status(503).json({ 
          error: 'Serviço Python indisponível',
          details: 'O serviço de IA não está respondendo.'
        });
      }
      if (error.code === 'ECONNABORTED') {
        return res.status(504).json({ 
          error: 'Timeout ao processar consulta RAG',
          details: 'O serviço demorou muito para responder (60s)'
        });
      }
      res.status(500).json({ 
        error: 'Erro ao processar consulta RAG',
        details: error.message
      });
    }
  });
});

describe('POST /api/ai/chat/query', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  test('deve retornar 401 sem token', async () => {
    const response = await request(app)
      .post('/api/ai/chat/query')
      .send({ question: 'Qual a temperatura ideal?' })
      .expect(401);
    
    expect(response.body.error).toContain('Token de autenticação');
  });
  
  test('deve retornar 400 se question não for fornecido', async () => {
    const response = await request(app)
      .post('/api/ai/chat/query')
      .set(getAuthHeaders())
      .send({})
      .expect(400);
    
    expect(response.body.error).toContain('question');
  });
  
  test('deve retornar 400 se question for string vazia', async () => {
    const response = await request(app)
      .post('/api/ai/chat/query')
      .set(getAuthHeaders())
      .send({ question: '   ' })
      .expect(400);
    
    expect(response.body.error).toContain('question');
  });
  
  test('deve retornar resposta do Python com sucesso', async () => {
    const mockPythonResponse = {
      data: {
        answer: 'A temperatura ideal para tomate é entre 18°C e 25°C.',
        sources: [
          'Clima e Produção de Tomates no Brasil.pdf'
        ]
      }
    };
    
    axios.post.mockResolvedValue(mockPythonResponse);
    
    const response = await request(app)
      .post('/api/ai/chat/query')
      .set(getAuthHeaders())
      .send({ question: 'Qual a temperatura ideal para tomate?' })
      .expect(200);
    
    expect(response.body.answer).toBe(mockPythonResponse.data.answer);
    expect(response.body.sources).toHaveLength(1);
    expect(axios.post).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/chat/query'),
      { question: 'Qual a temperatura ideal para tomate?' },
      expect.objectContaining({ timeout: 60000 })
    );
  });
  
  test('deve trimar espaços da question', async () => {
    const mockPythonResponse = { data: { answer: 'Resposta', sources: [] } };
    axios.post.mockResolvedValue(mockPythonResponse);
    
    await request(app)
      .post('/api/ai/chat/query')
      .set(getAuthHeaders())
      .send({ question: '   Qual a temperatura?   ' })
      .expect(200);
    
    expect(axios.post).toHaveBeenCalledWith(
      expect.any(String),
      { question: 'Qual a temperatura?' }, // Trimado
      expect.any(Object)
    );
  });
  
  test('deve usar resposta padrão se Python não retornar answer', async () => {
    const mockPythonResponse = { data: {} };
    axios.post.mockResolvedValue(mockPythonResponse);
    
    const response = await request(app)
      .post('/api/ai/chat/query')
      .set(getAuthHeaders())
      .send({ question: 'Teste' })
      .expect(200);
    
    expect(response.body.answer).toBe('Desculpe, não consegui gerar uma resposta.');
    expect(response.body.sources).toEqual([]);
  });
  
  test('deve tratar erro quando Python não está disponível', async () => {
    axios.post.mockRejectedValue({ code: 'ECONNREFUSED' });
    
    const response = await request(app)
      .post('/api/ai/chat/query')
      .set(getAuthHeaders())
      .send({ question: 'Qual a temperatura?' })
      .expect(503);
    
    expect(response.body.error).toBe('Serviço Python indisponível');
  });
  
  test('deve tratar timeout do Python', async () => {
    axios.post.mockRejectedValue({ code: 'ECONNABORTED' });
    
    const response = await request(app)
      .post('/api/ai/chat/query')
      .set(getAuthHeaders())
      .send({ question: 'Qual a temperatura?' })
      .expect(504);
    
    expect(response.body.error).toBe('Timeout ao processar consulta RAG');
  });
});

