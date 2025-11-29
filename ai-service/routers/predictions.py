# routers/predictions.py
"""
Rotas de predição e análise de armazenagem.
Endpoints: /predict/*
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import logging

from models.schemas import SimulationRequest, StorageAnalysisResponse
from services.storage_advisor import storage_advisor

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post('/storage', response_model=StorageAnalysisResponse)
def predict_storage_viability(data: SimulationRequest):
    """
    🧠 Predição de viabilidade de armazenagem (IA).
    
    Simula 30 dias considerando:
    - Custos fixos + variáveis (document-1.pdf)
    - Perdas por deterioração (0,2%/dia)
    - Evolução de preço (ML)
    - Impactos climáticos
    
    **Correções aplicadas:**
    - Perdas: 0,2%/dia (PDF)
    - Custo energia: R$ 0,025/kg·dia (PDF)
    - Normalização automática Caixa→Kg
    
    **Exemplo:**
    ```
    {
      "product": "Tomate",
      "state": "SP",
      "lat": -23.55,
      "lng": -46.63,
      "current_price": 80.00,
      "storage_cost_per_day": 0.10,
      "risk_factor": 1.0
    }
    ```
    """
    try:
        logger.info(
            f"📦 Requisição de armazenagem: {data.product} "
            f"em {data.state}, preço R$ {data.current_price}"
        )
        
        result = storage_advisor.predict_storage_viability(data)
        
        logger.info(f"✅ Análise concluída: {result['recommendation']['action']}")
        
        return result
    
    except Exception as e:
        logger.error(f"❌ Erro na predição de armazenagem: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Erro ao processar análise: {str(e)}"
        )


@router.get('/health')
def health_check():
    """
    🏥 Health check do módulo de predições.
    """
    return {
        'module': 'predictions',
        'status': 'healthy',
        'services': {
            'storage_advisor': 'online',
            'market_intelligence': 'online',
            'climate_api': 'online'
        },
        'timestamp': datetime.now().isoformat()
    }
