from fastapi import FastAPI
from pydantic import BaseModel
from datetime import datetime, timedelta
import math

app = FastAPI()

# Modelo de dados
class SimulationRequest(BaseModel):
    product: str
    current_price: float
    storage_cost_per_day: float
    risk_factor: float

@app.get("/")
def read_root():
    return {"status": "AgroAI Brain Online (Lightweight) 🧠", "version": "1.3.0"}

@app.post("/predict/storage")
def predict_storage_viability(data: SimulationRequest):
    # --- LÓGICA DE DATA SCIENCE (Python Puro) ---
    
    days = 30
    # Gera datas futuras
    future_dates = [(datetime.now() + timedelta(days=i)).strftime('%d/%m') for i in range(days)]
    
    prices = []
    costs = []
    net_profit = []
    
    for i in range(days):
        # 1. Custo Acumulado (Linear)
        day_cost = round(i * data.storage_cost_per_day, 2)
        costs.append(day_cost)
        
        # 2. Preço Futuro (Modelo Logarítmico com Choque)
        growth = 0
        # Se o risco for alto (> 0.5), simula um choque de oferta após 7 dias
        if i > 7 and data.risk_factor > 0.5: 
            # math.exp é o equivalente ao np.exp
            growth = 0.15 * (1 - math.exp(-(i-7)/5)) 
        
        # Aplica volatilidade base
        predicted_price = data.current_price * (1 + growth + (i * 0.002))
        prices.append(round(predicted_price, 2))

        # 3. Lucro Líquido
        profit = round(predicted_price - day_cost - data.current_price, 2)
        net_profit.append(profit)

    # 4. Recomendação Final
    max_profit = max(net_profit)
    best_day_idx = net_profit.index(max_profit)
    
    recommendation = {
        "action": "ARMAZENAR" if max_profit > 0 else "VENDER IMEDIATAMENTE",
        "best_day_index": best_day_idx,
        "best_day_date": future_dates[best_day_idx],
        "projected_profit": max_profit,
        "confidence_score": 0.85,
        "risk_event": "Risco Climático Elevado (Simulação)" if data.risk_factor > 0.5 else "Mercado Estável"
    }

    return {
        "chart_data": {
            "labels": future_dates,
            "prices": prices,
            "costs": costs
        },
        "recommendation": recommendation
    }

# Handler para a Vercel (opcional, mas bom ter explícito)
# A Vercel procura a variável 'app' automaticamente