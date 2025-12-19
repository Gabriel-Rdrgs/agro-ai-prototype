# 🚂 Guia Completo: Configuração no Railway

Este guia explica como configurar todos os serviços do projeto no Railway, incluindo AI Service, Backup Worker e Scheduler Worker.

---

## 📋 Índice

1. [Backend](#backend)
2. [AI Service](#ai-service)
3. [Backup Worker](#backup-worker)
4. [Scheduler Worker](#scheduler-worker)
5. [Troubleshooting Comum](#troubleshooting-comum)

---

## 🚀 Backend

### Configuração Básica

1. **Criar Service no Railway**
   - "+ New" → "Add New Service" → "GitHub Repo"
   - Selecione o repositório `agro-ai-prototype`

2. **Configurar Build & Deploy**
   - **Root Directory:** `backend`
   - **Dockerfile Path:** `Dockerfile` (ou deixe vazio)
   - **Start Command:** `npm start` (ou `node server.js`)

3. **Variáveis de Ambiente OBRIGATÓRIAS**
   ```bash
   DATABASE_URL=postgresql://...
   DIRECT_URL=postgresql://...  # Preferível
   JWT_SECRET=...
   PYTHON_API_URL=https://seu-ai-service.railway.app  # URL do AI Service no Railway
   INTERNAL_API_KEY=...  # ⚠️ CRÍTICO: Mesma chave do AI Service
   PORT=3001
   ```

### ⚠️ IMPORTANTE: INTERNAL_API_KEY

**A variável `INTERNAL_API_KEY` DEVE estar configurada no Backend com o MESMO valor do AI Service.**

- **Por quê?** O Backend precisa enviar o header `X-Internal-API-Key` em todas as requisições ao AI Service
- **O que acontece se não configurar?** Todas as requisições ao AI Service retornarão `401 Unauthorized`
- **Como gerar?** Use uma string aleatória segura (ex: `openssl rand -hex 32`)

### Erro: "401 Unauthorized" ao chamar AI Service

**Sintomas:**
- Logs mostram: `❌ Requisição sem X-Internal-API-Key: GET /api/v1/weather/extreme-events`
- Todas as requisições ao AI Service retornam 401

**Solução:**
1. Verifique se `INTERNAL_API_KEY` está configurada no Backend
2. Verifique se `INTERNAL_API_KEY` está configurada no AI Service
3. **Ambas devem ter o MESMO valor**
4. Faça redeploy de ambos os serviços após configurar

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
2. **Dockerfile Path:** `Dockerfile` (ou deixe vazio - Railway detecta automaticamente)
3. **Start Command:** `python scripts/backup_worker.py --once`
4. **Variables:** `DATABASE_URL` ou `DIRECT_URL`

**Nota:** O `Dockerfile` na raiz é específico para o backup worker. Outros serviços usam seus próprios Dockerfiles em subdiretórios.

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
- **Backup Worker:** Root Directory = vazio, Dockerfile Path = `Dockerfile` (ou vazio)
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

### Backend
- [ ] Root Directory: `backend`
- [ ] Dockerfile Path: `Dockerfile` (ou vazio)
- [ ] Start Command: `npm start` (ou `node server.js`)
- [ ] Variables: `DATABASE_URL`, `JWT_SECRET`, `PYTHON_API_URL`, `INTERNAL_API_KEY` ⚠️
- [ ] **CRÍTICO:** `INTERNAL_API_KEY` deve ser igual ao AI Service

### AI Service
- [ ] Root Directory: `ai-service`
- [ ] Dockerfile Path: `Dockerfile` (ou vazio)
- [ ] Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- [ ] Variables: `DATABASE_URL`, `OPENAI_API_KEY`, `INTERNAL_API_KEY` ⚠️
- [ ] **CRÍTICO:** `INTERNAL_API_KEY` deve ser igual ao Backend

### Backup Worker
- [ ] Root Directory: vazio (ou `./`)
- [ ] Dockerfile Path: `Dockerfile` (ou vazio)
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

