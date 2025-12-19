// backend/tests/auth/rbac.test.js
/**
 * Testes específicos para RBAC em rotas reais do sistema
 * 
 * Testa rotas que realmente usam checkRole(['admin'])
 */

const request = require('supertest');

// Mock de dependências
jest.mock('../../utils/supabase', () => ({
  auth: {
    getUser: jest.fn()
  }
}));

jest.mock('../../utils/jobQueue', () => ({
  createJob: jest.fn(() => 'job-123'),
  startJob: jest.fn(),
  updateProgress: jest.fn()
}));

jest.mock('../../utils/cache', () => ({
  invalidatePattern: jest.fn()
}));

jest.mock('../../services/auditService', () => ({
  logAction: jest.fn()
}));

const supabase = require('../../utils/supabase');

let app;
beforeAll(() => {
  const express = require('express');
  app = express();
  app.use(express.json());
  
  const { verifyToken, checkRole } = require('../../authMiddleware');
  const jobQueue = require('../../utils/jobQueue');
  const { logAction } = require('../../services/auditService');
  
  // Simula rota ETL (requer admin)
  app.post('/api/admin/etl/start', verifyToken, checkRole(['admin']), async (req, res) => {
    try {
      const userId = req.user?.id || 'system';
      const { type = 'all', skipIbge = false } = req.body;
      
      await logAction(userId, 'ETL_START', `Iniciado ETL tipo: ${type}`);
      
      const jobId = jobQueue.createJob('etl', { type, skipIbge });
      
      jobQueue.startJob(jobId, async () => {
        // Simula processamento
        return { success: true };
      });
      
      res.json({
        success: true,
        jobId,
        message: 'ETL iniciado em background'
      });
    } catch (error) {
      res.status(500).json({
        error: 'Erro ao iniciar ETL',
        details: error.message
      });
    }
  });
  
  // Simula rota de registro (requer admin)
  app.post('/api/auth/register', verifyToken, checkRole(['admin']), async (req, res) => {
    res.json({
      success: true,
      message: 'Usuário registrado'
    });
  });
});

describe('RBAC em Rotas Reais', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/admin/etl/start', () => {
    test('deve permitir acesso admin', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@agro.com',
        user_metadata: { role: 'admin' }
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockAdmin },
        error: null
      });
      
      const response = await request(app)
        .post('/api/admin/etl/start')
        .set('Authorization', 'Bearer admin-token')
        .send({ type: 'all' })
        .expect(200);
      
      expect(response.body.success).toBe(true);
      expect(response.body.jobId).toBeDefined();
    });
    
    test('deve negar acesso user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@agro.com',
        user_metadata: { role: 'user' }
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .post('/api/admin/etl/start')
        .set('Authorization', 'Bearer user-token')
        .send({ type: 'all' })
        .expect(403);
      
      expect(response.body.error).toContain('Acesso Proibido');
    });
    
    test('deve negar acesso sem autenticação', async () => {
      const response = await request(app)
        .post('/api/admin/etl/start')
        .send({ type: 'all' })
        .expect(401);
      
      expect(response.body.error).toContain('Token de autenticação');
    });
  });
  
  describe('POST /api/auth/register', () => {
    test('deve permitir acesso admin', async () => {
      const mockAdmin = {
        id: 'admin-123',
        email: 'admin@agro.com',
        user_metadata: { role: 'admin' }
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockAdmin },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', 'Bearer admin-token')
        .send({
          email: 'newuser@agro.com',
          password: 'password123'
        })
        .expect(200);
      
      expect(response.body.success).toBe(true);
    });
    
    test('deve negar acesso user', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@agro.com',
        user_metadata: { role: 'user' }
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .post('/api/auth/register')
        .set('Authorization', 'Bearer user-token')
        .send({
          email: 'newuser@agro.com',
          password: 'password123'
        })
        .expect(403);
      
      expect(response.body.error).toContain('Acesso Proibido');
    });
  });
  
  describe('Cenários de Edge Cases', () => {
    test('deve tratar erro quando Supabase retorna erro inesperado', async () => {
      supabase.auth.getUser.mockRejectedValue(new Error('Network error'));
      
      const response = await request(app)
        .post('/api/admin/etl/start')
        .set('Authorization', 'Bearer token')
        .send({ type: 'all' })
        .expect(500);
      
      expect(response.body.error).toContain('Erro interno');
    });
    
    test('deve tratar caso onde user existe mas sem metadata', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@agro.com'
        // Sem user_metadata
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .post('/api/admin/etl/start')
        .set('Authorization', 'Bearer token')
        .send({ type: 'all' })
        .expect(403);
      
      // Deve usar role padrão 'user' e negar acesso
      expect(response.body.error).toContain('Acesso Proibido');
    });
  });
});

