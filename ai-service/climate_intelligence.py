import requests
import pandas as pd
import logging
import os
from datetime import datetime
from functools import lru_cache
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Configuração de Logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("climate_intelligence")

# Carrega variáveis
load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Singleton do Banco
_engine = None

def get_db_engine():
    global _engine
    if _engine is None:
        if not DATABASE_URL:
            # Tenta pegar a variável alternativa se a principal falhar
            url = os.getenv("PYTHON_DB_URL")
            if not url:
                logger.warning("DATABASE_URL não encontrada no .env")
                return None
            _engine = create_engine(url)
        else:
            _engine = create_engine(DATABASE_URL)
    return _engine

class ClimateIntelligence:
    """
    Módulo Neural de Clima 🧠🌩️
    Responsável por buscar dados meteorológicos históricos e previsões.
    """
    
    def __init__(self):
        self.headers = {
            'User-Agent': 'Agro-AI-Bot/1.0 (Climate Module)'
        }

    def _validate_coords(self, lat, lng):
        try:
            lat, lng = float(lat), float(lng)
            return -90 <= lat <= 90 and -180 <= lng <= 180
        except (TypeError, ValueError):
            return False

    @lru_cache(maxsize=128)
    def get_rain_history(self, lat, lng, month):
        """
        Busca histórico de chuva (média de 5 anos) para o mês específico.
        Fonte: Open-Meteo Archive
        """
        if not self._validate_coords(lat, lng):
            return 150.0

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
            
            response = requests.get(url, params=params, headers=self.headers, timeout=5)
            
            if response.status_code != 200:
                logger.warning(f"OpenMeteo Archive Offline ({response.status_code})")
                return 150.0
            
            data = response.json()
            if 'daily' not in data: return 150.0
            
            df = pd.DataFrame(data['daily'])
            df['time'] = pd.to_datetime(df['time'])
            
            # Filtra apenas o mês desejado
            month_data = df[df['time'].dt.month == month]
            
            if month_data.empty: return 150.0
            
            daily_avg = month_data['precipitation_sum'].mean()
            return daily_avg * 30

        except Exception as e:
            logger.error(f"Erro Rain History: {e}")
            return 150.0

    @lru_cache(maxsize=128)
    def get_solar_radiation(self, lat, lng, month):
        """
        Busca radiação solar média (MJ/m²) para secagem/fotossíntese.
        Fonte: NASA POWER
        """
        if not self._validate_coords(lat, lng):
            return 18.0

        try:
            url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
            params = {
                'parameters': 'ALLSKY_SFC_SW_DWN',
                'community': 'AG',
                'longitude': lng,
                'latitude': lat,
                'format': 'JSON'
            }
            
            response = requests.get(url, params=params, headers=self.headers, timeout=6)
            
            if response.status_code != 200:
                return 18.0
            
            data = response.json()
            properties = data.get('properties', {}).get('parameter', {}).get('ALLSKY_SFC_SW_DWN', {})
            
            month_keys = {1: 'JAN', 2: 'FEB', 3: 'MAR', 4: 'APR', 5: 'MAY', 6: 'JUN',
                         7: 'JUL', 8: 'AUG', 9: 'SEP', 10: 'OCT', 11: 'NOV', 12: 'DEC'}
            
            raw_val = properties.get(month_keys.get(month), -1)
            
            if raw_val <= 0: return 18.0
            
            # Conversão kWh -> MJ
            mj_val = raw_val
            if raw_val < 10.0:
                mj_val = raw_val * 3.6
            
            return mj_val

        except Exception as e:
            logger.error(f"Erro NASA Solar: {e}")
            return 18.0

    def get_advanced_agrometeo(self, lat, lng):
        """
        Busca previsão AGORA (7 dias): Radiação, Chuva, Umidade.
        Usado pelo Robô de Tomate.
        """
        if not self._validate_coords(lat, lng):
            return None

        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": lat,
            "longitude": lng,
            "daily": ["temperature_2m_max", "precipitation_sum", "shortwave_radiation_sum"],
            "hourly": "relative_humidity_2m",
            "timezone": "America/Sao_Paulo",
            "past_days": 2
        }
        
        try:
            response = requests.get(url, params=params, headers=self.headers, timeout=10)
            if response.status_code != 200:
                return None

            data = response.json()
            daily = data.get('daily', {})
            hourly = data.get('hourly', {})
            
            rad_list = daily.get('shortwave_radiation_sum', [])
            avg_radiation = sum(rad_list) / len(rad_list) if rad_list else 0
            
            rain_list = daily.get('precipitation_sum', [])
            total_rain = sum(rain_list)
            
            hum_list = hourly.get('relative_humidity_2m', [])
            avg_humidity = sum(hum_list) / len(hum_list) if hum_list else 0
            
            return {
                "radiation_mj": round(avg_radiation, 2),
                "rain_mm": round(total_rain, 2),
                "humidity_pct": round(avg_humidity, 1)
            }
        except Exception as e:
            logger.error(f"Erro Agrometeo: {e}")
            return None

