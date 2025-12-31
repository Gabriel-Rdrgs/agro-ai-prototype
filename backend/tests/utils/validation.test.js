// backend/tests/utils/validation.test.js
/**
 * ✅ TEST-001: Testes unitários para funções de validação
 * 
 * Testa:
 * - validatePrice
 * - validateOpportunityIds
 * - validateCoordinates
 * - validateId
 */

const {
  validatePrice,
  validateOpportunityIds,
  validateCoordinates,
  validateId
} = require('../../utils/validation');

// Mock do logger
jest.mock('../../utils/logger', () => ({
  warn: jest.fn(),
  error: jest.fn()
}));

describe('Validation Utils', () => {
  describe('validatePrice', () => {
    test('deve retornar preço válido quando número positivo', () => {
      const result = validatePrice(2.5, 'buyPrice', 1);
      expect(result).toBe(2.5);
    });

    test('deve retornar null quando preço inválido (NaN)', () => {
      const result = validatePrice('invalid', 'buyPrice', 1);
      expect(result).toBeNull();
    });

    test('deve retornar null quando preço negativo', () => {
      const result = validatePrice(-5, 'buyPrice', 1);
      expect(result).toBeNull();
    });

    test('deve retornar null quando preço zero', () => {
      const result = validatePrice(0, 'buyPrice', 1);
      expect(result).toBeNull();
    });

    test('deve validar preço suspeito (> 20) mas ainda retornar', () => {
      const result = validatePrice(25, 'buyPrice', 1);
      expect(result).toBe(25); // Ainda retorna, mas loga aviso
    });

    test('deve funcionar sem opportunityId', () => {
      const result = validatePrice(2.5, 'buyPrice');
      expect(result).toBe(2.5);
    });
  });

  describe('validateOpportunityIds', () => {
    test('deve retornar válido quando array não vazio', () => {
      const result = validateOpportunityIds([1, 2, 3]);
      expect(result.valid).toBe(true);
      expect(result.ids).toEqual([1, 2, 3]);
    });

    test('deve retornar inválido quando não é array', () => {
      const result = validateOpportunityIds('not an array');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('array não vazio');
    });

    test('deve retornar inválido quando array vazio', () => {
      const result = validateOpportunityIds([]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('array não vazio');
    });

    test('deve retornar inválido quando mais de 5 IDs', () => {
      const result = validateOpportunityIds([1, 2, 3, 4, 5, 6]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Máximo de 5');
    });

    test('deve filtrar IDs inválidos', () => {
      const result = validateOpportunityIds([1, 'invalid', 3, -5, 0]);
      expect(result.valid).toBe(true);
      expect(result.ids).toEqual([1, 3]); // Apenas IDs válidos
    });

    test('deve retornar inválido quando nenhum ID válido', () => {
      const result = validateOpportunityIds(['invalid', -5, 0]);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Nenhum ID válido');
    });
  });

  describe('validateCoordinates', () => {
    test('deve retornar válido quando coordenadas corretas', () => {
      const result = validateCoordinates(-23.5505, -46.6333);
      expect(result.valid).toBe(true);
      expect(result.lat).toBe(-23.5505);
      expect(result.lng).toBe(-46.6333);
    });

    test('deve retornar inválido quando lat não é número', () => {
      const result = validateCoordinates('invalid', -46.6333);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('números válidos');
    });

    test('deve retornar inválido quando lng não é número', () => {
      const result = validateCoordinates(-23.5505, 'invalid');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('números válidos');
    });

    test('deve retornar inválido quando lat fora do range', () => {
      const result = validateCoordinates(91, -46.6333);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Latitude');
    });

    test('deve retornar inválido quando lng fora do range', () => {
      const result = validateCoordinates(-23.5505, 181);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Longitude');
    });

    test('deve aceitar coordenadas nos limites', () => {
      const result1 = validateCoordinates(90, 180);
      const result2 = validateCoordinates(-90, -180);
      
      expect(result1.valid).toBe(true);
      expect(result2.valid).toBe(true);
    });
  });

  describe('validateId', () => {
    test('deve retornar válido quando ID positivo', () => {
      const result = validateId(1, 'ID de oportunidade');
      expect(result.valid).toBe(true);
      expect(result.id).toBe(1);
    });

    test('deve retornar válido quando ID como string', () => {
      const result = validateId('123', 'ID de oportunidade');
      expect(result.valid).toBe(true);
      expect(result.id).toBe(123);
    });

    test('deve retornar inválido quando não é número', () => {
      const result = validateId('invalid', 'ID de oportunidade');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('número positivo');
    });

    test('deve retornar inválido quando zero', () => {
      const result = validateId(0, 'ID de oportunidade');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('número positivo');
    });

    test('deve retornar inválido quando negativo', () => {
      const result = validateId(-5, 'ID de oportunidade');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('número positivo');
    });

    test('deve usar fieldName na mensagem de erro', () => {
      const result = validateId('invalid', 'Custom Field');
      expect(result.error).toContain('Custom Field');
    });
  });
});

