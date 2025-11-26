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

# Carrega variáveis de ambiente
load_dotenv()

app = FastAPI()

# --- CONFIGURAÇÃO DE BANCO ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = os.getenv("PYTHON_DB_URL") 

if not DATABASE_URL:
    raise ValueError("❌ ERRO: DATABASE_URL não definida!")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

# --- CONSTANTES E DADOS (O CONHECIMENTO DA IA) ---

# 1. Geografia e Logística
STATE_COORDS = {
    'SP': (-23.55, -46.63), 'MG': (-19.91, -43.93), 'GO': (-16.68, -49.26),
    'BA': (-12.97, -38.50), 'RS': (-30.03, -51.22), 'PR': (-25.42, -49.27),
    'SC': (-27.59, -48.54), 'MT': (-15.60, -56.09), 'MS': (-20.44, -54.64),
    'CE': (-3.71, -38.54), 'PE': (-8.04, -34.87), 'RJ': (-22.90, -43.17),
    'ES': (-20.31, -40.31)
}

LOGISTICS_DATA = {
    'avg_diesel_price': 6.20,       # R$/Litro (Média ANP)
    'truck_km_per_liter': 3.5,      # Consumo médio Carreta
    'maintenance_per_km': 1.50,     # R$/Km (Pneus, óleo, desgaste)
    'driver_cost_per_km': 1.20      # R$/Km (Mão de obra)
}

# 2. Mercado Regional (Multiplicadores de Preço)
PRICE_MULTIPLIERS = {
    'SP': 1.2, 'RJ': 1.25, 'DF': 1.15, # Centros consumidores pagam mais
    'BA': 0.9, 'GO': 0.95, 'MG': 1.0, 'PE': 1.05, 'RS': 1.0
}

# 3. Fisiologia Vegetal (Baseado no PDF Estudos Tomate)
# ai-service/main.py

# 2. Fisiologia & Armazenagem
CROP_SPECS = {
    'Tomate': {
        'base_productivity': 300, 
        'base_cost_ha': 25000.00, 
        'temp_min_critical': 10.0,
        'temp_max_critical': 34.0,
        'ideal_rain_cycle': 600.0,
        'volatility_factor': 2.5,
        'rain_logistics_limit': 15.0,
        'min_solar_mj': 8.4, # NOVO: Mínimo de 8.4 MJ/m² de sol para qualidade
        'storage': {'loss_rate_daily': 0.015, 'energy_cost_daily_unit': 0.15, 'fixed_cost_unit': 1.50}
    },
    'Soja': {
        'base_productivity': 60,  
        'base_cost_ha': 4500.00,
        'temp_min_critical': 15.0,
        'temp_max_critical': 40.0,
        'ideal_rain_cycle': 800.0,
        'volatility_factor': 0.8,
        'rain_logistics_limit': 25.0,
        'min_solar_mj': 12.0, # Soja precisa de muita luz
        'storage': {'loss_rate_daily': 0.001, 'energy_cost_daily_unit': 0.02, 'fixed_cost_unit': 0.50}
    },
    'Milho': {
        'base_productivity': 150, 
        'base_cost_ha': 5000.00,
        'temp_min_critical': 10.0,
        'temp_max_critical': 38.0,
        'ideal_rain_cycle': 700.0,
        'volatility_factor': 0.9,
        'rain_logistics_limit': 25.0,
        'min_solar_mj': 15.0,
        'storage': {'loss_rate_daily': 0.001, 'energy_cost_daily_unit': 0.02, 'fixed_cost_unit': 0.50}
    },
    'Default': { 
        'base_productivity': 100, 'base_cost_ha': 5000, 
        'temp_min_critical': 0, 'temp_max_critical': 40, 
        'ideal_rain_cycle': 1000, 'volatility_factor': 1.0, 'rain_logistics_limit': 20.0,
        'min_solar_mj': 5.0,
        'storage': {'loss_rate_daily': 0.005, 'energy_cost_daily_unit': 0.05, 'fixed_cost_unit': 1.0}
    }
}
# 4. Calendário de Plantio Regional - NOVO
PLANTING_CALENDAR = {
    'Tomate': {
        'SP': {'ideal': [2,3,4,5,6], 'risk': [12,1,7]}, # Jan (Chuva), Jul (Frio)
        'MG': {'ideal': [2,3,4,5,8,9], 'risk': [12,1,6,7]},
        'RS': {'ideal': [8,9,10,11,12,1], 'risk': [5,6,7]}, # Inverno rigoroso
        'SC': {'ideal': [8,9,10,11,12], 'risk': [5,6,7]},
        'GO': {'ideal': [3,4,5,6], 'risk': [11,12,1]}, 
        'BA': {'ideal': [5,6,7,8], 'risk': [1,2,3]}, 
        'ES': {'ideal': [2,3,4,5], 'risk': [11,12,1]} 
    },
    'Soja': {
        'MT': {'ideal': [9,10,11], 'risk': [6,7,8]},
        'RS': {'ideal': [10,11,12], 'risk': [5,6]}
    }
}
# 5. Climatologia Histórica (Médias de Chuva mm)
BRAZIL_CLIMATE_NORMS = {
    'SP': {1: 230, 2: 210, 6: 45, 7: 35, 11: 144, 12: 200},
    'MG': {1: 270, 2: 200, 6: 20, 7: 15, 11: 210, 12: 250},
    'GO': {1: 270, 2: 220, 6: 10, 7: 5, 11: 220, 12: 260},
    'BA': {1: 60, 2: 50, 6: 180, 7: 150, 11: 100, 12: 80},
    'RS': {1: 120, 2: 110, 6: 140, 7: 150, 11: 130, 12: 110},
    'CE': {1: 100, 2: 150, 6: 40, 7: 20, 11: 10, 12: 30}
}

