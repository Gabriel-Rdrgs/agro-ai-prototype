# scripts/validate_prophet_data.py
"""
Script de validação de dados para Prophet.

Verifica:
1. Quantos dados históricos existem no banco (Supabase)
2. Se há dados suficientes para Prophet (mínimo 30 dias)
3. Testa Prophet com diferentes produtos/regiões
4. Gera relatório de cobertura

Uso:
    python scripts/validate_prophet_data.py [--product Tomate] [--region SP]
"""

import os
import sys
import argparse
from datetime import datetime, timedelta
from sqlalchemy import text
from dotenv import load_dotenv

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.price_forecast import price_forecast_service
from utils.database import get_database_url, get_engine

# Carrega variáveis de ambiente
load_dotenv()

# ========================================
# CONFIGURAÇÃO DE BANCO
# ========================================
# Usa a mesma lógica do main.py para tratar pgbouncer e outros parâmetros
engine = get_engine()

# ========================================
# FUNÇÕES DE VALIDAÇÃO
# ========================================

def check_historical_data(product: str = None, region: str = None) -> dict:
    """
    Verifica quantos dados históricos existem no banco.
    
    Args:
        product: Nome do produto (opcional)
        region: Código UF (opcional)
    
    Returns:
        Dict com estatísticas de dados
    """
    print("\n" + "="*60)
    print("📊 VERIFICANDO DADOS HISTÓRICOS NO BANCO")
    print("="*60)
    
    # Query base
    query = text("""
        SELECT 
            COUNT(*) as total_records,
            MIN(price_date) as oldest_date,
            MAX(price_date) as newest_date,
            COUNT(DISTINCT product_name) as unique_products,
            COUNT(DISTINCT ceasa_region) as unique_regions
        FROM "CeasaPrice"
        WHERE price_date >= :min_date
    """)
    
    params = {
        "min_date": datetime.now() - timedelta(days=180)
    }
    
    # Adiciona filtros se fornecidos
    if product:
        query = text("""
            SELECT 
                COUNT(*) as total_records,
                MIN(price_date) as oldest_date,
                MAX(price_date) as newest_date,
                COUNT(DISTINCT product_name) as unique_products,
                COUNT(DISTINCT ceasa_region) as unique_regions
            FROM "CeasaPrice"
            WHERE price_date >= :min_date
              AND product_name ILIKE :product
        """)
        params["product"] = f"%{product}%"
    
    if region:
        query = text("""
            SELECT 
                COUNT(*) as total_records,
                MIN(price_date) as oldest_date,
                MAX(price_date) as newest_date,
                COUNT(DISTINCT product_name) as unique_products,
                COUNT(DISTINCT ceasa_region) as unique_regions
            FROM "CeasaPrice"
            WHERE price_date >= :min_date
              AND ceasa_region = :region
        """)
        params["region"] = region.upper()
    
    with engine.connect() as conn:
        result = conn.execute(query, params).fetchone()
    
    total_records = result[0] or 0
    oldest_date = result[1]
    newest_date = result[2]
    unique_products = result[3] or 0
    unique_regions = result[4] or 0
    
    # Calcula dias de cobertura
    days_coverage = 0
    if oldest_date and newest_date:
        days_coverage = (newest_date - oldest_date).days
    
    # Verifica se há dados suficientes (mínimo 30 dias)
    has_sufficient_data = days_coverage >= 30 and total_records >= 30
    
    print(f"\n📈 Estatísticas:")
    print(f"   Total de registros: {total_records:,}")
    print(f"   Data mais antiga: {oldest_date.strftime('%Y-%m-%d') if oldest_date else 'N/A'}")
    print(f"   Data mais recente: {newest_date.strftime('%Y-%m-%d') if newest_date else 'N/A'}")
    print(f"   Cobertura temporal: {days_coverage} dias")
    print(f"   Produtos únicos: {unique_products}")
    print(f"   Regiões únicas: {unique_regions}")
    
    if has_sufficient_data:
        print(f"\n✅ Dados suficientes para Prophet (≥30 dias e ≥30 registros)")
    else:
        print(f"\n⚠️ Dados INSUFICIENTES para Prophet")
        print(f"   Necessário: ≥30 dias e ≥30 registros")
        print(f"   Atual: {days_coverage} dias, {total_records} registros")
        print(f"\n💡 Recomendação: Execute o script backfill_history.py")
        print(f"   python scripts/backfill_history.py --days 180 --product {product or 'Tomate'}")
    
    return {
        'total_records': total_records,
        'oldest_date': oldest_date,
        'newest_date': newest_date,
        'days_coverage': days_coverage,
        'unique_products': unique_products,
        'unique_regions': unique_regions,
        'has_sufficient_data': has_sufficient_data
    }


