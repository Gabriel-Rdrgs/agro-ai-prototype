// backend/tests/__mocks__/axios.js
/**
 * Mock do Axios para testes
 * 
 * Permite simular chamadas HTTP para serviços externos (Python, APIs, etc.)
 */

const mockAxios = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  patch: jest.fn(),
  create: jest.fn(() => mockAxios),
  defaults: {
    headers: {
      common: {}
    }
  }
};

module.exports = mockAxios;

