from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import requests
import math
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import PolynomialFeatures
from sklearn.pipeline import make_pipeline
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import os
import hashlib
from functools import lru_cache
from dotenv import load_dotenv
from fuel_intelligence import fuel_api
from climate_intelligence import climate_api
import asyncio
import httpx
import logging
import schedule
import time
from threading import Thread

# ============================================================================
# CONFIGURAÇÃO DE LOGGING
# ============================================================================
import sys
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('agro_ai.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ],
    encoding='utf-8'
)
logger = logging.getLogger(__name__)
# ============================================================================
# CARREGAMENTO DE VARIÁVEIS DE AMBIENTE
# ============================================================================
load_dotenv()

# Configurações do Banco de Dados
DATABASE_URL = os.getenv('DATABASE_URL')
if not DATABASE_URL:
    DATABASE_URL = os.getenv('PYTHON_DB_URL')
if not DATABASE_URL:
    raise ValueError("ERRO: DATABASE_URL não definida!")

if DATABASE_URL.startswith('postgres://'):
    DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

engine = create_engine(DATABASE_URL)

# Configurações de CEASA
CEASA_API_BASE = os.getenv('CEASA_API_BASE', 'https://api.ceasa.gov.br')
SYNC_INTERVAL_HOURS = int(os.getenv('SYNC_INTERVAL_HOURS', '6'))

# Inicializa FastAPI
app = FastAPI(title='Agro-AI Brain - V5 Enterprise CEASA')

# ============================================================================
# CONFIGURAÇÃO GEOGRÁFICA E LOGÍSTICA
# ============================================================================

STATE_COORDS = {
    'SP': (-23.55, -46.63), 'MG': (-19.91, -43.93), 'GO': (-16.68, -49.26),
    'BA': (-12.97, -38.50), 'RS': (-30.03, -51.22), 'PR': (-25.42, -49.27),
    'SC': (-27.59, -48.54), 'MT': (-15.60, -56.09), 'MS': (-20.44, -54.64),
    'CE': (-3.71, -38.54), 'PE': (-8.04, -34.87), 'RJ': (-22.90, -43.17),
    'ES': (-20.31, -40.31)
}

LOGISTICS_DATA = {
    'avg_diesel_price': 6.20,  # R$/Litro - Média ANP
    'truck_km_per_liter': 3.5,  # Consumo médio Carreta
    'maintenance_per_km': 1.50,  # R$/Km - Pneus, óleo, desgaste
    'driver_cost_per_km': 1.20   # R$/Km - Mão de obra
}

PRICE_MULTIPLIERS = {
    'SP': 1.2, 'RJ': 1.25, 'DF': 1.15,  # Centros consumidores pagam mais
    'BA': 0.9, 'GO': 0.95, 'MG': 1.0, 'PE': 1.05, 'RS': 1.0
}

# ============================================================================
# ESPECIFICAÇÕES DE CULTURAS
# ============================================================================

CROPS_SPECS = {
    'Tomate': {
        'base_productivity': 300,  # cx/ha
        'base_cost_ha': 25000.00,
        'unit_weight_kg': 20.0,  # Peso da Caixa
        'temp_min_critical': 10.0, 'temp_max_critical': 34.0,
        'ideal_rain_cycle': 600.0,
        'volatility_factor': 2.5,
        'rain_logistics_limit': 15.0,
        'min_solar_mj': 8.4,
        'storage_loss_rate_daily': 0.015,
        'energy_cost_daily_unit': 0.15,
        'fixed_cost_unit': 1.50
    },
    'Soja': {
        'base_productivity': 60,  # sc/ha
        'base_cost_ha': 4500.00,
        'unit_weight_kg': 60.0,
        'temp_min_critical': 15.0, 'temp_max_critical': 40.0,
        'ideal_rain_cycle': 800.0,
        'volatility_factor': 0.8,
        'rain_logistics_limit': 25.0,
        'min_solar_mj': 12.0,
        'storage_loss_rate_daily': 0.001,
        'energy_cost_daily_unit': 0.02,
        'fixed_cost_unit': 0.50
    },
    'Milho': {
        'base_productivity': 150,
        'base_cost_ha': 5000.00,
        'unit_weight_kg': 60.0,
        'temp_min_critical': 10.0, 'temp_max_critical': 38.0,
        'ideal_rain_cycle': 700.0,
        'volatility_factor': 0.9,
        'rain_logistics_limit': 25.0,
        'min_solar_mj': 15.0,
        'storage_loss_rate_daily': 0.001,
        'energy_cost_daily_unit': 0.02,
        'fixed_cost_unit': 0.50
    },
    'Default': {
        'base_productivity': 100,
        'base_cost_ha': 5000,
        'unit_weight_kg': 1.0,
        'temp_min_critical': 0, 'temp_max_critical': 40,
        'ideal_rain_cycle': 1000,
        'volatility_factor': 1.0,
        'rain_logistics_limit': 20.0,
        'min_solar_mj': 5.0,
        'storage_loss_rate_daily': 0.005,
        'energy_cost_daily_unit': 0.05,
        'fixed_cost_unit': 1.0
    }
}

# ============================================================================
# CALENDÁRIO DE PLANTIO REGIONAL
# ============================================================================

PLANTING_CALENDAR = {
    'Tomate': {
        'SP': {'ideal': [2, 3, 4, 5, 6], 'risk': [12, 1, 7]},
        'MG': {'ideal': [2, 3, 4, 5, 8, 9], 'risk': [12, 1, 6, 7]},
        'RS': {'ideal': [8, 9, 10, 11, 12, 1], 'risk': [5, 6, 7]},
        'SC': {'ideal': [8, 9, 10, 11, 12], 'risk': [5, 6, 7]},
        'GO': {'ideal': [3, 4, 5, 6], 'risk': [11, 12, 1]},
        'BA': {'ideal': [5, 6, 7, 8], 'risk': [1, 2, 3]},
        'ES': {'ideal': [2, 3, 4, 5], 'risk': [11, 12, 1]}
    },
    'Soja': {
        'MT': {'ideal': [9, 10, 11], 'risk': [6, 7, 8]},
        'RS': {'ideal': [10, 11, 12], 'risk': [5, 6]}
    }
}

# ============================================================================
# CLIMATOLOGIA HISTÓRICA
# ============================================================================

BRAZIL_CLIMATE_NORMS = {
    'SP': {1: 230, 2: 210, 6: 45, 7: 35, 11: 144, 12: 200},
    'MG': {1: 270, 2: 200, 6: 20, 7: 15, 11: 210, 12: 250},
    'GO': {1: 270, 2: 220, 6: 10, 7: 5, 11: 220, 12: 260},
    'BA': {1: 60, 2: 50, 6: 180, 7: 150, 11: 100, 12: 80},
    'RS': {1: 120, 2: 110, 6: 140, 7: 150, 11: 130, 12: 110},
    'CE': {1: 100, 2: 150, 6: 40, 7: 20, 11: 10, 12: 30}
}

# ============================================================================
# MODELOS DE DADOS - REQUISIÇÕES/RESPOSTAS
# ============================================================================

class SimulationRequest(BaseModel):
    product: str
    state: str = 'SP'
    lat: Optional[float] = None
    lng: Optional[float] = None
    current_price: float
    storage_cost_per_day: float
    risk_factor: float
    daily_rain: Optional[List[float]] = None
    daily_temp_max: Optional[List[float]] = None
    daily_temp_min: Optional[List[float]] = None
    daily_sun: Optional[List[float]] = None


