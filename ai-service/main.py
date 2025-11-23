from fastapi import FastAPI
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import os                   # <--- NOVO
from dotenv import load_dotenv # <--- NOVO

# Carrega variáveis de ambiente
load_dotenv()

app = FastAPI()

# --- CONFIGURAÇÃO SEGURA ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL não definida!")

engine = create_engine(DATABASE_URL)
engine = create_engine(DATABASE_URL)

class SimulationRequest(BaseModel):
    product: str
    current_price: float
    storage_cost_per_day: float
    risk_factor: float
    daily_rain: Optional[List[float]] = None 
    daily_temp: Optional[List[float]] = None # NOVO: Temperatura Máx
    daily_sun: Optional[List[float]] = None  # NOVO: Radiação Solar

@app.get("/")
def read_root():
    return {"status": "AgroAI Brain Online (V5 - Multivariable Weather) 🧠"}

def get_prediction_model(product_name):
    try:
        # Busca histórico (h."createdAt")
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
        
        model = LinearRegression()
        model.fit(df[['date_ordinal']], df['price'])
        
        volatility = df['price'].std()
        if pd.isna(volatility): volatility = 0.05
        
        return model, volatility
    except:
        return None, 0.05

@app.post("/predict/storage")
def predict_storage_viability(data: SimulationRequest):
    days = 30
    future_dates = []
    prices = []
    costs = []
    
    model, volatility = get_prediction_model(data.product)
    base_date = datetime.now()
    current_p = data.current_price

    # Garante listas preenchidas (Fallback 0)
    rain_data = data.daily_rain if data.daily_rain else [0] * days
    temp_data = data.daily_temp if data.daily_temp else [25] * days # Média 25°C
    sun_data = data.daily_sun if data.daily_sun else [15] * days    # Média 15MJ

    # Estende dados para 30 dias (Climatologia Simples)
    def extend_list(lst, default_val):
        if len(lst) < days:
            lst.extend([default_val] * (days - len(lst)))
        return lst

    rain_data = extend_list(rain_data, 5.0)  # Chuvoso no final
    temp_data = extend_list(temp_data, 28.0) # Quente no final
    sun_data = extend_list(sun_data, 20.0)   # Ensolarado

    for i in range(days):
        future_date = base_date + timedelta(days=i)
        future_dates.append(future_date.strftime('%d/%m'))
        costs.append(round(i * data.storage_cost_per_day, 2))

        # 1. Tendência Base (IA)
        if model:
            date_ordinal = np.array([[future_date.toordinal()]])
            trend_price = float(model.predict(date_ordinal)[0])
        else:
            trend_price = current_p * (1 + (0.005 * i))

        # 2. IMPACTOS CLIMÁTICOS MULTIVARIÁVEIS 🌩️☀️🌡️
        
        # A. Chuva (Logística/Colheita)
        # Acumulado de 3 dias trava colheita -> Escassez -> Preço Sobe
        recent_rain = sum(rain_data[max(0, i-2):i+1])
        rain_impact = 0
        if recent_rain > 50: rain_impact = 0.12
        elif recent_rain > 20: rain_impact = 0.04
        
        # B. Temperatura (Fisiologia)
        # Calor extremo (>32°C) aborta flores/queima fruto -> Escassez futura -> Preço Sobe
        # Frio ideal (20-25°C) -> Safra cheia -> Preço Cai/Estável
        day_temp = temp_data[i]
        temp_impact = 0
        if day_temp > 32: temp_impact = 0.03
        elif day_temp < 15: temp_impact = 0.05 # Frio trava maturação
        
        # C. Sol (Maturação)
        # Muito sol (>25MJ) acelera maturação -> Excesso de oferta momentânea -> Preço Cai
        day_sun = sun_data[i]
        sun_impact = 0
        if day_sun > 25: sun_impact = -0.03 

        # Soma tudo
        total_climate_impact = rain_impact + temp_impact + sun_impact
        
        # Aplica ao preço
        final_price = trend_price * (1 + total_climate_impact)
        
        # Micro ruído visual
        noise = np.random.normal(0, volatility * 0.1)
        prices.append(round(max(0.1, final_price + noise), 2))

    # Decisão
    net_profit = [p - c - current_p for p, c in zip(prices, costs)]
    max_profit = max(net_profit)
    best_day_idx = net_profit.index(max_profit)
    
    if best_day_idx > 0 and max_profit > 0.5:
        action = "ARMAZENAR"
        risk_msg = f"Melhor janela de venda em {future_dates[best_day_idx]} (Clima favorável)."
        confidence = 0.92
    elif max_profit > 0:
        action = "VENDER PARCIALMENTE"
        risk_msg = "Margens apertadas. Fique atento ao clima."
        confidence = 0.78
    else:
        action = "VENDER IMEDIATAMENTE"
        risk_msg = "Custos de armazenagem corroem o lucro."
        confidence = 0.95

    return {
        "chart_data": { "labels": future_dates, "prices": prices, "costs": costs },
        "recommendation": {
            "best_day_index": best_day_idx,
            "best_day_date": future_dates[best_day_idx],
            "projected_profit": round(max_profit, 2),
            "confidence_score": confidence,
            "risk_event": risk_msg,
            "action": action
        }
    }