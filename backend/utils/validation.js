// backend/utils/validation.js
// ✅ REFACTOR-002: Extrai funções duplicadas de validação

const logger = require('./logger');
const { PRICE_VALIDATION } = require('../config/constants');

/**
 * Valida e normaliza preço
 * ✅ REFACTOR-002: Extraído de múltiplos lugares no server.js
 * 
 * @param {number|string} price - Preço a validar
 * @param {string} field - Nome do campo (para logs)
 * @param {number} opportunityId - ID da oportunidade (para logs)
 * @returns {number|null} - Preço validado ou null se inválido
 */
function validatePrice(price, field = 'price', opportunityId = null) {
  const parsed = parseFloat(price);
  
  // Verifica se é NaN ou inválido
  if (isNaN(parsed) || parsed <= 0) {
    if (opportunityId) {
      logger.warn(`⚠️ [${opportunityId}] ${field} inválido: ${price}`);
    }
    return null;
  }
  
  // Verifica se é suspeito (dado legado em caixa)
  if (parsed > PRICE_VALIDATION.SUSPICIOUS_THRESHOLD) {
    logger.warn(
      `⚠️ [${opportunityId || 'unknown'}] ${field} suspeito (R$ ${parsed}) - possível dado legado em caixa. ` +
      `Execute migrate_units_to_kg.py se necessário.`
    );
  }
  
  return parsed;
}

/**
 * Valida array de IDs de oportunidades
 * 
 * @param {any} opportunityIds - Array de IDs a validar
 * @returns {{valid: boolean, ids: number[], error?: string}} - Resultado da validação
 */
function validateOpportunityIds(opportunityIds) {
  if (!Array.isArray(opportunityIds) || opportunityIds.length === 0) {
    return {
      valid: false,
      ids: [],
      error: 'opportunityIds deve ser um array não vazio'
    };
  }
  
  if (opportunityIds.length > 5) {
    return {
      valid: false,
      ids: [],
      error: 'Máximo de 5 oportunidades por comparação'
    };
  }
  
  // Converte para números e filtra inválidos
  const ids = opportunityIds
    .map(id => parseInt(id, 10))
    .filter(id => !isNaN(id) && id > 0);
  
  if (ids.length === 0) {
    return {
      valid: false,
      ids: [],
      error: 'Nenhum ID válido encontrado'
    };
  }
  
  return {
    valid: true,
    ids
  };
}

/**
 * Valida coordenadas geográficas
 * 
 * @param {number|string} lat - Latitude
 * @param {number|string} lng - Longitude
 * @returns {{valid: boolean, lat?: number, lng?: number, error?: string}}
 */
function validateCoordinates(lat, lng) {
  const parsedLat = parseFloat(lat);
  const parsedLng = parseFloat(lng);
  
  if (isNaN(parsedLat) || isNaN(parsedLng)) {
    return {
      valid: false,
      error: 'Lat e Lng devem ser números válidos'
    };
  }
  
  if (parsedLat < -90 || parsedLat > 90) {
    return {
      valid: false,
      error: 'Latitude deve estar entre -90 e 90'
    };
  }
  
  if (parsedLng < -180 || parsedLng > 180) {
    return {
      valid: false,
      error: 'Longitude deve estar entre -180 e 180'
    };
  }
  
  return {
    valid: true,
    lat: parsedLat,
    lng: parsedLng
  };
}

/**
 * Valida ID numérico
 * 
 * @param {any} id - ID a validar
 * @param {string} fieldName - Nome do campo (para mensagens de erro)
 * @returns {{valid: boolean, id?: number, error?: string}}
 */
function validateId(id, fieldName = 'ID') {
  const parsed = parseInt(id, 10);
  
  if (isNaN(parsed) || parsed <= 0) {
    return {
      valid: false,
      error: `${fieldName} deve ser um número positivo`
    };
  }
  
  return {
    valid: true,
    id: parsed
  };
}

module.exports = {
  validatePrice,
  validateOpportunityIds,
  validateCoordinates,
  validateId
};

