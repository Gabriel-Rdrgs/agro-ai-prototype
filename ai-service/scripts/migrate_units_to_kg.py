#!/usr/bin/env python3
"""
Script de Migração: Caixa → Kg
================================
Converte dados legados de preços em caixa (R$/caixa) para kg (R$/kg).

Regras:
- Opportunity: buyPrice e sellPrice > 20 → divide por 20
- CeasaPrice: price_min, price_max, price_avg > 20 → divide por 20

Uso:
    python scripts/migrate_units_to_kg.py --dry-run  # Preview sem alterar
    python scripts/migrate_units_to_kg.py --execute  # Executa migração
"""

import os
import sys
from decimal import Decimal
from typing import Dict, List, Tuple
import argparse
from datetime import datetime

# Adiciona o diretório raiz ao path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import sql

# Carrega .env
load_dotenv()

# Limpa URL do banco (remove pgbouncer se existir)
def clean_db_url(url: str) -> str:
    """Remove parâmetros pgbouncer da URL para conexão direta."""
    return url.replace('?pgbouncer=true', '').replace('&pgbouncer=true', '')

DATABASE_URL = clean_db_url(os.getenv('DATABASE_URL', ''))
THRESHOLD = 20.0  # Preços acima de 20 são considerados em caixa
CONVERSION_FACTOR = 20.0  # 1 caixa = 20 kg


def get_connection():
    """Cria conexão com o banco de dados."""
    if not DATABASE_URL:
        raise ValueError("DATABASE_URL não configurado no .env")
    return psycopg2.connect(DATABASE_URL)