# Instância Global
climate_api = ClimateIntelligence()

# ==============================================================================
# LÓGICA DE NEGÓCIO (ROBÔ DE TOMATE)
# ==============================================================================

def calculate_tomato_risk(meteo_data):
    """Regras Agronômicas para Tomate"""
    risk_score = 0
    reasons = []

    if meteo_data['rain_mm'] > 80:
        risk_score += 0.4
        reasons.append("Excesso de Chuva (>80mm)")
    elif meteo_data['rain_mm'] > 50:
        risk_score += 0.2
        reasons.append("Chuva Moderada")

    if meteo_data['humidity_pct'] > 85:
        risk_score += 0.3
        reasons.append("Umidade Alta (Risco Fúngico)")

    if meteo_data['radiation_mj'] < 15: 
        risk_score += 0.2
        reasons.append("Baixa Insolação")

    return min(risk_score, 1.0), ", ".join(reasons)

def update_market_prices():
    """Função Cron Job: Atualiza preços baseado no clima atual."""
    logger.info("🍅 INICIANDO INTELIGÊNCIA DE TOMATE...")
    
    engine = get_db_engine()
    if not engine:
        logger.error("Abortando: Sem conexão com banco.")
        return

    try:
        with engine.connect() as connection:
            locations_query = text("SELECT id, city, state, lat, lng, \"buyPrice\", \"sellPrice\" FROM \"Opportunity\" WHERE product = 'Tomate'")
            cities_to_scan = connection.execute(locations_query).fetchall()
            logger.info(f"🗺️ Encontrados {len(cities_to_scan)} polos produtores.")

            for row in cities_to_scan:
                opp_id, city, state = row.id, row.city, row.state
                
                # Conversão segura para float
                current_buy = float(row.buyPrice) if row.buyPrice is not None else 0.0
                current_sell = float(row.sellPrice) if row.sellPrice is not None else 0.0
                
                current_margin = current_sell / current_buy if current_buy > 0 else 1.35
                
                logger.info(f"📍 Analisando: {city} ({state})...")
                
                # Usa a classe para buscar dados
                data = climate_api.get_advanced_agrometeo(row.lat, row.lng)
                
                if data:
                    risk, reasons = calculate_tomato_risk(data)
                    
                    base_ref_price = 4.00 
                    scarcity_multiplier = 1 + risk 
                    new_buy_price = round(base_ref_price * scarcity_multiplier, 2)
                    new_sell_price = round(new_buy_price * current_margin, 2)
                    
                    risk_level = 1
                    if risk > 0.2: risk_level = 2
                    if risk > 0.5: risk_level = 3

                    # Atualiza Banco
                    update_query = text("""
                        UPDATE "Opportunity"
                        SET "buyPrice" = :buy, "sellPrice" = :sell, "riskLevel" = :risk_lvl,
                            "climate" = :climate_desc, "description" = :desc
                        WHERE id = :id
                    """)
                    
                    connection.execute(update_query, {
                        "buy": new_buy_price, "sell": new_sell_price, "risk_lvl": risk_level,
                        "climate_desc": f"Chuva: {data['rain_mm']}mm",
                        "desc": f"Risco Climático: {reasons}" if reasons else "Condições Favoráveis",
                        "id": opp_id
                    })

                    # Histórico
                    history_query = text("""
                        INSERT INTO "PriceHistory" ("opportunityId", "price", "createdAt")
                        VALUES (:opp_id, :price, NOW())
                    """)
                    connection.execute(history_query, {"opp_id": opp_id, "price": new_buy_price})
            
            # Limpeza
            cleanup_query = text("DELETE FROM \"PriceHistory\" WHERE \"createdAt\" < NOW() - INTERVAL '180 days'")
            connection.execute(cleanup_query)
            connection.commit()
            logger.info("✅ Ciclo de atualização concluído!")
            
    except Exception as e:
        logger.error(f"❌ Erro crítico no loop: {e}")

if __name__ == "__main__":
    update_market_prices()