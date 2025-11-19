const STORAGE_KEY = 'agro_ai_saved_scenarios';

export const StorageService = {
  // Salva um novo cenário
  save: (scenario) => {
    const current = StorageService.getAll();
    // Adiciona ID único e Data de criação
    const newScenario = { 
      ...scenario, 
      id: Date.now(), 
      savedAt: new Date().toISOString() 
    };
    // Salva no topo da lista (mais recente primeiro)
    const updated = [newScenario, ...current];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return newScenario;
  },

  // Busca todos os cenários
  getAll: () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Deleta um cenário pelo ID
  delete: (id) => {
    const current = StorageService.getAll();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  }
};