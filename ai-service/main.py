from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import pandas as pd
import numpy as np
import requests  # <--- Biblioteca nova para chamar APIs externas
from sklearn.linear_model import LinearRegression
from sqlalchemy import create_engine, text
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

# Carrega variáveis de ambiente
load_dotenv()

app = FastAPI()

# --- CONFIGURAÇÃO SEGURA ---
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    # Tenta pegar a URL específica do Python se a principal falhar (para casos de pooling)
    DATABASE_URL = os.getenv("PYTHON_DB_URL") 

if not DATABASE_URL:
    raise ValueError("❌ ERRO: DATABASE_URL não definida no .env!")

# Correção para SQLAlchemy (postgres:// -> postgresql://)
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

# --- MODELOS DE DADOS (Pydantic) ---
class SimulationRequest(BaseModel):
    product: str
    current_price: float
    storage_cost_per_day: float
    risk_factor: float
    daily_rain: Optional[List[float]] = None 
    daily_temp: Optional[List[float]] = None 
    daily_sun: Optional[List[float]] = None 

# --- FUNÇÕES AUXILIARES (ETL & IA) ---

def get_real_dollar_rate():
    """Busca a cotação do Dólar (USD) para Real (BRL) em tempo real."""
    try:
        response = requests.get("https://economia.awesomeapi.com.br/last/USD-BRL", timeout=5)
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
        
        if df.empty or len(df) < 5: return None, 0.05

        df = df.dropna()
        df['date_ordinal'] = pd.to_datetime(df['createdAt']).map(datetime.toordinal)
        
        model = LinearRegression()
        model.fit(df[['date_ordinal']], df['price'])
        
        volatility = df['price'].std()
        if pd.isna(volatility) or volatility == 0: volatility = 0.05
        
        return model, volatility
    except Exception as e:
        print(f"Erro no modelo: {e}")
        return None, 0.05

# --- ROTAS DA API ---

@app.get("/")
def read_root():
    return {"status": "AgroAI Brain Online (V2 - Com Robô ETL) 🚜🧠"}

# 🚀 NOVO: Rota para Rodar o Robô ETL (Sincronizar Preços)
@app.post("/etl/sync-prices")
def sync_market_prices():
    """
    V2: Atualiza preços E gera histórico para a IA treinar.
    """
    try:
        dollar = get_real_dollar_rate()
        
        # Simulação de preços base em Dólar
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
                
                # 1. Busca os IDs dos produtos para vincular o histórico
                # (Precisamos saber QUAL oportunidade estamos atualizando)
                ids_query = text('SELECT id FROM "Opportunity" WHERE product = :product')
                ids = conn.execute(ids_query, {"product": product}).fetchall()
                
                if not ids: continue

                # 2. Atualiza o Preço Atual (Tabela Opportunity)
                update_query = text("""
                    UPDATE "Opportunity"
                    SET "buyPrice" = :buy, "sellPrice" = :sell, "climate" = 'Atualizado via Bot'
                    WHERE "product" = :product
                """)
                conn.execute(update_query, {"buy": new_buy, "sell": new_sell, "product": product})
                updates_count += len(ids)

                # 3. 📸 SNAPSHOT: Grava na Tabela PriceHistory (Memória para a IA)
                # Vamos criar um ponto no passado para cada oportunidade desse produto
                for row in ids:
                    opp_id = row[0]
                    history_query = text("""
                        INSERT INTO "PriceHistory" ("opportunityId", "price", "createdAt")
                        VALUES (:opp_id, :price, NOW())
                    """)
                    conn.execute(history_query, {"opp_id": opp_id, "price": new_sell})
                    history_count += 1
        
        return {
            "message": "Sincronização com Histórico concluída!",
            "dollar_rate": dollar,
            "opportunities_updated": updates_count,
            "history_entries_created": history_count # <--- O novo indicador de sucesso
        }
    except Exception as e:
        print(f"Erro no ETL: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ai-service/main.py (Apenas a função de previsão corrigida)

@app.post("/predict/storage")
def predict_storage_viability(data: SimulationRequest):
    days = 30
    future_dates = []
    prices = []
    costs = []
    
    # Busca modelo linear e volatilidade histórica
    model, volatility = get_prediction_model(data.product)
    
    # Proteção contra NaN (Se a volatilidade vier nula, assume 5%)
    if volatility is None or np.isnan(volatility):
        volatility = 0.05

    base_date = datetime.now()
    current_p = data.current_price

    # Fallbacks para dados climáticos (se o front não mandar)
    rain_data = data.daily_rain if data.daily_rain else [0] * days
    
    for i in range(days):
        future_date = base_date + timedelta(days=i)
        future_dates.append(future_date.strftime('%d/%m'))
        
        # Custo acumulado
        costs.append(round(i * data.storage_cost_per_day, 2))

        # 1. Previsão Base (Tendência Linear)
        if model:
            date_ordinal = np.array([[future_date.toordinal()]])
            trend_price = float(model.predict(date_ordinal)[0])
        else:
            # Sem histórico? Crescimento leve de 0.5% ao dia
            trend_price = current_p * (1 + (0.005 * i))

        # 2. Fator Climático (Simulação simples)
        # Se chover muito nos 3 dias anteriores, preço sobe (logística difícil)
        recent_rain = sum(rain_data[max(0, i-2):i+1])
        climate_impact = 0
        if recent_rain > 30: climate_impact = 0.05 # +5% se chover muito

        # 3. Ruído de Mercado (Volatilidade)
        noise = np.random.normal(0, volatility * 0.5)
        
        # Preço Final do Dia
        final_price = trend_price * (1 + climate_impact) + noise
        prices.append(round(max(0.1, final_price), 2))

    # --- LÓGICA DE DECISÃO (O que estava faltando!) ---
    
    # Calcula lucro líquido para cada dia futuro
    net_profit = [p - c - current_p for p, c in zip(prices, costs)]
    max_profit = max(net_profit)
    best_day_idx = net_profit.index(max_profit)
    best_date_str = future_dates[best_day_idx]
    
    # Definição da Recomendação e Confiança
    confidence = 0.0
    risk_msg = ""
    action = ""

    base_confidence = 0.95
    
    # Se volatilidade for 0.10 (10%), confiança cai pouco.
    # Se for 0.50 (50%), confiança cai bastante, mas não zera.
    confidence = base_confidence / (1 + (volatility * 3))

    if best_day_idx > 0 and max_profit > 0:
        action = "ARMAZENAR"
        risk_msg = f"Tendência de alta supera custos. Pico previsto para {best_date_str}."
    elif max_profit <= 0:
        action = "VENDER IMEDIATAMENTE"
        risk_msg = "Custos de armazenagem corroem o lucro. Mercado em baixa."
        best_date_str = "Hoje"
        # Se a recomendação é vender logo para evitar prejuízo, a confiança costuma ser alta
        confidence = max(confidence, 0.85) 
    else:
        action = "AGUARDAR / VENDER PARCIAL"
        risk_msg = "Margens apertadas. Monitore o clima."
        confidence = confidence * 0.9 # Penalidade leve por incerteza

    confidence = round(max(0.0, min(1.0, confidence)), 2)

    return {
        "chart_data": { 
            "labels": future_dates, 
            "prices": prices, 
            "costs": costs 
        },
        "recommendation": {
            "action": action,
            "best_day_index": best_day_idx,
            "best_day_date": best_date_str,    # <--- O Frontend precisa disso
            "projected_profit": round(max_profit, 2),
            "confidence_score": round(confidence, 2), # <--- O Frontend precisa disso (0.95)
            "risk_event": risk_msg             # <--- O "Motivo"
        }
    }