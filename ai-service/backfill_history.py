import os
import pandas as pd
import numpy as np
import math
import random
import io
import time
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

load_dotenv()

# Configuração
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    DATABASE_URL = os.getenv("PYTHON_DB_URL")

if not DATABASE_URL:
    raise ValueError("❌ Defina DATABASE_URL no .env local!")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def fast_pg_insert(df, engine, table_name):
    """Usa o protocolo COPY para inserção ultra-rápida."""
    output = io.StringIO()
    df.to_csv(output, sep='\t', header=False, index=False)
    output.seek(0)
    
    connection = engine.raw_connection()
    cursor = connection.cursor()
    
    try:
        print(f"🚀 Enviando {len(df)} linhas via COPY...")
        cursor.copy_from(output, table_name, null="", columns=df.columns)
        connection.commit()
        print("✅ Inserção concluída!")
    except Exception as e:
        print(f"❌ Erro no COPY: {e}")
        connection.rollback()
    finally:
        cursor.close()
        connection.close()

def generate_fake_history():
    print("⏳ Gerando dados CORRIGIDOS (Por Kg)...")
    days_back = 180
    data_buffer = []
    
    # --- CONFIGURAÇÃO AJUSTADA (PREÇO POR KG) ---
    products_config = {
        'Tomate': {
            'base': 4.50, # Agora é R$ 4,50/kg (não 80/caixa)
            'volatility': 0.15, 
            'shock_prob': 0.05, 
            'shock_factor': 1.6 # Máximo ~R$ 7,20
        },
        'Soja': {
            'base': 130.00, # Saca continua 130
            'volatility': 0.03, 
            'shock_prob': 0.01,
            'shock_factor': 1.1
        },
        'Milho': {
            'base': 60.00, 
            'volatility': 0.04, 
            'shock_prob': 0.02,
            'shock_factor': 1.15
        }
    }

    with engine.connect() as conn:
        print("🧹 Limpando dados antigos (DELETE)...")
        try:
            # Timeout maior para garantir que limpa
            conn.execute(text("SET statement_timeout = '60s'"))
            conn.execute(text('DELETE FROM "PriceHistory"'))
            conn.commit()
            print("✨ Tabela limpa.")
        except Exception as e:
            print(f"⚠️ Erro ao limpar: {e}. Tentando inserir por cima...")

        print("🔍 Lendo produtos...")
        opps = pd.read_sql(text('SELECT id, product FROM "Opportunity"'), conn)

    print(f"🧮 Calculando preços para {len(opps)} produtos...")
    for _, row in opps.iterrows():
        product = row['product']
        # Se não achar o produto, usa Tomate como base
        conf = products_config.get(product, products_config['Tomate'])
        base_price = conf['base']
        
        for i in range(days_back):
            date = datetime.now() - timedelta(days=(days_back - i))
            season = math.sin(i * 0.05) * (base_price * conf['volatility'])
            noise = np.random.normal(0, base_price * 0.02)
            shock = 1.6 if random.random() < conf['shock_prob'] else 1.0
            price = (base_price + season + noise) * shock
            
            data_buffer.append({
                "opportunityId": row['id'],
                "price": round(max(0.1, price), 2),
                "createdAt": date
            })

    if data_buffer:
        df = pd.DataFrame(data_buffer)
        df = df[['opportunityId', 'price', 'createdAt']]
        fast_pg_insert(df, engine, 'PriceHistory')

if __name__ == "__main__":
    generate_fake_history()