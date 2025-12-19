# 💾 Guia de Backup PostgreSQL - Supabase

Este guia explica como usar os scripts de backup automatizado do banco de dados PostgreSQL (Supabase).

---

## 📋 Scripts Disponíveis

### 1. Script Bash (`backup_postgres.sh`)

**Localização:** `scripts/backup_postgres.sh`

**Requisitos:**
- `pg_dump` instalado (PostgreSQL client)
- Variáveis de ambiente: `DATABASE_URL` ou `DIRECT_URL`

**Uso:**
```bash
# Backup simples
./scripts/backup_postgres.sh

# Backup com compressão
./scripts/backup_postgres.sh --compress

# Backup com retenção de 14 dias
./scripts/backup_postgres.sh --retention 14

# Backup em diretório customizado
./scripts/backup_postgres.sh --dir /path/to/backups
```

### 2. Script Python (`backup_postgres.py`)

**Localização:** `scripts/backup_postgres.py`

**Requisitos:**
- Python 3.8+
- `pg_dump` instalado
- Variáveis de ambiente: `DATABASE_URL` ou `DIRECT_URL`

**Uso:**
```bash
# Backup simples
python scripts/backup_postgres.py

# Backup com compressão
python scripts/backup_postgres.py --compress

# Backup com retenção de 14 dias
python scripts/backup_postgres.py --retention 14

# Backup em diretório customizado
python scripts/backup_postgres.py --dir /path/to/backups
```

---

## 🔧 Configuração

### Variáveis de Ambiente

Adicione ao `.env`:

```bash
# URL de conexão do Supabase (prioriza DIRECT_URL para backups)
DIRECT_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
# OU
DATABASE_URL=postgresql://postgres:[PASSWORD]@[HOST]:5432/postgres
```

**Nota:** Use `DIRECT_URL` se disponível (porta 5432, sem pgbouncer) para backups mais confiáveis.

### Diretório de Backups

Por padrão, os backups são salvos em `./backups/` na raiz do projeto.

Para alterar:
```bash
export BACKUP_DIR=/path/to/backups
```

---

## 📅 Agendamento Automático

### Opção 1: Cron (Linux/macOS)

Edite o crontab:
```bash
crontab -e
```

Adicione linha para backup diário às 2h da manhã:
```cron
0 2 * * * cd /path/to/agro-ai-prototype && ./scripts/backup_postgres.sh --compress --retention 7
```

### Opção 2: Railway Job

1. Acesse Railway Dashboard
2. Crie um novo **Job** (não Service)
3. Configure:
   - **Command:** `./scripts/backup_postgres.sh --compress --retention 7`
   - **Schedule:** `0 2 * * *` (diário às 2h)
   - **Root Directory:** `./` (raiz do projeto)
   - **Environment Variables:** 
     - `DATABASE_URL` ou `DIRECT_URL`
     - `BACKUP_DIR` (opcional)

### Opção 3: GitHub Actions

Crie `.github/workflows/backup.yml`:

```yaml
name: Database Backup

on:
  schedule:
    - cron: '0 2 * * *'  # Diário às 2h UTC
  workflow_dispatch:  # Permite execução manual

jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup PostgreSQL Client
        run: |
          sudo apt-get update
          sudo apt-get install -y postgresql-client
      
      - name: Run Backup
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
        run: |
          chmod +x scripts/backup_postgres.sh
          ./scripts/backup_postgres.sh --compress --retention 7
      
      - name: Upload Backup
        uses: actions/upload-artifact@v3
        with:
          name: database-backup
          path: backups/*.sql.gz
          retention-days: 7
```

---

## 🔄 Restauração

### Restaurar Backup

```bash
# Backup não comprimido
psql "$DATABASE_URL" < backups/backup_20241219_020000.sql

# Backup comprimido
gunzip -c backups/backup_20241219_020000.sql.gz | psql "$DATABASE_URL"
```

### Restaurar em Banco Local (Desenvolvimento)

```bash
# Cria banco local
createdb agro_ai_dev

# Restaura backup
psql agro_ai_dev < backups/backup_20241219_020000.sql
```

---

## 📊 Retenção de Backups

Por padrão, o script mantém os últimos **7 dias** de backups.

Para alterar:
```bash
# Manter últimos 30 dias
./scripts/backup_postgres.sh --retention 30
```

Backups mais antigos são automaticamente removidos.

---

## 🗜️ Compressão

Backups comprimidos ocupam ~70-80% menos espaço.

**Exemplo:**
- Backup não comprimido: ~50 MB
- Backup comprimido: ~10-15 MB

Para habilitar compressão:
```bash
./scripts/backup_postgres.sh --compress
```

---

## 🔍 Verificação

### Listar Backups Disponíveis

```bash
ls -lh backups/
```

### Verificar Tamanho dos Backups

```bash
du -sh backups/
```

### Verificar Último Backup

```bash
ls -lt backups/ | head -5
```

---

## ⚠️ Troubleshooting

### Erro: "pg_dump não encontrado"

**Solução:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# macOS
brew install postgresql

# Docker
docker run --rm -v $(pwd)/backups:/backups postgres:latest \
  pg_dump "$DATABASE_URL" > /backups/backup.sql
```

### Erro: "DATABASE_URL não definida"

**Solução:**
1. Verifique se `.env` existe na raiz do projeto
2. Verifique se `DATABASE_URL` ou `DIRECT_URL` está definida
3. Exporte manualmente: `export DATABASE_URL="..."`

### Erro: "Connection refused" ou "Authentication failed"

**Solução:**
1. Verifique se a URL está correta
2. Verifique se as credenciais estão corretas
3. Use `DIRECT_URL` em vez de `DATABASE_URL` (porta 5432 em vez de 6543)

### Backup muito lento

**Causa:** Banco grande ou conexão lenta

**Solução:**
1. Use compressão: `--compress`
2. Execute em horários de menor tráfego
3. Considere backup incremental (futuro)

---

## 📈 Boas Práticas

1. **Backup Diário:** Configure para rodar diariamente
2. **Retenção:** Mantenha pelo menos 7 dias de backups
3. **Compressão:** Sempre use `--compress` para economizar espaço
4. **Teste de Restauração:** Teste restauração periodicamente
5. **Backup Offsite:** Considere copiar backups para S3/Google Drive
6. **Monitoramento:** Configure alertas se backup falhar

---

## 🔐 Segurança

- **Nunca commite backups no Git:** Adicione `backups/` ao `.gitignore`
- **Proteja variáveis de ambiente:** Não exponha `DATABASE_URL` publicamente
- **Criptografia:** Considere criptografar backups sensíveis
- **Acesso restrito:** Limite acesso ao diretório de backups

---

## 📚 Próximos Passos

- [ ] Integrar com S3/Google Cloud Storage
- [ ] Backup incremental (apenas mudanças)
- [ ] Notificações (email/Slack) em caso de falha
- [ ] Métricas de backup (tamanho, duração, sucesso/falha)
- [ ] Dashboard de status dos backups

---

**Última atualização:** Dezembro 2025

