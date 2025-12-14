/**
 * Utilitário para verificar época de plantio baseado no calendário ZARC/Embrapa
 * Replica a lógica de ai-service/config/calendar.py
 */

// Calendário simplificado (meses ideais por produto/estado)
// Baseado em ai-service/config/calendar.py
const PLANTING_CALENDAR = {
  'Tomate': {
    'SP': { ideal: [2, 3, 4, 5, 6], risk: [1, 12] },
    'MG': { ideal: [2, 3, 4, 5, 6, 7], risk: [12, 1] },
    'RJ': { ideal: [2, 3, 4, 5, 6, 7], risk: [12, 1] },
    'ES': { ideal: [2, 3, 4, 5, 6, 7], risk: [12, 1] },
    'PR': { ideal: [8, 9, 10, 11, 12, 1], risk: [6, 7] },
    'RS': { ideal: [8, 9, 10, 11, 12, 1], risk: [6, 7] },
    'SC': { ideal: [8, 9, 10, 11, 12, 1], risk: [6, 7] },
    'GO': { ideal: [3, 4, 5, 6, 7, 8, 9, 10], risk: [1, 2] },
    'MT': { ideal: [3, 4, 5, 6, 7, 8, 9, 10], risk: [1, 2] },
    'MS': { ideal: [3, 4, 5, 6, 7, 8, 9, 10], risk: [1, 2] },
    'BA': { ideal: [3, 4, 5, 6], risk: [] },
    'CE': { ideal: [3, 4, 5, 6], risk: [] },
    'PE': { ideal: [3, 4, 5, 6], risk: [] },
    'PA': { ideal: [3, 4, 5, 6, 7, 8, 9, 10], risk: [11, 12, 1, 2] },
    'AM': { ideal: [3, 4, 5, 6, 7, 8, 9, 10], risk: [11, 12, 1, 2] }
  },
  'Soja': {
    'MT': { ideal: [9, 10, 11], risk: [6, 7, 8] },
    'RS': { ideal: [10, 11, 12], risk: [5, 6] }
  }
};

/**
 * Obtém o mês atual (1-12)
 */
export function getCurrentMonth() {
  return new Date().getMonth() + 1; // Janeiro = 1, Dezembro = 12
}

/**
 * Verifica se uma oportunidade está na época ideal de plantio
 */
export function isIdealPlantingSeason(product, state) {
  const calendar = PLANTING_CALENDAR[product];
  if (!calendar) return null; // Produto não encontrado
  
  const stateData = calendar[state];
  if (!stateData) return null; // Estado não encontrado
  
  const currentMonth = getCurrentMonth();
  return stateData.ideal.includes(currentMonth);
}

/**
 * Verifica se uma oportunidade está na época de risco de plantio
 */
export function isRiskPlantingSeason(product, state) {
  const calendar = PLANTING_CALENDAR[product];
  if (!calendar) return null;
  
  const stateData = calendar[state];
  if (!stateData) return null;
  
  const currentMonth = getCurrentMonth();
  return stateData.risk.includes(currentMonth);
}

/**
 * Verifica se uma oportunidade está fora de época (nem ideal nem risco)
 */
export function isOutOfSeason(product, state) {
  const ideal = isIdealPlantingSeason(product, state);
  const risk = isRiskPlantingSeason(product, state);
  
  if (ideal === null || risk === null) return null; // Dados não disponíveis
  
  return !ideal && !risk;
}

/**
 * Retorna o status da época de plantio para uma oportunidade
 * @returns 'ideal' | 'risk' | 'out' | null (null = dados não disponíveis)
 */
export function getPlantingSeasonStatus(product, state) {
  if (isIdealPlantingSeason(product, state)) return 'ideal';
  if (isRiskPlantingSeason(product, state)) return 'risk';
  if (isOutOfSeason(product, state)) return 'out';
  return null; // Dados não disponíveis
}

/**
 * Retorna informações completas sobre a época de plantio
 */
export function getPlantingSeasonInfo(product, state) {
  const calendar = PLANTING_CALENDAR[product];
  if (!calendar) {
    return {
      status: null,
      ideal: [],
      risk: [],
      currentMonth: getCurrentMonth(),
      available: false
    };
  }
  
  const stateData = calendar[state];
  if (!stateData) {
    return {
      status: null,
      ideal: [],
      risk: [],
      currentMonth: getCurrentMonth(),
      available: false
    };
  }
  
  return {
    status: getPlantingSeasonStatus(product, state),
    ideal: stateData.ideal || [],
    risk: stateData.risk || [],
    currentMonth: getCurrentMonth(),
    available: true
  };
}
