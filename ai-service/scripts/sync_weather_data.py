#!/usr/bin/env python3
# ai-service/scripts/sync_weather_data.py
# ============================================
# ✅ FASE 0 - Semana 3: Script para sincronizar dados climáticos do Open-Meteo
# ============================================

import os
import sys
import logging
import requests
from datetime import datetime, date, timedelta
from typing import List, Dict, Optional, Tuple
from decimal import Decimal

# Adiciona o diretório raiz ao path para imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from utils.database import get_db_session, get_engine
from sqlalchemy import text

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s]: %(message)s'
)
logger = logging.getLogger(__name__)

# URL da API Open-Meteo
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

class WeatherDataSync:
    """Classe para sincronizar dados climáticos do Open-Meteo"""
    
    def __init__(self):
        self.engine = get_engine()
        self.session_factory = get_db_session
    
    def get_unique_locations(self) -> List[Tuple[float, float]]:
        """
        Busca todas as localizações únicas (lat, lng) da tabela Opportunity.
        
        Returns:
            Lista de tuplas (lat, lng)
        """
        try:
            with self.engine.connect() as conn:
                query = text("""
                    SELECT DISTINCT lat, lng
                    FROM "Opportunity"
                    WHERE lat IS NOT NULL 
                      AND lng IS NOT NULL
                      AND lat BETWEEN -90 AND 90
                      AND lng BETWEEN -180 AND 180
                    ORDER BY lat, lng
                """)
                
                result = conn.execute(query)
                locations = [(row[0], row[1]) for row in result]
                
                logger.info(f"📍 Encontradas {len(locations)} localizações únicas")
                return locations
                
        except Exception as e:
            logger.error(f"❌ Erro ao buscar localizações: {e}")
            return []
    
    def fetch_weather_data(self, lat: float, lng: float, target_date: date) -> Optional[Dict]:
        """
        Busca dados climáticos do Open-Meteo para uma localização e data específicas.
        
        Args:
            lat: Latitude
            lng: Longitude
            target_date: Data para buscar (hoje ou passado)
        
        Returns:
            Dicionário com dados climáticos ou None se falhar
        """
        try:
            params = {
                "latitude": lat,
                "longitude": lng,
                "daily": [
                    "temperature_2m_max",
                    "temperature_2m_min",
                    "precipitation_sum",
                    "shortwave_radiation_sum"
                ],
                "hourly": "relative_humidity_2m",
                "timezone": "America/Sao_Paulo",
                "start_date": target_date.isoformat(),
                "end_date": target_date.isoformat()
            }
            
            response = requests.get(OPEN_METEO_URL, params=params, timeout=15)
            
            if response.status_code != 200:
                logger.warning(f"⚠️ Open-Meteo retornou {response.status_code} para {lat},{lng}")
                return None
            
            data = response.json()
            daily = data.get('daily', {})
            hourly = data.get('hourly', {})
            
            # Extrai dados diários
            temps_max = daily.get('temperature_2m_max', [])
            temps_min = daily.get('temperature_2m_min', [])
            precip = daily.get('precipitation_sum', [])
            radiation = daily.get('shortwave_radiation_sum', [])
            
            # Extrai umidade (média horária)
            humidity = hourly.get('relative_humidity_2m', [])
            
            # Validação de dados
            if not temps_max or not temps_min:
                logger.warning(f"⚠️ Dados incompletos para {lat},{lng} em {target_date}")
                return None
            
            # Calcula valores
            temp_max = float(temps_max[0]) if temps_max else None
            temp_min = float(temps_min[0]) if temps_min else None
            precipitation = float(precip[0]) if precip else 0.0
            radiation_mj = float(radiation[0]) * 3.6 if radiation and radiation[0] else None  # kWh → MJ
            humidity_avg = sum(humidity) / len(humidity) if humidity else None
            
            # Calcula ET0 (Evapotranspiração de referência) usando Hargreaves simplificado
            # ET0 = 0.0023 * (T_avg + 17.8) * sqrt(T_max - T_min) * Ra
            et0 = None
            if temp_max and temp_min and radiation_mj:
                temp_avg = (temp_max + temp_min) / 2
                temp_range = temp_max - temp_min
                if temp_range > 0:
                    # Ra em MJ/m²/dia (já temos)
                    et0 = 0.0023 * (temp_avg + 17.8) * (temp_range ** 0.5) * (radiation_mj / 3.6)  # Ajuste para MJ
                    et0 = max(0, et0)  # Não pode ser negativo
            
            result = {
                "lat": lat,
                "lng": lng,
                "date": target_date,
                "temperature_max": temp_max,
                "temperature_min": temp_min,
                "precipitation": precipitation,
                "radiation_mj": radiation_mj,
                "humidity_avg": humidity_avg,
                "et0": et0
            }
            
            # Validação adicional
            if self.validate_weather_data(result):
                return result
            else:
                logger.warning(f"⚠️ Dados inválidos para {lat},{lng} em {target_date}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erro ao buscar dados para {lat},{lng}: {e}")
            return None
    
    def validate_weather_data(self, data: Dict) -> bool:
        """
        Valida dados climáticos antes de salvar.
        
        Args:
            data: Dicionário com dados climáticos
        
        Returns:
            True se válido, False caso contrário
        """
        # Valida coordenadas
        if not (-90 <= data['lat'] <= 90) or not (-180 <= data['lng'] <= 180):
            return False
        
        # Valida temperatura (Brasil: -10°C a 50°C)
        if data.get('temperature_max'):
            if not (-10 <= data['temperature_max'] <= 50):
                return False
        if data.get('temperature_min'):
            if not (-10 <= data['temperature_min'] <= 50):
                return False
        
        # Valida precipitação (0 a 500mm/dia - valores extremos mas possíveis)
        if data.get('precipitation') is not None:
            if not (0 <= data['precipitation'] <= 500):
                return False
        
        # Valida radiação (0 a 50 MJ/m²/dia)
        if data.get('radiation_mj') is not None:
            if not (0 <= data['radiation_mj'] <= 50):
                return False
        
        # Valida umidade (0 a 100%)
        if data.get('humidity_avg') is not None:
            if not (0 <= data['humidity_avg'] <= 100):
                return False
        
        # Valida ET0 (0 a 20mm/dia)
        if data.get('et0') is not None:
            if not (0 <= data['et0'] <= 20):
                return False
        
        return True
    
    def save_weather_data(self, data: Dict) -> bool:
        """
        Salva dados climáticos no banco de dados.
        
        Args:
            data: Dicionário com dados climáticos
        
        Returns:
            True se salvou com sucesso, False caso contrário
        """
        try:
            with self.engine.connect() as conn:
                # Usa INSERT ... ON CONFLICT para evitar duplicatas
                query = text("""
                    INSERT INTO weather_data (
                        lat, lng, date, temperature_max, temperature_min,
                        precipitation, radiation_mj, humidity_avg, et0, source
                    )
                    VALUES (
                        :lat, :lng, :date, :temp_max, :temp_min,
                        :precip, :radiation, :humidity, :et0, 'open-meteo'
                    )
                    ON CONFLICT (lat, lng, date, source)
                    DO UPDATE SET
                        temperature_max = EXCLUDED.temperature_max,
                        temperature_min = EXCLUDED.temperature_min,
                        precipitation = EXCLUDED.precipitation,
                        radiation_mj = EXCLUDED.radiation_mj,
                        humidity_avg = EXCLUDED.humidity_avg,
                        et0 = EXCLUDED.et0,
                        updated_at = NOW()
                """)
                
                conn.execute(query, {
                    "lat": data['lat'],
                    "lng": data['lng'],
                    "date": data['date'],
                    "temp_max": data.get('temperature_max'),
                    "temp_min": data.get('temperature_min'),
                    "precip": data.get('precipitation', 0),
                    "radiation": data.get('radiation_mj'),
                    "humidity": data.get('humidity_avg'),
                    "et0": data.get('et0')
                })
                conn.commit()
                
                return True
                
        except Exception as e:
            logger.error(f"❌ Erro ao salvar dados para {data['lat']},{data['lng']}: {e}")
            return False
    
    def sync_weather_data(self, target_date: Optional[date] = None, days_back: int = 0) -> Dict:
        """
        Sincroniza dados climáticos para todas as localizações.
        
        Args:
            target_date: Data específica para sincronizar (padrão: hoje)
            days_back: Número de dias para buscar no passado (padrão: 0 = apenas hoje)
        
        Returns:
            Dicionário com estatísticas da sincronização
        """
        if target_date is None:
            target_date = date.today()
        
        locations = self.get_unique_locations()
        
        if not locations:
            logger.warning("⚠️ Nenhuma localização encontrada")
            return {
                "success": False,
                "locations": 0,
                "saved": 0,
                "errors": 0,
                "message": "Nenhuma localização encontrada"
            }
        
        saved = 0
        errors = 0
        
        # Busca dados para hoje e dias passados se especificado
        dates_to_sync = [target_date - timedelta(days=i) for i in range(days_back + 1)]
        
        logger.info(f"🔄 Iniciando sincronização para {len(locations)} localizações e {len(dates_to_sync)} data(s)")
        
        for lat, lng in locations:
            for sync_date in dates_to_sync:
                try:
                    weather_data = self.fetch_weather_data(lat, lng, sync_date)
                    
                    if weather_data:
                        if self.save_weather_data(weather_data):
                            saved += 1
                            logger.debug(f"✅ {lat},{lng} - {sync_date}: Salvo")
                        else:
                            errors += 1
                    else:
                        errors += 1
                        
                except Exception as e:
                    logger.error(f"❌ Erro ao processar {lat},{lng} - {sync_date}: {e}")
                    errors += 1
        
        result = {
            "success": True,
            "locations": len(locations),
            "dates": len(dates_to_sync),
            "saved": saved,
            "errors": errors,
            "total_attempts": len(locations) * len(dates_to_sync)
        }
        
        logger.info(f"✅ Sincronização concluída: {saved} registros salvos, {errors} erros")
        
        return result


