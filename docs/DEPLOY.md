# Deploy e Infraestrutura

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025

---

## 1. Visão Geral

O sistema é implantado em múltiplos serviços:

- **Backend (Node.js)**: Railway
- **AI Service (Python)**: Railway
- **Frontend (React)**: Vercel
- **Banco de Dados**: Supabase (PostgreSQL)

---

## 2. Configuração no Railway

### 2.1. Backend (Node.js)

#### Configuração Básica

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
   PYTHON_API_URL=https://seu-ai-service.railway.app
   INTERNAL_API_KEY=...  # ⚠️ CRÍTICO: Mesma chave do AI Service
   PORT=3001
   ```

#### Autenticação Interna

**A variável `INTERNAL_API_KEY` DEVE estar configurada no Backend com o MESMO valor do AI Service.**

- **Por quê?** O Backend precisa enviar o header `X-Internal-API-Key` em todas as requisições ao AI Service
- **O que acontece se não configurar?** Todas as requisições ao AI Service retornarão `401 Unauthorized`
- **Como gerar?** Use uma string aleatória segura (ex: `openssl rand -hex 32`)

#### Erro: "401 Unauthorized" ao chamar AI Service

**Sintomas:**
- Logs mostram: `❌ Requisição sem X-Internal-API-Key: GET /api/v1/weather/extreme-events`
- Todas as requisições ao AI Service retornam 401

**Solução:**
1. Verifique se `INTERNAL_API_KEY` está configurada no Backend
2. Verifique se `INTERNAL_API_KEY` está configurada no AI Service
3. **Ambas devem ter o MESMO valor**
4. Faça redeploy de ambos os serviços após configurar

### 2.2. AI Service (Python)

#### Configuração Básica

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
   INTERNAL_API_KEY=...  # ⚠️ CRÍTICO: Mesma chave do Backend
   GOOGLE_MAPS_API_KEY=...  # Opcional
   ENVIRONMENT=production
   PORT=8000
   ```

#### Erro: "Railpack could not determine how to build"

**Solução:**
- Configure **Root Directory** como `ai-service`
- O Railway detectará automaticamente o `Dockerfile` em `ai-service/Dockerfile`

#### Erro: "ImportError: cannot import name 'settings'"

**Solução:**
- Já corrigido no código (arquivo `config/settings.py` exporta `settings` diretamente)
- Faça commit e push das alterações mais recentes

### 2.3. Scheduler Worker

**Arquivo:** `ai-service/scripts/scheduler_worker.py`

