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
CROP_SPECS = {
    'Tomate': {
        'base_productivity': 300, # cx/ha
        'base_cost_ha': 25000.00, 
        'temp_min_critical': 10.0,
        'temp_max_critical': 34.0,
        'ideal_rain_cycle': 600.0,
        'daily_thermal_range_ideal': (6.0, 8.0),
        'volatility_factor': 2.5, # NOVO: Alta volatilidade de mercado
        'rain_logistics_limit': 15.0 # NOVO: Chuva que para a colheita
    },
    'Soja': {
        'base_productivity': 60,  
        'base_cost_ha': 4500.00,
        'temp_min_critical': 15.0,
        'temp_max_critical': 40.0,
        'ideal_rain_cycle': 800.0,
        'daily_thermal_range_ideal': (5.0, 15.0),
        'volatility_factor': 0.8,
        'rain_logistics_limit': 25.0 
    },
    'Milho': {
        'base_productivity': 150, 
        'base_cost_ha': 5000.00,
        'temp_min_critical': 10.0,
        'temp_max_critical': 38.0,
        'ideal_rain_cycle': 700.0,
        'daily_thermal_range_ideal': (5.0, 15.0),
        'volatility_factor': 0.9,
        'rain_logistics_limit': 25.0
    },
    'Default': { 
        'base_productivity': 100, 
        'base_cost_ha': 5000, 
        'temp_min_critical': 0, 
        'temp_max_critical': 40, 
        'ideal_rain_cycle': 1000,
        'daily_thermal_range_ideal': (5.0, 15.0),
        'volatility_factor': 1.0,
        'rain_logistics_limit': 20.0
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
    days = 30
    current_month = datetime.now().month
    specs = CROP_SPECS.get(data.product, CROP_SPECS['Default'])
    
    # --- 1. Engenharia Climática (Gap Fill + Micro Eventos) ---
    forecast_rain = data.daily_rain if data.daily_rain else [0] * 16
    forecast_max = data.daily_temp_max if data.daily_temp_max else [25] * 16
    forecast_min = data.daily_temp_min if data.daily_temp_min else [18] * 16
    
    days_blind = max(0, days - len(forecast_rain))
    monthly_avg = BRAZIL_CLIMATE_NORMS.get(data.state, {}).get(current_month, 150)
    missing_rain = max(0, monthly_avg - sum(forecast_rain))
    daily_avg_missing = missing_rain / days_blind if days_blind > 0 else 0

    final_rain = list(forecast_rain)
    final_max = list(forecast_max)
    final_min = list(forecast_min)
    
    for _ in range(days_blind):
        sim_rain = 0
        if np.random.random() > 0.7: sim_rain = np.random.normal(15, 10)
        final_rain.append(max(0, sim_rain))
        final_max.append(np.mean(forecast_max[-3:]) + np.random.normal(0, 2))
        final_min.append(np.mean(forecast_min[-3:]) + np.random.normal(0, 2))
    
    final_rain = final_rain[:days]

    # --- 2. Modelagem de Preço (Com Fator de Volatilidade) ---
    model, volatility = get_prediction_model(data.product)
    base_date = datetime.now()
    prices, costs, future_dates = [], [], []
    risk_acc = 0
    vol_boost = specs.get('volatility_factor', 1.0)

    for i in range(days):
        future_date = base_date + timedelta(days=i)
        future_dates.append(future_date.strftime('%d/%m'))
        
        # >>> REVERSÃO: VOLTA AO CUSTO LINEAR SIMPLES <<<
        # Assumimos que a tecnologia do cliente anula a perda exponencial por enquanto.
        # Usa o valor linear enviado pelo front ou um padrão baixo.
        daily_cost = data.storage_cost_per_day if data.storage_cost_per_day > 0 else 0.05
        costs.append(round(i * daily_cost, 2))
        
        # Tendência de Preço (Mantém a inteligência climática!)
        trend = data.current_price
        if model: 
            trend = float(model.predict([[future_date.toordinal()]])[0])
        
        # Sazonalidade Diária (Entressafra)
        if data.product == 'Tomate' and future_date.month in [4, 5, 6, 7]:
             trend *= (1 + (0.005 * i))

        # Impactos Micro (Chuva/Frio)
        impact = 0.0
        if final_rain[i] > specs.get('rain_logistics_limit', 20):
            impact += 0.12 * vol_boost 
            risk_acc += 1
        
        if final_min[i] < specs.get('temp_min_critical', 10):
            impact += 0.08 * vol_boost
            risk_acc += 1

        noise = np.random.normal(0, volatility * vol_boost * 0.5)
        prices.append(round(max(0.5, trend * (1 + impact) + noise), 2))

    # --- 3. Decisão ---
    net_profit = [p - data.current_price - c for p, c in zip(prices, costs)]
    max_profit = max(net_profit)
    best_idx = net_profit.index(max_profit)
    
    if max_profit > 0:
        action = "ARMAZENAR"
        risk_msg = f"Pico de preço em {future_dates[best_idx]} compensa custos."
    elif max_profit > -2.0:
        action = "AGUARDAR"
        risk_msg = "Margens apertadas. Monitore o clima."
    else:
        action = "VENDER IMEDIATAMENTE"
        risk_msg = "Custo supera valorização."

    return {
        "chart_data": { "labels": future_dates, "prices": prices, "costs": costs },
        "recommendation": {
            "action": action,
            "best_day_date": future_dates[best_idx] if max_profit > -5 else "Hoje",
            "projected_profit": round(max_profit, 2),
            "confidence_score": 0.85 if risk_acc < 5 else 0.60,
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