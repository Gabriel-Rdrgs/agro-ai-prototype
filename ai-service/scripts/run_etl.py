# scripts/run_etl.py
"""
Script CLI para executar ETL completo de dados agrícolas.
Coleta dados de:
- Preços de mercado (CEASA-PR, Agrolink, CONAB, Outras CEASAs)
- Produção agrícola (IBGE)

Uso:
    python scripts/run_etl.py [--schedule] [--skip-ibge]
"""

import os
import sys
import argparse
import time
import schedule
from datetime import datetime

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.data_sync.market_scraper import market_scraper
from services.data_sync.ibge_scraper import ibge_scraper


def run_single_etl(skip_ibge: bool = False):
    """
    Executa ETL completo uma única vez.
    
    Args:
        skip_ibge: Se True, pula o ETL IBGE (produção agrícola)
    """
    print("\n" + "="*60)
    print(f"🚀 ETL COMPLETO INICIADO - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    results = {
        'market': None,
        'ibge': None,
        'success': True,
        'total_records': 0,
        'sources': []
    }
    
    try:
        # 1. ETL de Preços de Mercado
        print("\n📊 [1/2] Executando ETL de Preços de Mercado...")
        print("-" * 60)
        try:
            market_result = market_scraper.run_etl()
            results['market'] = market_result
            
            if market_result['success']:
                results['total_records'] += market_result['records']
                results['sources'].extend(market_result.get('sources', []))
                print(f"✅ Preços: {market_result['records']} registros de {', '.join(market_result.get('sources', []))}")
            else:
                print(f"⚠️ Preços: {market_result.get('error', 'Erro desconhecido')}")
                results['success'] = False
        except Exception as e:
            print(f"❌ Erro no ETL de preços: {e}")
            results['success'] = False
        
        # 2. ETL IBGE (Produção Agrícola)
        if not skip_ibge:
            print("\n📊 [2/2] Executando ETL IBGE (Produção Agrícola)...")
            print("-" * 60)
            try:
                ibge_result = ibge_scraper.run_etl(years_back=2)
                results['ibge'] = ibge_result
                
                if ibge_result['success']:
                    results['total_records'] += ibge_result['records']
                    results['sources'].append('IBGE')
                    print(f"✅ IBGE: {ibge_result['records']} registros coletados, {ibge_result['saved']} salvos")
                else:
                    print(f"⚠️ IBGE: {ibge_result.get('error', 'Nenhum dado coletado')}")
            except Exception as e:
                print(f"⚠️ Erro no ETL IBGE: {e}")
        else:
            print("\n⏭️  [2/2] ETL IBGE pulado (--skip-ibge)")
        
        # Resumo final
        print("\n" + "="*60)
        if results['success'] and results['total_records'] > 0:
            print("✅ ETL COMPLETO CONCLUÍDO COM SUCESSO!")
            print(f"📦 Total de registros coletados: {results['total_records']}")
            print(f"📡 Fontes: {', '.join(results['sources'])}")
        elif results['total_records'] == 0:
            print("⚠️ ETL CONCLUÍDO MAS NENHUM REGISTRO COLETADO")
            print("💡 Verifique se as fontes de dados estão disponíveis")
        else:
            print("⚠️ ETL CONCLUÍDO COM AVISOS")
        
        return results
    
    except Exception as e:
        print(f"\n❌ ERRO CRÍTICO NO ETL: {e}")
        import traceback
        traceback.print_exc()
        return {'success': False, 'error': str(e)}
    
    finally:
        print("="*60 + "\n")


def run_scheduled_etl(interval_hours: int = 6, skip_ibge: bool = False):
    """
    Executa ETL em intervalos programados.
    
    Args:
        interval_hours: Intervalo entre execuções (padrão: 6h)
        skip_ibge: Se True, pula o ETL IBGE em todas as execuções
    """
    print(f"⏰ ETL AGENDADO - Execução a cada {interval_hours} horas")
    if skip_ibge:
        print("ℹ️  ETL IBGE será pulado em todas as execuções")
    print("Pressione Ctrl+C para interromper\n")
    
    # Execução imediata
    run_single_etl(skip_ibge=skip_ibge)
    
    # Agenda próximas execuções
    schedule.every(interval_hours).hours.do(lambda: run_single_etl(skip_ibge=skip_ibge))
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Verifica a cada 1 minuto


def main():
    """Função principal com argumentos CLI"""
    parser = argparse.ArgumentParser(
        description='Executa ETL completo de dados agrícolas (Preços + Produção IBGE).'
    )
    
    parser.add_argument(
        '--schedule',
        action='store_true',
        help='Executa ETL em loop programado (padrão: a cada 6h)'
    )
    
    parser.add_argument(
        '--interval',
        type=int,
        default=6,
        help='Intervalo entre execuções em horas (padrão: 6)'
    )
    
    parser.add_argument(
        '--skip-ibge',
        action='store_true',
        help='Pula o ETL IBGE (produção agrícola) - útil para execuções rápidas'
    )
    
    args = parser.parse_args()
    
    try:
        if args.schedule:
            run_scheduled_etl(interval_hours=args.interval, skip_ibge=args.skip_ibge)
        else:
            run_single_etl(skip_ibge=args.skip_ibge)
    
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrompido pelo usuário. Finalizando...")
        sys.exit(0)


if __name__ == "__main__":
    main()
