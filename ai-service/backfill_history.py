import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
import random

# --- CONFIGURAÇÃO ---
# Use sua string de conexão REAL (sem pgbouncer)
DATABASE_URL="postgresql://postgres.jiyqrxgyopytqvctdvir:jRbNxCnSFg93eVPE@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)

def generate_history():
    print("🕰️ LIGANDO A MÁQUINA DO TEMPO (BACKFILL)...")
    
    with engine.connect() as connection:
        # 1. Busca as cidades (SQLAlchemy inicia transação aqui - Autobegin)
        print("📡 Lendo cidades do banco...")
        cities = connection.execute(text("SELECT id, city, state, \"buyPrice\" FROM \"Opportunity\" WHERE product = 'Tomate'")).fetchall()
        
        history_buffer = []
        days_back = 180 
        
        print(f"📅 Gerando {days_back} dias de dados para {len(cities)} cidades...")

        for row in cities:
            city = row.city
            base_current_price = float(row.buyPrice)
            opp_id = row.id
            
            volatility = 0.05 if row.state in ['GO', 'SP'] else 0.08 
            
            for i in range(days_back, 0, -1):
                date = datetime.now() - timedelta(days=i)
                season_factor = np.sin(i / 30) * 0.15 
                daily_noise = random.normalvariate(0, volatility)
                
                raw_price = base_current_price * (1 + season_factor + daily_noise)
                
                # --- CORREÇÃO AQUI: float() explícito ---
                # Converte de numpy.float64 para float nativo do Python
                historical_price = float(max(2.00, round(raw_price, 2)))
                
                history_buffer.append({
                    "opportunityId": opp_id,
                    "price": historical_price,
                    "createdAt": date.strftime('%Y-%m-%d %H:%M:%S')
                })

        # 2. Salvar (Usamos a transação já aberta)
        print(f"💾 Salvando {len(history_buffer)} registros no histórico...")
        
        try:
            insert_query = text("""
                INSERT INTO "PriceHistory" ("opportunityId", "price", "createdAt")
                VALUES (:opportunityId, :price, :createdAt)
            """)
            
            for record in history_buffer:
                connection.execute(insert_query, record)
            
            # Agora sim, damos o commit final
            connection.commit()
            print("✅ SUCESSO! A história foi reescrita.")
            
        except Exception as e:
            connection.rollback()
            print(f"❌ Erro ao salvar: {e}")

if __name__ == "__main__":
    generate_history()