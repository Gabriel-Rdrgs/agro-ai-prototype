# ai-service/routers/projections.py
"""
Endpoints para validação cruzada de projeções e alertas.
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import logging
from services.projection_validator import ProjectionValidator

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/projections", tags=["projections"])

validator = ProjectionValidator()


@router.get("/compare/{product}")
async def compare_projections(
    product: str,
    region: Optional[str] = Query(None, description="Código UF (ex: SP)"),
    days_ahead: int = Query(30, description="Dias à frente para comparar")
):
    """
    Compara projeções CONAB com previsões Prophet.
    
    Args:
        product: Nome do produto
        region: Código UF opcional
        days_ahead: Quantos dias à frente comparar
        
    Returns:
        Comparação detalhada com alertas
    """
    try:
        result = validator.compare_projections(
            product=product,
            region=region,
            days_ahead=days_ahead
        )
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Erro desconhecido"))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro ao comparar projeções: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/validate/all")
async def validate_all_products(
    days_ahead: int = Query(30, description="Dias à frente para validar")
):
    """
    Valida projeções para todos os produtos disponíveis.
    
    Returns:
        Resultados de validação para todos os produtos
    """
    try:
        result = validator.validate_all_products(days_ahead=days_ahead)
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Erro desconhecido"))
        
        return result
        
    except Exception as e:
        logger.error(f"❌ Erro ao validar produtos: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/alerts")
async def get_alerts(
    severity: Optional[str] = Query(None, description="Filtrar por severidade: warning, critical"),
    product: Optional[str] = Query(None, description="Filtrar por produto")
):
    """
    Retorna alertas de divergências entre projeções.
    
    Args:
        severity: Filtrar por severidade
        product: Filtrar por produto
        
    Returns:
        Lista de alertas
    """
    try:
        result = validator.validate_all_products()
        
        if not result.get("success"):
            raise HTTPException(status_code=400, detail=result.get("error", "Erro desconhecido"))
        
        alerts = result.get("all_alerts", [])
        
        # Filtros
        if severity:
            alerts = [a for a in alerts if a.get("severity") == severity]
        
        if product:
            alerts = [a for a in alerts if product.lower() in str(a).lower()]
        
        return {
            "success": True,
            "total_alerts": len(alerts),
            "alerts": alerts
        }
        
    except Exception as e:
        logger.error(f"❌ Erro ao buscar alertas: {e}")
        raise HTTPException(status_code=500, detail=str(e))
