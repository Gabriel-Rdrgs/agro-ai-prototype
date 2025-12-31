# Backup e Restauração do Banco de Dados

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025

---

## 1. Visão Geral

O sistema possui scripts automatizados para backup do banco de dados PostgreSQL (Supabase), com suporte a compressão e retenção automática.

---

## 2. Scripts Disponíveis

### 2.1. Script Bash (`backup_postgres.sh`)

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

**Parâmetros:**
- `--compress`: Comprime backup com gzip (economiza ~70-80% de espaço)
- `--retention N`: Mantém apenas os últimos N backups (remove antigos automaticamente)
- `--dir PATH`: Diretório de destino (padrão: `backups/`)

### 2.2. Script Python (`backup_postgres.py`)

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

**Vantagens sobre Bash:**
- Melhor tratamento de erros
- Logging mais detalhado
- Validação de parâmetros

---

## 3. Backup Automático no Railway

### 3.1. Opções de Configuração

**Opção 1: Railway Cron Job** (Recomendado)

- Executa o backup uma vez por dia e termina
- Mais eficiente (não fica rodando 24/7)
- Ideal para backups diários

**Opção 2: Railway Service** (Alternativa)

- Roda continuamente e executa backups agendados
- Útil se precisar de múltiplos backups por dia
- Consome mais recursos

### 3.2. Configuração Passo a Passo

#### Passo 1: Criar Novo Service

1. No dashboard do Railway, vá para seu projeto
2. Clique em **"+ New"** → **"Add New Service"**
3. Escolha **"GitHub Repo"** e selecione o mesmo repositório (`agro-ai-prototype`)

#### Passo 2: Configurar Root Directory e Dockerfile

⚠️ **IMPORTANTE:** O Dockerfile do backup está na raiz como `Dockerfile.backup`

1. Vá em **"Settings"** do novo service
2. Na seção **"Build & Deploy"**, configure:
   - **Root Directory:** Deixe vazio (ou `./`) - código está na raiz
   - **Dockerfile Path:** `Dockerfile.backup` ⚠️ **CRÍTICO**
3. Clique em **"Save"**

#### Passo 3: Configurar Variáveis de Ambiente

**Variáveis OBRIGATÓRIAS:**
```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...  # Preferível para backups
```

**Variáveis OPCIONAIS:**
```bash
BACKUP_RETENTION_DAYS=7      # Padrão: 7 dias
BACKUP_COMPRESS=true         # Padrão: true
BACKUP_DIR=/app/backups      # Padrão: /app/backups
```

#### Passo 4: Configurar Cron Job (Opção 1)

1. Vá em **"Settings"** → **"Cron Schedule"**
2. Configure: `0 2 * * *` (2h da manhã, horário UTC)
3. **Start Command:** `python scripts/backup_postgres.py --compress --retention 7`

#### Passo 5: Verificar Funcionamento

1. Execute manualmente: **"Deploy"** → **"Redeploy"**
2. Verifique logs: **"Logs"** → Procure por `✅ Backup concluído`
3. Verifique arquivos: **"Files"** → `backups/` (se visível)

---

## 4. Restauração

### 4.1. Restaurar Backup Simples

```bash
# Descomprimir se necessário
gunzip backup_20251219_145005.sql.gz

# Restaurar
psql $DATABASE_URL < backup_20251219_145005.sql
```

### 4.2. Restaurar Backup no Supabase

1. Acesse Supabase Dashboard → Database → Backups
2. Selecione o backup desejado
3. Clique em **"Restore"**
4. Confirme a restauração

**⚠️ ATENÇÃO:** Restauração sobrescreve dados atuais. Faça backup antes de restaurar.

---

## 5. Funcionalidades

### 5.1. Compressão

- **Economia:** ~70-80% de espaço
- **Formato:** gzip (.sql.gz)
- **Ativação:** `--compress` ou `BACKUP_COMPRESS=true`

### 5.2. Retenção Automática

- **Funcionalidade:** Remove backups antigos automaticamente
- **Configuração:** `--retention N` ou `BACKUP_RETENTION_DAYS=N`
- **Padrão:** 7 dias

### 5.3. Logging Detalhado

- **Formato:** Timestamp, status, tamanho, duração
- **Arquivo:** `backup_postgres.log` (script Python)
- **Exemplo:**
  ```
  2025-12-19 14:50:05 - ✅ Backup concluído: backup_20251219_145005.sql.gz (45.2 MB, 12.3s)
  ```

---

## 6. Estrutura de Arquivos de Backup

### 6.1. Nomenclatura

```
backup_YYYYMMDD_HHMMSS.sql[.gz]
```

**Exemplo:**
- `backup_20251219_145005.sql` (não comprimido)
- `backup_20251219_145005.sql.gz` (comprimido)

### 6.2. Conteúdo

- Schema completo (tabelas, índices, extensões)
- Dados de todas as tabelas
- Extensões: PostGIS, pgvector
- Constraints e foreign keys

---

## 7. Monitoramento

### 7.1. Verificar Último Backup

```bash
# Listar backups
ls -lh backups/

# Verificar data do último backup
ls -lt backups/ | head -1
```

### 7.2. Verificar Tamanho dos Backups

```bash
# Tamanho total
du -sh backups/

# Tamanho individual
ls -lh backups/*.sql.gz
```

### 7.3. Verificar Logs

```bash
# Script Python
tail -f backup_postgres.log

# Script Bash
# Logs são exibidos no console
```

---

## 8. Troubleshooting

### 8.1. Erro: "pg_dump: command not found"

**Causa:** PostgreSQL client não instalado

**Solução:**
```bash
# Ubuntu/Debian
sudo apt-get install postgresql-client

# Mac
brew install postgresql

# Windows
# Baixar de: https://www.postgresql.org/download/windows/
```

### 8.2. Erro: "connection to server failed"

**Causa:** `DATABASE_URL` inválida ou banco inacessível

**Solução:**
1. Verifique `DATABASE_URL` no `.env`
2. Teste conexão: `psql $DATABASE_URL`
3. Verifique firewall/rede

### 8.3. Erro: "permission denied"

**Causa:** Sem permissão para escrever no diretório de backup

**Solução:**
```bash
# Criar diretório se não existir
mkdir -p backups/

# Dar permissão de escrita
chmod 755 backups/
```

### 8.4. Backup Muito Grande

**Causa:** Banco de dados grande ou sem compressão

**Solução:**
1. Use `--compress` para comprimir
2. Considere backup incremental (futuro)
3. Limpe dados antigos se necessário

---

## 9. Boas Práticas

### 9.1. Frequência de Backup

- **Produção:** Diário (recomendado)
- **Desenvolvimento:** Semanal ou antes de mudanças grandes
- **Crítico:** Antes de migrations ou alterações de schema

### 9.2. Retenção

- **Produção:** 7-14 dias (recomendado)
- **Desenvolvimento:** 3-7 dias
- **Crítico:** 30+ dias (backups importantes)

### 9.3. Validação

- **Teste restauração:** Periodicamente, valide que os backups podem ser restaurados
- **Verifique tamanho:** Backups muito pequenos podem indicar erro
- **Monitore logs:** Verifique se backups estão sendo executados corretamente

---

## 10. Referências

- [Guia Backup PostgreSQL](./GUIA_BACKUP_POSTGRES.md) - Guia detalhado do script
- [Guia Backup Railway](./GUIA_BACKUP_RAILWAY.md) - Configuração no Railway

---

**Última atualização:** Dezembro 2025

