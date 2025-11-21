from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import math

app = FastAPI()

# --- MODELO EXATO DO QUE VEM DO FRONTEND ---
class SimulationRequest(BaseModel):
    product: str
    current_price: float
    storage_cost_per_day: float  # <--- AGORA BATE COM O SEU LOG
    risk_factor: float

@app.get("/")
def read_root():
    return {"status": "AgroAI Brain Online", "version": "1.2.0 - Fixed"}

@app.post("/predict/storage")
def predict_storage_viability(data: SimulationRequest):
    print(f"✅ DADOS RECEBIDOS NO PYTHON: {data}") # Log de confirmação

    days = 30
    future_dates = [(datetime.now() + timedelta(days=i)).strftime('%d/%m') for i in range(days)]
    
    prices = []
    costs = []
    
    for i in range(days):
        # 1. Custo (Usa o nome novo)
        day_cost = i * data.storage_cost_per_day
        costs.append(round(day_cost, 2))
        
        # 2. Preço
        growth = 0
        if i > 7 and data.risk_factor > 0.5: 
            growth = 0.15 * (1 - math.exp(-(i-7)/5)) 
        
        predicted_price = data.current_price * (1 + growth + (i * 0.002))
        prices.append(round(predicted_price, 2))

    net_profit = [p - c - data.current_price for p, c in zip(prices, costs)]
    max_profit = max(net_profit)
    best_day_idx = net_profit.index(max_profit)
    
    return {
        "chart_data": {
            "labels": future_dates,
            "prices": prices,
            "costs": costs
        },
        "recommendation": {
            "best_day_index": best_day_idx,
            "best_day_date": future_dates[best_day_idx],
            "projected_profit": round(max_profit, 2),
            "confidence_score": 0.85,
            "risk_event": "Risco Climático Elevado" if data.risk_factor > 0.5 else "Mercado Estável"
        }
    }

# Para rodar: uvicorn main:app --reload --port 8000