# ai-service/routers/soil.py
# ============================================
# ✅ FASE 0 - Semana 4: Endpoints para dados de solo (SoilGrids)
# ============================================

from fastapi import APIRouter, HTTPException, Query
from services.data_sync.soilgrids_service import soilgrids_service
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/properties")
async def get_soil_properties(
    lat: float = Query(..., description="Latitude da localização", ge=-90, le=90),
    lng: float = Query(..., description="Longitude da localização", ge=-180, le=180),
    depth: str = Query("0-5cm", description="Profundidade do solo (ex: 0-5cm, 5-15cm, 15-30cm)")
):
    """
    Retorna propriedades do solo para uma localização específica.
    
    Fonte: SoilGrids API (ISRIC)
    """
    try:
        data = soilgrids_service.get_soil_properties(lat, lng, depth)
        
        if not data:
            raise HTTPException(
                status_code=503,
                detail="Dados de solo indisponíveis para esta localização"
            )
        
        return {
            "status": "success",
            "data": data,
            "source": "SoilGrids (ISRIC)",
            "location": {"lat": lat, "lng": lng},
            "depth": depth
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar dados de solo: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar dados de solo")

@router.get("/summary")
async def get_soil_summary(
    lat: float = Query(..., description="Latitude da localização", ge=-90, le=90),
    lng: float = Query(..., description="Longitude da localização", ge=-180, le=180)
):
    """
    Retorna resumo das propriedades do solo (múltiplas profundidades).
    
    Fonte: SoilGrids API (ISRIC)
    """
    try:
        data = soilgrids_service.get_soil_summary(lat, lng)
        
        if not data:
            raise HTTPException(
                status_code=503,
                detail="Dados de solo indisponíveis para esta localização"
            )
        
        return {
            "status": "success",
            "data": data,
            "source": "SoilGrids (ISRIC)",
            "location": {"lat": lat, "lng": lng}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar resumo de solo: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar dados de solo")