def test_prophet_forecast(product: str, region: str = None) -> dict:
    """
    Testa Prophet com produto/região específicos.
    
    Args:
        product: Nome do produto
        region: Código UF (opcional)
    
    Returns:
        Dict com resultado do teste
    """
    print("\n" + "="*60)
    print(f"🔮 TESTANDO PROPHET: {product}/{region or 'Todas as regiões'}")
    print("="*60)
    
    try:
        # Testa previsão de 7 dias
        print(f"\n📅 Testando previsão de 7 dias...")
        result_7d = price_forecast_service.forecast(
            product=product,
            region=region,
            days_ahead=7
        )
        
        # Testa previsão de 30 dias
        print(f"📅 Testando previsão de 30 dias...")
        result_30d = price_forecast_service.forecast(
            product=product,
            region=region,
            days_ahead=30
        )
        
        # Analisa resultados
        status_7d = result_7d.get('status', 'unknown')
        status_30d = result_30d.get('status', 'unknown')
        model_7d = result_7d.get('forecast_model', 'unknown')  # ✅ Corrigido: forecast_model, não model_type
        model_30d = result_30d.get('forecast_model', 'unknown')  # ✅ Corrigido: forecast_model, não model_type
        
        print(f"\n📊 Resultados:")
        print(f"   7 dias:  Status={status_7d}, Modelo={model_7d}")
        print(f"   30 dias: Status={status_30d}, Modelo={model_30d}")
        
        if status_7d == 'success' and model_7d == 'prophet':
            forecast_7d = result_7d.get('forecast', [])
            if forecast_7d:
                last_price_7d = forecast_7d[-1].get('price', 0)
                print(f"   ✅ Previsão 7d: R$ {last_price_7d:.2f}/kg")
        
        if status_30d == 'success' and model_30d == 'prophet':
            forecast_30d = result_30d.get('forecast', [])
            if forecast_30d:
                last_price_30d = forecast_30d[-1].get('price', 0)
                print(f"   ✅ Previsão 30d: R$ {last_price_30d:.2f}/kg")
        
        success = (status_7d == 'success' and status_30d == 'success')
        used_prophet = (model_7d == 'prophet' or model_30d == 'prophet')
        
        if success and used_prophet:
            print(f"\n✅ Prophet funcionando corretamente!")
        elif success and not used_prophet:
            print(f"\n⚠️ Previsão funcionando, mas usando fallback (não Prophet)")
            print(f"   Isso indica que não há dados suficientes para Prophet")
        else:
            print(f"\n❌ Erro ao gerar previsões")
            if status_7d == 'error':
                print(f"   Erro 7d: {result_7d.get('message', 'Desconhecido')}")
            if status_30d == 'error':
                print(f"   Erro 30d: {result_30d.get('message', 'Desconhecido')}")
        
        return {
            'success': success,
            'used_prophet': used_prophet,
            'status_7d': status_7d,
            'status_30d': status_30d,
            'model_7d': model_7d,
            'model_30d': model_30d,
            'result_7d': result_7d,
            'result_30d': result_30d
        }
        
    except Exception as e:
        print(f"\n❌ Erro ao testar Prophet: {e}")
        import traceback
        traceback.print_exc()
        return {
            'success': False,
            'error': str(e)
        }