**Configuração:**

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
   SCHEDULER_ENABLED=true
   ```

**Funcionalidades:**
- Executa ETLs periódicos (configurável)
- Sincroniza dados climáticos
- Não roda no mesmo processo do FastAPI (evita execução duplicada)

---

## 3. Configuração no Vercel (Frontend)

### 3.1. Deploy Inicial

1. **Conectar Repositório**
   - Acesse [Vercel](https://vercel.com)
   - Importe o repositório `agro-ai-prototype`

2. **Configurar Build**
   - **Root Directory:** `frontend`
   - **Build Command:** `npm run build`
   - **Output Directory:** `build`

3. **Variáveis de Ambiente**
   ```bash
   REACT_APP_API_URL=https://seu-backend.railway.app
   REACT_APP_MAP_TOKEN=seu_token_do_leaflet
   ```

### 3.2. Deploy Automático

- **Push para `main`**: Deploy automático em produção
- **Pull Requests**: Preview deployments automáticos

---

## 4. CI/CD (GitHub Actions)

### 4.1. Pipeline de Testes

**Arquivo:** `.github/workflows/test.yml`

**Execução:**
- Roda automaticamente em cada push/PR
- Testa backend (Jest), frontend (React Scripts), AI service (Pytest)

**Status:** [![Tests](https://github.com/Gabriel-Rdrgs/agro-ai-prototype/actions/workflows/test.yml/badge.svg)](https://github.com/Gabriel-Rdrgs/agro-ai-prototype/actions)

### 4.2. Deploy Automático

**Configuração:**
- Railway: Deploy automático via GitHub integration
- Vercel: Deploy automático via GitHub integration

---

## 5. Health Checks

### 5.1. Endpoints de Health Check

**Backend Node.js:**
- `GET /health` - Health check básico (rápido, para load balancers)
- `GET /health/detailed` - Health check completo (banco, serviços, APIs, recursos)

**Python AI Service:**
- `GET /health` - Health check básico
- `GET /health/detailed` - Health check completo
- `GET /health/database` - Verifica apenas banco
- `GET /health/services` - Verifica apenas serviços
- `GET /health/external` - Verifica apenas APIs externas

### 5.2. Monitoramento

**Railway:**
- Health checks automáticos
- Restart automático em caso de falha

**Vercel:**
- Health checks automáticos
- Notificações em caso de erro

---

## 6. Variáveis de Ambiente

### 6.1. Backend

| Variável | Obrigatória? | Descrição |
|----------|--------------|-----------|
| `DATABASE_URL` | ✅ Sim | URL de conexão PostgreSQL |
| `DIRECT_URL` | ⚠️ Recomendado | URL direta (sem pooler) |
| `JWT_SECRET` | ✅ Sim | Secret para JWT tokens |
| `PYTHON_API_URL` | ✅ Sim | URL do AI Service |
| `INTERNAL_API_KEY` | ✅ Sim | Chave compartilhada com Python |
| `PORT` | ⚠️ Opcional | Porta do servidor (padrão: 3001) |
| `SUPABASE_URL` | ✅ Sim | URL do Supabase |
| `SUPABASE_ANON_KEY` | ✅ Sim | Chave anônima do Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Sim | Chave service role do Supabase |
| `SENTRY_DSN` | ⚠️ Opcional | DSN do Sentry para monitoramento |

### 6.2. AI Service

| Variável | Obrigatória? | Descrição |
|----------|--------------|-----------|
| `DATABASE_URL` | ✅ Sim | URL de conexão PostgreSQL |
| `DIRECT_URL` | ⚠️ Recomendado | URL direta (sem pooler) |
| `OPENAI_API_KEY` | ✅ Sim | Chave OpenAI (para RAG) |
| `INTERNAL_API_KEY` | ✅ Sim | Chave compartilhada com Node.js |
| `GOOGLE_MAPS_API_KEY` | ⚠️ Opcional | Chave Google Maps (para distâncias precisas) |
| `ENVIRONMENT` | ⚠️ Opcional | Ambiente (development/production) |
| `PORT` | ⚠️ Opcional | Porta do servidor (padrão: 8000) |

### 6.3. Frontend

| Variável | Obrigatória? | Descrição |
|----------|--------------|-----------|
| `REACT_APP_API_URL` | ✅ Sim | URL do backend |
| `REACT_APP_MAP_TOKEN` | ⚠️ Opcional | Token do Leaflet |

---

## 7. Migrations do Banco

### 7.1. Rodar Migrations

**Desenvolvimento:**
```bash
cd backend
npx prisma migrate dev --name nome_da_migration
```

**Produção:**
```bash
cd backend
npx prisma migrate deploy
```

### 7.2. Seed do Banco

```bash
cd backend
node prisma/seed.js
```

---

## 8. Ingestão de PDFs no RAG

### 8.1. Executar Ingestão

**Local:**
```bash
cd ai-service
python services/rag_ingestion.py
```

**Docker:**
```bash
docker exec -it agro_brain python services/rag_ingestion.py
```

**Railway:**
1. Acesse Railway → AI Service → Console
2. Execute: `python services/rag_ingestion.py`

---

## 9. Troubleshooting

### 9.1. Erro: "Cannot connect to database"

**Causa:** `DATABASE_URL` inválida ou banco inacessível

**Solução:**
1. Verifique `DATABASE_URL` no Railway
2. Teste conexão: `psql $DATABASE_URL`
3. Verifique se Supabase está acessível

### 9.2. Erro: "401 Unauthorized" entre serviços

**Causa:** `INTERNAL_API_KEY` não configurada ou valores diferentes

**Solução:**
1. Verifique `INTERNAL_API_KEY` no Backend
2. Verifique `INTERNAL_API_KEY` no AI Service
3. **Ambas devem ter o MESMO valor**
4. Faça redeploy de ambos os serviços

### 9.3. Erro: "CORS blocked"

**Causa:** Origem não permitida no CORS

**Solução:**
1. Configure `ALLOWED_ORIGINS` no backend
2. Adicione domínio do Vercel na lista de origens permitidas

---

## 10. Referências

- [Guia Railway](./GUIA_RAILWAY.md) - Guia detalhado de configuração
- [Guia CI/CD](./GUIA_CI_CD.md) - Integração contínua e deploy
- [Guia Health Checks](./GUIA_HEALTH_CHECKS.md) - Monitoramento e health checks

---

**Última atualização:** Dezembro 2025

