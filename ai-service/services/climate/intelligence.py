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
from datetime import datetime
from functools import lru_cache
from typing import Dict, Optional, Tuple

from utils.cache import CacheManager
from config.constants import BRAZIL_CLIMATE_NORMS

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