# --- MODELOS DE DADOS (REQ/RES) ---

class SimulationRequest(BaseModel):
    product: str
    state: str = 'SP' 
    # --- ADICIONE ESTAS DUAS LINHAS ---
    lat: Optional[float] = None 
    lng: Optional[float] = None 
    # ----------------------------------
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

# --- FUNÇÕES AUXILIARES ---

def get_real_dollar_rate():
    try:
        response = requests.get("https://economia.awesomeapi.com.br/last/USD-BRL", timeout=3)
        data = response.json()
        return float(data['USDBRL']['bid'])
    except Exception as e:
        print(f"⚠️ Erro ao buscar dólar: {e}. Usando backup R$ 5.50")
        return 5.50

def get_prediction_model(product_name):
    try:
        query = text("""
            SELECT h."createdAt", price 
            FROM "PriceHistory" h
            JOIN "Opportunity" o ON h."opportunityId" = o.id
            WHERE o.product = :prod
            ORDER BY h."createdAt" ASC
        """)
        with engine.connect() as conn:
            df = pd.read_sql(query, conn, params={"prod": product_name})
        
        if df.empty or len(df) < 10: return None, 0.05

        df = df.dropna()
        df['date_ordinal'] = pd.to_datetime(df['createdAt']).map(datetime.toordinal)
        
        model = make_pipeline(PolynomialFeatures(3), LinearRegression())
        model.fit(df[['date_ordinal']], df['price'])
        
        volatility = df['price'].std()
        return model, (volatility if not pd.isna(volatility) else 0.05)
    except Exception as e:
        print(f"Erro no modelo: {e}")
        return None, 0.05
def validate_coords(lat, lng):
    """Verifica se as coordenadas são geográficamente válidas."""
    try:
        lat = float(lat)
        lng = float(lng)
        return -90 <= lat <= 90 and -180 <= lng <= 180
    except (TypeError, ValueError):
        return False
    
