# scripts/backfill_history.py
"""
Script para popular histórico de preços no banco de dados.
Gera dados sintéticos com sazonalidade real.

CORREÇÕES APLICADAS:
- Soja/Milho agora em KG (era em Saca ❌)
- Volatilidade Tomate: 35% (era 15% ❌)
- Sazonalidade regional integrada
- Choques de mercado mais realistas

Uso:
    python scripts/backfill_history.py [--days 180] [--product Tomate]
"""

import os
import sys
import argparse
import pandas as pd
import numpy as np
import math
import random
import io
from datetime import datetime, timedelta
from sqlalchemy import create_engine, text
from dotenv import load_dotenv

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from config.constants import UNIT_WEIGHTS
from services.market_intelligence import get_seasonality_factor

# Carrega variáveis de ambiente
load_dotenv()

# ========================================
# CONFIGURAÇÃO DE BANCO
# ========================================
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("PYTHON_DB_URL")

if not DATABASE_URL:
    raise ValueError("❌ Defina DATABASE_URL no .env local!")

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)


# ========================================
# CONFIGURAÇÃO DE PRODUTOS
# ========================================
# ✅ CORRIGIDO: Todos os preços em KG agora
PRODUCTS_CONFIG = {
    'Tomate': {
        'base': 4.50,        # R$ 4,50/kg (era R$ 80/caixa ❌)
        'volatility': 0.35,  # ✅ CORRIGIDO: 35% (era 15% ❌)
        'shock_prob': 0.08,  # 8% chance de choque semanal
        'shock_factor': 1.8, # Choques de até +80%
        'seasonal_amplitude': 0.30  # Variação sazonal ±30%
    },
    'Soja': {
        'base': 2.17,        # ✅ CORRIGIDO: R$ 130÷60kg = R$ 2,17/kg (era R$ 130 ❌)
        'volatility': 0.08,  # 8% volatilidade (grãos são estáveis)
        'shock_prob': 0.01,  # Raros choques
        'shock_factor': 1.15,
        'seasonal_amplitude': 0.10
    },
    'Milho': {
        'base': 1.00,        # ✅ CORRIGIDO: R$ 60÷60kg = R$ 1,00/kg (era R$ 60 ❌)
        'volatility': 0.10,  # 10% volatilidade
        'shock_prob': 0.02,
        'shock_factor': 1.20,
        'seasonal_amplitude': 0.12
    }
}


def fast_pg_insert(df: pd.DataFrame, table_name: str) -> None:
    """
    Usa protocolo COPY do PostgreSQL para inserção ultra-rápida.
    
    Args:
        df: DataFrame com dados
        table_name: Nome da tabela destino
    """
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


