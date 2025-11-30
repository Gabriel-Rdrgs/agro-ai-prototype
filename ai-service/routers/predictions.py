# routers/predictions.py
"""
Rotas de predição e inteligência de mercado.
Endpoints: /predict/*
"""

from fastapi import APIRouter, HTTPException
from typing import List, Optional
from pydantic import BaseModel
import logging

# 1. IMPORTAÇÕES
from models.schemas import SimulationRequest, StorageAnalysisResponse
from services.storage_advisor import storage_advisor
from services.fuel_pricing import fuel_api 

logger = logging.getLogger(__name__)

router = APIRouter()

# --- MODELOS LOCAIS PARA BATCH (Para não depender de schemas.py) ---
class BatchItem(BaseModel):
    id: int
    product: str
    state: str
    current_price: float
    buy_price: float

class BatchRequest(BaseModel):
    items: List[BatchItem]

# --- ROTA 1: Armazenagem (Detalhada) ---
@router.post('/storage', response_model=StorageAnalysisResponse)
def predict_storage_viability(data: SimulationRequest):
    """
    🧠 Predição de viabilidade de armazenagem (IA).
    """
    try:
        # Log simplificado
        logger.info(f"📦 Storage Check: {data.product} em {data.state}")
        result = storage_advisor.predict_storage_viability(data)
        return result
    
    except Exception as e:
        logger.error(f"❌ Erro na predição de armazenagem: {e}", exc_info=True)
        # Retorna 500 mas com mensagem clara JSON
        raise HTTPException(status_code=500, detail=str(e))


# --- ROTA 2: Previsão em Lote (Mapa) - NOVA! ---
@router.post('/batch')
def predict_batch(data: BatchRequest):
    """
    🗺️ Processa múltiplas oportunidades para o Mapa/Slider.
    """
    try:
        logger.info(f"🔄 Processando lote de {len(data.items)} itens...")
        results = {}
        
        for item in data.items:
            try:
                # Cria simulação simplificada (sem clima real para ser rápido)
                # O StorageAdvisor é robusto e aceita listas vazias de clima
                sim_req = SimulationRequest(
                    product=item.product,
                    state=item.state,
                    current_price=item.current_price,
                    # Defaults para simulação rápida
                    storage_cost_per_day=0.03,
                    risk_factor=1,
                    daily_rain=[], 
                    daily_temp_max=[], 
                    daily_temp_min=[], 
                    daily_sun=[],
                    lat=0, 
                    lng=0
                )
                
                # Chama a IA
                analysis = storage_advisor.predict_storage_viability(sim_req)
                
                # Salva apenas o resumo para o frontend
                results[item.id] = {
                    "action": analysis["recommendation"]["action"],
                    "profit": analysis["recommendation"]["estimated_profit"],
                    "confidence": analysis["recommendation"]["confidence"]
                }
            except Exception as item_error:
                logger.warning(f"⚠️ Falha no item {item.id}: {item_error}")
                results[item.id] = {"error": "Falha na análise"}
                
        return results

    except Exception as e:
        logger.error(f"❌ Erro no Batch: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro ao processar lote")


# --- ROTA 3: Combustível ---
@router.get('/fuel')
async def get_fuel_prices():
    """
    ⛽ Retorna preços médios de combustível por estado.
    """
    try:
        logger.info("⛽ Buscando tabela de preços de combustível...")
        prices = fuel_api.fetch_current_prices()  
        
        if not prices:
            logger.warning("⚠️ Nenhum preço encontrado")
            raise HTTPException(status_code=503, detail="Serviço indisponível")
            
        return prices

    except Exception as e:
        logger.error(f"❌ Erro ao buscar combustível: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail="Erro interno")