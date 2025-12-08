# ai-service/routers/weather.py
from fastapi import APIRouter, HTTPException, Query
from services.climate.intelligence import climate_api
import logging

router = APIRouter()
logger = logging.getLogger(__name__)

@router.get("/forecast")
async def get_weather_forecast(
    lat: float = Query(..., description="Latitude da fazenda"),
    lng: float = Query(..., description="Longitude da fazenda")
):
    """
    Retorna previsão estendida de 16 dias com dados agronômicos.
    """
    try:
        data = await climate_api.get_extended_forecast(lat, lng)
        
        if not data or not data.get('time'):
            # Se falhar ou vier vazio, tenta um fallback ou retorna erro amigável
            logger.warning(f"⚠️ Previsão vazia para {lat}, {lng}")
            raise HTTPException(status_code=503, detail="Dados climáticos indisponíveis no momento")
            
        return {
            "status": "success",
            "data": data,
            "source": "Open-Meteo (16 Days)"
        }
        
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"❌ Erro crítico na rota weather: {e}")
        raise HTTPException(status_code=500, detail="Erro interno ao buscar clima")