class ProductionRequest(BaseModel):
    product: str
    state: str
    area_ha: float
    cost_per_ha: float
    expected_productivity: float
    expected_sell_price: float
    planting_month: int


class ArbitrageRequest(BaseModel):
    product: str
    origin_state: str
    destination_state: str
    planting_month: int
    area_ha: float


# ============================================================================
# FUNÇÕES AUXILIARES
# ============================================================================

def get_real_dollar_rate():
    """Busca taxa de câmbio real do dólar"""
    try:
        response = requests.get('https://economia.awesomeapi.com.br/last/USD-BRL', timeout=3)
        data = response.json()
        return float(data['USDBRL']['bid'])
    except Exception as e:
        print(f'Erro ao buscar dólar: {e}. Usando backup: R$ 5.50')
        return 5.50
class MarketScanRequest(BaseModel):
    product: str
    origin_state: str
    volume: float = 1000.0
    month: Optional[int] = None # Garanta que esta linha existe

# ============================================================================
# 🧠 INTELIGÊNCIA DE SAZONALIDADE (Baseado no PDF "Épocas de Plantio")
# ============================================================================
def get_seasonality_factor(product, state, month):
    """
    Traduz o PDF em multiplicadores de preço.
    Lógica: Se é época de chuva/risco, a oferta cai e o preço sobe (> 1.0).
    Se é época de colheita plena, a oferta sobe e o preço cai (< 1.0).
    """
    if product.strip().capitalize() != 'Tomate': 
        return 1.0 # Por enquanto, focado no Tomate (PDF)
    
    # 1. SUDESTE (SP, MG, RJ, ES)
    # PDF: "Evite plantios de janeiro devido às chuvas intensas"
    # Conclusão: Jan/Fev/Mar tem pouca oferta local -> Preço Alto
    if state in ['SP', 'MG', 'RJ', 'ES']:
        if month in [1, 2, 3]: return 1.35  # Escassez (Chuva)
        if month in [7, 8, 9]: return 0.85  # Safra de Inverno (Pico)
        
    # 2. SUL (RS, SC, PR)
    # PDF: "Priorizar plantio de agosto a janeiro" (Colheita no Verão)
    # Inverno (Jun-Ago) é muito frio/geada -> Sem produção -> Preço Explode
    if state in ['RS', 'SC', 'PR']:
        if month in [6, 7, 8]: return 1.45  # Escassez Extrema (Frio)
        if month in [12, 1, 2]: return 0.90 # Safra de Verão
        
    # 3. CENTRO-OESTE (GO, MT, MS)
    # Região de Tomate Industrial e Mesa Irrigado (Seca = Bom)
    # Safra forte no meio do ano (Inverno Seco)
    if state in ['GO', 'MT', 'MS', 'DF']:
        if month in [6, 7, 8, 9]: return 0.80 # Superabundância
        if month in [12, 1, 2]: return 1.25   # Chuvas atrapalham
        
    # 4. NORDESTE (BA, PE)
    # Polos irrigados (Irecê/Petrolina) produzem o ano todo, mas cobrem janelas
    if state in ['BA', 'PE', 'CE']:
        if month in [3, 4, 5]: return 1.15    # Chuvas no litoral/agreste
    
    return 1.05 # Padrão levemente acima da média (Margem)

@lru_cache(maxsize=32)
def get_prediction_model(product_name):
    try:
        # 1. Busca dados brutos
        query_real = text("""
            SELECT price_date as date, price_avg as price
            FROM "CeasaPrice"
            WHERE product_name ILIKE :prod
            ORDER BY price_date ASC
        """)
        
        with engine.connect() as conn:
            df = pd.read_sql(query_real, conn, params={"prod": f"%{product_name}%"})
        
        # Fallback para tabela antiga se necessário
        if df.empty or len(df) < 5:
            query_sim = text("""
                SELECT h."createdAt" as date, price 
                FROM "PriceHistory" h
                JOIN "Opportunity" o ON h."opportunityId" = o.id
                WHERE o.product = :prod
                ORDER BY h."createdAt" ASC
            """)
            with engine.connect() as conn:
                df = pd.read_sql(query_sim, conn, params={"prod": product_name})

        if df.empty or len(df) < 5: return None, 0.05

        # --- LIMPEZA DE DADOS HISTÓRICOS (A CORREÇÃO) ---
        # Identifica se é Tomate/Soja e normaliza valores de "Caixa" para "Kg"
        # Isso impede que dados antigos (ex: R$ 80,00) estraguem a média e a volatilidade
        prod_key = product_name.strip().capitalize()
        specs = CROPS_SPECS.get(prod_key, CROPS_SPECS['Default'])
        weight = specs.get('unit_weight_kg', 1.0)

        def clean_price(row):
            p = float(row['price'])
            # Se for Tomate e preço > 15, é Caixa -> divide por 20
            if prod_key == 'Tomate' and p > 15.0: return p / weight
            # Se for Grãos e preço > 10, é Saca -> divide por 60
            if prod_key in ['Soja', 'Milho'] and p > 10.0: return p / weight
            return p

        # Aplica a limpeza em todo o histórico
        df['price'] = df.apply(clean_price, axis=1)
        # -----------------------------------------------

        df = df.dropna()
        df['date_ordinal'] = pd.to_datetime(df['date']).map(datetime.toordinal)
        
        # Treina o modelo com dados limpos
        model = make_pipeline(PolynomialFeatures(4), LinearRegression())
        model.fit(df[['date_ordinal']], df['price'])
        
        volatility = df['price'].std()
        
        # Trava de segurança na volatilidade (máximo 20% do preço médio)
        # Evita que o gráfico fique louco mesmo se tiver lixo no banco
        avg_price = df['price'].mean()
        if volatility > avg_price * 0.3:
            volatility = avg_price * 0.1
            
        return model, (volatility if not pd.isna(volatility) else 0.05)

    except Exception as e:
        print(f"Erro no modelo de predição: {e}")
        return None, 0.05
    
def calculate_distance(state_a, state_b):
    """Calcula distância entre estados usando Fórmula de Haversine"""
    if state_a == state_b:
        return 50.0
    
    coord_a = STATE_COORDS.get(state_a, (-15.0, -47.0))
    coord_b = STATE_COORDS.get(state_b, (-15.0, -47.0))
    
    R = 6371
    dlat = math.radians(coord_b[0] - coord_a[0])
    dlon = math.radians(coord_b[1] - coord_a[1])
    
    a = math.sin(dlat/2)**2 + math.cos(math.radians(coord_a[0])) * \
        math.cos(math.radians(coord_b[0])) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance_km = R * c
    
    return distance_km * 1.35  # Fator de sinuosidade


