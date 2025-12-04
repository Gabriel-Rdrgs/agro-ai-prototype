// frontend/src/hooks/useOpportunities.js
import { useState, useEffect } from 'react';
import api from '../services/api';

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        // Chama a rota que acabamos de atualizar no Backend
        const response = await api.get('/opportunities');
        
        // O Backend já entrega no formato perfeito, só salvamos
        setOpportunities(response.data);
      } catch (err) {
        console.error("Erro ao carregar oportunidades:", err);
        setError("Falha ao carregar dados da inteligência.");
      } finally {
        setLoading(false);
      }
    }

    loadData();
    
    // Opcional: Polling para atualizar a cada 30s se quiser "Live Data"
    // const interval = setInterval(loadData, 30000);
    // return () => clearInterval(interval);

  }, []);

  return { opportunities, loading, error };
}