def generate_coverage_report():
    """
    Gera relatório de cobertura de dados por produto/região.
    """
    print("\n" + "="*60)
    print("📋 RELATÓRIO DE COBERTURA DE DADOS")
    print("="*60)
    
    # Busca produtos únicos
    query_products = text("""
        SELECT DISTINCT product_name
        FROM "CeasaPrice"
        WHERE price_date >= :min_date
        ORDER BY product_name
    """)
    
    # Busca regiões únicas
    query_regions = text("""
        SELECT DISTINCT ceasa_region
        FROM "CeasaPrice"
        WHERE price_date >= :min_date
          AND ceasa_region IS NOT NULL
        ORDER BY ceasa_region
    """)
    
    params = {
        "min_date": datetime.now() - timedelta(days=180)
    }
    
    with engine.connect() as conn:
        products = [row[0] for row in conn.execute(query_products, params)]
        regions = [row[0] for row in conn.execute(query_regions, params)]
    
    print(f"\n📦 Produtos encontrados: {len(products)}")
    for product in products[:10]:  # Mostra apenas os 10 primeiros
        print(f"   - {product}")
    if len(products) > 10:
        print(f"   ... e mais {len(products) - 10} produtos")
    
    print(f"\n🌍 Regiões encontradas: {len(regions)}")
    for region in regions[:10]:  # Mostra apenas as 10 primeiras
        print(f"   - {region}")
    if len(regions) > 10:
        print(f"   ... e mais {len(regions) - 10} regiões")
    
    # Testa combinações principais
    print(f"\n🧪 Testando combinações principais...")
    test_combinations = [
        ('Tomate', 'SP'),
        ('Tomate', 'MG'),
        ('Tomate', None),  # Todas as regiões
    ]
    
    results = []
    for product, region in test_combinations:
        if product in products:
            result = test_prophet_forecast(product, region)
            results.append({
                'product': product,
                'region': region or 'Todas',
                'success': result.get('success', False),
                'used_prophet': result.get('used_prophet', False)
            })
    
    # Resumo
    print("\n" + "="*60)
    print("📊 RESUMO DOS TESTES")
    print("="*60)
    for result in results:
        status_icon = "✅" if result['success'] else "❌"
        prophet_icon = "🔮" if result['used_prophet'] else "⚠️"
        print(f"{status_icon} {prophet_icon} {result['product']}/{result['region']}")
    
    return {
        'products': products,
        'regions': regions,
        'test_results': results
    }


def main():
    """Função principal com argumentos CLI"""
    parser = argparse.ArgumentParser(
        description='Valida dados históricos e testa Prophet.'
    )
    
    parser.add_argument(
        '--product',
        type=str,
        default=None,
        help='Produto específico para testar (ex: Tomate)'
    )
    
    parser.add_argument(
        '--region',
        type=str,
        default=None,
        help='Região específica para testar (ex: SP)'
    )
    
    parser.add_argument(
        '--full-report',
        action='store_true',
        help='Gera relatório completo de cobertura'
    )
    
    args = parser.parse_args()
    
    try:
        # 1. Verifica dados históricos
        data_stats = check_historical_data(
            product=args.product,
            region=args.region
        )
        
        # 2. Testa Prophet se produto especificado
        if args.product:
            test_result = test_prophet_forecast(
                product=args.product,
                region=args.region
            )
        else:
            test_result = None
        
        # 3. Gera relatório completo se solicitado
        if args.full_report:
            coverage_report = generate_coverage_report()
        
        # 4. Recomendações finais
        print("\n" + "="*60)
        print("💡 RECOMENDAÇÕES")
        print("="*60)
        
        if not data_stats['has_sufficient_data']:
            print("\n⚠️ AÇÃO NECESSÁRIA:")
            print("   1. Execute o script de backfill para gerar dados históricos:")
            print(f"      python scripts/backfill_history.py --days 180 --product {args.product or 'Tomate'}")
            print("\n   2. Ou execute o ETL para coletar dados reais:")
            print("      python scripts/run_etl.py")
        else:
            print("\n✅ Dados suficientes encontrados!")
            if test_result and not test_result.get('used_prophet', False):
                print("\n⚠️ Prophet não está sendo usado (fallback ativo)")
                print("   Isso pode indicar:")
                print("   - Dados insuficientes para o produto/região específica")
                print("   - Problema na configuração do Prophet")
                print("   - Dados muito recentes (Prophet precisa de histórico)")
        
        print("\n" + "="*60)
        
    except Exception as e:
        print(f"\n❌ Erro crítico: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()


