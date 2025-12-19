// backend/tests/helpers/authHelper.js
/**
 * Helpers para autenticação em testes
 */

const jwt = require('jsonwebtoken');

/**
 * Gera um token JWT válido para testes
 * 
 * @param {Object} payload - Payload do token (user, role, etc.)
 * @returns {string} Token JWT
 */
function generateTestToken(payload = {}) {
  const defaultPayload = {
    id: 'test-user-id',
    email: 'test@agro.com',
    role: 'user',
    ...payload
  };
  
  return jwt.sign(defaultPayload, process.env.JWT_SECRET || 'test-jwt-secret', {
    expiresIn: '1h'
  });
}

/**
 * Cria headers de autenticação para requisições de teste
 * 
 * @param {Object} payload - Payload do token
 * @returns {Object} Headers com Authorization
 */
function getAuthHeaders(payload = {}) {
  const token = generateTestToken(payload);
  return {
    Authorization: `Bearer ${token}`
  };
}

module.exports = {
  generateTestToken,
  getAuthHeaders
};

