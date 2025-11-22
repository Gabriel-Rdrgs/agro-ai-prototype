import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
import random

# --- CONFIGURAÇÃO ---
# Use sua senha correta aqui
DATABASE_URL="postgresql://postgres.jiyqrxgyopytqvctdvir:ZC9BPp3AhUxtth1R@aws-0-us-west-2.pooler.supabase.com:6543/postgres"
engine = create_engine(DATABASE_URL)

def generate_history():
    print("🕰️ LIGANDO A MÁQUINA DO TEMPO (PANDAS TURBO)...")
    
    with engine.connect() as connection:
        # 1. Busca as cidades
        print("📡 Lendo cidades do banco...")
        cities = connection.execute(text("SELECT id, city, state, \"buyPrice\" FROM \"Opportunity\" WHERE product = 'Tomate'")).fetchall()
        
        history_buffer = []
        days_back = 180 
        
        print(f"📅 Calculando dados para {len(cities)} cidades nos últimos {days_back} dias...")

        # 2. Gera os dados na memória (Python é muito rápido nisso)
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
                historical_price = max(2.00, round(raw_price, 2))
                
                history_buffer.append({
                    "opportunityId": opp_id,
                    "price": historical_price,
                    "createdAt": date
                })

    # 3. O Pulo do Gato: Inserção em Lote via Pandas
    if not history_buffer:
        print("❌ Nenhuma cidade encontrada para gerar histórico.")
        return

    print(f"🚀 Enviando {len(history_buffer)} registros para o Supabase...")
    
    # Cria um DataFrame (Tabela na memória)
    df = pd.DataFrame(history_buffer)
    
    # Garante que os números são floats nativos do Python (tchau bug do numpy!)
    df['price'] = df['price'].astype(float)
    
    try:
        # O método 'multi' cria um único INSERT com várias linhas: VALUES (...), (...), (...)
        # chunksize=1000 garante que não estoure o limite do banco
        df.to_sql(
            'PriceHistory', 
            engine, 
            if_exists='append', # Adiciona aos dados existentes
            index=False,        # Não envia o índice do DataFrame (0, 1, 2...)
            method='multi',     # O segredo da velocidade
            chunksize=1000      # Pacotes de 1000 em 1000
        )
        print("✅ SUCESSO! Histórico gravado em segundos.")
        
    except Exception as e:
        print(f"❌ Erro na inserção: {e}")

if __name__ == "__main__":
    generate_history()