@lru_cache(maxsize=128) # Cache para 128 combinações de local/mês
def fetch_climate_history_averages(lat, lng, month):
    """
    Busca 5 anos de histórico na OpenMeteo Archive e calcula a média.
    Com Cache LRU para evitar chamadas repetidas.
    """
    if not validate_coords(lat, lng):
        print(f"⚠️ Coordenadas inválidas: ({lat}, {lng})")
        return 150.0 

    try:
        current_year = datetime.now().year
        end_date = datetime.now().replace(year=current_year - 1).strftime('%Y-%m-%d')
        start_date = datetime.now().replace(year=current_year - 6).strftime('%Y-%m-%d')
        
        url = f"https://archive-api.open-meteo.com/v1/archive?latitude={lat}&longitude={lng}&start_date={start_date}&end_date={end_date}&daily=precipitation_sum&timezone=America%2FSao_Paulo"
        
        response = requests.get(url, timeout=4)
        
        if response.status_code != 200:
            print(f"⚠️ OpenMeteo Offline/Erro: {response.status_code}")
            return 150.0

        data = response.json()
        
        if 'daily' not in data: return 150.0

        df = pd.DataFrame(data['daily'])
        df['time'] = pd.to_datetime(df['time'])
        month_data = df[df['time'].dt.month == month]
        
        if month_data.empty: return 150.0

        daily_avg = month_data['precipitation_sum'].mean()
        monthly_avg = daily_avg * 30
        
        print(f"🌦️ Histórico OpenMeteo ({lat},{lng}) Mês {month}: {monthly_avg:.1f}mm")
        return monthly_avg

    except Exception as e:
        print(f"⚠️ Erro ao buscar histórico climático: {e}")
        return 150.0

@lru_cache(maxsize=128)
def fetch_nasa_solar_data(lat, lng, month):
    """
    Busca a média histórica de Radiação Solar na NASA POWER.
    Com Cache LRU.
    """
    if not validate_coords(lat, lng): 
        return 15.0 

    try:
        url = "https://power.larc.nasa.gov/api/temporal/climatology/point"
        params = {
            'parameters': 'ALLSKY_SFC_SW_DWN',
            'community': 'AG',
            'longitude': lng,
            'latitude': lat,
            'format': 'JSON'
        }
        
        response = requests.get(url, params=params, timeout=5)
        
        if response.status_code != 200:
            print(f"⚠️ NASA Offline/Erro: {response.status_code}")
            return 18.0

        data = response.json()
        
        properties = data.get('properties', {}).get('parameter', {}).get('ALLSKY_SFC_SW_DWN', {})
        
        month_keys = {1:'JAN', 2:'FEB', 3:'MAR', 4:'APR', 5:'MAY', 6:'JUN', 
                      7:'JUL', 8:'AUG', 9:'SEP', 10:'OCT', 11:'NOV', 12:'DEC'}
        
        raw_val = properties.get(month_keys[month], -1)
        
        if raw_val < 0: return 15.0 # Dado inválido da NASA

        mj_val = raw_val
        if raw_val < 10.0: 
            mj_val = raw_val * 3.6 
            
        print(f"☀️ NASA POWER ({lat}, {lng}) Mês {month}: {mj_val:.2f} MJ/m²/dia")
        return mj_val

    except Exception as e:
        print(f"⚠️ Erro NASA POWER: {e}")
        return 18.0