def generate_price_history(
    days_back: int = 180,
    product_filter: str = None
) -> None:
    """
    Gera histórico de preços com sazonalidade real.
    
    Args:
        days_back: Número de dias a gerar (padrão: 180)
        product_filter: Produto específico ou None para todos
    """
    print("="*60)
    print(f"⏳ GERANDO HISTÓRICO DE PREÇOS (CORRIGIDO EM KG)")
    print(f"Período: {days_back} dias")
    if product_filter:
        print(f"Produto: {product_filter}")
    print("="*60)
    
    data_buffer = []
    
    with engine.connect() as conn:
        # ========================================
        # LIMPEZA DE DADOS ANTIGOS
        # ========================================
        print("\n🧹 Limpando dados antigos...")
        try:
            conn.execute(text("SET statement_timeout = '60s'"))
            conn.execute(text('DELETE FROM "PriceHistory"'))
            conn.commit()
            print("✨ Tabela limpa.")
        except Exception as e:
            print(f"⚠️ Erro ao limpar: {e}. Tentando inserir por cima...")
        
        # ========================================
        # BUSCA PRODUTOS
        # ========================================
        print("\n🔍 Lendo produtos do banco...")
        
        query = 'SELECT id, product, state FROM "Opportunity"'
        if product_filter:
            query += f" WHERE product = '{product_filter}'"
        
        opps = pd.read_sql(text(query), conn)
        
        print(f"🧮 Gerando preços para {len(opps)} registros...")
        
        # ========================================
        # GERAÇÃO DE PREÇOS
        # ========================================
        for idx, row in opps.iterrows():
            product = row['product']
            state = row['state'] if 'state' in row else 'SP'
            
            # Configuração do produto
            conf = PRODUCTS_CONFIG.get(product, PRODUCTS_CONFIG['Tomate'])
            
            base_price = conf['base']
            volatility = conf['volatility']
            shock_prob = conf['shock_prob']
            shock_factor = conf['shock_factor']
            seasonal_amp = conf['seasonal_amplitude']
            
            for i in range(days_back):
                date = datetime.now() - timedelta(days=(days_back - i))
                month = date.month
                
                # ========================================
                # 1. TENDÊNCIA TEMPORAL (Onda senoidal)
                # ========================================
                # Ciclo anual completo
                seasonal_wave = math.sin(i * 2 * math.pi / 365) * (base_price * seasonal_amp)
                
                # ========================================
                # 2. SAZONALIDADE REGIONAL (PDF)
                # ========================================
                # Usa função real do market_intelligence
                season_factor = get_seasonality_factor(product, state, month)
                regional_adjustment = base_price * (season_factor - 1.0)
                
                # ========================================
                # 3. RUÍDO ESTOCÁSTICO
                # ========================================
                noise = np.random.normal(0, base_price * volatility * 0.3)
                
                # ========================================
                # 4. CHOQUES DE MERCADO
                # ========================================
                shock = shock_factor if random.random() < shock_prob else 1.0
                
                # ========================================
                # 5. PREÇO FINAL
                # ========================================
                price = (base_price + seasonal_wave + regional_adjustment + noise) * shock
                
                # Validação: nunca menor que 10% do preço base 
                price = max(base_price * 0.1, price)
                
                data_buffer.append({
                    "opportunityId": row['id'],
                    "price": round(price, 2),
                    "createdAt": date
                })
            
            # Progresso
            if (idx + 1) % 10 == 0:
                print(f"  → Processados: {idx + 1}/{len(opps)}")
    
    # ========================================
    # INSERÇÃO NO BANCO
    # ========================================
    if data_buffer:
        print(f"\n💾 Preparando inserção de {len(data_buffer)} registros...")
        df = pd.DataFrame(data_buffer)
        df = df[['opportunityId', 'price', 'createdAt']]
        
        fast_pg_insert(df, 'PriceHistory')
        
        print("\n" + "="*60)
        print("✅ HISTÓRICO GERADO COM SUCESSO!")
        print(f"Total de registros: {len(data_buffer)}")
        print(f"Período: {days_back} dias")
        print(f"Data mais antiga: {data_buffer[0]['createdAt'].strftime('%Y-%m-%d')}")
        print(f"Data mais recente: {data_buffer[-1]['createdAt'].strftime('%Y-%m-%d')}")
        print("="*60)
    else:
        print("⚠️ Nenhum dado gerado.")


def main():
    """Função principal com argumentos CLI"""
    parser = argparse.ArgumentParser(
        description='Gera histórico de preços sintético para o banco de dados.'
    )
    
    parser.add_argument(
        '--days',
        type=int,
        default=180,
        help='Número de dias de histórico (padrão: 180)'
    )
    
    parser.add_argument(
        '--product',
        type=str,
        default=None,
        help='Filtrar por produto específico (ex: Tomate, Soja, Milho)'
    )
    
    parser.add_argument(
        '--clean-only',
        action='store_true',
        help='Apenas limpa a tabela sem gerar novos dados'
    )
    
    args = parser.parse_args()
    
    # Validação
    if args.product and args.product not in PRODUCTS_CONFIG:
        print(f"⚠️ Produto '{args.product}' não reconhecido.")
        print(f"Produtos disponíveis: {', '.join(PRODUCTS_CONFIG.keys())}")
        sys.exit(1)
    
    # Execução
    if args.clean_only:
        print("🧹 Modo limpeza ativado...")
        with engine.connect() as conn:
            conn.execute(text('DELETE FROM "PriceHistory"'))
            conn.commit()
        print("✅ Tabela limpa.")
    else:
        generate_price_history(
            days_back=args.days,
            product_filter=args.product
        )


if __name__ == "__main__":
    main()
