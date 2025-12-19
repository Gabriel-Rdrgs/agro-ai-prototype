#!/bin/bash
# scripts/backup_postgres.sh
# Script de backup automatizado do PostgreSQL (Supabase)
#
# Uso:
#   ./scripts/backup_postgres.sh                    # Backup único
#   ./scripts/backup_postgres.sh --retention 7      # Manter últimos 7 backups
#   ./scripts/backup_postgres.sh --compress          # Comprimir backup
#
# Variáveis de ambiente necessárias:
#   - DATABASE_URL ou DIRECT_URL (URL de conexão do Supabase)
#   - BACKUP_DIR (opcional, padrão: ./backups)
#   - BACKUP_RETENTION_DAYS (opcional, padrão: 7)

set -euo pipefail

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configurações padrão
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$PROJECT_ROOT/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-7}"
COMPRESS="${COMPRESS:-false}"

# Parse de argumentos
while [[ $# -gt 0 ]]; do
  case $1 in
    --retention)
      RETENTION_DAYS="$2"
      shift 2
      ;;
    --compress)
      COMPRESS=true
      shift
      ;;
    --dir)
      BACKUP_DIR="$2"
      shift 2
      ;;
    --help)
      echo "Uso: $0 [--retention N] [--compress] [--dir DIR]"
      echo ""
      echo "Opções:"
      echo "  --retention N   Manter últimos N backups (padrão: 7)"
      echo "  --compress      Comprimir backup com gzip"
      echo "  --dir DIR       Diretório para salvar backups (padrão: ./backups)"
      echo "  --help          Mostrar esta ajuda"
      exit 0
      ;;
    *)
      echo -e "${RED}❌ Opção desconhecida: $1${NC}"
      echo "Use --help para ver opções disponíveis"
      exit 1
      ;;
  esac
done

# Função de logging
log() {
  echo -e "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

log_error() {
  echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ❌ $1${NC}" >&2
}

log_success() {
  echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] ✅ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] ⚠️  $1${NC}"
}

# Verifica se pg_dump está disponível
if ! command -v pg_dump &> /dev/null; then
  log_error "pg_dump não encontrado. Instale o PostgreSQL client:"
  echo "  Ubuntu/Debian: sudo apt-get install postgresql-client"
  echo "  macOS: brew install postgresql"
  echo "  Docker: Use imagem postgres:latest"
  exit 1
fi

# Carrega variáveis de ambiente
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Obtém URL do banco (prioriza DIRECT_URL, depois DATABASE_URL)
DATABASE_URL="${DIRECT_URL:-${DATABASE_URL:-}}"

if [ -z "$DATABASE_URL" ]; then
  log_error "DATABASE_URL ou DIRECT_URL não definida!"
  echo "Configure no .env ou exporte a variável de ambiente"
  exit 1
fi

# Normaliza URL (postgres:// → postgresql://)
if [[ "$DATABASE_URL" == postgres://* ]]; then
  DATABASE_URL="${DATABASE_URL/postgres:\/\//postgresql:\/\/}"
fi

# Cria diretório de backups se não existir
mkdir -p "$BACKUP_DIR"

# Gera nome do arquivo de backup
TIMESTAMP=$(date +'%Y%m%d_%H%M%S')
BACKUP_FILE="$BACKUP_DIR/backup_${TIMESTAMP}.sql"

# Se compressão estiver habilitada, adiciona .gz
if [ "$COMPRESS" = true ]; then
  BACKUP_FILE="${BACKUP_FILE}.gz"
fi

log "🚀 Iniciando backup do PostgreSQL..."
log "   Diretório: $BACKUP_DIR"
log "   Arquivo: $(basename "$BACKUP_FILE")"
log "   Retenção: $RETENTION_DAYS dias"

# Executa backup
log "📦 Executando pg_dump..."

if [ "$COMPRESS" = true ]; then
  # Backup comprimido
  if pg_dump "$DATABASE_URL" --no-owner --no-acl --clean --if-exists | gzip > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup criado com sucesso: $(basename "$BACKUP_FILE") ($BACKUP_SIZE)"
  else
    log_error "Falha ao criar backup!"
    exit 1
  fi
else
  # Backup não comprimido
  if pg_dump "$DATABASE_URL" --no-owner --no-acl --clean --if-exists > "$BACKUP_FILE"; then
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    log_success "Backup criado com sucesso: $(basename "$BACKUP_FILE") ($BACKUP_SIZE)"
  else
    log_error "Falha ao criar backup!"
    exit 1
  fi
fi

# Remove backups antigos (retenção)
if [ "$RETENTION_DAYS" -gt 0 ]; then
  log "🧹 Removendo backups mais antigos que $RETENTION_DAYS dias..."
  
  # Encontra backups antigos (considera .sql e .sql.gz)
  OLD_BACKUPS=$(find "$BACKUP_DIR" -name "backup_*.sql*" -type f -mtime +$RETENTION_DAYS)
  
  if [ -n "$OLD_BACKUPS" ]; then
    echo "$OLD_BACKUPS" | while read -r old_backup; do
      log_warning "Removendo backup antigo: $(basename "$old_backup")"
      rm -f "$old_backup"
    done
    log_success "Limpeza concluída"
  else
    log "Nenhum backup antigo encontrado"
  fi
fi

# Lista backups disponíveis
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "backup_*.sql*" -type f | wc -l)
log_success "Backup concluído! Total de backups: $BACKUP_COUNT"

# Mostra últimos 5 backups
log "📋 Últimos backups:"
find "$BACKUP_DIR" -name "backup_*.sql*" -type f -printf "%T@ %p\n" | sort -rn | head -5 | while read -r timestamp file; do
  size=$(du -h "$file" | cut -f1)
  date=$(date -d "@$timestamp" +'%Y-%m-%d %H:%M:%S' 2>/dev/null || date -r "$timestamp" +'%Y-%m-%d %H:%M:%S' 2>/dev/null || echo "N/A")
  echo "   - $(basename "$file") ($size, $date)"
done

exit 0