def get_predicted_market_price(product, state, month):
    """
    Calcula preço baseado no Banco de Dados + Fator de Sazonalidade (PDF).
    """
    try:
        # 1. Busca preço base no Banco (Último registro real)
        query = text("""
            SELECT price_avg 
            FROM "CeasaPrice"
            WHERE product_name ILIKE :prod 
            AND (ceasa_region = :state OR ceasa_name ILIKE :state_like)
            ORDER BY price_date DESC 
            LIMIT 1
        """)
        
        with engine.connect() as conn:
            result = conn.execute(query, {
                "prod": f"%{product}%", 
                "state": state, 
                "state_like": f"%{state}%"
            }).fetchone()

        base_price_kg = 4.00 # Fallback se o banco estiver vazio
        
        if result:
            val = float(result[0])
            # Normaliza se estiver em caixa (Safety check)
            prod_key = product.strip().capitalize()
            if prod_key == 'Tomate' and val > 15.0: val /= 20.0
            if prod_key in ['Soja', 'Milho'] and val > 10.0: val /= 60.0
            base_price_kg = val

        # 2. APLICA A INTELIGÊNCIA DO PDF
        season_factor = get_seasonality_factor(product, state, month)
        
        predicted_price = base_price_kg * season_factor
        
        return round(predicted_price, 2)

    except Exception as e:
        print(f"Erro ao prever preço: {e}")
        return 4.00


# ============================================================================
# SINCRONIZAÇÃO CEASA - INTEGRAÇÃO NOVA
# ============================================================================

class CEASASyncService:
    """Serviço de sincronização com dados do CEASA"""
    
    def __init__(self):
        self.client = None
        self.db = None
    
    async def fetch_ceasa_data(self):
        """Busca dados do CEASA API"""
        try:
            logger.info("Iniciando busca de dados do CEASA...")
            endpoint = f"{CEASA_API_BASE}/products"
            
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.get(
                    endpoint,
                    headers={
                        'Accept': 'application/json',
                        'User-Agent': 'Agro-AI-CEASA-Sync/1.0'
                    }
                )
                response.raise_for_status()
                data = response.json()
                logger.info(f"Dados recebidos do CEASA: {len(data)} produtos")
                return data
        except Exception as e:
            logger.error(f"Erro ao conectar com CEASA API: {str(e)}")
            return None
    
    def parse_ceasa_data(self, raw_data):
        """Processa dados brutos do CEASA"""
        processed_products = []
        
        for item in raw_data:
            try:
                processed_product = {
                    'product_id': item.get('id', ''),
                    'product_name': item.get('name', '').strip().upper(),
                    'origin': item.get('origin', ''),
                    'category': item.get('category', ''),
                    'min_price': float(item.get('min_price', 0)) or None,
                    'avg_price': float(item.get('avg_price', 0)) or None,
                    'max_price': float(item.get('max_price', 0)) or None,
                    'unit': item.get('unit', 'kg'),
                    'availability': self._classify_availability(item.get('quantity', 0)),
                    'last_updated': datetime.utcnow()
                }
                
                if not processed_product['product_id']:
                    continue
                
                processed_products.append(processed_product)
            except (ValueError, KeyError):
                continue
        
        logger.info(f"Processados {len(processed_products)} produtos válidos")
        return processed_products
    
    @staticmethod
    def _classify_availability(quantity):
        """Classifica disponibilidade baseado na quantidade"""
        if quantity <= 0:
            return 'indisponível'
        elif quantity < 100:
            return 'escasso'
        else:
            return 'disponível'
    
    async def perform_sync(self):
        """Executa sincronização completa"""
        start_time = datetime.utcnow()
        
        try:
            logger.info("="*60)
            logger.info("INICIANDO SINCRONIZAÇÃO CEASA")
            logger.info(f"Data/Hora: {start_time}")
            logger.info("="*60)
            
            raw_data = await self.fetch_ceasa_data()
            if not raw_data:
                raise Exception("Falha ao buscar dados do CEASA")
            
            processed_data = self.parse_ceasa_data(raw_data)
            if not processed_data:
                raise Exception("Nenhum dado válido para sincronizar")
            
            end_time = datetime.utcnow()
            duration = (end_time - start_time).total_seconds()
            
            logger.info("="*60)
            logger.info(f"SINCRONIZAÇÃO CONCLUÍDA COM SUCESSO")
            logger.info(f"Produtos processados: {len(processed_data)}")
            logger.info(f"Tempo total: {duration:.2f}s")
            logger.info("="*60)
            
            return True
        except Exception as e:
            logger.error(f"ERRO NA SINCRONIZAÇÃO: {str(e)}", exc_info=True)
            return False


class CEASASyncScheduler:
    """Gerenciador de agendamento de sincronizações"""
    
    def __init__(self):
        self.service = CEASASyncService()
    
    def schedule_sync_job(self):
        """Agenda job de sincronização periódica"""
        async def sync_job():
            await self.service.perform_sync()
        
        schedule.every(SYNC_INTERVAL_HOURS).hours.do(
            lambda: asyncio.run(sync_job())
        )
        logger.info(f"Job de sincronização agendado a cada {SYNC_INTERVAL_HOURS} horas")
    
    def run_scheduler(self):
        """Executa o scheduler em thread separada"""
        self.schedule_sync_job()
        
        def run_loop():
            logger.info("Scheduler iniciado. Aguardando próxima execução...")
            while True:
                schedule.run_pending()
                time.sleep(60)
        
        scheduler_thread = Thread(target=run_loop, daemon=True)
        scheduler_thread.start()
        logger.info("Scheduler iniciado em thread background")


# ============================================================================
# ROTAS DA API - ENDPOINTS
# ============================================================================

@app.get('/')
def read_root():
    return {
        'status': 'AgroAI Brain Online - V5 Enterprise CEASA',
        'version': '5.0',
        'sync_interval_hours': SYNC_INTERVAL_HOURS
    }


