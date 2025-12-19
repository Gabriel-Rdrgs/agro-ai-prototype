#!/usr/bin/env python3
"""
Worker dedicado para execução de jobs agendados (ETLs, sincronizações, etc.).

Este script deve rodar como um processo separado no Railway (ou localmente)
para evitar que múltiplas réplicas do FastAPI executem os mesmos jobs.

Uso:
    python scripts/scheduler_worker.py [--interval 60]
    
No Railway:
    - Configure como um Job separado ou Service adicional
    - Variável de ambiente: SCHEDULER_ENABLED=true
"""

import os
import sys
import time
import logging
import argparse
import schedule
from datetime import datetime
from dotenv import load_dotenv

# Adiciona path para imports
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from utils.database import test_connection, get_engine
from config.settings import get_settings

# ========================================
# CONFIGURAÇÃO DE LOGGING
# ========================================
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('scheduler_worker.log', encoding='utf-8'),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Carrega variáveis de ambiente
load_dotenv()
settings = get_settings()

# ========================================
# CONFIGURAÇÃO DE JOBS
# ========================================

def register_etl_jobs():
    """
    Registra jobs de ETL no scheduler.
    
    Por enquanto, os ETLs são executados manualmente via endpoints admin
    ou via script run_etl.py. Se precisar agendar ETLs automáticos,
    adicione aqui:
    
    Exemplo:
        from services.data_sync.market_scraper import market_scraper
        schedule.every(6).hours.do(lambda: market_scraper.sync_all())
    """
    logger.info("📋 Registrando jobs agendados...")
    
    # Exemplo de job (descomente se necessário):
    # schedule.every(6).hours.do(run_market_etl)
    # schedule.every().day.at("02:00").do(run_ibge_etl)
    
    logger.info("✅ Jobs registrados (nenhum por padrão - ETLs são executados manualmente)")


def run_scheduler_loop(check_interval: int = 60):
    """
    Loop principal do scheduler worker.
    
    Args:
        check_interval: Intervalo em segundos para verificar jobs pendentes (padrão: 60s)
    """
    logger.info("="*60)
    logger.info("⏰ SCHEDULER WORKER INICIADO")
    logger.info("="*60)
    
    # Testa conexão com banco
    logger.info("🔌 Testando conexão com banco de dados...")
    if not test_connection():
        logger.error("❌ FALHA: Banco de dados não acessível")
        logger.error("   O worker não pode funcionar sem banco de dados")
        sys.exit(1)
    logger.info("✅ Banco de dados conectado")
    
    # Registra jobs
    register_etl_jobs()
    
    logger.info(f"🔄 Verificando jobs a cada {check_interval} segundos...")
    logger.info("   Pressione Ctrl+C para interromper")
    logger.info("="*60)
    
    # Loop principal
    try:
        while True:
            try:
                # Executa jobs pendentes
                schedule.run_pending()
                
                # Aguarda antes da próxima verificação
                time.sleep(check_interval)
                
            except KeyboardInterrupt:
                logger.info("\n⚠️ Interrompido pelo usuário. Finalizando...")
                break
            except Exception as e:
                logger.error(f"❌ Erro ao executar jobs: {e}", exc_info=True)
                # Aguarda antes de tentar novamente (evita loop infinito de erros)
                time.sleep(check_interval)
    
    except Exception as e:
        logger.error(f"❌ Erro fatal no scheduler worker: {e}", exc_info=True)
        sys.exit(1)
    
    finally:
        logger.info("="*60)
        logger.info("🛑 SCHEDULER WORKER ENCERRADO")
        logger.info("="*60)


def main():
    """Função principal com argumentos CLI"""
    parser = argparse.ArgumentParser(
        description='Worker dedicado para execução de jobs agendados.'
    )
    
    parser.add_argument(
        '--interval',
        type=int,
        default=60,
        help='Intervalo em segundos para verificar jobs pendentes (padrão: 60)'
    )
    
    parser.add_argument(
        '--check-db',
        action='store_true',
        help='Apenas verifica conexão com banco e sai'
    )
    
    args = parser.parse_args()
    
    # Modo de verificação rápida
    if args.check_db:
        logger.info("🔍 Modo de verificação de banco...")
        if test_connection():
            logger.info("✅ Banco de dados acessível")
            sys.exit(0)
        else:
            logger.error("❌ Banco de dados não acessível")
            sys.exit(1)
    
    # Modo normal: roda o scheduler
    run_scheduler_loop(check_interval=args.interval)


if __name__ == "__main__":
    main()

