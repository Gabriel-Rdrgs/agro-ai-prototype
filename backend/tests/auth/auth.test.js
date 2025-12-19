// backend/tests/auth/auth.test.js
/**
 * Testes para autenticação e RBAC
 * 
 * Testa:
 * - verifyToken (validação de token JWT)
 * - checkRole (verificação de roles)
 * - Rotas protegidas com RBAC
 */

const request = require('supertest');
const { generateTestToken, getAuthHeaders } = require('../helpers/authHelper');

// Mock de dependências
jest.mock('../../utils/supabase', () => ({
  auth: {
    getUser: jest.fn()
  }
}));

const supabase = require('../../utils/supabase');

let app;
beforeAll(() => {
  const express = require('express');
  app = express();
  app.use(express.json());
  
  // Importa middlewares reais
  const { verifyToken, checkRole } = require('../../authMiddleware');
  
  // Rota pública (sem autenticação)
  app.get('/api/public', (req, res) => {
    res.json({ message: 'Public endpoint' });
  });
  
  // Rota protegida (requer autenticação)
  app.get('/api/protected', verifyToken, (req, res) => {
    res.json({ 
      message: 'Protected endpoint',
      user: req.user 
    });
  });
  
  // Rota admin (requer autenticação + role admin)
  app.get('/api/admin/only', verifyToken, checkRole(['admin']), (req, res) => {
    res.json({ 
      message: 'Admin endpoint',
      user: req.user 
    });
  });
  
  // Rota que aceita múltiplas roles
  app.get('/api/moderator', verifyToken, checkRole(['admin', 'moderator']), (req, res) => {
    res.json({ 
      message: 'Moderator endpoint',
      user: req.user 
    });
  });
});

describe('Autenticação e RBAC', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('verifyToken', () => {
    test('deve permitir acesso a rota pública sem token', async () => {
      const response = await request(app)
        .get('/api/public')
        .expect(200);
      
      expect(response.body.message).toBe('Public endpoint');
    });
    
    test('deve retornar 401 sem token em rota protegida', async () => {
      const response = await request(app)
        .get('/api/protected')
        .expect(401);
      
      expect(response.body.error).toContain('Token de autenticação não fornecido');
    });
    
    test('deve retornar 401 com token inválido', async () => {
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Invalid token' }
      });
      
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
      
      expect(response.body.error).toContain('Sessão inválida ou expirada');
    });
    
    test('deve permitir acesso com token válido', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@agro.com',
        user_metadata: { role: 'user' }
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.message).toBe('Protected endpoint');
      expect(response.body.user.id).toBe('user-123');
      expect(response.body.user.email).toBe('test@agro.com');
      expect(response.body.user.role).toBe('user');
    });
    
    test('deve usar role padrão "user" quando não especificada', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@agro.com',
        user_metadata: {} // Sem role
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
      
      expect(response.body.user.role).toBe('user'); // Padrão
    });
  });
  
  describe('checkRole', () => {
    test('deve permitir acesso admin a rota admin', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@agro.com',
        user_metadata: { role: 'admin' }
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .get('/api/admin/only')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);
      
      expect(response.body.message).toBe('Admin endpoint');
      expect(response.body.user.role).toBe('admin');
    });
    
    test('deve negar acesso user a rota admin', async () => {
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
        .get('/api/admin/only')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
      
      expect(response.body.error).toContain('Acesso Proibido');
    });
    
    test('deve negar acesso quando role não está definida', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@agro.com',
        user_metadata: {} // Sem role
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .get('/api/admin/only')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
      
      expect(response.body.error).toContain('Acesso Proibido');
    });
    
    test('deve permitir acesso com role moderador em rota que aceita admin ou moderator', async () => {
      const mockUser = {
        id: 'mod-123',
        email: 'mod@agro.com',
        user_metadata: { role: 'moderator' }
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .get('/api/moderator')
        .set('Authorization', 'Bearer mod-token')
        .expect(200);
      
      expect(response.body.message).toBe('Moderator endpoint');
      expect(response.body.user.role).toBe('moderator');
    });
    
    test('deve permitir acesso com role admin em rota que aceita admin ou moderator', async () => {
      const mockUser = {
        id: 'admin-123',
        email: 'admin@agro.com',
        user_metadata: { role: 'admin' }
      };
      
      supabase.auth.getUser.mockResolvedValue({
        data: { user: mockUser },
        error: null
      });
      
      const response = await request(app)
        .get('/api/moderator')
        .set('Authorization', 'Bearer admin-token')
        .expect(200);
      
      expect(response.body.message).toBe('Moderator endpoint');
    });
    
    test('deve negar acesso user em rota que aceita admin ou moderator', async () => {
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
        .get('/api/moderator')
        .set('Authorization', 'Bearer user-token')
        .expect(403);
      
      expect(response.body.error).toContain('Acesso Proibido');
    });
  });
  
  describe('Tratamento de Erros', () => {
    test('deve tratar erro interno do Supabase', async () => {
      supabase.auth.getUser.mockRejectedValue(new Error('Internal Supabase error'));
      
      const response = await request(app)
        .get('/api/protected')
        .set('Authorization', 'Bearer token')
        .expect(500);
      
      expect(response.body.error).toContain('Erro interno de autenticação');
    });
    
    test('deve tratar erro quando req.user não existe após verifyToken', async () => {
      // Simula caso onde verifyToken passa mas req.user não é populado
      // (não deveria acontecer, mas testa robustez)
      supabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      });
      
      const response = await request(app)
        .get('/api/admin/only')
        .set('Authorization', 'Bearer token')
        .expect(401);
      
      expect(response.body.error).toContain('Sessão inválida ou expirada');
    });
  });
});