def calculate_distance(state_a, state_b):
    if state_a == state_b: return 50.0 
    
    coord_a = STATE_COORDS.get(state_a, (-15.0, -47.0))
    coord_b = STATE_COORDS.get(state_b, (-15.0, -47.0))
    
    # Fórmula de Haversine
    R = 6371
    dlat = math.radians(coord_b[0] - coord_a[0])
    dlon = math.radians(coord_b[1] - coord_a[1])
    a = math.sin(dlat/2)**2 + math.cos(math.radians(coord_a[0])) * math.cos(math.radians(coord_b[0])) * math.sin(dlon/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    distance_km = R * c
    
    return distance_km * 1.35 # Fator de sinuosidade (estradas não são retas)

def get_predicted_market_price(product, state, month):
    # Preço base simulado
    base_prices = {'Tomate': 80.0, 'Soja': 130.0, 'Milho': 60.0}
    price = base_prices.get(product, 50.0)
    
    # Sazonalidade (Inverno valoriza hortaliças)
    if product == 'Tomate' and month in [6, 7, 8]:
        price *= 1.3
        
    # Fator Regional
    region_factor = PRICE_MULTIPLIERS.get(state, 1.0)
    return round(price * region_factor, 2)

# --- ROTAS DA API ---

@app.get("/")
def read_root():
    return {"status": "AgroAI Brain Online V4 (Full Enterprise) 🧠🚜"}

# 1. ROTA DO ROBÔ ETL
@app.post("/etl/sync-prices")
def sync_market_prices():
    try:
        dollar = get_real_dollar_rate()
        market_prices_usd = {
            'Tomate': {'buy': 0.80, 'sell': 1.10}, 
            'Soja':   {'buy': 25.00, 'sell': 28.50},
            'Milho':  {'buy': 12.00, 'sell': 14.00},
            'Alface': {'buy': 0.30, 'sell': 0.50}
        }
        updates_count = 0
        history_count = 0
        
        with engine.begin() as conn: 
            for product, prices in market_prices_usd.items():
                new_buy = round(prices['buy'] * dollar, 2)
                new_sell = round(prices['sell'] * dollar, 2)
                ids_query = text('SELECT id FROM "Opportunity" WHERE product = :product')
                ids = conn.execute(ids_query, {"product": product}).fetchall()
                if not ids: continue

                update_query = text("""
                    UPDATE "Opportunity"
                    SET "buyPrice" = :buy, "sellPrice" = :sell, "climate" = 'Atualizado via Bot'
                    WHERE "product" = :product
                """)
                conn.execute(update_query, {"buy": new_buy, "sell": new_sell, "product": product})
                updates_count += len(ids)

                for row in ids:
                    opp_id = row[0]
                    history_query = text("""
                        INSERT INTO "PriceHistory" ("opportunityId", "price", "createdAt")
                        VALUES (:opp_id, :price, NOW())
                    """)
                    conn.execute(history_query, {"opp_id": opp_id, "price": new_sell})
                    history_count += 1
        
        return {
            "message": "Sincronização completa!",
            "opportunities_updated": updates_count,
            "history_entries_created": history_count
        }
    except Exception as e:
        print(f"Erro no ETL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# 2. ROTA DE ARMAZENAGEM (Inteligência Climática / StorageAdvisor)

@app.post("/predict/storage")
def predict_storage_viability(data: SimulationRequest):
    print(f"🔍 RECEBIDO: Produto={data.product}, Estado={data.state}, Lat={data.lat}, Lng={data.lng}")
    days = 30
    current_month = datetime.now().month
    specs = CROP_SPECS.get(data.product, CROP_SPECS['Default'])
    
    # --- 0. DETERMINISMO (A CORREÇÃO) ---
    # Cria uma "Semente" única baseada no Produto + Estado + Data Atual
    # Isso garante que a simulação seja idêntica se os dados não mudarem no mesmo dia.
    seed_source = f"{data.product}-{data.state}-{datetime.now().strftime('%Y-%m-%d')}"
    # Transforma a string em um número inteiro para a semente
    seed_val = int(hashlib.sha256(seed_source.encode('utf-8')).hexdigest(), 16) % (2**32)
    # Cria um gerador isolado (não usa o random global)
    rng = np.random.RandomState(seed_val)

    # 1. Consultas Externas
    if data.lat and data.lng:
        monthly_rain_avg = fetch_climate_history_averages(data.lat, data.lng, current_month)
        solar_mj_avg = fetch_nasa_solar_data(data.lat, data.lng, current_month)
    else:
        monthly_rain_avg = BRAZIL_CLIMATE_NORMS.get(data.state, {}).get(current_month, 150)
        solar_mj_avg = 18.0 

    # Gap Fill de Chuva
    forecast_rain = data.daily_rain if data.daily_rain else [0] * 16
    forecast_max = data.daily_temp_max if data.daily_temp_max else [25] * 16
    forecast_min = data.daily_temp_min if data.daily_temp_min else [18] * 16
    
    days_blind = max(0, days - len(forecast_rain))
    missing_rain = max(0, monthly_rain_avg - sum(forecast_rain))
    daily_avg_missing = missing_rain / days_blind if days_blind > 0 else 0

    final_rain = list(forecast_rain)
    final_max = list(forecast_max)
    final_min = list(forecast_min)
    
    for _ in range(days_blind):
        sim_rain = 0
        # Usa 'rng' em vez de 'np.random' para garantir determinismo
        if rng.random() > 0.6:
            sim_rain = rng.normal(daily_avg_missing, daily_avg_missing * 0.5)
        final_rain.append(max(0, sim_rain))
        final_max.append(np.mean(forecast_max[-3:]) + rng.normal(0, 2))
        final_min.append(np.mean(forecast_min[-3:]) + rng.normal(0, 2))
    
    final_rain = final_rain[:days]

    # 2. Modelagem de Preço
    model, volatility = get_prediction_model(data.product)
    prices, costs, future_dates = [], [], []
    risk_acc = 0
    vol_boost = specs.get('volatility_factor', 1.0)

    # Fator de Qualidade (NASA)
    quality_factor = 1.0
    required_sun = specs.get('min_solar_mj', 0)
    if required_sun > 0 and solar_mj_avg < required_sun:
        deficit = (required_sun - solar_mj_avg) / required_sun
        quality_factor -= (deficit * 0.5)
        if deficit > 0.2: risk_acc += 2

    for i in range(days):
        future_date = datetime.now() + timedelta(days=i)
        future_dates.append(future_date.strftime('%d/%m'))
        
        # Custo Linear
        daily_cost = data.storage_cost_per_day if data.storage_cost_per_day > 0 else 0.05
        costs.append(round(i * daily_cost, 2))
        
        trend = data.current_price
        if model: 
            X_pred = pd.DataFrame({'date_ordinal': [future_date.toordinal()]})
            trend = float(model.predict(X_pred)[0])
        
        # Sazonalidade
        if data.product == 'Tomate' and future_date.month in [4, 5, 6, 7]:
             trend *= (1 + (0.005 * i))

        trend *= quality_factor

        # Impactos Micro
        impact = 0.0
        if final_rain[i] > specs.get('rain_logistics_limit', 20):
            impact += 0.12 * vol_boost 
            risk_acc += 1
        
        if final_min[i] < specs.get('temp_min_critical', 10):
            impact += 0.08 * vol_boost
            risk_acc += 1

        # Ruído Determinístico (rng)
        noise = rng.normal(0, volatility * vol_boost * 0.5)
        prices.append(round(max(0.5, trend * (1 + impact) + noise), 2))

    # 3. Decisão
    net_profit = [p - data.current_price - c for p, c in zip(prices, costs)]
    max_profit = max(net_profit)
    best_idx = net_profit.index(max_profit)
    
    risk_msg = "Tendência favorável."
    if quality_factor < 0.95:
        risk_msg = f"Alerta: Baixa insolação ({solar_mj_avg:.1f} MJ) pode afetar qualidade."
    
    if max_profit > 0:
        action = "ARMAZENAR"
        risk_msg = f"Pico em {future_dates[best_idx]} supera custos."
    elif max_profit > -2.0:
        action = "AGUARDAR"
        if "insolação" not in risk_msg: risk_msg = "Margens apertadas. Monitore o clima."
    else:
        action = "VENDER IMEDIATAMENTE"
        risk_msg = "Custo supera valorização."

    return {
        "chart_data": { "labels": future_dates, "prices": prices, "costs": costs },
        "recommendation": {
            "action": action,
            "best_day_date": future_dates[best_idx] if max_profit > -5 else "Hoje",
            "projected_profit": round(max_profit, 2),
            "confidence_score": 0.95 if (data.lat and solar_mj_avg > 10) else 0.80,
            "risk_event": risk_msg
        }
    }
# 3. ROTA DE PRODUÇÃO (Cálculo Local / Legado)
@app.post("/calc/production")
def calculate_production_roi(data: ProductionRequest):
    specs = CROP_SPECS.get(data.product, CROP_SPECS['Default'])
    norms = BRAZIL_CLIMATE_NORMS.get(data.state, {})
    
    # 1. Análise MACRO: Calendário de Plantio
    calendar = PLANTING_CALENDAR.get(data.product, {}).get(data.state)
    
    prod_factor = 1.0
    risk_notes = []

    if calendar:
        if data.planting_month in calendar.get('ideal', []):
            prod_factor = 1.05 # Bônus de janela ideal
            risk_notes.append("Plantio na JANELA IDEAL para a região.")
        elif data.planting_month in calendar.get('risk', []):
            prod_factor = 0.70 # Penalidade severa (Risco Climático)
            risk_notes.append(f"ALERTA: Plantio em mês de ALTO RISCO em {data.state}.")
        else:
            prod_factor = 0.90 # Transição
            risk_notes.append("Plantio em janela marginal/transição.")
    else:
        # Fallback para lógica de chuva acumulada (600mm) se não tiver calendário
        cycle_months = [(data.planting_month + i - 1) % 12 + 1 for i in range(4)]
        avg_rain = sum([norms.get(m, 150) for m in cycle_months])
        if avg_rain > specs['ideal_rain_cycle']:
            prod_factor -= 0.15
            risk_notes.append(f"Risco de chuva excessiva no ciclo ({avg_rain}mm).")

    final_prod = data.expected_productivity * prod_factor
    net_profit = (final_prod * data.area_ha * data.expected_sell_price) - (data.area_ha * data.cost_per_ha)
    
    return {
        "adjusted_productivity": round(final_prod, 1),
        "productivity_loss_pct": round((1 - prod_factor/1.05) * 100 if prod_factor < 1.0 else 0, 1),
        "net_profit": round(net_profit, 2),
        "roi": round((net_profit / (data.area_ha * data.cost_per_ha)) * 100, 1),
        "risk_analysis": risk_notes
    }
# 4. ROTA DE ARBITRAGEM (Nova Lógica Completa)
@app.post("/calc/arbitrage")
def calculate_arbitrage(data: ArbitrageRequest):
    specs = CROP_SPECS.get(data.product, CROP_SPECS['Default'])
    
    # 1. Produção na Origem
    predicted_productivity = specs.get('base_productivity', 100)
    climate_notes = []
    
    # Simulação simples de risco na origem
    if data.origin_state in ['RS', 'SC'] and data.planting_month in [5, 6]:
        predicted_productivity *= 0.8
        climate_notes.append(f"Risco de geada em {data.origin_state}.")
    
    total_volume = data.area_ha * predicted_productivity
    production_cost = data.area_ha * specs.get('base_cost_ha', 5000)
    unit_cost = production_cost / total_volume if total_volume > 0 else 0

    # 2. Logística
    distance = calculate_distance(data.origin_state, data.destination_state)
    diesel = LOGISTICS_DATA['avg_diesel_price']
    km_l = LOGISTICS_DATA['truck_km_per_liter']
    maint = LOGISTICS_DATA['maintenance_per_km'] + LOGISTICS_DATA['driver_cost_per_km']
    
    trip_cost = (distance / km_l * diesel) + (distance * maint)
    
    # Capacidade de carga
    capacity = 1200 if data.product == 'Tomate' else 550
    trips = math.ceil(total_volume / capacity)
    total_logistics = trip_cost * trips

    # 3. Venda
    harvest_month = (data.planting_month + 3) % 12 or 12
    sell_price = get_predicted_market_price(data.product, data.destination_state, harvest_month)
    revenue = total_volume * sell_price

    # 4. Resultado
    total_cost = production_cost + total_logistics
    profit = revenue - total_cost
    roi = (profit / total_cost) * 100 if total_cost > 0 else 0

    return {
        "analysis": {
            "origin": data.origin_state,
            "destination": data.destination_state,
            "distance_km": round(distance),
            "est_harvest_month": harvest_month
        },
        "production": {
            "productivity_ha": round(predicted_productivity, 1),
            "total_volume": round(total_volume),
            "unit_cost_origin": round(unit_cost, 2),
            "total_production_cost": round(production_cost, 2)
        },
        "logistics": {
            "diesel_price_ref": diesel,
            "trips_needed": trips,
            "cost_per_trip": round(trip_cost, 2),
            "total_logistics_cost": round(total_logistics, 2)
        },
        "market": {
            "predicted_sell_price": sell_price,
            "gross_revenue": round(revenue, 2)
        },
        "financial": {
            "total_cost": round(total_cost, 2),
            "net_profit": round(profit, 2),
            "roi": round(roi, 1)
        },
        "risks": climate_notes if climate_notes else ["Condições favoráveis."]
    }
@app.post("/admin/seed-history")
def seed_history_data():
    """
    Limpa e popula a tabela PriceHistory com 6 meses de dados simulados.
    Útil para ambientes de demonstração/produção inicial.
    """
    import random
    
    print("⏳ Iniciando Seed de Histórico...")
    days_back = 180
    data_buffer = []
    
    # Configurações de Mercado (Mock)
    products_config = {
        'Tomate': {'base': 80.0, 'volatility': 0.15, 'shock_prob': 0.05},
        'Soja':   {'base': 130.0, 'volatility': 0.03, 'shock_prob': 0.01},
        'Milho':  {'base': 60.0, 'volatility': 0.04, 'shock_prob': 0.02}
    }

    try:
        with engine.connect() as conn:
            # 1. Limpa tabela antiga
            conn.execute(text('TRUNCATE TABLE "PriceHistory" RESTART IDENTITY CASCADE'))
            conn.commit() # Importante commitar o truncate
            
            # 2. Busca IDs dos produtos
            opps = pd.read_sql(text('SELECT id, product FROM "Opportunity"'), conn)
            
            # 3. Gera dados
            for _, row in opps.iterrows():
                product = row['product']
                if product not in products_config: continue
                
                conf = products_config[product]
                base_price = conf['base']
                
                for i in range(days_back):
                    date = datetime.now() - timedelta(days=(days_back - i))
                    
                    # Sazonalidade + Ruído
                    season = math.sin(i * 0.05) * (base_price * conf['volatility'])
                    noise = np.random.normal(0, base_price * 0.02)
                    
                    # Choque
                    shock = 1.6 if random.random() < conf['shock_prob'] else 1.0
                    
                    price = (base_price + season + noise) * shock
                    
                    data_buffer.append({
                        "opportunityId": row['id'],
                        "price": round(max(0.1, price), 2),
                        "createdAt": date
                    })
            
            # 4. Inserção em Massa
            if data_buffer:
                df = pd.DataFrame(data_buffer)
                df.to_sql('PriceHistory', engine, if_exists='append', index=False, method='multi', chunksize=1000)
                return {"status": "Success", "entries_created": len(df)}
            else:
                return {"status": "No data created", "reason": "No opportunities found"}

    except Exception as e:
        print(f"Erro no Seed: {e}")
        raise HTTPException(status_code=500, detail=str(e))