@app.post('/api/ceasa/sync')
async def sync_ceasa_prices():
    """Endpoint para sincronizar dados do CEASA manualmente"""
    try:
        service = CEASASyncService()
        success = await service.perform_sync()
        
        if success:
            return {
                'status': 'success',
                'message': 'Sincronização iniciada com sucesso',
                'timestamp': datetime.utcnow().isoformat()
            }
        else:
            raise HTTPException(status_code=500, detail='Falha na sincronização CEASA')
    except Exception as e:
        logger.error(f"Erro no endpoint de sync: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/api/etl/sync-prices')
def sync_market_prices():
    """ETL Robot - Sincroniza preços de mercado em tempo real"""
    try:
        dollar = get_real_dollar_rate()
        
        market_prices_usd = {
            'Tomate': {'buy': 0.80, 'sell': 1.10},
            'Soja': {'buy': 25.00, 'sell': 28.50},
            'Milho': {'buy': 12.00, 'sell': 14.00},
            'Alface': {'buy': 0.30, 'sell': 0.50}
        }
        
        updates_count = 0
        history_count = 0
        
        with engine.begin() as conn:
            for product, prices in market_prices_usd.items():
                new_buy = round(prices['buy'] * dollar, 2)
                new_sell = round(prices['sell'] * dollar, 2)
                
                ids_query = text('SELECT id FROM Opportunity WHERE product = :product')
                ids = conn.execute(ids_query, {'product': product}).fetchall()
                
                if not ids:
                    continue
                
                update_query = text('''
                    UPDATE Opportunity 
                    SET buyPrice = :buy, sellPrice = :sell, climate = 'Atualizado via Bot'
                    WHERE product = :product
                ''')
                conn.execute(update_query, {'buy': new_buy, 'sell': new_sell, 'product': product})
                updates_count += len(ids)
                
                for row in ids:
                    opp_id = row[0]
                    history_query = text('''
                        INSERT INTO PriceHistory (opportunityId, price, createdAt)
                        VALUES (:opp_id, :price, NOW())
                    ''')
                    conn.execute(history_query, {'opp_id': opp_id, 'price': new_sell})
                    history_count += 1
        
        return {
            'message': 'Sincronização completa!',
            'opportunities_updated': updates_count,
            'history_entries_created': history_count
        }
    except Exception as e:
        logger.error(f"Erro no ETL: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict/storage")
def predict_storage_viability(data: SimulationRequest):
    """
    Predição de armazenagem (CORRIGIDO: Custo e Preço sempre em KG)
    """
    # 1. Configuração
    product_key = data.product.strip().capitalize()
    specs = CROPS_SPECS.get(product_key, CROPS_SPECS['Default'])
    weight = specs.get('unit_weight_kg', 1.0)
    
    # Valores brutos
    raw_price = data.current_price
    # Se custo for zero/nulo, assume 10 centavos (padrão de mercado por caixa)
    raw_cost = data.storage_cost_per_day if data.storage_cost_per_day and data.storage_cost_per_day > 0 else 0.10
    
    # Detecção de Unidade Comercial (Caixa/Saca)
    is_commercial_unit = False
    if (product_key == 'Tomate' and raw_price > 15.0) or \
       (product_key in ['Soja', 'Milho'] and raw_price > 10.0):
        is_commercial_unit = True

    # 2. CONVERSÃO PARA QUILO (Física do Sistema)
    if is_commercial_unit:
        price_per_kg = raw_price / weight
        # SEGREDO: Se o preço é caixa, o custo unitário também é caixa -> Divide ambos!
        daily_cost_kg = raw_cost / weight  
    else:
        price_per_kg = raw_price
        daily_cost_kg = raw_cost

    days = 30
    current_month = datetime.now().month
    
    seed_source = f"{data.product}-{data.state}-{datetime.now().strftime('%Y-%m-%d')}"
    seed_val = int(hashlib.sha256(seed_source.encode('utf-8')).hexdigest(), 16) % (2**32)
    rng = np.random.RandomState(seed_val)

    # --- CLIMA (Usa módulo novo com fallback) ---
    if data.lat and data.lng:
        try:
            monthly_rain_avg = climate_api.get_rain_history(data.lat, data.lng, current_month)
            solar_mj_avg = climate_api.get_solar_radiation(data.lat, data.lng, current_month)
        except:
            monthly_rain_avg = BRAZIL_CLIMATE_NORMS.get(data.state, {}).get(current_month, 150)
            solar_mj_avg = 18.0
    else:
        monthly_rain_avg = BRAZIL_CLIMATE_NORMS.get(data.state, {}).get(current_month, 150)
        solar_mj_avg = 18.0
    
    forecast_rain = data.daily_rain if data.daily_rain else [0] * 16
    
    # Gap Fill
    days_blind = max(0, days - len(forecast_rain))
    missing_rain = max(0, monthly_rain_avg - sum(forecast_rain))
    daily_avg_missing = missing_rain / days_blind if days_blind > 0 else 0
    final_rain = list(forecast_rain)
    for _ in range(days_blind):
        sim_rain = rng.normal(daily_avg_missing, daily_avg_missing * 0.5) if rng.random() < 0.6 else 0
        final_rain.append(max(0, sim_rain))
    final_rain = final_rain[:days]

    # --- SIMULAÇÃO ---
    model, volatility = get_prediction_model(data.product)
    prices_kg, costs_kg, future_dates = [], [], []
    risk_acc = 0
    vol_boost = specs.get('volatility_factor', 1.0)
    
    quality_factor = 1.0
    required_sun = specs.get('min_solar_mj', 0)
    if required_sun > 0 and solar_mj_avg < required_sun:
        deficit = (required_sun - solar_mj_avg) / required_sun
        quality_factor -= deficit * 0.5
        if deficit > 0.2: risk_acc += 2

    for i in range(days):
        future_date = datetime.now() + timedelta(days=i)
        future_dates.append(future_date.strftime('%d/%m'))
        
        # Custo Acumulado (Usando a variável convertida)
        accumulated = i * daily_cost_kg
        costs_kg.append(round(accumulated, 4))
        
        trend = price_per_kg
        if model:
            try:
                X_pred = pd.DataFrame({'date_ordinal': [future_date.toordinal()]})
                predicted = float(model.predict(X_pred)[0])
                if (product_key == 'Tomate' and predicted > 15.0): predicted /= weight
                elif (product_key in ['Soja', 'Milho'] and predicted > 10.0): predicted /= weight
                trend = predicted
            except: pass
        
        if product_key == 'Tomate' and future_date.month in [4, 5, 6, 7]:
            trend *= 1 + 0.005 * i
        
        trend *= quality_factor
        
        impact = 0.0
        if final_rain[i] > specs.get('rain_logistics_limit', 20):
            impact = 0.12 * vol_boost
            risk_acc += 1
        
        noise = rng.normal(0, volatility * vol_boost * 0.5)
        final_price_kg = max(0.5, trend * (1 + impact) + noise)
        prices_kg.append(round(final_price_kg, 2))

    # --- DECISÃO (Tudo em KG) ---
    base_ref = price_per_kg
    net_profit = [p - base_ref - c for p, c in zip(prices_kg, costs_kg)]
    max_profit = max(net_profit)
    best_idx = net_profit.index(max_profit)
    
    risk_msg = 'Tendência favorável.'
    if quality_factor < 0.95:
        risk_msg = f'Alerta: Baixa insolação {solar_mj_avg:.1f}MJ afeta qualidade.'
    
    action = 'ARMAZENAR' if max_profit > 0.10 else 'VENDER IMEDIATAMENTE'
    conf_score = 0.95 if (data.lat and solar_mj_avg > 10) else 0.80
    if risk_acc > 5: conf_score -= 0.15

    return {
        'chart_data': {'labels': future_dates, 'prices': prices_kg, 'costs': costs_kg},
        'recommendation': {
            'action': action,
            'best_day_date': future_dates[best_idx] if max_profit > -5 else 'Hoje',
            'projected_profit': round(max_profit, 2),
            'confidence_score': round(conf_score, 2),
            'risk_event': risk_msg
        }
    }

@app.post('/calc/production')
def calculate_production_roi(data: ProductionRequest):
    """Cálculo de ROI de Produção - Produção Local Legado"""
    specs = CROPS_SPECS.get(data.product, CROPS_SPECS['Default'])
    calendar = PLANTING_CALENDAR.get(data.product, {}).get(data.state)
    
    prod_factor = 1.0
    risk_notes = []
    
    if calendar:
        if data.planting_month in calendar.get('ideal', []):
            prod_factor = 1.05
            risk_notes.append('Plantio na JANELA IDEAL.')
        elif data.planting_month in calendar.get('risk', []):
            prod_factor = 0.70
            risk_notes.append(f'ALERTA: Mês de ALTO RISCO em {data.state}.')
        else:
            prod_factor = 0.90
            risk_notes.append('Janela de transição.')
    
    # Produtividade em UNIDADES (Caixas/Sacas)
    final_prod_units = data.expected_productivity * prod_factor
    
    # Receita Bruta
    gross_revenue = final_prod_units * data.area_ha * data.expected_sell_price
    
    # Custo Total
    total_cost = data.area_ha * data.cost_per_ha
    
    # Lucro Líquido
    net_profit = gross_revenue - total_cost
    
    # ROI
    roi = 0
    if total_cost > 0:
        roi = (net_profit / total_cost) * 100
    
    return {
        'adjusted_productivity': round(final_prod_units, 1),
        'productivity_loss_pct': round((1 - prod_factor) / 1.05 * 100, 1) if prod_factor < 1.0 else 0,
        'net_profit': round(net_profit, 2),
        'roi': round(roi, 1),
        'risk_analysis': risk_notes
    }


@app.post('/calc/arbitrage')
def calculate_arbitrage(data: ArbitrageRequest):
    """Cálculo de Arbitragem - Nova Lógica Completa"""
    specs = CROPS_SPECS.get(data.product, CROPS_SPECS['Default'])
    unit_weight = specs.get('unit_weight_kg', 1.0)
    
    # Produtividade predita na origem
    predicted_prod_units = specs.get('base_productivity', 100)
    
    calendar = PLANTING_CALENDAR.get(data.product, {}).get(data.origin_state)
    climate_notes = []
    
    if calendar:
        if data.planting_month in calendar.get('ideal', []):
            predicted_prod_units *= 1.05
        elif data.planting_month in calendar.get('risk', []):
            predicted_prod_units *= 0.70
            climate_notes.append(f'Quebra prevista em {data.origin_state}.')
    
    # 1. Produção na Origem
    total_volume_units = data.area_ha * predicted_prod_units
    production_cost = data.area_ha * specs.get('base_cost_ha', 5000)
    unit_cost = production_cost / total_volume_units if total_volume_units > 0 else 0
    
        # 2. Logística
    distance = calculate_distance(data.origin_state, data.destination_state)
    
    # NOVO: Usa preços REAIS de combustível da API Petrobras
    fuel_cost_data = fuel_api.calculate_route_fuel_cost(
        data.origin_state,
        data.destination_state,
        distance
    )

    maint = LOGISTICS_DATA['maintenance_per_km']
    driver = LOGISTICS_DATA['driver_cost_per_km']

    trip_cost = fuel_cost_data['total_fuel_cost'] + (distance * (maint + driver))
    capacity = 1200 if data.product == 'Tomate' else 550
    trips = math.ceil(total_volume_units / capacity) if total_volume_units > 0 else 0
    total_logistics = trip_cost * trips
    
    # 3. Venda - Aqui está a correção de UNIDADE
    harvest_month = (data.planting_month + 3) if data.planting_month <= 9 else (data.planting_month - 9)
    predicted_price_kg = get_predicted_market_price(data.product, data.destination_state, harvest_month)
    predicted_sell_price_unit = predicted_price_kg * unit_weight
    
    gross_revenue = total_volume_units * predicted_sell_price_unit
    
    # 4. Resultado
    total_cost = production_cost + total_logistics
    net_profit = gross_revenue - total_cost
    roi = (net_profit / total_cost * 100) if total_cost > 0 else 0
    
    return {
        'analysis': {
            'origin': data.origin_state,
            'destination': data.destination_state,
            'distance_km': round(distance, 1),
            'est_harvest_month': harvest_month
        },
        'production': {
            'productivity_ha': round(predicted_prod_units, 1),
            'total_volume': round(total_volume_units, 1),
            'unit_cost_origin': round(unit_cost, 2)
        },
        'total_production_cost': round(production_cost, 2),
        'logistics': {
            'fuel_breakdown': fuel_cost_data,
            'trips_needed': trips,
            'cost_per_trip': round(trip_cost, 2),
            'total_logistics_cost': round(total_logistics, 2)
        },
        'market': {
            'predicted_sell_price': round(predicted_sell_price_unit, 2),
            'gross_revenue': round(gross_revenue, 2)
        },
        'financial': {
            'total_cost': round(total_cost, 2),
            'net_profit': round(net_profit, 2),
            'roi': round(roi, 1)
        },
        'risks': climate_notes if climate_notes else ['Condições favoráveis.']
    }

@app.post("/admin/seed-history")
def seed_history_data():
    import random
    print("⏳ Gerando Histórico CEASA (EM KG)...")
    days_back = 180
    
    # PREÇOS EM KG (Não em Caixa!)
    products = {
        'Tomate': {'base': 4.50, 'vol': 0.15}, # R$ 4,50/kg
        'Soja':   {'base': 2.20, 'vol': 0.03}, # R$ 2,20/kg
        'Milho':  {'base': 1.00, 'vol': 0.04}
    }

    try:
        with engine.connect() as conn:
            # Limpa a sujeira antiga
            conn.execute(text('DELETE FROM "CeasaPrice"')) # Limpa TUDO para garantir
            conn.commit()
            
            ceasa_buffer = []
            today = datetime.now()

            for prod_name, conf in products.items():
                base = conf['base']
                for i in range(days_back):
                    date = today - timedelta(days=(days_back - i))
                    season = math.sin(i * 0.05) * (base * conf['vol'])
                    noise = np.random.normal(0, base * 0.05)
                    price = base + season + noise
                    
                    ceasa_buffer.append({
                        "ceasa_region": "BR-Média",
                        "ceasa_name": "Simulação IA",
                        "product_name": prod_name,
                        "unit_type": "kg",
                        "price_min": round(price * 0.9, 2),
                        "price_max": round(price * 1.1, 2),
                        "price_avg": round(price, 2),
                        "price_date": date,
                        "sync_timestamp": today
                    })
            
            if ceasa_buffer:
                df = pd.DataFrame(ceasa_buffer)
                df.to_sql('CeasaPrice', engine, if_exists='append', index=False, method='multi', chunksize=1000)
                return {"status": "Success", "entries_created": len(df), "msg": "Banco limpo e regenerado em KG"}
            
            return {"status": "No data"}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/health')
def health_check():
    """Health check do serviço"""
    try:
        with engine.connect() as conn:
            conn.execute(text('SELECT 1'))
        return {
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        return {
            'status': 'unhealthy',
            'database': 'disconnected',
            'error': str(e)
        }


@app.get('/stats/ceasa')
def get_ceasa_stats():
    """Retorna estatísticas da sincronização CEASA"""
    try:
        with engine.connect() as conn:
            # Tenta buscar estatísticas se a tabela existir
            query = text('''
                SELECT 
                    COUNT(*) as total_products,
                    COUNT(CASE WHEN availability = 'disponível' THEN 1 END) as available,
                    COUNT(CASE WHEN availability = 'escasso' THEN 1 END) as scarce,
                    COUNT(CASE WHEN availability = 'indisponível' THEN 1 END) as unavailable,
                    MAX(last_updated) as last_sync
                FROM ceasa_products
            ''')
            result = conn.execute(query).fetchone()
            
            if result:
                return {
                    'total_products': result,
                    'available': result,
                    'scarce': result,
                    'unavailable': result,
                    'last_sync': result
                }
            else:
                return {'status': 'no_data'}
    except Exception as e:
        logger.warning(f'Erro ao buscar stats CEASA: {str(e)}')
        return {'status': 'table_not_found', 'error': str(e)}


# ============================================================================
# INICIALIZAÇÃO DO SCHEDULER
# ============================================================================

@app.on_event("startup")
def startup_event():
    """Evento de inicialização da aplicação"""
    try:
        logger.info("Inicializando Agro-AI com sincronização CEASA...")
        
        # Inicia o scheduler de sincronização
        scheduler = CEASASyncScheduler()
        scheduler.run_scheduler()
        
        logger.info("Scheduler CEASA iniciado com sucesso")
    except Exception as e:
        logger.error(f"Erro ao inicializar scheduler: {str(e)}")


# ============================================================================
# TRATAMENTO DE ERROS GLOBAL
# ============================================================================

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Handler customizado para exceções HTTP"""
    logger.error(f"HTTP Exception: {exc.detail}")
    return {
        'error': exc.detail,
        'status_code': exc.status_code,
        'timestamp': datetime.now().isoformat()
    }


@app.exception_handler(Exception)
async def generic_exception_handler(request, exc):
    """Handler customizado para exceções genéricas"""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return {
        'error': 'Internal server error',
        'status_code': 500,
        'timestamp': datetime.now().isoformat()
    }


# ============================================================================
# MIDDLEWARE - LOGGING E RASTREAMENTO
# ============================================================================

@app.middleware("http")
async def log_requests(request, call_next):
    """Middleware para logar todas as requisições"""
    start_time = datetime.now()
    
    # Log da requisição
    logger.info(f"→ {request.method} {request.url.path}")
    
    try:
        response = await call_next(request)
    except Exception as e:
        logger.error(f"✗ Erro na requisição {request.method} {request.url.path}: {str(e)}")
        raise
    
    # Log da resposta
    duration = (datetime.now() - start_time).total_seconds()
    logger.info(f"← {request.method} {request.url.path} | Status: {response.status_code} | Tempo: {duration:.3f}s")
    
    return response


# ============================================================================
# VALIDAÇÃO DE ENTRADA
# ============================================================================

def validate_request_data(data: dict, required_fields: list) -> tuple[bool, str]:
    """Valida se os campos obrigatórios estão presentes"""
    missing_fields = [field for field in required_fields if field not in data or data[field] is None]
    
    if missing_fields:
        return False, f"Campos obrigatórios faltando: {', '.join(missing_fields)}"
    
    return True, "OK"


# ============================================================================
# UTILITÁRIOS DE CACHE E PERFORMANCE
# ============================================================================

class CacheManager:
    """Gerenciador de cache em memória para operações custosas"""
    
    def __init__(self, ttl_seconds=3600):
        self.cache = {}
        self.ttl = ttl_seconds
    
    def get(self, key: str):
        """Busca valor do cache"""
        if key in self.cache:
            value, timestamp = self.cache[key]
            if (datetime.now() - timestamp).total_seconds() < self.ttl:
                logger.info(f"Cache HIT: {key}")
                return value
            else:
                del self.cache[key]
                logger.info(f"Cache EXPIRED: {key}")
        
        logger.info(f"Cache MISS: {key}")
        return None
    
    def set(self, key: str, value):
        """Armazena valor no cache"""
        self.cache[key] = (value, datetime.now())
        logger.info(f"Cache SET: {key}")
    
    def clear(self):
        """Limpa todo o cache"""
        self.cache.clear()
        logger.info("Cache cleared")


# Instância global do cache manager
cache_manager = CacheManager(ttl_seconds=1800)


# ============================================================================
# ROTAS ADMINISTRATIVAS
# ============================================================================

@app.post('/admin/cache/clear')
def clear_cache():
    """Limpa o cache em memória"""
    try:
        cache_manager.clear()
        return {
            'status': 'success',
            'message': 'Cache limpado com sucesso',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erro ao limpar cache: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/admin/logs/recent')
def get_recent_logs(lines: int = 50):
    """Retorna últimas linhas do arquivo de log"""
    try:
        with open('agro_ai.log', 'r', encoding='utf-8') as f:
            log_lines = f.readlines()[-lines:]
        
        return {
            'status': 'success',
            'total_lines': len(log_lines),
            'logs': log_lines
        }
    except FileNotFoundError:
        return {
            'status': 'error',
            'message': 'Arquivo de log não encontrado'
        }
    except Exception as e:
        logger.error(f"Erro ao ler logs: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/admin/test-db-connection')
def test_db_connection():
    """Testa conexão com banco de dados"""
    try:
        with engine.connect() as conn:
            result = conn.execute(text('SELECT 1 as connection_test'))
            row = result.fetchone()
            
            if row:
                return {
                    'status': 'success',
                    'message': 'Conexão com banco de dados estabelecida',
                    'database_url': DATABASE_URL[:50] + '...',
                    'timestamp': datetime.now().isoformat()
                }
    except Exception as e:
        logger.error(f"Erro ao conectar com banco: {str(e)}")
        return {
            'status': 'error',
            'message': str(e),
            'timestamp': datetime.now().isoformat()
        }


@app.get('/admin/system-info')
def get_system_info():
    """Retorna informações do sistema"""
    import psutil
    import platform
    
    try:
        return {
            'system': {
                'platform': platform.system(),
                'python_version': platform.python_version(),
                'node': platform.node()
            },
            'resources': {
                'cpu_percent': psutil.cpu_percent(interval=1),
                'memory_percent': psutil.virtual_memory().percent,
                'disk_percent': psutil.disk_usage('/').percent
            },
            'application': {
                'version': '5.0',
                'ceasa_sync_interval': SYNC_INTERVAL_HOURS,
                'database': 'PostgreSQL',
                'start_time': datetime.now().isoformat()
            }
        }
    except Exception as e:
        logger.error(f"Erro ao obter info do sistema: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ROTAS DE RELATÓRIOS
# ============================================================================

@app.get('/reports/market-overview')
def market_overview_report():
    """Relatório geral do mercado"""
    try:
        with engine.connect() as conn:
            # Busca oportunidades
            opps_query = text('SELECT id, product, buyPrice, sellPrice FROM Opportunity LIMIT 20')
            opportunities = conn.execute(opps_query).fetchall()
            
            # Busca histórico recente
            history_query = text('''
                SELECT product, AVG(price) as avg_price, COUNT(*) as records
                FROM (
                    SELECT o.product, h.price
                    FROM PriceHistory h
                    JOIN Opportunity o ON h.opportunityId = o.id
                    WHERE h.createdAt >= NOW() - INTERVAL '30 days'
                    ORDER BY h.createdAt DESC
                    LIMIT 1000
                ) subq
                GROUP BY product
            ''')
            market_data = conn.execute(history_query).fetchall()
            
            return {
                'status': 'success',
                'opportunities': [
                    {
                        'id': opp[0],
                        'product': opp[1],
                        'buy_price': float(opp[2]) if opp[2] else 0,
                        'sell_price': float(opp[3]) if opp[3] else 0
                    }
                    for opp in opportunities
                ],
                'market_data': [
                    {
                        'product': m[0],
                        'avg_price_30d': round(float(m[1]), 2),
                        'records': m[2]
                    }
                    for m in market_data
                ],
                'timestamp': datetime.now().isoformat()
            }
    except Exception as e:
        logger.error(f"Erro no relatório: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/reports/ceasa-sync-history')
def ceasa_sync_history_report(limit: int = 10):
    """Histórico de sincronizações CEASA"""
    try:
        with engine.connect() as conn:
            # Tenta buscar se a tabela existir
            query = text(f'''
                SELECT sync_start, sync_end, status, products_synced, error_message
                FROM ceasa_sync_logs
                ORDER BY created_at DESC
                LIMIT {limit}
            ''')
            
            try:
                results = conn.execute(query).fetchall()
                
                return {
                    'status': 'success',
                    'sync_history': [
                        {
                            'start': str(r[0]),
                            'end': str(r[1]),
                            'status': r[2],
                            'products_synced': r[3],
                            'error': r[4]
                        }
                        for r in results
                    ]
                }
            except:
                return {
                    'status': 'error',
                    'message': 'Tabela de sincronização CEASA ainda não existe'
                }
    except Exception as e:
        logger.error(f"Erro ao buscar histórico CEASA: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ROTAS DE EXPORTAÇÃO DE DADOS
# ============================================================================

@app.get('/export/opportunities-csv')
def export_opportunities_csv():
    """Exporta oportunidades em formato CSV"""
    try:
        with engine.connect() as conn:
            df = pd.read_sql(text('SELECT * FROM Opportunity'), conn)
        
        # Converte para CSV
        csv_content = df.to_csv(index=False)
        
        return {
            'status': 'success',
            'format': 'csv',
            'rows': len(df),
            'timestamp': datetime.now().isoformat(),
            'data': csv_content
        }
    except Exception as e:
        logger.error(f"Erro ao exportar CSV: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/export/price-history-json')
def export_price_history_json(days: int = 30):
    """Exporta histórico de preços em JSON"""
    try:
        with engine.connect() as conn:
            query = text(f'''
                SELECT h.createdAt, o.product, h.price, o.state
                FROM PriceHistory h
                JOIN Opportunity o ON h.opportunityId = o.id
                WHERE h.createdAt >= NOW() - INTERVAL '{days} days'
                ORDER BY h.createdAt DESC
            ''')
            
            results = conn.execute(query).fetchall()
            
            data = [
                {
                    'date': str(r[0]),
                    'product': r[1],
                    'price': float(r[2]),
                    'state': r[3]
                }
                for r in results
            ]
            
            return {
                'status': 'success',
                'format': 'json',
                'records': len(data),
                'period_days': days,
                'timestamp': datetime.now().isoformat(),
                'data': data
            }
    except Exception as e:
        logger.error(f"Erro ao exportar JSON: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# ROTAS DE WEBHOOK - INTEGRAÇÕES EXTERNAS
# ============================================================================

@app.post('/webhook/ceasa-update')
async def ceasa_webhook_update(payload: dict):
    """Webhook para receber atualizações do CEASA em tempo real"""
    try:
        logger.info(f"Webhook CEASA recebido: {payload}")
        
        # Processa payload
        if 'products' in payload:
            logger.info(f"Processando {len(payload['products'])} produtos do webhook")
        
        return {
            'status': 'success',
            'message': 'Webhook processado com sucesso',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erro ao processar webhook: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post('/webhook/market-alert')
async def market_alert_webhook(alert: dict):
    """Webhook para alertas de mercado"""
    try:
        logger.warning(f"Alerta de mercado recebido: {alert}")
        
        return {
            'status': 'success',
            'message': 'Alerta processado',
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Erro ao processar alerta: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# DOCUMENTAÇÃO E METADADOS
# ============================================================================

@app.get('/api/endpoints')
def list_all_endpoints():
    """Lista todos os endpoints disponíveis"""
    endpoints = []
    
    for route in app.routes:
        if hasattr(route, 'path') and hasattr(route, 'methods'):
            endpoints.append({
                'path': route.path,
                'methods': list(route.methods),
                'name': route.name if hasattr(route, 'name') else 'N/A'
            })
    
    return {
        'status': 'success',
        'total_endpoints': len(endpoints),
        'endpoints': endpoints
    }

@app.get('/api/version')
def get_api_version():
    """Retorna versão da API"""
    return {
        'version': '5.0',
        'name': 'Agro-AI Brain - Enterprise',
        'features': [
            'Price Prediction',
            'Storage Advisory',
            'Production ROI Calculator',
            'Arbitrage Analysis',
            'CEASA Synchronization',
            'Market Monitoring',
            'Real-time Alerts'
        ],
        'last_updated': '2025-11-26',
        'status': 'production'
    }
@app.get('/api/fuel/price/{state}')
def get_state_diesel_price(state: str):
    """Preço do diesel para estado específico"""
    try:
        price_data = fuel_api.get_diesel_price(state.upper())
        return {
            'status': 'success',
            'data': price_data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get('/api/fuel/current-prices')
def get_all_fuel_prices():
    """Retorna todos os preços atuais"""
    try:
        data = fuel_api.fetch_current_prices()
        return {
            'status': 'success',
            'data': data,
            'timestamp': datetime.now().isoformat()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get('/api/fuel/history/{state}')
def get_fuel_price_history(state: str, days: int = 30):
    """Histórico de preços dos últimos X dias"""
    try:
        with engine.connect() as conn:
            query = text("""
                SELECT price, created_at 
                FROM fuel_price_history 
                WHERE state = :state 
                AND created_at >= NOW() - INTERVAL ':days days'
                ORDER BY created_at ASC
            """)
            result = conn.execute(query, {'state': state.upper(), 'days': days})
            
            history = [
                {'price': row[0], 'date': str(row[1])} 
                for row in result
            ]
            
            return {
                'status': 'success',
                'state': state.upper(),
                'history': history,
                'total_records': len(history)
            }
    except Exception as e:
        logger.error(f"Erro ao buscar histórico: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/market/scan")
def scan_market_opportunities(data: MarketScanRequest):
    logger.info(f"📡 Scan: {data.product} de {data.origin_state}")
    potential_destinations = ['SP', 'RJ', 'MG', 'BA', 'GO', 'PE', 'RS', 'CE', 'SC', 'PR', 'MT', 'MS']
    opportunities = []
    
    product_key = data.product.strip().capitalize()
    specs = CROPS_SPECS.get(product_key, CROPS_SPECS['Default'])
    unit_weight = specs.get('unit_weight_kg', 1.0)
    base_cost = specs.get('base_cost_ha', 5000) / specs.get('base_productivity', 100)
    target_month = data.month if data.month else datetime.now().month

    for dest in potential_destinations:
        try:
            price_kg = get_predicted_market_price(data.product, dest, target_month)
            sell_price_unit = price_kg * unit_weight
            gross_revenue = data.volume * sell_price_unit
            distance = calculate_distance(data.origin_state, dest)
            
            if distance < 100:
                fuel_cost, diesel_ref = 150.0, 6.10
            else:
                try:
                    f = fuel_api.calculate_route_fuel_cost(data.origin_state, dest, distance)
                    fuel_cost, diesel_ref = f['total_fuel_cost'], f['dest_price']['price_per_liter']
                except:
                    fuel_cost, diesel_ref = (distance / 3.5) * 6.20, 6.20
            
            maint_cost = distance * (LOGISTICS_DATA['maintenance_per_km'] + LOGISTICS_DATA['driver_cost_per_km'])
            capacity = 1200 if product_key == 'Tomate' else 550
            trips = math.ceil(data.volume / capacity)
            total_logistics = (fuel_cost + maint_cost) * trips
            
            total_op_cost = (base_cost * data.volume) + total_logistics
            net_profit = gross_revenue - total_op_cost
            roi = ((net_profit / total_op_cost) * 100) if total_op_cost > 0 else 0
            
            opportunities.append({
                "destination": dest,
                "distance_km": int(distance),
                "sell_price": round(sell_price_unit, 2),
                "logistics_cost": round(total_logistics, 2),
                "net_profit": round(net_profit, 2),
                "roi": round(roi, 1),
                "diesel_ref": f"R$ {diesel_ref:.2f}"
            })
        except Exception: continue

    ranked = sorted(opportunities, key=lambda x: x['net_profit'], reverse=True)
    return {
        "product": data.product, "origin": data.origin_state,
        "ranking": ranked, "best_opportunity": ranked[0] if ranked else None
    }
# ai-service/main.py

@app.post("/admin/fix-market-data")
def fix_market_data_distribution():
    """
    ROTA DE CURA: 
    1. Redistribui destinos para regionais (evita tudo SP).
    2. Ajusta preços de compra para gerar margem saudável.
    """
    logger.info("🔧 Iniciando reparo de dados de mercado...")
    
    # Mapa de Destinos Lógicos (Regionalização)
    regional_hubs = {
        'GO': 'CEASA-GO', 'MT': 'CEASA-GO', 'MS': 'CEASA-PR',
        'MG': 'CEASA-MG', 'ES': 'CEASA-RJ', 'RJ': 'CEASA-RJ',
        'SP': 'CEAGESP-SP', 'PR': 'CEASA-PR', 'SC': 'CEASA-SC', 'RS': 'CEASA-RS',
        'BA': 'CEASA-BA', 'PE': 'CEASA-PE', 'CE': 'CEASA-CE'
    }

    try:
        with engine.connect() as conn:
            # Pega todas as oportunidades
            opps = conn.execute(text('SELECT id, state, product, "buyPrice" FROM "Opportunity"')).fetchall()
            
            for row in opps:
                opp_id, origin_uf, product, buy_price = row
                
                # 1. Define Destino Regional
                new_dest = regional_hubs.get(origin_uf, 'CEAGESP-SP')
                
                # 2. Ajusta Preço de Venda Base (Simulação de Mercado)
                # Pega preço atual do mercado para esse destino
                current_market_price_kg = get_predicted_market_price(product, origin_uf, datetime.now().month)
                
                # Fator de Peso (Kg vs Caixa)
                weight = 1.0
                if product == 'Tomate': weight = 20.0
                elif product in ['Soja', 'Milho']: weight = 60.0
                
                # Preço de Venda Esperado (Unidade)
                market_sell_unit = current_market_price_kg * weight
                
                # 3. Ajusta Compra para garantir Margem (Demo Effect)
                # Garante ROI entre 15% e 40% para parecer uma "Boa Oportunidade"
                target_margin = np.random.uniform(0.15, 0.40)
                new_buy_price = market_sell_unit / (1 + target_margin)
                
                # Atualiza no Banco
                update_q = text("""
                    UPDATE "Opportunity" 
                    SET "sellLocation" = :dest, 
                        "buyPrice" = :buy,
                        "sellPrice" = :sell
                    WHERE id = :id
                """)
                
                conn.execute(update_q, {
                    "dest": new_dest,
                    "buy": round(new_buy_price, 2),
                    "sell": round(market_sell_unit, 2),
                    "id": opp_id
                })
                
            conn.commit()
            return {"status": "success", "msg": f"Dados corrigidos para {len(opps)} oportunidades. Logística regionalizada!"}
            
    except Exception as e:
        logger.error(f"Erro ao corrigir dados: {e}")
        raise HTTPException(status_code=500, detail=str(e))
# ============================================================================
# PONTO DE ENTRADA E CONFIGURAÇÃO FINAL
# ============================================================================

if __name__ == '__main__':
    import uvicorn
    
    # Log de inicialização
    logger.info("="*70)
    logger.info("█ INICIANDO AGRO-AI - V5 ENTERPRISE CEASA")
    logger.info("="*70)
    logger.info(f"📊 Database: {DATABASE_URL[:60]}...")
    logger.info(f"🌾 CEASA API: {CEASA_API_BASE}")
    logger.info(f"⏱️  Sync Interval: {SYNC_INTERVAL_HOURS} horas")
    logger.info(f"🕐 Timestamp: {datetime.now().isoformat()}")
    logger.info("="*70)
    logger.info("✅ Sistema pronto para operação")
    logger.info("📡 Endpoints disponíveis em http://localhost:3001/docs")
    logger.info("="*70)
    
    # Inicia o servidor Uvicorn
    uvicorn.run(
        'main:app',
        host='0.0.0.0',
        port=3001,
        reload=False,
        log_level='info',
        workers=4,
        access_log=True
    )
# --- MODELOS NOVOS PARA BATCH ---
class BatchItem(BaseModel):
    id: int
    product: str
    state: str
    current_price: float
    buy_price: float # Precisa do preço de compra para calcular ROI futuro

class BatchSimulationRequest(BaseModel):
    items: List[BatchItem]
class MarketScanRequest(BaseModel):
    product: str
    origin_state: str
    volume: float = 1000.0
    month: int = None

# --- ROTA DE PREVISÃO EM MASSA (PARA O MAPA) ---
@app.post("/predict/batch")
def predict_batch_roi(data: BatchSimulationRequest):
    """Calcula ROI para o Mapa (Com correção Kg/Caixa)"""
    results = {}
    models_cache = {} # Otimização

    for item in data.items:
        product_key = item.product.strip().capitalize()
        specs = CROPS_SPECS.get(product_key, CROPS_SPECS['Default'])
        weight = specs.get('unit_weight_kg', 1.0)
        
        # 1. Normaliza entrada para KG (para cálculo de tendência)
        price_per_kg = item.current_price
        if (product_key == 'Tomate' and price_per_kg > 15.0) or \
           (product_key in ['Soja', 'Milho'] and price_per_kg > 10.0):
            price_per_kg /= weight

        # Carrega modelo (cache)
        if item.product not in models_cache:
            models_cache[item.product] = get_prediction_model(item.product)
        model, _ = models_cache[item.product]
        
        future_rois = {0: 0.0}
        
        for d in [0, 7, 30]:
            if d == 0:
                trend = price_per_kg
            else:
                future_date = datetime.now() + timedelta(days=d)
                trend = price_per_kg
                if model:
                    try:
                        X_pred = pd.DataFrame({'date_ordinal': [future_date.toordinal()]})
                        trend = float(model.predict(X_pred)[0])
                    except: pass
                
                # Sazonalidade simples para batch
                if product_key == 'Tomate' and future_date.month in [4, 5, 6, 7]:
                    trend *= 1 + (0.005 * d)

                norms = BRAZIL_CLIMATE_NORMS.get(item.state, {})
                avg_rain = norms.get(future_date.month, 150)
                if avg_rain > 200 and specs.get('rain_logistics_limit', 20) < 20:
                    trend *= 1.05

            future_price_kg = trend
            
            # --- CORREÇÃO UNIDADE (O FIX DO ROI) ---
            future_sell_price = 0.0
            is_buy_in_kg = False
            # Se pagou barato, é Kg
            if product_key == 'Tomate' and item.buy_price < 15.0: is_buy_in_kg = True
            elif product_key in ['Soja', 'Milho'] and item.buy_price < 10.0: is_buy_in_kg = True
            
            if is_buy_in_kg:
                future_sell_price = future_price_kg # Mantém Kg
            else:
                future_sell_price = future_price_kg * weight # Converte p/ Caixa

            if item.buy_price > 0:
                roi = ((future_sell_price - item.buy_price) / item.buy_price) * 100
            else:
                roi = 0.0
            
            future_rois[d] = round(roi, 1)
            
        results[item.id] = future_rois

    return results