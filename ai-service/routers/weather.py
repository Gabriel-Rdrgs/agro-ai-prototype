# ai-service/routers/weather.py
from fastapi import APIRouter, HTTPException, Query
from services.climate.intelligence import climate_api
from services.climate.extreme_events import extreme_events_detector
from services.climate.supply_risk_analyzer import supply_risk_analyzer
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

@router.get("/extreme-events")
async def get_extreme_events(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    days: int = Query(16, ge=7, le=30, description="Dias à frente para analisar (7-30)")
):
    """
    🔥 Detecta eventos climáticos extremos (ondas de calor/frio, chuvas extremas, granizo, ciclones).
    
    Retorna análise detalhada com:
    - Eventos detectados (tipo, severidade, duração)
    - Nível de risco geral
    - Recomendações específicas
    - Contexto de El Niño/La Niña
    """
    try:
        result = await extreme_events_detector.detect_extreme_events(lat, lng, days)
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        logger.error(f"❌ Erro ao detectar eventos extremos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao analisar eventos extremos: {str(e)}")

@router.get("/extreme-events/historical")
async def get_historical_extreme_events(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    days_back: int = Query(7, ge=1, le=30, description="Dias atrás para verificar (1-30)")
):
    """
    📅 Verifica eventos extremos históricos (ex: granizo há 2 dias).
    
    Útil para verificar se eventos passados afetaram as plantações.
    """
    try:
        from datetime import datetime, timedelta
        from services.climate.intelligence import climate_api
        
        # Busca dados históricos da API Archive
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        # Usa archive API para dados históricos
        archive_url = "https://archive-api.open-meteo.com/v1/archive"
        params = {
            "latitude": lat,
            "longitude": lng,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "daily": [
                "temperature_2m_max",
                "temperature_2m_min",
                "precipitation_sum",
                "wind_speed_10m_max",
                "weathercode",
                "surface_pressure_mean"  # Para detecção de ciclones históricos
            ],
            "timezone": "America/Sao_Paulo"
        }
        
        import httpx
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.get(archive_url, params=params)
            
            if response.status_code != 200:
                raise HTTPException(status_code=503, detail="Dados históricos indisponíveis")
            
            data = response.json()
            daily = data.get("daily", {})
            
            # Processa eventos históricos
            historical_events = []
            dates = daily.get("time", [])
            temp_max = daily.get("temperature_2m_max", [])
            temp_min = daily.get("temperature_2m_min", [])
            rain = daily.get("precipitation_sum", [])
            wind = daily.get("wind_speed_10m_max", [])
            weathercode = daily.get("weathercode", [])
            pressure = daily.get("surface_pressure_mean", [])  # Pressão para detecção de ciclones
            
            for idx, date_str in enumerate(dates):
                day_events = []
                
                # Verifica granizo (weathercode)
                if idx < len(weathercode) and weathercode[idx] in [96, 99]:
                    day_events.append({
                        "type": "hail",
                        "severity": "extreme" if weathercode[idx] == 99 else "high",
                        "date": date_str,
                        "message": f"🌨️ Granizo registrado em {date_str}"
                    })
                
                # Verifica chuva extrema
                if idx < len(rain) and rain[idx] and rain[idx] > 50:
                    day_events.append({
                        "type": "extreme_rain",
                        "severity": "extreme",
                        "date": date_str,
                        "rainfall_mm": round(rain[idx], 1),
                        "message": f"🌧️ Chuva extrema: {rain[idx]:.1f}mm em {date_str}"
                    })
                
                # Verifica vento extremo (com critérios revisados - não classifica apenas por pressão)
                if idx < len(wind) and wind[idx]:
                    wind_kmh = wind[idx] * 3.6 if wind[idx] < 50 else wind[idx]
                    press = pressure[idx] if idx < len(pressure) else None
                    
                    # Aplica mesmos critérios da detecção futura (ventos fortes são necessários)
                    if wind_kmh > 90:
                        day_events.append({
                            "type": "tropical_storm",
                            "severity": "extreme",
                            "date": date_str,
                            "wind_speed_kmh": round(wind_kmh, 1),
                            "pressure_hpa": round(press, 1) if press else None,
                            "message": f"🌀 CICLONE: {wind_kmh:.1f} km/h" + (f", pressão {press:.1f} hPa" if press else "") + f" em {date_str}"
                        })
                    elif (wind_kmh > 75 and press and press < 1000) or (wind_kmh > 60 and press and press < 980):
                        day_events.append({
                            "type": "tropical_storm",
                            "severity": "high",
                            "date": date_str,
                            "wind_speed_kmh": round(wind_kmh, 1),
                            "pressure_hpa": round(press, 1) if press else None,
                            "message": f"🌀 Tempestade Tropical: {wind_kmh:.1f} km/h, pressão {press:.1f} hPa em {date_str}"
                        })
                    elif wind_kmh > 75 or (wind_kmh > 60 and press and press < 1005):
                        day_events.append({
                            "type": "tropical_storm",
                            "severity": "moderate",
                            "date": date_str,
                            "wind_speed_kmh": round(wind_kmh, 1),
                            "pressure_hpa": round(press, 1) if press else None,
                            "message": f"🌪️ Ventos fortes: {wind_kmh:.1f} km/h em {date_str}"
                        })
                
                if day_events:
                    historical_events.extend(day_events)
            
            return {
                "status": "success",
                "period": {
                    "start": start_date.strftime("%Y-%m-%d"),
                    "end": end_date.strftime("%Y-%m-%d"),
                    "days_back": days_back
                },
                "events": historical_events,
                "total_events": len(historical_events),
                "summary": f"{len(historical_events)} evento(s) extremo(s) detectado(s) nos últimos {days_back} dias"
            }
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Erro ao buscar eventos históricos: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao analisar eventos históricos: {str(e)}")

@router.get("/supply-risk")
async def get_supply_risk(
    lat: float = Query(..., description="Latitude"),
    lng: float = Query(..., description="Longitude"),
    product: str = Query("Tomate", description="Produto agrícola (ex: Tomate, Soja, Milho)"),
    days: int = Query(16, ge=7, le=30, description="Dias à frente para analisar (7-30)")
):
    """
    🔥 Analisa risco de abastecimento para uma região específica.
    
    Identifica regiões que podem ficar comprometidas no abastecimento
    devido a eventos climáticos extremos, problemas de produção, etc.
    
    Retorna:
    - Nível de risco (low, moderate, high, extreme)
    - Score de risco (0-100)
    - Fatores de risco identificados
    - Recomendações específicas
    - Período afetado
    """
    import time
    start_time = time.time()
    logger.info(f"📊 Iniciando análise de supply risk para lat={lat}, lng={lng}, product={product}")
    
    try:
        result = await supply_risk_analyzer.analyze_supply_risk(
            lat=lat,
            lng=lng,
            product=product,
            forecast_days=days
        )
        elapsed = time.time() - start_time
        logger.info(f"✅ Supply risk calculado em {elapsed:.2f}s para lat={lat}, lng={lng}")
        return {
            "status": "success",
            **result
        }
    except Exception as e:
        elapsed = time.time() - start_time
        logger.error(f"❌ Erro ao analisar risco de abastecimento após {elapsed:.2f}s: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Erro ao analisar risco de abastecimento: {str(e)}")