# 📝 Templates de Variáveis de Ambiente

Este documento contém os templates para criar os arquivos `.env.example` em cada serviço.

## ⚠️ IMPORTANTE

Os arquivos `.env.example` estão no `.gitignore` para evitar commits acidentais.  
Crie manualmente os arquivos usando os templates abaixo.

---

## 🔵 Backend (.env.example)

Crie o arquivo: `backend/.env.example`

```env
# ============================================
# BACKEND - VARIÁVEIS DE AMBIENTE
# ============================================
# Copie este arquivo para .env e preencha com seus valores reais
# NUNCA commite o arquivo .env com valores reais!

# ============================================
# SERVIDOR
# ============================================
PORT=3001
NODE_ENV=development

# ============================================
# BANCO DE DADOS (PostgreSQL - Supabase)
# ============================================
# URL completa do Supabase (com pooling)
DATABASE_URL=postgresql://user:password@host:6543/database?pgbouncer=true
# URL direta (sem pooling) - para Python/SQLAlchemy
DIRECT_URL=postgresql://user:password@host:5432/database

# ============================================
# AUTENTICAÇÃO (Supabase)
# ============================================
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=sua_chave_anon_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_chave_service_role_aqui
JWT_SECRET=seu_jwt_secret_super_seguro_minimo_32_caracteres

# ============================================
# SERVIÇOS INTERNOS
# ============================================
# URL do serviço Python (AI Service)
PYTHON_API_URL=http://ai-service:8000
# Chave compartilhada entre Node.js e Python
INTERNAL_API_KEY=sua_chave_interna_super_segura_aqui

# ============================================
# APIs EXTERNAS
# ============================================
AWESOME_API_URL=https://economia.awesomeapi.com.br

# ============================================
# OBSERVABILIDADE (Sentry)
# ============================================
SENTRY_DSN=https://sua_chave@sentry.io/projeto
SENTRY_ENVIRONMENT=development

# ============================================
# JOBS E AGENDAMENTOS
# ============================================
# Sincronização de clima (cron expression)
WEATHER_SYNC_SCHEDULE=0 2 * * *
# Habilitar/desabilitar sincronização automática
ENABLE_WEATHER_SYNC=true

# ============================================
# ✅ FASE B - B2: SISTEMA DE ALERTAS
# ============================================
# Redis para fila de alertas
REDIS_URL=redis://redis:6379

# Telegram Bot (opcional)
TELEGRAM_BOT_TOKEN=seu_token_do_bot_telegram_aqui

# Twilio para WhatsApp (opcional)
TWILIO_ACCOUNT_SID=seu_account_sid_twilio
TWILIO_AUTH_TOKEN=seu_auth_token_twilio
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886

# Verificação de alertas (cron expression - padrão: a cada 30 minutos)
ALERT_CHECK_SCHEDULE=*/30 * * * *
# Habilitar/desabilitar verificação automática de alertas
ENABLE_ALERTS=true

# ============================================
# DEPLOY (Railway)
# ============================================
RAILWAY_STATIC_URL=https://seu-app.railway.app

# ============================================
# CORS (Opcional - para desenvolvimento)
# ============================================
# Se não definido, aceita origens com "agro-ai-prototype" ou "localhost"
ALLOWED_ORIGINS=https://agro-ai-prototype.vercel.app,http://localhost:3000
```

---

## 🐍 AI Service (.env.example)

Crie o arquivo: `ai-service/.env.example`

```env
# ============================================
# AI SERVICE (Python) - VARIÁVEIS DE AMBIENTE
# ============================================
# Copie este arquivo para .env e preencha com seus valores reais
# NUNCA commite o arquivo .env com valores reais!

# ============================================
# SERVIDOR
# ============================================
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
LOG_LEVEL=INFO

# ============================================
# BANCO DE DADOS (PostgreSQL - Supabase)
# ============================================
# URL direta (sem pooling) - Python/SQLAlchemy precisa de conexão direta
DATABASE_URL=postgresql://user:password@host:5432/database
# Alternativa: URL direta (prioridade sobre DATABASE_URL)
DIRECT_URL=postgresql://user:password@host:5432/database

# ============================================
# SEGURANÇA
# ============================================
# Chave compartilhada entre Node.js e Python
INTERNAL_API_KEY=sua_chave_interna_super_segura_aqui

# ============================================
# IA/ML (OpenAI)
# ============================================
OPENAI_API_KEY=sk-sua_chave_openai_aqui

# ============================================
# APIs EXTERNAS
# ============================================
AWESOME_API_URL=https://economia.awesomeapi.com.br
OPENMETEO_API_URL=https://api.open-meteo.com/v1/forecast
CEASA_API_BASE=
FUEL_API_URL=

# ============================================
# CONFIGURAÇÕES DE ML
# ============================================
# Dias de retenção de modelos Prophet
MODEL_RETENTION_DAYS=180
# Confiança mínima para previsões
MIN_CONFIDENCE=0.5
# Máximo de registros para análise
MAX_RECORDS=10000

# ============================================
# CACHE
# ============================================
# TTL do cache em segundos (padrão: 30 minutos)
CACHE_TTL_SECONDS=1800

# ============================================
# BACKEND (Node.js)
# ============================================
# URL do backend Node.js (opcional, para callbacks)
BACKEND_URL=http://backend:3001
```

---

## 📱 Frontend (.env.local.example)

Crie o arquivo: `frontend/.env.local.example`

```env
# ============================================
# FRONTEND (React) - VARIÁVEIS DE AMBIENTE
# ============================================
# Copie este arquivo para .env.local e preencha com seus valores reais
# NUNCA commite o arquivo .env.local com valores reais!
# 
# NOTA: No React, variáveis de ambiente devem começar com REACT_APP_

# ============================================
# AUTENTICAÇÃO (Supabase)
# ============================================
REACT_APP_SUPABASE_URL=https://seu-projeto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=sua_chave_anon_aqui

# ============================================
# APIs
# ============================================
# URL do backend Node.js
REACT_APP_API_URL=http://localhost:3001
# URL do serviço Python (AI Service) - opcional
REACT_APP_PYTHON_API_URL=http://localhost:8000

# ============================================
# OBSERVABILIDADE (Sentry)
# ============================================
REACT_APP_SENTRY_DSN=https://sua_chave@sentry.io/projeto
REACT_APP_SENTRY_RELEASE=1.0.0

# ============================================
# AMBIENTE
# ============================================
NODE_ENV=development
```

---

## 📋 Checklist de Criação

- [ ] Criar `backend/.env.example` (copiar template acima)
- [ ] Criar `ai-service/.env.example` (copiar template acima)
- [ ] Criar `frontend/.env.local.example` (copiar template acima)
- [ ] Verificar que `.gitignore` permite `.env.example` (mas bloqueia `.env`)
- [ ] Commitar os arquivos `.env.example`

---

## 🔍 Verificação

Após criar os arquivos, verifique:

```bash
# Backend
ls -la backend/.env.example

# AI Service
ls -la ai-service/.env.example

# Frontend
ls -la frontend/.env.local.example
```

---

**Fonte:** `PLANO_ACAO_CONSOLIDADO.md` - FASE A: A3

