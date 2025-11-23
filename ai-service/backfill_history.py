import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
import random

import os
from dotenv import load_dotenv # <--- Import novo

# Carrega as variáveis do arquivo .env para a memória
load_dotenv()

# Pega a variável do ambiente. Se não existir, retorna None
DATABASE_URL = os.getenv("DATABASE_URL")

# Validação de segurança (opcional, mas recomendada)
if not DATABASE_URL:
    raise ValueError("❌ ERRO FATAL: A variável DATABASE_URL não foi encontrada. Verifique seu arquivo .env")
engine = create_engine(DATABASE_URL)

def generate_history():
    print("🕰️ LIGANDO A MÁQUINA DO TEMPO (MODO TURBO - PANDAS)...")
    
    # 1. Busca as cidades (SQLAlchemy)
    with engine.connect() as connection:
        print("📡 Lendo cidades do banco...")
        cities = connection.execute(text("SELECT id, city, state, \"buyPrice\" FROM \"Opportunity\" WHERE product = 'Tomate'")).fetchall()
        
        if not cities:
            print("❌ Nenhuma cidade encontrada!")
            return

        history_buffer = []
        days_back = 180 
        
        print(f"📅 Gerando dados matemáticos para {len(cities)} cidades...")

        for row in cities:
            base_current_price = float(row.buyPrice)
            opp_id = row.id
            
            volatility = 0.05 if row.state in ['GO', 'SP'] else 0.08 
            
            for i in range(days_back, 0, -1):
                date = datetime.now() - timedelta(days=i)
                
                # Simula Sazonalidade + Ruído
                season_factor = np.sin(i / 30) * 0.15 
                daily_noise = random.normalvariate(0, volatility)
                
                raw_price = base_current_price * (1 + season_factor + daily_noise)
                historical_price = float(max(2.00, round(raw_price, 2)))
                
                # Adiciona na lista
                history_buffer.append({
                    "opportunityId": opp_id,
                    "price": historical_price,
                    "createdAt": date
                })

    # 2. O PULO DO GATO 🐈 (Fora do loop de conexão anterior)
    print(f"🚀 Preparando envio de {len(history_buffer)} registros...")
    
    # Cria o DataFrame
    df = pd.DataFrame(history_buffer)
    
    try:
        # --- A LINHA MÁGICA ESTÁ AQUI 👇 ---
        df.to_sql(
            'PriceHistory', 
            engine, 
            if_exists='append', # Adiciona aos dados que já existem
            index=False,        # Não envia o número da linha
            method='multi',     # Insere milhares de uma vez
            chunksize=1000      # Pacotes de 1000
        )
        # -----------------------------------
        
        print("✅ SUCESSO! Histórico gravado em velocidade máxima.")
        
    except Exception as e:
        print(f"❌ Erro na inserção Pandas: {e}")

if __name__ == "__main__":
    generate_history()