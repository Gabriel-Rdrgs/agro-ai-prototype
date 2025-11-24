// frontend/src/services/storageService.js

const STORAGE_KEY = 'agro_roi_scenarios';

export const StorageService = {
  // Salva um cenário
  saveScenario: (scenario) => {
    try {
      const current = StorageService.getScenarios();
      const updated = [
        { ...scenario, id: Date.now(), savedAt: new Date() }, 
        ...current
      ].slice(0, 10);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event('storage'));
      return true;
    } catch (e) {
      console.error("Erro ao salvar cenário:", e);
      return false;
    }
  },

  // Busca a lista de cenários (Versão Nova)
  getScenarios: () => {
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  },

  // --- CORREÇÃO DO ERRO ---
  // Mantemos o nome 'getAll' para não quebrar seu Dashboard antigo.
  // Ela faz a mesma coisa que a getScenarios.
  getAll: () => {
    return StorageService.getScenarios();
  },

  clearScenarios: () => {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event('storage'));
  }
};