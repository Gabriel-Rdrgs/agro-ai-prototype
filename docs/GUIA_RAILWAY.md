# 🚂 Guia Completo: Configuração no Railway

Este guia explica como configurar todos os serviços do projeto no Railway, incluindo AI Service, Backup Worker e Scheduler Worker.

---

## 📋 Índice

1. [AI Service](#ai-service)
2. [Backup Worker](#backup-worker)
3. [Scheduler Worker](#scheduler-worker)
4. [Troubleshooting Comum](#troubleshooting-comum)

---

## 🤖 AI Service

### Configuração Básica

1. **Criar Service no Railway**
   - "+ New" → "Add New Service" → "GitHub Repo"
   - Selecione o repositório `agro-ai-prototype`

2. **Configurar Build & Deploy**
   - **Root Directory:** `ai-service`
   - **Dockerfile Path:** `Dockerfile` (ou deixe vazio)
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`

3. **Variáveis de Ambiente**
   ```bash
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...  # Preferível
   OPENAI_API_KEY=sk-...
   INTERNAL_API_KEY=...
   ```

### Erro: "Railpack could not determine how to build"

**Solução:**
- Configure **Root Directory** como `ai-service`
- O Railway detectará automaticamente o `Dockerfile` em `ai-service/Dockerfile`

### Erro: "ImportError: cannot import name 'settings'"

**Solução:**
- Já corrigido no código (arquivo `config/settings.py` exporta `settings` diretamente)
- Faça commit e push das alterações mais recentes

---

## 💾 Backup Worker

Veja o [Guia Completo de Backup](./GUIA_BACKUP_RAILWAY.md) para detalhes.

### Configuração Rápida

1. **Root Directory:** Vazio (ou `./`)
2. **Dockerfile Path:** `Dockerfile.backup-worker`
3. **Start Command:** `python scripts/backup_worker.py --once`
4. **Variables:** `DATABASE_URL` ou `DIRECT_URL`

---

## ⏰ Scheduler Worker

### Configuração Básica

1. **Criar Service no Railway**
   - "+ New" → "Add New Service" → "GitHub Repo"
   - Selecione o repositório `agro-ai-prototype`

2. **Configurar Build & Deploy**
   - **Root Directory:** `ai-service`
   - **Dockerfile Path:** `Dockerfile` (mesmo do AI Service)
   - **Start Command:** `python scripts/scheduler_worker.py`

3. **Variáveis de Ambiente**
   ```bash
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...
   OPENAI_API_KEY=sk-...
   INTERNAL_API_KEY=...
   # Configurações do scheduler
   ETL_SCHEDULE_TIME=03:00
   WEATHER_SYNC_INTERVAL=3600
   ```

### Funcionalidades do Scheduler

- **ETL de Mercado:** Executa diariamente (configurável via `ETL_SCHEDULE_TIME`)
- **Sincronização de Clima:** Executa periodicamente (configurável via `WEATHER_SYNC_INTERVAL`)
- **Validação de Projeções:** Executa após ETLs

---

## 🔧 Troubleshooting Comum

### Erro: "Railpack could not determine how to build"

**Causa:** Root Directory não configurado ou Dockerfile não encontrado.

**Solução:**
- **AI Service / Scheduler:** Root Directory = `ai-service`
- **Backup Worker:** Root Directory = vazio, Dockerfile Path = `Dockerfile.backup-worker`
- **Backend:** Root Directory = `backend`

### Erro: "Dockerfile not found"

**Causa:** Dockerfile Path incorreto ou Root Directory incorreto.

**Solução:**
- Verifique se o Root Directory está correto
- Verifique se o Dockerfile Path está correto (ou deixe vazio se usar nome padrão `Dockerfile`)

### Erro: "ImportError" ou "ModuleNotFoundError"

**Causa:** Código desatualizado ou dependências faltando.

**Solução:**
- Faça commit e push das alterações mais recentes
- Verifique se todas as dependências estão no `requirements.txt`
- Faça redeploy do service

### Erro: "DATABASE_URL não configurado"

**Causa:** Variável de ambiente não definida.

**Solução:**
- Adicione `DATABASE_URL` ou `DIRECT_URL` nas variáveis de ambiente
- Use `DIRECT_URL` quando possível (porta 5432, sem pgbouncer)

---

## 📋 Checklist por Service

### AI Service
- [ ] Root Directory: `ai-service`
- [ ] Dockerfile Path: `Dockerfile` (ou vazio)
- [ ] Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Variables: `DATABASE_URL`, `OPENAI_API_KEY`, `INTERNAL_API_KEY`

### Backup Worker
- [ ] Root Directory: vazio (ou `./`)
- [ ] Dockerfile Path: `Dockerfile.backup-worker`
- [ ] Start Command: `python scripts/backup_worker.py --once`
- [ ] Variables: `DATABASE_URL` ou `DIRECT_URL`
- [ ] Cron Schedule configurado (se usar `--once`)

### Scheduler Worker
- [ ] Root Directory: `ai-service`
- [ ] Dockerfile Path: `Dockerfile` (ou vazio)
- [ ] Start Command: `python scripts/scheduler_worker.py`
- [ ] Variables: `DATABASE_URL`, `OPENAI_API_KEY`, `INTERNAL_API_KEY`

---

## 🔗 Referências

- [Guia de Backup no Railway](./GUIA_BACKUP_RAILWAY.md)
- [Railway Documentation](https://docs.railway.app)