def analyze_opportunities(conn) -> Dict:
    """Analisa oportunidades que precisam de migração."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Busca oportunidades com preços > 20
        cur.execute("""
            SELECT 
                id, 
                product, 
                state,
                "buyPrice"::numeric as buy_price,
                "sellPrice"::numeric as sell_price
            FROM "Opportunity"
            WHERE "buyPrice"::numeric > %s OR "sellPrice"::numeric > %s
            ORDER BY id
        """, (THRESHOLD, THRESHOLD))
        
        opportunities = cur.fetchall()
        
        buy_price_count = sum(1 for opp in opportunities if float(opp['buy_price']) > THRESHOLD)
        sell_price_count = sum(1 for opp in opportunities if float(opp['sell_price']) > THRESHOLD)
        
        return {
            'total': len(opportunities),
            'buy_price_count': buy_price_count,
            'sell_price_count': sell_price_count,
            'records': opportunities
        }


def analyze_ceasa_prices(conn) -> Dict:
    """Analisa preços CEASA que precisam de migração."""
    with conn.cursor(cursor_factory=RealDictCursor) as cur:
        # Busca preços CEASA com valores > 20
        cur.execute("""
            SELECT 
                id,
                ceasa_region,
                product_name,
                price_min::numeric as price_min,
                price_max::numeric as price_max,
                price_avg::numeric as price_avg
            FROM "CeasaPrice"
            WHERE price_min::numeric > %s 
               OR price_max::numeric > %s 
               OR price_avg::numeric > %s
            ORDER BY id
        """, (THRESHOLD, THRESHOLD, THRESHOLD))
        
        prices = cur.fetchall()
        
        min_count = sum(1 for p in prices if float(p['price_min']) > THRESHOLD)
        max_count = sum(1 for p in prices if float(p['price_max']) > THRESHOLD)
        avg_count = sum(1 for p in prices if float(p['price_avg']) > THRESHOLD)
        
        return {
            'total': len(prices),
            'min_count': min_count,
            'max_count': max_count,
            'avg_count': avg_count,
            'records': prices
        }


def migrate_opportunities(conn, dry_run: bool = True) -> Tuple[int, int]:
    """Migra preços de Opportunity de caixa para kg."""
    with conn.cursor() as cur:
        # Atualiza buyPrice
        cur.execute("""
            UPDATE "Opportunity"
            SET "buyPrice" = ("buyPrice"::numeric / %s)::decimal(10,2)
            WHERE "buyPrice"::numeric > %s
        """, (CONVERSION_FACTOR, THRESHOLD))
        buy_updated = cur.rowcount
        
        # Atualiza sellPrice
        cur.execute("""
            UPDATE "Opportunity"
            SET "sellPrice" = ("sellPrice"::numeric / %s)::decimal(10,2)
            WHERE "sellPrice"::numeric > %s
        """, (CONVERSION_FACTOR, THRESHOLD))
        sell_updated = cur.rowcount
        
        if not dry_run:
            conn.commit()
        else:
            conn.rollback()
        
        return buy_updated, sell_updated


def migrate_ceasa_prices(conn, dry_run: bool = True) -> Tuple[int, int, int]:
    """Migra preços de CeasaPrice de caixa para kg."""
    with conn.cursor() as cur:
        # Atualiza price_min
        cur.execute("""
            UPDATE "CeasaPrice"
            SET price_min = (price_min::numeric / %s)::decimal(10,2)
            WHERE price_min::numeric > %s
        """, (CONVERSION_FACTOR, THRESHOLD))
        min_updated = cur.rowcount
        
        # Atualiza price_max
        cur.execute("""
            UPDATE "CeasaPrice"
            SET price_max = (price_max::numeric / %s)::decimal(10,2)
            WHERE price_max::numeric > %s
        """, (CONVERSION_FACTOR, THRESHOLD))
        max_updated = cur.rowcount
        
        # Atualiza price_avg
        cur.execute("""
            UPDATE "CeasaPrice"
            SET price_avg = (price_avg::numeric / %s)::decimal(10,2)
            WHERE price_avg::numeric > %s
        """, (CONVERSION_FACTOR, THRESHOLD))
        avg_updated = cur.rowcount
        
        if not dry_run:
            conn.commit()
        else:
            conn.rollback()
        
        return min_updated, max_updated, avg_updated


def print_preview(opp_stats: Dict, ceasa_stats: Dict):
    """Imprime preview da migração."""
    print("\n" + "="*70)
    print("📊 PREVIEW DA MIGRAÇÃO: Caixa → Kg")
    print("="*70)
    
    print(f"\n📦 OPPORTUNITY:")
    print(f"   Total de registros com preços > R$ {THRESHOLD}: {opp_stats['total']}")
    print(f"   - buyPrice a migrar: {opp_stats['buy_price_count']}")
    print(f"   - sellPrice a migrar: {opp_stats['sell_price_count']}")
    
    if opp_stats['records']:
        print(f"\n   Exemplos (primeiros 5):")
        for opp in opp_stats['records'][:5]:
            buy = float(opp['buy_price'])
            sell = float(opp['sell_price'])
            print(f"   ID {opp['id']} ({opp['product']}/{opp['state']}):")
            if buy > THRESHOLD:
                print(f"     buyPrice:  R$ {buy:.2f} → R$ {buy/CONVERSION_FACTOR:.2f}")
            if sell > THRESHOLD:
                print(f"     sellPrice: R$ {sell:.2f} → R$ {sell/CONVERSION_FACTOR:.2f}")
    
    print(f"\n💰 CEASA PRICE:")
    print(f"   Total de registros com preços > R$ {THRESHOLD}: {ceasa_stats['total']}")
    print(f"   - price_min a migrar: {ceasa_stats['min_count']}")
    print(f"   - price_max a migrar: {ceasa_stats['max_count']}")
    print(f"   - price_avg a migrar: {ceasa_stats['avg_count']}")
    
    if ceasa_stats['records']:
        print(f"\n   Exemplos (primeiros 5):")
        for price in ceasa_stats['records'][:5]:
            p_min = float(price['price_min'])
            p_max = float(price['price_max'])
            p_avg = float(price['price_avg'])
            print(f"   ID {price['id']} ({price['product_name']}/{price['ceasa_region']}):")
            if p_min > THRESHOLD:
                print(f"     price_min: R$ {p_min:.2f} → R$ {p_min/CONVERSION_FACTOR:.2f}")
            if p_max > THRESHOLD:
                print(f"     price_max: R$ {p_max:.2f} → R$ {p_max/CONVERSION_FACTOR:.2f}")
            if p_avg > THRESHOLD:
                print(f"     price_avg: R$ {p_avg:.2f} → R$ {p_avg/CONVERSION_FACTOR:.2f}")
    
    print("\n" + "="*70)


def main():
    parser = argparse.ArgumentParser(description='Migra dados de caixa para kg')
    parser.add_argument('--dry-run', action='store_true', 
                       help='Preview sem alterar dados (padrão)')
    parser.add_argument('--execute', action='store_true',
                       help='Executa a migração (requer confirmação)')
    args = parser.parse_args()
    
    # Por padrão, faz dry-run
    dry_run = not args.execute
    
    print("\n🔧 Script de Migração: Caixa → Kg")
    print(f"   Modo: {'DRY-RUN (preview)' if dry_run else 'EXECUÇÃO'}")
    print(f"   Threshold: R$ {THRESHOLD}")
    print(f"   Fator de conversão: {CONVERSION_FACTOR} (1 caixa = 20 kg)\n")
    
    try:
        conn = get_connection()
        print("✅ Conectado ao banco de dados\n")
        
        # Analisa dados
        print("📊 Analisando dados...")
        opp_stats = analyze_opportunities(conn)
        ceasa_stats = analyze_ceasa_prices(conn)
        
        # Preview
        print_preview(opp_stats, ceasa_stats)
        
        if dry_run:
            print("\n💡 Para executar a migração, use: --execute")
            return
        
        # Confirmação
        print("\n⚠️  ATENÇÃO: Esta operação irá ALTERAR dados no banco!")
        confirm = input("   Digite 'SIM' para confirmar: ")
        
        if confirm != 'SIM':
            print("❌ Migração cancelada.")
            return
        
        # Executa migração
        print("\n🔄 Executando migração...")
        
        buy_updated, sell_updated = migrate_opportunities(conn, dry_run=False)
        min_updated, max_updated, avg_updated = migrate_ceasa_prices(conn, dry_run=False)
        
        print("\n✅ Migração concluída!")
        print(f"\n📦 OPPORTUNITY:")
        print(f"   - buyPrice atualizados: {buy_updated}")
        print(f"   - sellPrice atualizados: {sell_updated}")
        print(f"\n💰 CEASA PRICE:")
        print(f"   - price_min atualizados: {min_updated}")
        print(f"   - price_max atualizados: {max_updated}")
        print(f"   - price_avg atualizados: {avg_updated}")
        print("\n✨ Dados migrados com sucesso! Agora todos os preços estão em R$/kg.")
        
    except Exception as e:
        print(f"\n❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        if 'conn' in locals():
            conn.close()


if __name__ == '__main__':
    main()

