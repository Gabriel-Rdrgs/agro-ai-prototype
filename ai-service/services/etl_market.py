# ai-service/services/etl_market.py
import logging
import requests
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from dotenv import load_dotenv
import os
from supabase import create_client

load_dotenv()
logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

# Configuração Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def fetch_dollar_history(days=365):
    """Busca histórico do Dólar (USD-BRL) dos últimos X dias via API pública"""
    url = f"https://economia.awesomeapi.com.br/json/daily/USD-BRL/{days}"
    try:
        response = requests.get(url)
        data = response.json()
        
        prices = []
        for item in data:
            # A API retorna timestamp em segundos
            date = datetime.fromtimestamp(int(item['timestamp'])).date()
            price = float(item['bid']) # Preço de compra
            
            prices.append({
                "date": date.isoformat(),
                "product": "dolar",
                "region": "BR",
                "price": price,
                "unit": "brl",
                "source": "awesomeapi"
            })
        return prices
    except Exception as e:
        logger.error(f"Erro ao buscar Dólar: {e}")
        return []

def generate_mock_commodity(product, start_price, volatility, days=365):
    """
    Gera dados sintéticos realistas para Soja/Milho/Tomate 
    (Para validar o Prophet enquanto não pagamos API de commodities)
    """
    prices = []
    current_price = start_price
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=days)
    
    for i in range(days):
        date = start_date + timedelta(days=i)
        
        # Random Walk com tendência de sazonalidade simples
        change = np.random.normal(0, volatility)
        current_price += change
        
        # Garante que não fique negativo
        current_price = max(current_price, 5.0)
        
        prices.append({
            "date": date.isoformat(),
            "product": product,
            "region": "BR", # Média Brasil
            "price": round(current_price, 2),
            "unit": "sc_60kg" if product != 'tomate' else 'cx_20kg',
            "source": "simulated_v1"
        })
    return prices

def deduplicate_data(data_list):
    """
    Remove duplicatas (mesma data, produto e região) mantendo a última ocorrência.
    Resolve o erro 'ON CONFLICT DO UPDATE command cannot affect row a second time'.
    """
    unique_map = {}
    for item in data_list:
        # Cria uma chave única para cada registro
        key = (item['date'], item['product'], item['region'])
        unique_map[key] = item
    
    # Retorna apenas os valores únicos
    return list(unique_map.values())

def run_etl():
    logger.info("🚀 Iniciando ETL de Mercado...")
    
    raw_data = []
    
    # 1. Dólar (Real)
    logger.info("   💵 Buscando Dólar...")
    dollar_data = fetch_dollar_history()
    raw_data.extend(dollar_data)
    
    # 2. Commodities (Simuladas para MVP)
    logger.info("   🌱 Gerando histórico de Soja...")
    raw_data.extend(generate_mock_commodity("soja", 120.00, 1.5))
    
    logger.info("   🌽 Gerando histórico de Milho...")
    raw_data.extend(generate_mock_commodity("milho", 55.00, 0.8))
    
    logger.info("   🍅 Gerando histórico de Tomate...")
    raw_data.extend(generate_mock_commodity("tomate", 80.00, 2.5))
    
    # 3. Limpeza (Deduplicação)
    logger.info(f"   🧹 Registros brutos: {len(raw_data)}")
    clean_data = deduplicate_data(raw_data)
    logger.info(f"   ✨ Registros únicos para inserir: {len(clean_data)}")
    
    # 4. Inserção no Supabase (Upsert)
    batch_size = 1000
    for i in range(0, len(clean_data), batch_size):
        batch = clean_data[i:i+batch_size]
        try:
            supabase.table("market_prices").upsert(batch, on_conflict="date,product,region").execute()
            logger.info(f"      ✅ Lote {i} a {i+len(batch)} inserido.")
        except Exception as e:
            logger.error(f"      ❌ Erro ao inserir lote: {e}")

if __name__ == "__main__":
    run_etl()