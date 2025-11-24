import os
import random
import math
import pandas as pd # <--- O Rei da Performance voltou
import numpy as np
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Configuração do Banco
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = os.getenv("PYTHON_DB_URL") # Fallback
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

if not DATABASE_URL:
    raise ValueError("❌ Sem DATABASE_URL definida!")

engine = create_engine(DATABASE_URL)

def generate_fake_history():
    print("⏳ Iniciando Máquina do Tempo V2 (Pandas Bulk Mode)...")
    
    # Configurações de Mercado
    products_config = {
        'Tomate': {
            'base': 4.50, 
            'volatility': 0.15, # 15% de variação normal
            'shock_prob': 0.05, # 5% de chance de "Evento Climático Extremo"
            'shock_factor': 1.6 # Preço sobe 60% no choque (Chuva forte)
        },
        'Soja': {
            'base': 130.00, 
            'volatility': 0.03,
            'shock_prob': 0.01,
            'shock_factor': 1.1
        },
        'Milho': {
            'base': 60.00, 
            'volatility': 0.04,
            'shock_prob': 0.02,
            'shock_factor': 1.15
        },
        'Alface': {
            'base': 2.00, 
            'volatility': 0.10,
            'shock_prob': 0.08, # Muito sensível
            'shock_factor': 1.4
        }
    }
    
    days_back = 180
    data_buffer = [] # Lista para guardar tudo na memória antes de enviar

    with engine.connect() as conn:
        # 1. Limpa histórico antigo (Rápido)
        conn.execute(text('TRUNCATE TABLE "PriceHistory" RESTART IDENTITY CASCADE'))
        print("🧹 Tabela limpa.")

        # 2. Busca Oportunidades
        opportunities = pd.read_sql('SELECT id, product FROM "Opportunity"', conn)

    print(f"   -> Gerando dados para {len(opportunities)} produtos...")

    # 3. Geração Matemática (Tudo em RAM)
    for _, row in opportunities.iterrows():
        opp_id = row['id']
        product = row['product']
        
        if product not in products_config:
            continue
            
        conf = products_config[product]
        base_price = conf['base']
        
        # Simulação dia a dia
        current_price = base_price
        
        for i in range(days_back):
            date = datetime.now() - timedelta(days=(days_back - i))
            
            # A. Sazonalidade (Onda)
            season = math.sin(i * 0.05) * (base_price * conf['volatility'])
            
            # B. Ruído Diário (Random Walk)
            noise = np.random.normal(0, base_price * 0.02)
            
            # C. O Fator "Caos" (O que tu pediste sobre o Tomate 🍅)
            shock = 1.0
            if random.random() < conf['shock_prob']:
                shock = conf['shock_factor'] # BOMBA! Preço dispara.
                print(f"      ⛈️ Choque climático em {product} no dia {date.strftime('%d/%m')}")
            
            # Cálculo final
            price = (base_price + season + noise) * shock
            
            # Recuperação elástica (o preço tende a voltar ao normal nos dias seguintes)
            # Mas aqui simplificamos: o choque dura 1 dia (flash spike) ou a onda segura a média.
            
            data_buffer.append({
                "opportunityId": opp_id,
                "price": round(max(0.1, price), 2),
                "createdAt": date
            })

    # 4. Inserção em Massa (O Pulo do Gato do Pandas 🐈)
    if data_buffer:
        df = pd.DataFrame(data_buffer)
        print(f"🚀 Inserindo {len(df)} registros via Pandas Chunk Insert...")
        
        # method='multi' envia várias linhas num único comando SQL. Muito mais rápido.
        df.to_sql('PriceHistory', engine, if_exists='append', index=False, method='multi', chunksize=1000)
        
        print("✅ Histórico gerado com sucesso!")
    else:
        print("⚠️ Nenhuma oportunidade encontrada para gerar histórico.")

if __name__ == "__main__":
    generate_fake_history()