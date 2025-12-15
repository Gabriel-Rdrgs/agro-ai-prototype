# ai-service/routers/production.py
# ============================================
# ✅ FASE 0 - Semana 4: Endpoints para dados de produção (IBGE SIDRA)
# ============================================

from fastapi import APIRouter, HTTPException, Query
from services.data_sync.ibge_scraper import ibge_scraper
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/data")
async def get_production_data(
    product: str = Query(..., description="Nome do produto (ex: Tomate, Soja, Milho)"),
    year: int = Query(None, description="Ano (padrão: ano atual - 1)"),
    state_code: str = Query(None, description="Código do estado (ex: SP, MG, GO)")
):
    """
    Retorna dados de produção agrícola do IBGE SIDRA.
    
    Fonte: API IBGE SIDRA (Tabela 1612 - Lavouras Temporárias)
    """
    try:
        data = ibge_scraper.fetch_production_data(
            product=product,
            year=year,
            state_code=state_code
        )
        
        if not data:
            raise HTTPException(
                status_code=404,
                detail=f"Dados de produção não encontrados para {product}"
            )
        
        return {
            "status": "success",
            "data": data,
            "source": "IBGE SIDRA (Tabela 1612)",
            "product": product,
            "year": year,
            "state": state_code
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar dados de produção IBGE: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar dados IBGE")

@router.get("/summary")
async def get_production_summary(
    product: str = Query(..., description="Nome do produto"),
    state_code: str = Query(None, description="Código do estado")
):
    """
    Retorna resumo de dados de produção (últimos anos).
    
    Fonte: IBGE SIDRA
    """
    try:
        from datetime import datetime
        
        current_year = datetime.now().year
        years = [current_year - i for i in range(1, 4)]  # Últimos 3 anos
        
        all_data = []
        for year in years:
            data = ibge_scraper.fetch_production_data(
                product=product,
                year=year,
                state_code=state_code
            )
            if data:
                all_data.extend(data)
        
        if not all_data:
            raise HTTPException(
                status_code=404,
                detail=f"Resumo de produção não encontrado para {product}"
            )
        
        return {
            "status": "success",
            "data": all_data,
            "source": "IBGE SIDRA",
            "product": product,
            "state": state_code,
            "years": years
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar resumo de produção: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar dados IBGE")

