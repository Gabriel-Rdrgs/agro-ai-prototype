#!/usr/bin/env python3
"""
Worker dedicado para execução de backups agendados do PostgreSQL.

Este script pode rodar como:
1. Processo contínuo (com schedule) - para Railway Service
2. Job único (execução única) - para Railway Cron Job

Uso como Service (processo contínuo):
    python scripts/backup_worker.py --schedule

Uso como Job (execução única):
    python scripts/backup_worker.py --once

No Railway:
    - Opção 1: Configure como Service com --schedule (roda continuamente)
    - Opção 2: Configure como Cron Job com --once (executa e termina)
"""

import os
import sys
import time
import logging
import argparse
import schedule
import subprocess
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Configuração de Logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

# Carrega variáveis de ambiente
load_dotenv()

# ========================================
# CONFIGURAÇÃO
# ========================================

# Diretório de backups (padrão: ./backups)
BACKUP_DIR = os.getenv('BACKUP_DIR', os.path.join(os.path.dirname(__file__), '..', 'backups'))
BACKUP_RETENTION_DAYS = int(os.getenv('BACKUP_RETENTION_DAYS', '7'))  # Retenção padrão: 7 dias
BACKUP_COMPRESS = os.getenv('BACKUP_COMPRESS', 'true').lower() == 'true'  # Compressão padrão: sim

# Horário padrão do backup (2h da manhã UTC)
BACKUP_SCHEDULE_TIME = os.getenv('BACKUP_SCHEDULE_TIME', '02:00')


def run_backup():
    """
    Executa o backup do PostgreSQL usando o script Python.
    
    Returns:
        bool: True se o backup foi bem-sucedido, False caso contrário
    """
    try:
        logger.info("=" * 60)
        logger.info("💾 INICIANDO BACKUP DO BANCO DE DADOS")
        logger.info("=" * 60)
        
        # Caminho do script de backup
        script_path = os.path.join(os.path.dirname(__file__), 'backup_postgres.py')
        
        if not os.path.exists(script_path):
            logger.error(f"❌ Script de backup não encontrado: {script_path}")
            return False
        
        # Prepara comando
        cmd = [sys.executable, script_path]
        
        if BACKUP_COMPRESS:
            cmd.append('--compress')
        
        if BACKUP_RETENTION_DAYS > 0:
            cmd.extend(['--retention', str(BACKUP_RETENTION_DAYS)])
        
        if BACKUP_DIR:
            cmd.extend(['--dir', BACKUP_DIR])
        
        logger.info(f"📋 Comando: {' '.join(cmd)}")
        logger.info(f"📁 Diretório de backup: {BACKUP_DIR}")
        logger.info(f"🗓️ Retenção: {BACKUP_RETENTION_DAYS} dias")
        logger.info(f"🗜️ Compressão: {'Sim' if BACKUP_COMPRESS else 'Não'}")
        
        # Executa backup
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False
        )
        
        if result.returncode == 0:
            logger.info("✅ BACKUP CONCLUÍDO COM SUCESSO")
            if result.stdout:
                logger.info(f"📄 Saída:\n{result.stdout}")
            return True
        else:
            logger.error("❌ ERRO AO EXECUTAR BACKUP")
            if result.stderr:
                logger.error(f"❌ Erro:\n{result.stderr}")
            if result.stdout:
                logger.error(f"📄 Saída:\n{result.stdout}")
            return False
            
    except Exception as e:
        logger.error(f"❌ Erro fatal ao executar backup: {e}", exc_info=True)
        return False
    finally:
        logger.info("=" * 60)


def register_backup_job():
    """
    Registra o job de backup no scheduler.
    """
    logger.info("📋 Registrando job de backup agendado...")
    
    # Agenda backup diário no horário configurado
    schedule.every().day.at(BACKUP_SCHEDULE_TIME).do(run_backup)
    
    logger.info(f"✅ Backup agendado para executar diariamente às {BACKUP_SCHEDULE_TIME} UTC")
    logger.info(f"   (Configure BACKUP_SCHEDULE_TIME para alterar o horário)")


def run_scheduler_loop(check_interval: int = 60):
    """
    Loop principal do scheduler (para modo --schedule).
    
    Args:
        check_interval: Intervalo em segundos para verificar jobs pendentes
    """
    logger.info("=" * 60)
    logger.info("⏰ BACKUP WORKER INICIADO (Modo Scheduler)")
    logger.info("=" * 60)
    logger.info(f"🔄 Verificando jobs a cada {check_interval} segundos...")
    logger.info(f"💾 Backup agendado para: {BACKUP_SCHEDULE_TIME} UTC (diário)")
    logger.info("   Pressione Ctrl+C para interromper")
    logger.info("=" * 60)
    
    register_backup_job()
    
    # Executa backup imediatamente na primeira execução (opcional)
    # Descomente a linha abaixo se quiser executar backup ao iniciar:
    # logger.info("🚀 Executando backup inicial...")
    # run_backup()
    
    while True:
        try:
            schedule.run_pending()
            time.sleep(check_interval)
        except KeyboardInterrupt:
            logger.info("\n\n⚠️ Interrompido pelo usuário. Finalizando...")
            break
        except Exception as e:
            logger.error(f"❌ Erro fatal no Scheduler Loop: {e}", exc_info=True)
            time.sleep(300)  # Espera 5 minutos antes de tentar novamente


def main():
    parser = argparse.ArgumentParser(
        description='Worker de Backup PostgreSQL para Agro-AI Brain.'
    )
    
    parser.add_argument(
        '--schedule',
        action='store_true',
        help='Modo scheduler: roda continuamente e executa backups agendados'
    )
    
    parser.add_argument(
        '--once',
        action='store_true',
        help='Modo job único: executa backup uma vez e termina'
    )
    
    parser.add_argument(
        '--interval',
        type=int,
        default=60,
        help='Intervalo de verificação em segundos (apenas para --schedule, padrão: 60)'
    )
    
    parser.add_argument(
        '--test',
        action='store_true',
        help='Apenas testa a configuração e sai (não executa backup)'
    )
    
    args = parser.parse_args()
    
    # Valida argumentos
    if not args.schedule and not args.once and not args.test:
        parser.error("Você deve especificar --schedule, --once ou --test")
    
    if args.test:
        logger.info("🧪 Modo de teste - verificando configuração...")
        logger.info(f"   BACKUP_DIR: {BACKUP_DIR}")
        logger.info(f"   BACKUP_RETENTION_DAYS: {BACKUP_RETENTION_DAYS}")
        logger.info(f"   BACKUP_COMPRESS: {BACKUP_COMPRESS}")
        logger.info(f"   BACKUP_SCHEDULE_TIME: {BACKUP_SCHEDULE_TIME}")
        logger.info(f"   DATABASE_URL: {'✅ Configurado' if os.getenv('DATABASE_URL') or os.getenv('DIRECT_URL') else '❌ Não configurado'}")
        logger.info("✅ Teste concluído")
        sys.exit(0)
    
    if args.once:
        logger.info("🚀 Modo job único - executando backup agora...")
        success = run_backup()
        sys.exit(0 if success else 1)
    
    if args.schedule:
        run_scheduler_loop(args.interval)


if __name__ == "__main__":
    main()