def main():
    """Função principal"""
    import argparse
    
    parser = argparse.ArgumentParser(description='Sincroniza dados climáticos do Open-Meteo')
    parser.add_argument('--date', type=str, help='Data no formato YYYY-MM-DD (padrão: hoje)')
    parser.add_argument('--days-back', type=int, default=0, help='Número de dias para buscar no passado (padrão: 0)')
    
    args = parser.parse_args()
    
    target_date = None
    if args.date:
        try:
            target_date = datetime.strptime(args.date, '%Y-%m-%d').date()
        except ValueError:
            logger.error(f"❌ Data inválida: {args.date}. Use o formato YYYY-MM-DD")
            sys.exit(1)
    
    sync = WeatherDataSync()
    result = sync.sync_weather_data(target_date=target_date, days_back=args.days_back)
    
    if result['success']:
        logger.info(f"✅ Sincronização concluída com sucesso!")
        logger.info(f"   Localizações: {result['locations']}")
        logger.info(f"   Datas: {result['dates']}")
        logger.info(f"   Registros salvos: {result['saved']}")
        logger.info(f"   Erros: {result['errors']}")
        sys.exit(0)
    else:
        logger.error(f"❌ Sincronização falhou: {result.get('message', 'Erro desconhecido')}")
        sys.exit(1)


if __name__ == "__main__":
    main()
