# ai-service/routers/zarc.py
# ============================================
# ✅ FASE 0 - Semana 4: Endpoints para dados ZARC (Zoneamento Agrícola)
# ============================================

from fastapi import APIRouter, HTTPException, Query
from services.data_sync.zarc_service import zarc_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/planting-windows")
async def get_planting_windows(
    product: str = Query(..., description="Nome do produto (ex: Tomate, Soja, Milho)"),
    state: str = Query(..., description="Código do estado (ex: SP, MG, GO)", min_length=2, max_length=2),
    cultivar: str = Query(None, description="Nome da cultivar (opcional)")
):
    """
    Retorna janelas de plantio do ZARC para um produto e estado.
    
    Fonte: Dados Abertos do MAPA (CSV)
    """
    try:
        data = zarc_service.get_planting_windows(product, state, cultivar)
        
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"Janelas de plantio não encontradas para {product}/{state}"
            )
        
        return {
            "status": "success",
            "data": data,
            "source": "ZARC (MAPA - Dados Abertos)",
            "product": product,
            "state": state
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar janelas de plantio ZARC: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar dados ZARC")

@router.get("/ideal-period")
async def get_ideal_planting_period(
    product: str = Query(..., description="Nome do produto"),
    state: str = Query(..., description="Código do estado", min_length=2, max_length=2),
    cultivar: str = Query(None, description="Nome da cultivar (opcional)")
):
    """
    Retorna período ideal de plantio baseado no ZARC.
    
    Fonte: Dados Abertos do MAPA (CSV)
    """
    try:
        data = zarc_service.get_ideal_planting_period(product, state, cultivar)
        
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"Período ideal não encontrado para {product}/{state}"
            )
        
        return {
            "status": "success",
            **data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar período ideal ZARC: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar dados ZARC")

