#!/usr/bin/env python3
# scripts/backup_postgres.py
# Script de backup automatizado do PostgreSQL (Supabase) - Versão Python
#
# Uso:
#   python scripts/backup_postgres.py                    # Backup único
#   python scripts/backup_postgres.py --retention 7      # Manter últimos 7 backups
#   python scripts/backup_postgres.py --compress         # Comprimir backup
#
# Variáveis de ambiente necessárias:
#   - DATABASE_URL ou DIRECT_URL (URL de conexão do Supabase)

import os
import sys
import subprocess
import gzip
import shutil
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv

# Adiciona path para imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Cores para output
class Colors:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[1;33m'
    NC = '\033[0m'  # No Color

def log(message):
    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {message}")

def log_error(message):
    print(f"{Colors.RED}[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ❌ {message}{Colors.NC}", file=sys.stderr)

def log_success(message):
    print(f"{Colors.GREEN}[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ✅ {message}{Colors.NC}")

def log_warning(message):
    print(f"{Colors.YELLOW}[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] ⚠️  {message}{Colors.NC}")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description='Backup automatizado do PostgreSQL (Supabase)')
    parser.add_argument('--retention', type=int, default=7, help='Manter últimos N backups (padrão: 7)')
    parser.add_argument('--compress', action='store_true', help='Comprimir backup com gzip')
    parser.add_argument('--dir', type=str, help='Diretório para salvar backups (padrão: ./backups)')
    args = parser.parse_args()
    
    # Carrega .env
    project_root = Path(__file__).parent.parent
    env_file = project_root / '.env'
    if env_file.exists():
        load_dotenv(env_file)
    
    # Configurações
    backup_dir = Path(args.dir) if args.dir else project_root / 'backups'
    retention_days = args.retention
    compress = args.compress
    
    # Verifica se pg_dump está disponível
    try:
        subprocess.run(['pg_dump', '--version'], capture_output=True, check=True)
    except (subprocess.CalledProcessError, FileNotFoundError):
        log_error("pg_dump não encontrado. Instale o PostgreSQL client:")
        print("  Ubuntu/Debian: sudo apt-get install postgresql-client")
        print("  macOS: brew install postgresql")
        print("  Docker: Use imagem postgres:latest")
        sys.exit(1)
    
    # Obtém URL do banco
    database_url = os.getenv('DIRECT_URL') or os.getenv('DATABASE_URL')
    
    if not database_url:
        log_error("DATABASE_URL ou DIRECT_URL não definida!")
        print("Configure no .env ou exporte a variável de ambiente")
        sys.exit(1)
    
    # Normaliza URL (postgres:// → postgresql://)
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    # Cria diretório de backups
    backup_dir.mkdir(parents=True, exist_ok=True)
    
    # Gera nome do arquivo
    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
    backup_file = backup_dir / f"backup_{timestamp}.sql"
    
    if compress:
        backup_file = backup_dir / f"backup_{timestamp}.sql.gz"
    
    log("🚀 Iniciando backup do PostgreSQL...")
    log(f"   Diretório: {backup_dir}")
    log(f"   Arquivo: {backup_file.name}")
    log(f"   Retenção: {retention_days} dias")
    
    # Executa backup
    log("📦 Executando pg_dump...")
    
    try:
        # Executa pg_dump
        dump_process = subprocess.Popen(
            ['pg_dump', database_url, '--no-owner', '--no-acl', '--clean', '--if-exists'],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        if compress:
            # Comprime durante o dump
            with gzip.open(backup_file, 'wb') as f:
                shutil.copyfileobj(dump_process.stdout, f)
        else:
            # Salva direto
            with open(backup_file, 'wb') as f:
                shutil.copyfileobj(dump_process.stdout, f)
        
        # Espera processo terminar
        stdout, stderr = dump_process.communicate()
        
        if dump_process.returncode != 0:
            log_error(f"Falha ao criar backup: {stderr.decode()}")
            sys.exit(1)
        
        # Calcula tamanho
        backup_size = backup_file.stat().st_size
        size_mb = backup_size / (1024 * 1024)
        log_success(f"Backup criado com sucesso: {backup_file.name} ({size_mb:.2f} MB)")
        
    except Exception as e:
        log_error(f"Erro ao criar backup: {e}")
        sys.exit(1)
    
    # Remove backups antigos
    if retention_days > 0:
        log(f"🧹 Removendo backups mais antigos que {retention_days} dias...")
        
        cutoff_date = datetime.now() - timedelta(days=retention_days)
        removed_count = 0
        
        for backup_path in backup_dir.glob('backup_*.sql*'):
            # Obtém data de modificação
            mtime = datetime.fromtimestamp(backup_path.stat().st_mtime)
            
            if mtime < cutoff_date:
                log_warning(f"Removendo backup antigo: {backup_path.name}")
                backup_path.unlink()
                removed_count += 1
        
        if removed_count > 0:
            log_success(f"Limpeza concluída: {removed_count} backup(s) removido(s)")
        else:
            log("Nenhum backup antigo encontrado")
    
    # Lista backups disponíveis
    backups = list(backup_dir.glob('backup_*.sql*'))
    backup_count = len(backups)
    log_success(f"Backup concluído! Total de backups: {backup_count}")
    
    # Mostra últimos 5 backups
    if backups:
        log("📋 Últimos backups:")
        backups.sort(key=lambda p: p.stat().st_mtime, reverse=True)
        
        for backup_path in backups[:5]:
            size = backup_path.stat().st_size
            size_mb = size / (1024 * 1024)
            mtime = datetime.fromtimestamp(backup_path.stat().st_mtime)
            print(f"   - {backup_path.name} ({size_mb:.2f} MB, {mtime.strftime('%Y-%m-%d %H:%M:%S')})")
    
    return 0

if __name__ == '__main__':
    sys.exit(main())

