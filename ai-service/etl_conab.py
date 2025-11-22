import requests
import pandas as pd
from sqlalchemy import create_engine, text
import time

# --- CONFIGURAÇÃO (A mesma que funcionou para você) ---
# Se estiver usando variáveis de ambiente, melhor. Se não, pode usar a string direta (cuidado com segurança em produção!)
DATABASE_URL="postgresql://postgres.jiyqrxgyopytqvctdvir:ZC9BPp3AhUxtth1R@aws-0-us-west-2.pooler.supabase.com:6543/postgres"

# Ajuste para SQLAlchemy
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def get_real_dollar_rate():
    """Busca a cotação do Dólar (USD) para Real (BRL) em tempo real."""
    try:
        print("💸 Buscando cotação do Dólar na AwesomeAPI...")
        response = requests.get("https://economia.awesomeapi.com.br/last/USD-BRL")
        data = response.json()
        bid_price = float(data['USDBRL']['bid'])
        print(f"💵 Dólar Hoje: R$ {bid_price:.2f}")
        return bid_price
    except Exception as e:
        print(f"⚠️ Erro ao buscar dólar: {e}. Usando valor de backup R$ 5.50")
        return 5.50

def run_smart_etl():
    print("🚜 INICIANDO ROBÔ DE PREÇOS (ETL)...")
    
    # 1. Pega o fator de mercado real (Dólar)
    dollar_rate = get_real_dollar_rate()

    # 2. Define preços base em DÓLAR (Commodities são negociadas em USD)
    # Isso simula uma inteligência de mercado: o preço internacional varia menos que o câmbio.
    market_prices_usd = {
        'Tomate': {'buy': 0.80, 'sell': 1.10} # Preço em Dólar por Kg (Aprox R$ 4.50)
    }

    print("⚙️ Recalculando oportunidades com base no câmbio atual...")

    with engine.connect() as connection:
        for product, prices in market_prices_usd.items():
            # Converte para Reais
            new_buy_price = round(prices['buy'] * dollar_rate, 2)
            new_sell_price = round(prices['sell'] * dollar_rate, 2)

            # Atualiza no Banco
            query = text("""
                UPDATE "Opportunity"
                SET "buyPrice" = :buy, "sellPrice" = :sell, "climate" = 'Atualizado via Bot'
                WHERE "product" = :product
            """)
            
            result = connection.execute(query, {
                "buy": new_buy_price,
                "sell": new_sell_price,
                "product": product
            })
            
            print(f"   -> {product}: Compra R$ {new_buy_price} | Venda R$ {new_sell_price} (Spread: {(new_sell_price - new_buy_price):.2f})")
            
        connection.commit()

    print(f"✅ ETL Concluído! Preços atualizados com Dólar a R$ {dollar_rate:.2f}")

if __name__ == "__main__":
    run_smart_etl()