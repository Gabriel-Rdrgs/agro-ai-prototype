# scripts/run_etl.py
"""
Script CLI para executar ETL de preços de mercado.
Coleta dados de CEASA-PR e Agrolink.

Uso:
    python scripts/run_etl.py [--schedule]
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


def run_single_etl():
    """Executa ETL uma única vez"""
    print("\n" + "="*60)
    print(f"🚀 ETL INICIADO - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("="*60)
    
    try:
        result = market_scraper.run_etl()
        
        if result['success']:
            print("\n✅ ETL CONCLUÍDO COM SUCESSO!")
            print(f"Registros coletados: {result['records']}")
            print(f"Fontes: {', '.join(result['sources'])}")
        else:
            print("\n⚠️ ETL CONCLUÍDO COM AVISOS")
            print(f"Erro: {result.get('error', 'Unknown')}")
        
        return result
    
    except Exception as e:
        print(f"\n❌ ERRO CRÍTICO NO ETL: {e}")
        return {'success': False, 'error': str(e)}
    
    finally:
        print("="*60 + "\n")


def run_scheduled_etl(interval_hours: int = 6):
    """
    Executa ETL em intervalos programados.
    
    Args:
        interval_hours: Intervalo entre execuções (padrão: 6h)
    """
    print(f"⏰ ETL AGENDADO - Execução a cada {interval_hours} horas")
    print("Pressione Ctrl+C para interromper\n")
    
    # Execução imediata
    run_single_etl()
    
    # Agenda próximas execuções
    schedule.every(interval_hours).hours.do(run_single_etl)
    
    while True:
        schedule.run_pending()
        time.sleep(60)  # Verifica a cada 1 minuto


def main():
    """Função principal com argumentos CLI"""
    parser = argparse.ArgumentParser(
        description='Executa ETL de preços de mercado (CEASA + Agrolink).'
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
    
    args = parser.parse_args()
    
    try:
        if args.schedule:
            run_scheduled_etl(interval_hours=args.interval)
        else:
            run_single_etl()
    
    except KeyboardInterrupt:
        print("\n\n⚠️ Interrompido pelo usuário. Finalizando...")
        sys.exit(0)


if __name__ == "__main__":
    main()
