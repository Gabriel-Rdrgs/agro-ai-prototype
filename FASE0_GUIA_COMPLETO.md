# 🏗️ FASE 0: Fundação Sólida - Guia Completo

**Status:** Em Progresso  
**Início:** Dezembro 2025

> **Este é o único arquivo de referência para a FASE 0.** Consolida toda a documentação necessária.

---

## 📋 ÍNDICE

1. [Tarefas Manuais (3 Passos)](#tarefas-manuais)
2. [Semana 1: Infraestrutura e Segurança](#semana-1)
3. [Semana 2: Observabilidade](#semana-2)
   - [📋 Guia Passo a Passo - Semana 2](#guia-semana-2)
4. [Semana 3: Dados Automatizados](#semana-3)
5. [Semana 4: Integrações Essenciais](#semana-4)

---

## 📋 GUIA SEMANA 2

Para instruções detalhadas passo a passo sobre como configurar Sentry e testar GitHub Actions, consulte:
- **`FASE0_SEMANA2_PASSOS_MANUAIS.md`** - Guia completo com todos os passos

---

## 🎯 TAREFAS MANUAIS (FAÇA PRIMEIRO)

### **1. Adicionar SUPABASE_SERVICE_ROLE_KEY ao .env**

1. **Supabase Dashboard** → Settings → API
2. Copie a chave `service_role` (não a `anon`)
3. Abra `backend/.env` e adicione:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY="cole-aqui-a-chave-completa"
   ```
4. Reinicie o backend

---

### **2. Aplicar Políticas RLS no Supabase**

1. **Supabase Dashboard** → SQL Editor
2. Abra: `backend/prisma/migrations/rls_policies_safe.sql`
3. Copie TODO o conteúdo (Ctrl+A, Ctrl+C)
4. Cole no SQL Editor do Supabase
5. Clique em **Run** (ou Ctrl+Enter)
6. Deve aparecer "Success. No rows returned"

**Nota:** A versão `_safe.sql` verifica se as tabelas existem antes de aplicar RLS.

---

### **3. Conectar Railway ao GitHub**

1. Acesse https://railway.app → Login with GitHub
2. **New Project** → Deploy from GitHub repo
3. Selecione `agro-ai-prototype`
4. Railway detecta Backend e AI Service automaticamente
5. Para cada serviço, vá em **Variables** e adicione:

**Backend:**
```
DATABASE_URL=<sua-connection-string>
DIRECT_URL=<sua-direct-connection-string>
SUPABASE_URL=<sua-supabase-url>
SUPABASE_ANON_KEY=<sua-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
PYTHON_API_URL=<url-do-ai-service>
PORT=3001
NODE_ENV=production
```

**AI Service:**
```
DATABASE_URL=<mesma-connection-string>
OPENAI_API_KEY=<sua-openai-key>
SUPABASE_URL=<sua-supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<sua-service-role-key>
```

6. Deploy automático após configurar variáveis

**Como obter DATABASE_URL:**
- Supabase Dashboard > Settings > Database > Connection string (URI)

---

## ✅ SEMANA 1: Infraestrutura e Segurança

### **1.1. Substituir authController.js por Supabase Auth** ✅

**Status:** ✅ COMPLETO

**Arquivos:**
- `backend/authController_supabase.js` (NOVO)
- `backend/utils/supabase.js` (ATUALIZADO - cliente admin)
- `backend/server.js` (ATUALIZADO)

**Próximo passo:** Adicionar `SUPABASE_SERVICE_ROLE_KEY` ao `.env` (ver tarefas manuais acima)

---

### **1.2. Ativar Row Level Security (RLS)** ✅

**Status:** ✅ SQL CRIADO

**Arquivo:** `backend/prisma/migrations/rls_policies_safe.sql`

**Como aplicar:** Ver tarefas manuais acima (passo 2)

**Políticas criadas para:**
- Opportunity, PriceHistory, User, RefreshToken, AuditLog
- documents, CeasaPrice, fuel_prices, IBGEProduction, market_prices, CeasaSyncLog

---

### **1.3. Deploy Automático Railway** ✅

**Status:** ✅ DOCUMENTAÇÃO CRIADA

**Como configurar:** Ver tarefas manuais acima (passo 3)

**Variáveis necessárias:** Ver seção acima

---

### **1.4. Variáveis de Ambiente** ✅

**Status:** ✅ DOCUMENTADO

**Backend (.env):**
```
DATABASE_URL, DIRECT_URL
SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
PYTHON_API_URL, PORT, NODE_ENV
SENTRY_DSN, SENTRY_RELEASE (FASE 0 - Semana 2)
LOG_LEVEL (FASE 0 - Semana 2)
```

**Frontend (.env.local):**
```
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
REACT_APP_API_URL
REACT_APP_SENTRY_DSN, REACT_APP_SENTRY_RELEASE (FASE 0 - Semana 2)
```

**AI Service (.env):**
```
DATABASE_URL
OPENAI_API_KEY
SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
```

**⚠️ IMPORTANTE:** NUNCA commitar arquivos `.env` com valores reais!

---

## ✅ SEMANA 2: Observabilidade e Qualidade

### **2.1. Instalar Sentry** ✅

**Status:** ✅ COMPLETO

**O que foi feito:**
- ✅ Instalado `@sentry/node` no backend
- ✅ Instalado `@sentry/react` no frontend
- ✅ Criado `backend/utils/sentry.js` (configuração backend)
- ✅ Criado `frontend/src/utils/sentry.js` (configuração frontend)
- ✅ Integrado no `backend/server.js` (middlewares e error handler)
- ✅ Integrado no `frontend/src/index.js` (inicialização)

**Próximos passos (manuais):**
📋 **Guia detalhado:** Consulte `FASE0_SEMANA2_PASSOS_MANUAIS.md`

**Resumo rápido:**
1. Criar conta em https://sentry.io
2. Criar projeto para Backend (Node.js) e copiar DSN
3. Criar projeto para Frontend (React) e copiar DSN
4. Adicionar DSNs aos `.env`:
   - Backend: `SENTRY_DSN=<dsn-do-backend>`
   - Frontend: `REACT_APP_SENTRY_DSN=<dsn-do-frontend>`
5. Reiniciar servidores
6. (Opcional) Configurar `SENTRY_RELEASE` para versionamento

**Arquivos criados/modificados:**
- `backend/utils/sentry.js` (NOVO)
- `frontend/src/utils/sentry.js` (NOVO)
- `backend/server.js` (ATUALIZADO - integração Sentry)
- `frontend/src/index.js` (ATUALIZADO - inicialização Sentry)

---

### **2.2. GitHub Actions (CI/CD)** ✅

**Status:** ✅ COMPLETO

**O que foi feito:**
- ✅ Criado `.github/workflows/test.yml`
- ✅ Pipeline configurado para:
  - Backend: ESLint (se configurado), validação Prisma
  - Frontend: ESLint, build de teste
  - Python: verificação de imports

**Próximos passos (manuais):**
📋 **Guia detalhado:** Consulte `FASE0_SEMANA2_PASSOS_MANUAIS.md`

**Resumo rápido:**
1. Fazer commit e push das mudanças
2. Verificar aba "Actions" no GitHub
3. Aguardar execução do pipeline (verde = sucesso)

**Arquivos criados:**
- `.github/workflows/test.yml` (NOVO)

---

### **2.3. Logging Estruturado** ✅

**Status:** ✅ COMPLETO

**O que foi feito:**
- ✅ Instalado `winston` no backend
- ✅ Criado `backend/utils/logger.js` (configuração completa)
- ✅ Integrado no `backend/server.js` (substituição de console.log/error)
- ✅ Formato JSON em produção, colorido em desenvolvimento
- ✅ Arquivos de log em `backend/logs/` (apenas produção)

**Características:**
- Níveis: error, warn, info, http, debug
- Console colorido em dev, JSON em produção
- Arquivos de log rotativos (5MB, 5 arquivos)
- Tratamento de exceções não capturadas

**Próximos passos:**
- (Opcional) Configurar `LOG_LEVEL` no `.env` (padrão: `debug` em dev, `info` em prod)

**Arquivos criados/modificados:**
- `backend/utils/logger.js` (NOVO)
- `backend/server.js` (ATUALIZADO - uso de logger)
- `backend/logs/.gitkeep` (NOVO - diretório de logs)

---

## ✅ SEMANA 3: Dados Climáticos Automatizados

### **3.1. Script Python para Open-Meteo** ✅

**Status:** ✅ COMPLETO

**O que foi feito:**
- ✅ Criado `ai-service/scripts/sync_weather_data.py`
- ✅ Script busca dados do Open-Meteo para todas as localizações únicas
- ✅ Salva dados no Postgres (tabela `weather_data`)
- ✅ Validação completa de dados antes de salvar
- ✅ Suporte para buscar dados de hoje e dias passados
- ✅ Tratamento de erros e logging detalhado

**Características:**
- Busca localizações únicas da tabela `Opportunity`
- Coleta: temperatura (max/min), precipitação, radiação, umidade, ET0
- Validação: coordenadas, temperaturas, precipitação, radiação, umidade
- Prevenção de duplicatas (ON CONFLICT)

**Arquivos criados:**
- `ai-service/scripts/sync_weather_data.py` (NOVO)

---

### **3.2. Job Agendado** ✅

**Status:** ✅ COMPLETO

**O que foi feito:**
- ✅ Criado `backend/utils/weatherSyncJob.js`
- ✅ Integrado no `backend/server.js`
- ✅ Configurado para executar diariamente às 2h da manhã (horário de Brasília)
- ✅ Rota admin para sincronização manual (`/api/admin/sync-weather`)
- ✅ Configurável via variáveis de ambiente

**Configuração:**
- **Schedule padrão:** `0 2 * * *` (2h da manhã)
- **Variável:** `WEATHER_SYNC_SCHEDULE` (customizável)
- **Desabilitar:** `ENABLE_WEATHER_SYNC=false`

**Arquivos criados/modificados:**
- `backend/utils/weatherSyncJob.js` (NOVO)
- `backend/server.js` (ATUALIZADO - integração do job)

---

### **3.3. Tabela no Banco de Dados** ✅

**Status:** ✅ COMPLETO

**O que foi feito:**
- ✅ Criado modelo `WeatherData` no `schema.prisma`
- ✅ Criada migration SQL (`20251214000000_add_weather_data`)
- ✅ Índices otimizados para consultas por localização e data
- ✅ Constraint único para evitar duplicatas

**Estrutura da tabela:**
- `lat`, `lng`, `date` (chave única)
- `temperature_max`, `temperature_min`
- `precipitation` (mm)
- `radiation_mj` (MJ/m²)
- `humidity_avg` (%)
- `et0` (Evapotranspiração de referência em mm)
- `source` (padrão: 'open-meteo')

**Arquivos criados/modificados:**
- `backend/prisma/schema.prisma` (ATUALIZADO - modelo WeatherData)
- `backend/prisma/migrations/20251214000000_add_weather_data/migration.sql` (NOVO)

---

## ⚠️ SEMANA 4: Integrações Essenciais

### **4.1. SoilGrids API**

**O que fazer:**
1. Integrar API REST do ISRIC
2. Endpoint: dados de solo via Lat/Long
3. Cachear resultados

**Status:** ⚠️ PENDENTE

---

### **4.2. ZARC API (MAPA)**

**O que fazer:**
1. Integrar API Dados Abertos (MAPA)
2. Ou baixar CSVs do Gov.br se API instável
3. Dados de janelas ideais de plantio

**Status:** ⚠️ PENDENTE

---

### **4.3. SIDRA (IBGE)**

**O que fazer:**
1. Integrar API do IBGE (SIDRA)
2. Dados de produção/safra (LSPA)

**Status:** ⚠️ PENDENTE (parcialmente implementado)

---

## 📝 NOTAS IMPORTANTES

- **Variáveis de ambiente:** Nunca commitar valores reais
- **RLS:** Testar após aplicar para garantir que funciona
- **Railway:** Deploy automático já funciona após configurar
- **Sentry:** Configurar antes de ir para produção

---

## 🚨 TROUBLESHOOTING

### **Erro: "relation does not exist"**
- Use `rls_policies_safe.sql` (verifica se tabela existe antes)

### **Erro: "SUPABASE_SERVICE_ROLE_KEY não encontrado"**
- Verifique se está no `.env` do backend
- Reinicie o servidor após adicionar

### **Railway: Deploy falha**
- Verifique logs
- Confirme que todas as variáveis estão configuradas
- Verifique se `DATABASE_URL` está correto

---

**Última atualização:** Dezembro 2025

