#!/usr/bin/env python3
"""
Script rápido para popular dados de teste na tabela CeasaPrice.
Gera 90 dias de histórico sintético para testar o Prophet.

Uso:
    python scripts/populate_test_data.py
"""

import os
import sys
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import random

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    print("❌ Erro: DATABASE_URL não encontrado no .env")
    sys.exit(1)

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)

def populate_test_data():
    """Popula dados de teste para Tomate em SP"""
    print("=" * 60)
    print("🚀 Populando dados de teste para CeasaPrice")
    print("=" * 60)
    
    # Preço base (R$/kg)
    base_price = 4.50
    today = datetime.now()
    
    # Gera 90 dias de histórico
    prices = []
    for i in range(90):
        date = today - timedelta(days=90 - i)
        
        # Simula sazonalidade (preços mais altos no inverno)
        month = date.month
        if month in [6, 7, 8]:  # Inverno
            seasonal_factor = 1.15
        elif month in [12, 1, 2]:  # Verão
            seasonal_factor = 0.90
        else:
            seasonal_factor = 1.0
        
        # Adiciona variação aleatória
        variation = random.uniform(-0.10, 0.10)  # ±10%
        price = base_price * seasonal_factor * (1 + variation)
        
        prices.append({
            "ceasa_region": "SP",
            "ceasa_name": "CEAGESP - São Paulo",
            "product_name": "Tomate",
            "unit_type": "kg",
            "price_min": round(price * 0.95, 2),
            "price_max": round(price * 1.05, 2),
            "price_avg": round(price, 2),
            "price_date": date
        })
    
    # Insere no banco (upsert para evitar duplicatas)
    with engine.connect() as conn:
        inserted = 0
        for price in prices:
            try:
                conn.execute(text("""
                    INSERT INTO "CeasaPrice" 
                    (ceasa_region, ceasa_name, product_name, unit_type, price_min, price_max, price_avg, price_date)
                    VALUES (:region, :name, :product, :unit, :min, :max, :avg, :date)
                    ON CONFLICT (ceasa_region, product_name, price_date) 
                    DO UPDATE SET 
                        price_min = EXCLUDED.price_min,
                        price_max = EXCLUDED.price_max,
                        price_avg = EXCLUDED.price_avg,
                        sync_timestamp = CURRENT_TIMESTAMP
                """), {
                    "region": price["ceasa_region"],
                    "name": price["ceasa_name"],
                    "product": price["product_name"],
                    "unit": price["unit_type"],
                    "min": price["price_min"],
                    "max": price["price_max"],
                    "avg": price["price_avg"],
                    "date": price["price_date"]
                })
                conn.commit()
                inserted += 1
            except Exception as e:
                print(f"⚠️ Erro ao inserir {price['price_date']}: {e}")
                conn.rollback()
    
    print(f"\n✅ {inserted} registros inseridos/atualizados")
    print(f"📅 Período: {(today - timedelta(days=90)).strftime('%Y-%m-%d')} até {today.strftime('%Y-%m-%d')}")
    print("=" * 60)
    print("\n💡 Agora você pode testar o Prophet:")
    print("   python -c \"from services.price_forecast import price_forecast_service; result = price_forecast_service.forecast('Tomate', 'SP', 30); print('Status:', result['status'])\"")

if __name__ == "__main__":
    populate_test_data()

