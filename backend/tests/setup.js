// backend/tests/setup.js
/**
 * Configuração global para testes Jest
 * 
 * Configura mocks e variáveis de ambiente antes de rodar os testes.
 */

// Mock de variáveis de ambiente
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.PYTHON_API_URL = 'http://localhost:8000';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Suprime logs durante testes (opcional - descomente se quiser ver logs)
// const logger = require('../utils/logger');
// logger.transports.forEach(t => t.silent = true);

// Limpa mocks após cada teste
afterEach(() => {
  jest.clearAllMocks();
});

