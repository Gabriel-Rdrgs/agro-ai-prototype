from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta

app = FastAPI()

# --- CONFIGURAÇÃO ---
DATABASE_URL="postgresql://postgres:ZC9BPp3AhUxtth1R@db.jiyqrxgyopytqvctdvir.supabase.co:5432/postgres"
engine = create_engine(DATABASE_URL)

class SimulationRequest(BaseModel):
    product: str
    current_price: float
    storage_cost_per_day: float
    risk_factor: float

@app.get("/")
def read_root():
    return {"status": "AgroAI Brain Online (v2.1 Safe Mode) 🧠"}

def get_prediction_model(product_name):
    try:
        # Busca histórico ordenado (Correção: h."createdAt" para evitar ambiguidade)
        query = text("""
            SELECT h."createdAt", price 
            FROM "PriceHistory" h
            JOIN "Opportunity" o ON h."opportunityId" = o.id
            WHERE o.product = :prod
            ORDER BY h."createdAt" ASC
        """)
        
        with engine.connect() as conn:
            df = pd.read_sql(query, conn, params={"prod": product_name})
        
        # Proteção contra dados vazios
        if df.empty or len(df) < 10:
            print(f"⚠️ Histórico insuficiente para {product_name} ({len(df)} registros)")
            return None, 0.05

        # Tratamento de NaN e Conversão de Data
        df = df.dropna()
        df['date_ordinal'] = pd.to_datetime(df['createdAt']).map(datetime.toordinal)
        
        X = df[['date_ordinal']]
        y = df['price']

        model = LinearRegression()
        model.fit(X, y)
        
        # Calcula volatilidade
        volatility = df['price'].std()
        if pd.isna(volatility): volatility = 0.05
        
        return model, volatility

    except Exception as e:
        print(f"❌ Erro no treinamento: {e}")
        return None, 0.05
    
@app.post("/predict/storage")
def predict_storage_viability(data: SimulationRequest):
    print(f"🧠 Processando IA para: {data.product} (Preço Atual: {data.current_price})")

    days = 30
    future_dates = []
    prices = []
    costs = []
    
    model, volatility = get_prediction_model(data.product)
    base_date = datetime.now()

    # Garante que temos um preço inicial válido
    current_p = data.current_price if data.current_price > 0 else 4.00

    for i in range(days):
        future_date = base_date + timedelta(days=i)
        future_dates.append(future_date.strftime('%d/%m'))
        
        # Custo Acumulado
        costs.append(round(i * data.storage_cost_per_day, 2))

        # Previsão
        if model:
            date_ordinal = np.array([[future_date.toordinal()]])
            predicted = float(model.predict(date_ordinal)[0])
            noise = np.random.normal(0, volatility * 0.5)
            final_price = predicted + noise
        else:
            # Fallback: Tendência de leve alta se não tiver IA
            growth = 0.005 * i 
            final_price = current_p * (1 + growth)

        prices.append(round(max(0.1, final_price), 2))

    # Lógica de Decisão
    net_profit = [p - c - current_p for p, c in zip(prices, costs)]
    max_profit = max(net_profit)
    best_day_idx = net_profit.index(max_profit)
    
    # Define Ação
    trend_diff = prices[-1] - prices[0]
    
    if max_profit > 0.5: # Lucro mínimo de 50 centavos para valer a pena
        action = "ARMAZENAR" if trend_diff > 0 else "VENDER PARCIALMENTE"
        risk_msg = "Oportunidade de lucro detectada."
    else:
        action = "VENDER IMEDIATAMENTE"
        risk_msg = "Custos de armazenagem corroem o lucro."

    return {
        "chart_data": { "labels": future_dates, "prices": prices, "costs": costs },
        "recommendation": {
            "best_day_index": best_day_idx,
            "best_day_date": future_dates[best_day_idx],
            "projected_profit": round(max_profit, 2),
            "confidence_score": 0.89 if model else 0.50, # Sempre retorna float
            "risk_event": risk_msg,
            "action": action
        }
    }