#!/usr/bin/env python3
"""
Script rápido para popular dados de teste na tabela CeasaPrice.
Gera histórico sintético para testar o Prophet.

Uso:
    python scripts/populate_test_data.py [--product Tomate] [--region MG] [--days 180]
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from sqlalchemy import text
from dotenv import load_dotenv
import random

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.database import get_engine

load_dotenv()

# Configuração de produtos e regiões
PRODUCTS_CONFIG = {
    'Tomate': {
        'base_price': 4.50,
        'ceasa_names': {
            'SP': 'CEAGESP - São Paulo',
            'MG': 'CEASA-MG - Belo Horizonte',
            'RJ': 'CEASA-RJ - Rio de Janeiro',
            'GO': 'CEASA-GO - Goiânia',
        }
    },
    'Soja': {
        'base_price': 2.17,
        'ceasa_names': {
            'SP': 'CEAGESP - São Paulo',
            'MG': 'CEASA-MG - Belo Horizonte',
            'PR': 'CEASA-PR - Curitiba',
        }
    },
    'Milho': {
        'base_price': 1.00,
        'ceasa_names': {
            'SP': 'CEAGESP - São Paulo',
            'MG': 'CEASA-MG - Belo Horizonte',
            'PR': 'CEASA-PR - Curitiba',
        }
    }
}

engine = get_engine()

def populate_test_data(product: str = 'Tomate', region: str = 'SP', days: int = 180):
    """
    Popula dados de teste para produto/região específicos.
    
    Args:
        product: Nome do produto (Tomate, Soja, Milho)
        region: Código UF (SP, MG, RJ, etc.)
        days: Número de dias de histórico a gerar
    """
    print("=" * 60)
    print(f"🚀 Populando dados de teste para CeasaPrice")
    print(f"   Produto: {product}")
    print(f"   Região: {region}")
    print(f"   Período: {days} dias")
    print("=" * 60)
    
    # Valida produto
    if product not in PRODUCTS_CONFIG:
        print(f"❌ Produto '{product}' não reconhecido.")
        print(f"   Produtos disponíveis: {', '.join(PRODUCTS_CONFIG.keys())}")
        sys.exit(1)
    
    config = PRODUCTS_CONFIG[product]
    base_price = config['base_price']
    
    # Valida região
    if region not in config['ceasa_names']:
        print(f"⚠️ Região '{region}' não tem CEASA configurada para {product}.")
        print(f"   Usando nome genérico: CEASA-{region}")
        ceasa_name = f"CEASA-{region}"
    else:
        ceasa_name = config['ceasa_names'][region]
    
    today = datetime.now()
    
    # Gera histórico
    prices = []
    for i in range(days):
        date = today - timedelta(days=days - i)
        
        # Simula sazonalidade (preços mais altos no inverno)
        month = date.month
        if month in [6, 7, 8]:  # Inverno
            seasonal_factor = 1.15
        elif month in [12, 1, 2]:  # Verão
            seasonal_factor = 0.90
        else:
            seasonal_factor = 1.0
        
        # Adiciona variação aleatória (maior para Tomate)
        if product == 'Tomate':
            variation = random.uniform(-0.15, 0.15)  # ±15% (mais volátil)
        else:
            variation = random.uniform(-0.08, 0.08)  # ±8% (grãos mais estáveis)
        
        price = base_price * seasonal_factor * (1 + variation)
        
        prices.append({
            "ceasa_region": region.upper(),
            "ceasa_name": ceasa_name,
            "product_name": product,
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
    print(f"📅 Período: {(today - timedelta(days=days)).strftime('%Y-%m-%d')} até {today.strftime('%Y-%m-%d')}")
    print("=" * 60)
    print(f"\n💡 Agora você pode testar o Prophet:")
    print(f"   python scripts/validate_prophet_data.py --product {product} --region {region}")

def main():
    """Função principal com argumentos CLI"""
    parser = argparse.ArgumentParser(
        description='Popula dados de teste na tabela CeasaPrice para validar Prophet.'
    )
    
    parser.add_argument(
        '--product',
        type=str,
        default='Tomate',
        help='Produto (Tomate, Soja, Milho) - padrão: Tomate'
    )
    
    parser.add_argument(
        '--region',
        type=str,
        default='SP',
        help='Código UF (SP, MG, RJ, etc.) - padrão: SP'
    )
    
    parser.add_argument(
        '--days',
        type=int,
        default=180,
        help='Número de dias de histórico (padrão: 180)'
    )
    
    args = parser.parse_args()
    
    populate_test_data(
        product=args.product,
        region=args.region,
        days=args.days
    )

if __name__ == "__main__":
    main()

