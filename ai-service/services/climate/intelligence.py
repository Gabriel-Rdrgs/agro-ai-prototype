# services/climate/intelligence.py
"""
Módulo de inteligência climática.
Busca dados de APIs meteorológicas com fallbacks robustos.

CORREÇÕES APLICADAS (baseadas em document.pdf):
- Radiação solar: threshold 8.4 MJ/m² (era 15 ❌)
- Chuva: 35mm/7dias ideal, 70mm crítico (era 80mm ❌)
- Umidade: 80% crítico (era 85 ✅)
- Conversão kWh→MJ corrigida
"""

import requests
import pandas as pd
import logging
import httpx
import asyncio 
from datetime import datetime
from functools import lru_cache
from typing import Dict, Optional, Tuple


from utils.cache import CacheManager
from config.constants import BRAZIL_CLIMATE_NORMS


FORECAST_API_URL = "https://api.open-meteo.com/v1/forecast"
ARCHIVE_API_URL = "https://archive-api.open-meteo.com/v1/archive"

logger = logging.getLogger(__name__)


class ClimateIntelligence:
    """
    Serviço de inteligência climática com múltiplas fontes.
    
    Fontes:
    - Open-Meteo Archive (histórico 5 anos)
    - NASA POWER (radiação solar)
    - Open-Meteo Forecast (previsão 7 dias)
    """
    
    def __init__(self):
        self.cache = CacheManager(ttl_seconds=3600)  # 1 hora
        self.headers = {
            'User-Agent': 'Agro-AI/6.0 (Climate Intelligence Module)'
        }
        logger.info("✅ ClimateIntelligence iniciado")
    
    def _validate_coords(self, lat: float, lng: float) -> bool:
        """Valida coordenadas geográficas"""
        try:
            lat_f, lng_f = float(lat), float(lng)
            return -90 <= lat_f <= 90 and -180 <= lng_f <= 180
        except (TypeError, ValueError):
            return False
    
    @lru_cache(maxsize=256)
    def get_rain_history(self, lat: float, lng: float, month: int) -> float:
        """
        Busca histórico de chuva (média de 5 anos) para mês específico.
        
        Args:
            lat: Latitude
            lng: Longitude
            month: Mês (1-12)
        
        Returns:
            Precipitação média mensal em mm (fallback: 150mm)
        """
        if not self._validate_coords(lat, lng):
            logger.warning("⚠️ Coordenadas inválidas, usando fallback")
            return 150.0
        
        cache_key = f"rain_history_{lat}_{lng}_{month}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        try:
            current_year = datetime.now().year
            start_date = f"{current_year - 6}-01-01"
            end_date = f"{current_year - 1}-12-31"
            
            url = "https://archive-api.open-meteo.com/v1/archive"
            params = {
                'latitude': lat,
                'longitude': lng,
                'start_date': start_date,
                'end_date': end_date,
                'daily': 'precipitation_sum',
                'timezone': 'America/Sao_Paulo'
            }
            
            response = requests.get(url, params=params, headers=self.headers, timeout=8)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ OpenMeteo Archive offline ({response.status_code})")
                return 150.0
            
            data = response.json()
            
            if 'daily' not in data or not data['daily']:
                return 150.0
            
            # Processa dados
            df = pd.DataFrame(data['daily'])
            df['time'] = pd.to_datetime(df['time'])
            
            # Filtra mês desejado
            month_data = df[df['time'].dt.month == month]
            
            if month_data.empty:
                return 150.0
            
            # Média diária × 30 = mensal
            daily_avg = month_data['precipitation_sum'].mean()
            monthly_avg = daily_avg * 30
            
            # Validação de sanidade
            if monthly_avg < 0 or monthly_avg > 1000:
                logger.warning(f"⚠️ Valor suspeito: {monthly_avg}mm, usando 150mm")
                return 150.0
            
            self.cache.set(cache_key, monthly_avg)
            logger.debug(f"✅ Histórico chuva: {monthly_avg:.1f}mm/mês")
            
            return round(monthly_avg, 1)
        
        except Exception as e:
            logger.error(f"❌ Erro Rain History: {e}")
            return 150.0
    
    @lru_cache(maxsize=256)
    def get_solar_radiation(self, lat: float, lng: float, month: int) -> float:
        """
        Busca radiação solar média para mês específico.
        
        Args:
            lat: Latitude
            lng: Longitude
            month: Mês (1-12)
        
        Returns:
            Radiação em MJ/m²/dia (fallback: 18.0)
        
        CORREÇÃO: NASA POWER retorna kWh/m²/dia → sempre converter para MJ
        """
        if not self._validate_coords(lat, lng):
            return 18.0
        
        cache_key = f"solar_rad_{lat}_{lng}_{month}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        try:
            url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
            params = {
                'parameters': 'ALLSKY_SFC_SW_DWN',  # Radiação de onda curta
                'community': 'AG',
                'longitude': lng,
                'latitude': lat,
                'format': 'JSON'
            }
            
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ NASA POWER offline ({response.status_code})")
                return 18.0
            
            data = response.json()
            properties = data.get('properties', {}).get('parameter', {}).get('ALLSKY_SFC_SW_DWN', {})
            
            # Mapeia mês para chave NASA
            month_keys = {
                1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR', 5: 'MAY', 6: 'JUN',
                7: 'JUL', 8: 'AUG', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC'
            }
            
            raw_val = properties.get(month_keys.get(month), -1)
            
            if raw_val <= 0:
                return 18.0
            
            # ✅ CORREÇÃO: NASA retorna kWh/m²/dia → SEMPRE converter para MJ
            # 1 kWh = 3.6 MJ
            mj_val = raw_val * 3.6
            
            # Validação de sanidade (Brasil: 12-25 MJ/m²/dia típico)
            if mj_val < 5.0 or mj_val > 30.0:
                logger.warning(f"⚠️ Valor NASA suspeito: {mj_val:.1f} MJ, usando 18.0")
                return 18.0
            
            self.cache.set(cache_key, mj_val)
            logger.debug(f"✅ Radiação solar: {mj_val:.1f} MJ/m²/dia")
            
            return round(mj_val, 1)
        
        except Exception as e:
            logger.error(f"❌ Erro NASA Solar: {e}")
            return 18.0
    
    def get_advanced_agrometeo(self, lat: float, lng: float) -> Optional[Dict]:
        """
        Busca previsão meteorológica de 7 dias (Open-Meteo Forecast).
        
        Args:
            lat: Latitude
            lng: Longitude
        
        Returns:
            {
                'radiation_mj': 18.5,
                'rain_mm': 45.2,
                'humidity_pct': 72.0
            }
            ou None se falhar
        """
        if not self._validate_coords(lat, lng):
            return None
        
        cache_key = f"forecast_{lat}_{lng}"
        cached = self.cache.get(cache_key)
        if cached:
            return cached
        
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lng,
            "daily": ["temperature_2m_max", "precipitation_sum", "shortwave_radiation_sum"],
            "hourly": "relative_humidity_2m",
            "timezone": "America/Sao_Paulo",
            "past_days": 2,
            "forecast_days": 7
        }
        
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ OpenMeteo Forecast offline ({response.status_code})")
                return None
            
            data = response.json()
            daily = data.get('daily', {})
            hourly = data.get('hourly', {})
            
            # Radiação (kWh → MJ)
            rad_list = daily.get('shortwave_radiation_sum', [])
            avg_radiation_kwh = sum(rad_list) / len(rad_list) if rad_list else 0
            avg_radiation_mj = avg_radiation_kwh * 3.6  # ✅ Conversão correta
            
            # Chuva total
            rain_list = daily.get('precipitation_sum', [])
            total_rain = sum(rain_list)
            
            # Umidade
            hum_list = hourly.get('relative_humidity_2m', [])
            avg_humidity = sum(hum_list) / len(hum_list) if hum_list else 0
            
            result = {
                "radiation_mj": round(avg_radiation_mj, 2),
                "rain_mm": round(total_rain, 2),
                "humidity_pct": round(avg_humidity, 1)
            }
            
            self.cache.set(cache_key, result)
            logger.debug(f"✅ Forecast: {result}")
            
            return result
        
        except Exception as e:
            logger.error(f"❌ Erro Agrometeo: {e}")
            return None
    
    async def get_extended_forecast(self, lat: float, lng: float) -> Optional[Dict]:
        """
        Versão Final (Híbrida):
        - Umidade: Busca da API (Hourly) e agrega -> Sucesso confirmado!
        - ET0: Calcula via Hargreaves (Python) -> Porque a API retornou zeros.
        """
        if not self._validate_coords(lat, lng):
            return {}

        try:
            params = {
                "latitude": lat,
                "longitude": lng,
                "timezone": "America/Sao_Paulo",
                "forecast_days": 16,
                "models": "gfs_seamless",
                
                # 1. Variáveis Diárias (Garantidas)
                "daily": [
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_sum",
                    "precipitation_probability_max",
                    "wind_speed_10m_max"
                ],
                # 2. Variáveis Horárias (Para Umidade)
                "hourly": [
                    "relative_humidity_2m"
                ]
            }

            async with httpx.AsyncClient(timeout=20.0) as client:
                response = await client.get(FORECAST_API_URL, params=params)
                
                if response.status_code != 200:
                    logger.error(f"❌ Erro API: {response.text}")
                    response.raise_for_status()
                
                data = response.json()
                daily = data.get("daily", {})
                hourly = data.get("hourly", {})
                
                # --- PROCESSAMENTO HÍBRIDO ---
                
                t_max_list = daily.get("temperature_2m_max", [])
                t_min_list = daily.get("temperature_2m_min", [])
                hourly_hum = hourly.get("relative_humidity_2m", [])
                
                daily_et0 = []
                daily_hum_max = []
                
                # Constante de Radiação (Ra) ~ 15 MJ/m2 (Média Brasil)
                Ra = 15.0 

                num_days = len(daily.get("time", []))

                for i in range(num_days):
                    # 1. Umidade (API Real)
                    start_idx = i * 24
                    end_idx = start_idx + 24
                    if start_idx < len(hourly_hum):
                        day_hum_slice = hourly_hum[start_idx:end_idx]
                        max_hum = max([v for v in day_hum_slice if v is not None], default=0)
                        daily_hum_max.append(max_hum)
                    else:
                        daily_hum_max.append(0)

                    # 2. ET0 (Cálculo Matemático Hargreaves)
                    # Porque a API retornou zeros no 'evapotranspiration'
                    try:
                        if i < len(t_max_list) and i < len(t_min_list):
                            t_max = t_max_list[i]
                            t_min = t_min_list[i]
                            
                            if t_max is not None and t_min is not None:
                                t_mean = (t_max + t_min) / 2
                                delta_t = t_max - t_min
                                if delta_t < 0: delta_t = 0
                                
                                # Fórmula Hargreaves-Samani
                                et0 = 0.0023 * (t_mean + 17.8) * (delta_t ** 0.5) * (0.408 * Ra)
                                daily_et0.append(round(et0, 2))
                            else:
                                daily_et0.append(0.0)
                        else:
                            daily_et0.append(0.0)
                    except:
                        daily_et0.append(3.5) # Fallback seguro

                result = {
                    "time": daily.get("time", []),
                    "temp_max": t_max_list,
                    "temp_min": t_min_list,
                    "rain_sum": daily.get("precipitation_sum", []),
                    "rain_prob": daily.get("precipitation_probability_max", []),
                    "wind_max": daily.get("wind_speed_10m_max", []),
                    "et0": daily_et0,             # ✅ Calculado (Hargreaves)
                    "humidity_max": daily_hum_max # ✅ API Real
                }
                
                logger.info(f"✅ Previsão Híbrida (16 dias) gerada para {lat},{lng}")
                return result

        except Exception as e:
            logger.error(f"❌ Erro Crítico Intelligence: {e}")
            return {}

    async def _get_fallback_forecast(self, lat: float, lng: float) -> Optional[Dict]:
        """
        Fallback simples caso o GFS falhe (apenas dados básicos).
        """
        # ... (Cópia da versão simplificada que funcionou antes) ...
        # Se quiser implementar, copie o código da "Solução Definitiva (Modo Básico Garantido)" aqui
        return {}
        
    @lru_cache(maxsize=128)
    def get_accumulated_rain_recent(self, lat: float, lng: float, days_back: int = 120) -> float:
        """
        Busca o volume REAL de chuva acumulada nos últimos X dias.
        Usado para determinar se a safra foi úmida ou seca.
        """
        if not self._validate_coords(lat, lng):
            return 500.0 # Fallback neutro
            
        cache_key = f"acc_rain_{lat}_{lng}_{days_back}"
        cached = self.cache.get(cache_key)
        if cached: return cached

        try:
            # Define datas: De (Hoje - 120 dias) até (Ontem)
            end_date = (datetime.now() - pd.Timedelta(days=1)).strftime('%Y-%m-%d')
            start_date = (datetime.now() - pd.Timedelta(days=days_back)).strftime('%Y-%m-%d')
            
            url = "https://archive-api.open-meteo.com/v1/archive"
            params = {
                'latitude': lat,
                'longitude': lng,
                'start_date': start_date,
                'end_date': end_date,
                'daily': 'precipitation_sum',
                'timezone': 'America/Sao_Paulo'
            }
            
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            if response.status_code != 200:
                logger.warning(f"⚠️ Falha ao buscar chuva acumulada: {response.status_code}")
                return 500.0 # Retorna valor ideal para não travar
            
            data = response.json()
            daily_rain = data.get('daily', {}).get('precipitation_sum', [])
            
            if not daily_rain: return 500.0
            
            # Soma tudo (ex: [0, 10, 5, 0...] -> 540mm)
            total_rain = sum(filter(None, daily_rain))
            
            self.cache.set(cache_key, total_rain)
            logger.info(f"🌧️ Chuva acumulada ({days_back}d) em {lat},{lng}: {total_rain:.1f}mm")
            
            return round(total_rain, 1)

        except Exception as e:
            logger.error(f"❌ Erro fetch rain history: {e}")
            return 500.0    


# ========================================
# INSTÂNCIA GLOBAL
# ========================================
climate_api = ClimateIntelligence()


# ========================================
# FUNÇÕES AUXILIARES (Para compatibilidade com código legado)
# ========================================

def get_rain_history(lat: float, lng: float, month: int) -> float:
    """
    Wrapper para compatibilidade com código antigo.
    Use climate_api.get_rain_history() diretamente no código novo.
    """
    return climate_api.get_rain_history(lat, lng, month)


def get_solar_radiation(lat: float, lng: float, month: int) -> float:
    """
    Wrapper para compatibilidade com código antigo.
    Use climate_api.get_solar_radiation() diretamente no código novo.
    """
    return climate_api.get_solar_radiation(lat, lng, month)


def get_advanced_agrometeo(lat: float, lng: float) -> Optional[Dict]:
    """
    Wrapper para compatibilidade com código antigo.
    Use climate_api.get_advanced_agrometeo() diretamente no código novo.
    """
    return climate_api.get_advanced_agrometeo(lat, lng)
