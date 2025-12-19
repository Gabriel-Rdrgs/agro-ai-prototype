# 📋 PLANEJAMENTO COMPLETO - AGRO-AI PROTOTYPE

**Data de Criação:** Dezembro 2025  
**Última Atualização:** Dezembro 2025  
**Status:** Em Execução  
**Progresso Geral:** ~75%

> **Este é o ÚNICO arquivo de planejamento.** Consolida toda a estratégia, fases, semanas e progresso do projeto.

---

## 📊 ÍNDICE

1. [Visão Geral do Projeto](#visão-geral)
2. [Progresso por Fase](#progresso-por-fase)
3. [FASE 0: Fundação Sólida](#fase-0-fundacao-solida) ✅ **100% CONCLUÍDA**
4. [FASE 1: Funcionalidades Core](#fase-1-funcionalidades-core) ⚠️ **85% CONCLUÍDA**
5. [FASE 2: Inteligência Artificial](#fase-2-inteligencia-artificial) ⚠️ **80% CONCLUÍDA**
6. [FASE 3: Frontend e UX](#fase-3-frontend-e-ux) ⚠️ **70% CONCLUÍDA**
7. [FASE 4: Qualidade e Produção](#fase-4-qualidade-e-producao) ⚠️ **10% CONCLUÍDA**
8. [🧭 Plano Detalhado por Fase, Semana e Tarefas](#🧭-plano-detalhado-por-fase-semana-e-tarefas)
9. [Roadmap de Evolução Futura](#roadmap-evolucao-futura)

---

## 🎯 VISÃO GERAL DO PROJETO

O **agro-ai-prototype** é uma plataforma de inteligência agrícola para arbitragem, clima, logística e RAG em documentos técnicos.

### **Stack Técnico:**
- **Frontend:** React, Leaflet, Axios
- **Backend:** Node.js, Express, Prisma
- **IA:** Python, FastAPI, Prophet, OpenAI
- **Banco:** PostgreSQL (Supabase), PostGIS, pgvector
- **Deploy:** Railway, Vercel

### **Foco Atual:**
Tomate de mesa no Brasil, com base em PDFs técnicos (Embrapa, UFG, ZARC) e integrações CEASA/Agrolink/CONAB/IBGE.

---

## 📊 PROGRESSO POR FASE

| Fase | Status | Progresso | Prioridade |
|------|--------|-----------|------------|
| **FASE 0** | ✅ **CONCLUÍDA** | 100% | ✅ Base sólida estabelecida |
| **FASE 1** | ⚠️ **EM PROGRESSO** | 85% | 🔥 Alta - Core funcional |
| **FASE 2** | ⚠️ **EM PROGRESSO** | 80% | 🔥 Alta - IA e previsões |
| **FASE 3** | ⚠️ **EM PROGRESSO** | 70% | ⭐ Média - UX e visualizações |
| **FASE 4** | ⚠️ **PENDENTE** | 10% | ⭐ Média - Qualidade |

---

## ✅ FASE 0: FUNDAÇÃO SÓLIDA

**Status:** ✅ **100% CONCLUÍDA**  
**Período:** Dezembro 2025  
**Duração:** 4 Semanas

### **Objetivo:**
Estabelecer base técnica sólida: segurança, observabilidade, dados automatizados e integrações essenciais.

---

### **SEMANA 1: Infraestrutura e Segurança** ✅

#### ✅ **1.1. Supabase Auth**
- ✅ Criado `backend/authController_supabase.js`
- ✅ Migrado de JWT manual para Supabase Auth
- ✅ Cliente admin configurado (`SUPABASE_SERVICE_ROLE_KEY`)
- ✅ Integrado no `backend/server.js`

#### ✅ **1.2. Row Level Security (RLS)**
- ✅ SQL criado (`rls_policies_safe.sql`)
- ✅ Políticas para todas as tabelas principais
- ✅ Verificação condicional (evita erros se tabela não existe)
- ⚠️ **Pendente:** Aplicar no Supabase (tarefa manual)

#### ✅ **1.3. Deploy Automático Railway**
- ✅ Documentação criada
- ✅ Variáveis de ambiente documentadas
- ⚠️ **Pendente:** Configurar no Railway (tarefa manual)

#### ✅ **1.4. Variáveis de Ambiente**
- ✅ `.env.example` criado
- ✅ Documentação completa de variáveis
- ✅ Separação dev/prod

**Progresso Semana 1:** ✅ **100%** (implementação completa, pendências são manuais)

---

### **SEMANA 2: Observabilidade e Qualidade** ✅

#### ✅ **2.1. Sentry**
- ✅ `backend/utils/sentry.js` criado
- ✅ `frontend/src/utils/sentry.js` criado
- ✅ Integrado no backend (middlewares, error handler)
- ✅ Integrado no frontend (inicialização)
- ⚠️ **Pendente:** Configurar DSNs (tarefa manual)

#### ✅ **2.2. GitHub Actions (CI/CD)**
- ✅ `.github/workflows/test.yml` criado
- ✅ Pipeline para backend, frontend e Python
- ✅ Node.js 20, validação Prisma, ESLint
- ✅ Testes automáticos a cada push

#### ✅ **2.3. Logging Estruturado**
- ✅ `backend/utils/logger.js` criado (Winston)
- ✅ Formato JSON em produção, colorido em dev
- ✅ Rotação de logs (5MB, 5 arquivos)
- ✅ Integrado no `backend/server.js`

**Progresso Semana 2:** ✅ **100%** (implementação completa, pendências são manuais)

---

### **SEMANA 3: Dados Climáticos Automatizados** ✅

#### ✅ **3.1. Script Python para Open-Meteo**
- ✅ `ai-service/scripts/sync_weather_data.py` criado
- ✅ Busca dados para todas as localizações únicas
- ✅ Validação completa de dados
- ✅ Suporte para hoje e dias passados
- ✅ Cálculo de ET0 (Hargreaves)

#### ✅ **3.2. Job Agendado**
- ✅ `backend/utils/weatherSyncJob.js` criado
- ✅ Integrado no `backend/server.js`
- ✅ Configurado para 2h da manhã (horário de Brasília)
- ✅ Rota admin `/api/admin/sync-weather` (manual)
- ✅ Configurável via `WEATHER_SYNC_SCHEDULE`

#### ✅ **3.3. Tabela no Banco de Dados**
- ✅ Modelo `WeatherData` no `schema.prisma`
- ✅ Migration SQL criada (`20251214000000_add_weather_data`)
- ✅ Índices otimizados (lat/lng, date, lat/lng/date)
- ✅ Constraint único para evitar duplicatas
- ✅ Tabela criada e funcionando

**Progresso Semana 3:** ✅ **100%**

---

### **SEMANA 4: Integrações Essenciais** ✅

#### ✅ **4.1. SoilGrids API (ISRIC)**
- ✅ `ai-service/services/data_sync/soilgrids_service.py` criado
- ✅ Endpoint `/api/v1/soil/properties` (dados por Lat/Long)
- ✅ Endpoint `/api/v1/soil/summary` (resumo múltiplas profundidades)
- ✅ Cache com `@lru_cache` (100 localizações)
- ✅ Validação de dados
- ✅ Integrado no `ai-service/main.py`

#### ✅ **4.2. ZARC API (MAPA)**
- ✅ `ai-service/services/data_sync/zarc_service.py` criado
- ✅ Download automático de CSV do portal Dados Abertos
- ✅ Endpoint `/api/v1/zarc/planting-windows` (janelas de plantio)
- ✅ Endpoint `/api/v1/zarc/ideal-period` (período ideal)
- ✅ Cache com `@lru_cache` (100 consultas - aumentado)
- ✅ Cache persistente de CSV (24h TTL)
- ✅ Múltiplas URLs de fallback para CSV
- ✅ Normalização de nomes de produtos
- ✅ **Fallback para `calendar.py` quando CSV não disponível** 🔄
- ✅ Integrado no `ai-service/main.py`
- ✅ Proxy route no backend Node.js com autenticação JWT

#### ✅ **4.3. IBGE SIDRA**
- ✅ `ai-service/services/data_sync/ibge_scraper.py` (já existia - ETL completo)
- ✅ `ai-service/routers/production.py` criado (endpoints REST)
- ✅ Endpoint `/api/v1/production/data` (dados de produção)
- ✅ Endpoint `/api/v1/production/summary` (resumo últimos anos)
- ✅ Integrado no `ai-service/main.py`

**Progresso Semana 4:** ✅ **100%**

---

### **📦 ENTREGAS DA FASE 0**

**Arquivos Criados (10):**
1. `backend/utils/sentry.js`
2. `backend/utils/logger.js`
3. `backend/utils/weatherSyncJob.js`
4. `ai-service/scripts/sync_weather_data.py`
5. `ai-service/services/data_sync/soilgrids_service.py`
6. `ai-service/services/data_sync/zarc_service.py`
7. `ai-service/routers/soil.py`
8. `ai-service/routers/zarc.py`
9. `ai-service/routers/production.py`
10. `backend/prisma/migrations/20251214000000_add_weather_data/migration.sql`

**Endpoints Criados (5):**
- `/api/v1/soil/properties`
- `/api/v1/soil/summary`
- `/api/v1/zarc/planting-windows`
- `/api/v1/zarc/ideal-period`
- `/api/v1/production/data`

**Integrações (3):**
- SoilGrids (ISRIC)
- ZARC (MAPA)
- IBGE SIDRA

---

## ⚠️ FASE 1: FUNCIONALIDADES CORE

**Status:** ⚠️ **85% CONCLUÍDA**  
**Prioridade:** 🔥 **ALTA**

### **✅ Completo:**
- ✅ Docker Compose configurado
- ✅ PostgreSQL + PostGIS + pgvector funcionando
- ✅ Arquitetura de microsserviços (Node.js + Python)
- ✅ Autenticação JWT + Refresh Tokens
- ✅ Middleware RBAC (`checkRole`)
- ✅ Modelo `AuditLog` no banco
- ✅ **ETL CONAB** (implementado com projeções)
- ✅ **ETL IBGE** (implementado)
- ✅ **ETL CEASA-PR e Agrolink** (funcionando)
- ✅ **Performance otimizada** (cache agressivo, async ETL, batch processing)
- ✅ **ROI unificado** (cálculo completo em toda aplicação)
- ✅ **Otimizações de performance** (cache de 12h, sessionStorage, retry logic)

### **⚠️ Pendente:**
- ⚠️ Aplicar RBAC em todas as rotas administrativas (2-3 horas)
- ⚠️ Backup automático (2-3 horas)

---

## ⚠️ FASE 2: INTELIGÊNCIA ARTIFICIAL

**Status:** ⚠️ **80% CONCLUÍDA**  
**Prioridade:** 🔥 **ALTA**

### **✅ Completo:**
- ✅ FastAPI Python configurado
- ✅ **Prophet implementado** (`price_forecast.py`)
- ✅ Conexão Python ↔ PostgreSQL
- ✅ Cache em memória (LRU) + cache agressivo (12h para clima)
- ✅ Algoritmo de risco climático básico
- ✅ **Storage Advisor** (qualidade, shelf-life)
- ✅ **Arbitrage Calculator** (ROI completo)
- ✅ **Climate Intelligence** (dados históricos, eventos extremos)
- ✅ **Calendar** (época de plantio/colheita)
- ✅ **Supply Risk Analyzer** (regiões comprometidas)
- ✅ **Extreme Events Detector** (granizo, ciclones, ondas de calor/frio)
- ✅ **Projeções futuras corrigidas** (ROI completo)
- ✅ **Sistema de recomendação** (compra/não compra)
- ✅ **RAG Básico** (OpenAI Embeddings + pgvector + gpt-4o-mini)

### **⚠️ Pendente:**
- ⚠️ **Integrar Prophet no `/batch`** (substituir valores fixos) - **REQUISITO CLIENTE** 🔥
- ⚠️ Validação de modelos Prophet (backtesting)
- ⚠️ Redis para cache distribuído (opcional, futuro)

---

## ⚠️ FASE 3: FRONTEND E UX

**Status:** ⚠️ **70% CONCLUÍDA**  
**Prioridade:** ⭐ **MÉDIA**

### **✅ Completo:**
- ✅ Mapa Leaflet integrado
- ✅ Dashboard com gráficos básicos
- ✅ Visualização de oportunidades
- ✅ **Modal com abas criado** (`OpportunityModal.jsx`)
- ✅ **FinancialTab** (funcionando)
- ✅ **QualityTab** (preenchido com dados do Python)
- ✅ **ClimateTab** (preenchido com dados do Python)
- ✅ **AITab** (preenchido com recomendações)
- ✅ **Filtros avançados no sidebar** (ROI, estado, risco, chuva, produto, época de plantio)
- ✅ **Regiões Comprometidas** (heatmap com GeoJSON)
- ✅ **Sistema de cache no frontend** (sessionStorage)
- ✅ **Otimizações de performance** (batches, retry logic, timeouts ajustados)

### **⚠️ Pendente:**
- ⚠️ **Comparação de chuva visual** (ano anterior vs. atual) - melhorar visualização
- ⚠️ **Exibir eventos extremos no mapa** (badges nos marcadores)
- ⚠️ **Exibir como colhe cada região** (melhorar visualização no ClimateTab)
- ⚠️ Filtros mais avançados (safra, época de plantio) - parcialmente implementado
- ⚠️ Conexão completa com dados preditivos no Dashboard
- ⚠️ Gerador de relatórios PDF (no Plano Expandido - Semana 10)
- ⚠️ PWA Completo (notificações push) - ver "Funcionalidades Adicionais"

---

## ⚠️ FASE 4: QUALIDADE E PRODUÇÃO

**Status:** ⚠️ **10% CONCLUÍDA**  
**Prioridade:** ⭐ **MÉDIA**

### **✅ Completo:**
- ✅ Logging estruturado (parcial - backend)

### **⚠️ Pendente:**
- ⚠️ Testes unitários (Jest/Pytest)
- ⚠️ Testes de carga
- ⚠️ Security scan completo
- ⚠️ Backup automático

---

## 🧭 PLANO DETALHADO POR FASE, SEMANA E TAREFAS

> **Esta é a linha do tempo única do projeto.**  
> Organização: **FASE → SEMANA → TAREFAS**.  
> Use as checkboxes `[ ] / [x]` para marcar o progresso.

---

### 🧱 FASE 1 – Core + Requisitos Críticos (Semanas 1–4)

**Objetivo da Fase 1:**  
Garantir que o **MVP esteja sólido**, com previsões funcionando, ROI consistente, mapa utilizável e experiência mínima agradável para o cliente.

#### 🗓️ Semana 1 – Requisitos Críticos do Cliente 🔥

- **1.1. Melhorias Visuais Imediatas**
  - [x] Melhorar visualização de comparação de chuva (ano anterior vs. atual) - Cards com gradiente, alertas para variações >30%
  - [x] Adicionar badges de eventos extremos no mapa (granizo, ciclones, etc.) - Pré-carregamento para 10 primeiras oportunidades visíveis
  - [x] Melhorar exibição de safra no `ClimateTab` - Integração ZARC com fallback para calendar.py implementada
  - [x] Correção de sintaxe no `ClimateTab.jsx` (aspa extra removida)

- **1.2. Integrar Prophet no `/batch`** 🔥 **PRIORIDADE MÁXIMA** ✅ **CONCLUÍDO**
  - [x] Garantir que `price_forecast_service` (Prophet + fallback) seja a fonte de verdade dos preços futuros no `/batch`
  - [x] Garantir que **não haja valores fixos** (+2%/+8%) dominando o resultado (apenas fallback rápido)
  - [x] Adicionar logs e métricas para rastrear percentual de chamadas usando Prophet vs fallback
  - [x] Validar datasets suficientes (rodar ETLs e `backfill_history.py` se necessário) - ✅ Validado: 496 registros, 154 dias de cobertura
  - [x] Testar com múltiplas regiões e produtos - ✅ Prophet funcionando corretamente para Tomate (todas regiões e SP)
  - [x] Atualizar documentação marcando requisito como concluído

- **1.3. Segurança e Infraestrutura** 🔒 **CRÍTICO**
  - [x] Revisar segurança do serviço Python (FastAPI)
  - [x] Adicionar middleware de autenticação no FastAPI (API key compartilhada entre Node ↔ Python)
  - [x] Garantir que Python não esteja exposto publicamente sem proteção (networking privado ou shared secret)
  - [x] Restringir CORS do Brain para origens específicas em produção (ler de `ALLOWED_ORIGINS` env)
  - [x] Endurecer RBAC: revisar todas as rotas `/api/admin/*` e garantir `checkRole(['admin'])` onde necessário
  - [x] Implementar uso efetivo de `AuditLog` para ações críticas (ETL, recálculo de ROI, correções de dados, sincronização de clima)

- **1.4. Formalização de Configuração**
  - [x] Criar `.env.example` completo para `backend/` (todas as variáveis necessárias sem valores reais)
  - [x] Criar `.env.example` completo para `ai-service/` (todas as variáveis necessárias sem valores reais)
  - [x] Criar `.env.example` completo para `frontend/` (todas as variáveis necessárias sem valores reais)
  - [x] Consolidar documentação de variáveis de ambiente em seção única (evitar duplicação entre README e PLANEJAMENTO)

- **1.5. Limpeza de Dados Legados**
  - [x] Criar script de migração definitiva: converter todos os preços legados (`Opportunity`, `CeasaPrice`) de caixa para R$/kg
  - [x] Executar migração em ambiente de desenvolvimento primeiro
  - [x] Remover normalizações defensivas (>20 → caixa→kg) do Node e Python após migração (ou deixar apenas como salvaguarda com log)
  - [x] Validar que todos os novos dados já entram no padrão R$/kg (padrão estabelecido)

- **1.6. Integração RAG com Frontend** 🤖 **CONCLUÍDO**
  - [x] Conectar chat RAG ao frontend via proxy no backend (`/api/ai/chat/query`)
  - [x] Corrigir rota de API no frontend para usar backend Node.js (não chamar Python diretamente)
  - [x] Ingestão dos 3 PDFs de tomate no banco vetorial com metadata rica (`theme`, `crop`, `source_type`)
  - [x] Script de ingestão funcionando dentro do container Docker
  - [x] Chat RAG testado e funcionando end-to-end

- **1.7. Validação Prophet** 📊 ✅ **CONCLUÍDO**
  - [x] Criar script de validação (`validate_prophet_data.py`) para verificar datasets suficientes
  - [x] Criar guia de uso (`docs/GUIA_VALIDACAO_PROPHET.md`)
  - [x] Rodar validação e confirmar Prophet funcionando - ✅ Validado: Prophet ativo e gerando previsões corretas
  - [x] Corrigir script de validação (campo `forecast_model` em vez de `model_type`)

- **1.8. Polimento e Testes**
  - [ ] Ajustes visuais finais no mapa e tabs
  - [ ] Testes de usabilidade (mapa + simulador + clima)
  - [ ] Correções de bugs encontrados

---

#### 🗓️ Semana 2 – UX, Performance e Filtros Avançados

- **2.1. Filtros Avançados (Mapa + Sidebar)** ✅ **CONCLUÍDO**
  - [x] Completar filtro por safra (usar lógica unificada) - ✅ Implementado via getPlantingSeasonStatus()
  - [x] Completar filtro por época de plantio (ZARC/Calendar) - ✅ Implementado com plantingCalendar.js
  - [x] Implementar "filtros salvos" (pelo menos em `localStorage`/`sessionStorage`) - ✅ Filtros salvos em localStorage, carregados automaticamente

- **2.2. Arquitetura: Extrair Scheduler de ETL** ✅ **CONCLUÍDO**
  - [x] Mover lógica `schedule.run_pending()` de `ai-service/main.py` para script separado (`ai-service/scripts/scheduler_worker.py`)
  - [x] Criar worker dedicado com logging estruturado e tratamento de erros
  - [x] Remover scheduler inline do `main.py` (FastAPI agora apenas request/response)
  - [x] Documentar processo de agendamento de ETLs (`docs/RAILWAY_SCHEDULER_WORKER.md`)
  - [x] Configurar job agendado no Railway - ✅ Worker rodando em produção (Root Directory = ai-service)

- **2.3. Otimizações Backend/Frontend** ✅ **CONCLUÍDO**
  - [x] Otimizar queries geoespaciais (índices, limites de resultados) - ✅ Limites adicionados em todas as queries (max 1000 oportunidades, 500 CEASA, etc.)
  - [x] Melhorar tratamento de erros (mensagens amigáveis + logs claros) - ✅ Mensagens amigáveis implementadas, detalhes apenas em dev
  - [x] Completar logging estruturado onde ainda faltar (usar `logger.js`) - ✅ console.log/error substituídos por logger em routes/ceasa.js

---

#### 🗓️ Semana 3 – Produção, Qualidade e Confiabilidade

- **3.1. Backup e Monitoramento**
  - [ ] Script de backup PostgreSQL (dump automatizado)
  - [ ] Agendamento automático (cron/Job no Railway)
  - [ ] Health checks melhorados (incluindo Python/Supabase)

- **3.2. Validação Prophet e Testes de IA**
  - [ ] Script de backtesting (comparar previsão vs. realidade histórica)
  - [ ] Validar previsões com dados históricos (erro médio, desvio)
  - [ ] Ajustar hiperparâmetros se necessário
  - [x] **Testes de integração Pytest para Prophet:** ✅ **CONCLUÍDO E VALIDADO**
    - [x] Testar `price_forecast_service.forecast` com dados sintéticos - ✅ 8 testes criados e **TODOS PASSANDO**
    - [x] Validar comportamento Prophet vs fallback em diferentes cenários - ✅ Testes de fallback implementados e validados
    - [x] Testar cache LRU do Prophet - ✅ Teste de cache implementado e validado
    - [x] **Cobertura:** `price_forecast.py` - **60%** ✅
  - [x] **Testes de integração Pytest para RAG:** ✅ **CONCLUÍDO E VALIDADO**
    - [x] Validar ingestão de PDF de tomate (`rag_ingestion.py`) - ✅ Estrutura criada (requer dados reais)
    - [x] Testar que consultas típicas retornam chunks adequados (`rag_service.py`) - ✅ 7 testes criados e **TODOS PASSANDO**
    - [x] Validar tratamento de erros (quota, rate-limit, API key inválida) - ✅ Testes de tratamento de erros implementados e validados
    - [x] **Cobertura:** `rag_service.py` - **85%** ✅
    - [ ] Testar endpoint `/api/v1/chat/query` end-to-end (próximo passo: testes de integração HTTP)

- **3.3. Testes de Backend Node** ✅ **CONCLUÍDO E VALIDADO**
  - [x] Adicionar suíte Jest para endpoints críticos (`/api/ai/batch`, `/api/opportunities`, `/api/ai/chat/query`) - ✅ 21 testes criados e **TODOS PASSANDO**
  - [x] Testes de validação, sanitização, cache, limites, tratamento de erros - ✅ Implementados e validados
  - [x] Testes de integração para autenticação e RBAC - ✅ 20 testes criados e **TODOS PASSANDO**
    - [x] Testes de `verifyToken` (validação de token JWT via Supabase) - ✅ 5 testes
    - [x] Testes de `checkRole` (verificação de roles admin/user/moderator) - ✅ 6 testes
    - [x] Testes de rotas protegidas com RBAC (`/api/admin/etl/start`, `/api/auth/register`) - ✅ 7 testes
    - [x] Testes de tratamento de erros e edge cases - ✅ 2 testes
  - [ ] Integrar testes no GitHub Actions (já existe workflow)

- **3.4. Documentação Essencial**
  - [ ] Atualizar `README` principal
  - [ ] Documentar APIs principais (pelo menos via md ou Swagger básico)
  - [ ] Criar guia de uso para cliente (fluxo principal da aplicação)
  - [ ] Documentar contrato único de schema para tabela `documents` (evitar drift entre Prisma/SQLAlchemy)

---

#### 🗓️ Semana 4 – Preparação para Evolução e Tendências

- **4.1. Dashboard de Tendências de Mercado**
  - [ ] Backend – Endpoint de tendências (médias móveis, direção do preço)
  - [ ] Frontend – Gráficos de tendência com filtros de período

- **4.2. Novo Mapa (Pesquisa + Protótipo)**
  - [ ] Pesquisar Google Maps API (recursos, custos, limitações)
  - [ ] Planejar migração de Leaflet para Google Maps (arquitetura, camadas)
  - [ ] Criar protótipo básico com Google Maps (sem substituir o mapa atual ainda)

---

### 🤖 FASE 2 – Inteligência de Mercado e Análises (Semanas 5–8)

**Objetivo da Fase 2:**  
Sair do “só previsão de preço” para um **radar de mercado completo**, com histórico, correlação, oferta/demanda e canais de comunicação.

#### 🗓️ Semana 5 – Histórico de Decisões e ROI Realizado

- [ ] Criar tabela `decisions` (decisão, data, ROI esperado, ROI realizado)
- [ ] Migration no Prisma e relações com `User`/`Opportunity`
- [ ] API de decisões (salvar, atualizar ROI realizado, listar histórico)
- [ ] Interface de decisões (botão "Decidir", dashboard de histórico e acurácia)
- [ ] **Painel de Qualidade do Modelo:**
  - [ ] Endpoint Python de backtesting automático (Prophet e recomendações)
  - [ ] Cálculo de acurácia histórica: ROI esperado vs ROI realizado por produto/estado
  - [ ] Frontend: Gráficos de acurácia e métricas de qualidade (MAE, RMSE, MAPE)
  - [ ] Dashboard de "confiança do modelo" para cada previsão

---

#### 🗓️ Semana 6 – Correlação entre Regiões e Explicabilidade

- [ ] Backend – Cálculo de correlação de preços entre regiões (`/api/v1/correlation/regions`)
- [ ] Frontend – Matriz de correlação (heatmap) e/ou gráfico de rede
- [ ] Integração com recomendações (usar correlação no motor de decisão)
- [ ] **Explicabilidade de ROI:**
  - [ ] Backend Python: Decompor ROI em componentes (frete, produção, quebra técnica, taxas CEASA)
  - [ ] Endpoint `/api/v1/calc/roi/breakdown` retorna "feature importance" qualitativa
  - [ ] Frontend: Exibir breakdown visual (gráfico de pizza ou barras) mostrando impacto de cada componente
  - [ ] Tooltip explicativo: "Frete responde por 45% do custo total", "Quebra técnica impacta em X%"
- [ ] **RAG Orientado a Tarefas:**
  - [ ] Criar modos de consulta especializados: "Planejamento de plantio", "Manejo de risco climático", "Pós-colheita/armazenagem"
  - [ ] Cada modo filtra documentos por metadata (`theme`, `crop`, `region`) antes da busca vetorial
  - [ ] Endpoint `/api/v1/chat/query` aceita parâmetro `mode` (opcional)
  - [ ] Frontend: Botões de modo rápido no chat agronômico

---

#### 🗓️ Semana 7 – Previsão de Oferta e Demanda

- [ ] Backend – Serviço de previsão de oferta e demanda (`/api/v1/supply-demand/forecast`)
- [ ] Integração com dados CONAB + IBGE
- [ ] Gráfico oferta vs. demanda projetada + alertas de desequilíbrio
- [ ] **Feature Flagging:**
  - [ ] Criar tabela `FeatureFlags` no Prisma (nome, habilitado, descrição)
  - [ ] Endpoint admin para gerenciar flags (`/api/admin/feature-flags`)
  - [ ] Middleware no backend Node e Python para verificar flags antes de executar features
  - [ ] Flags iniciais: `rag_enabled`, `supply_risk_enabled`, `prophet_enabled`, `extreme_events_enabled`
  - [ ] Frontend: Condicionalmente renderiza features baseado em flags (permite experimentar sem quebrar demo)
- [ ] **Melhorias no RAG:**
  - [ ] Adicionar campos de metadata mais ricos (`crop`, `theme`, `region`, `source_type`) na ingestão
  - [ ] Endpoint `/api/v1/chat/debug-query` para inspeção (retorna chunks sem chamar LLM)
  - [ ] Melhorar chunking: respeitar seções/capítulos em PDFs densos
  - [ ] Reranking simples: priorizar chunks com termos-chave relevantes à pergunta

---

#### 🗓️ Semana 8 – Alertas Inteligentes + WhatsApp

- [ ] Completar sistema de alertas (backend + frontend)
- [ ] Tela de configuração de alertas (ROI, preço, risco, clima)
- [ ] Integração WhatsApp Business (envio/recebimento + comandos básicos)

---

### 📊 FASE 3 – Visualização Avançada e Analytics (Semanas 9–12)

**Objetivo da Fase 3:**  
Transformar o sistema num **painel visual rico**, com mapas, timelines e relatórios executivos.

#### 🗓️ Semana 9 – Mapa de Calor de Preços

- [ ] Backend – Agregação de preços por região (média, mediana) e endpoint `/api/v1/prices/heatmap`
- [ ] Frontend – Heatmap no mapa (cores de preço, tooltip, filtros)

---

#### 🗓️ Semana 10 – Timeline de Eventos

- [ ] Backend – Endpoint de agregação de eventos (clima, preço, alertas)
- [ ] Frontend – Componente de timeline com filtros e detalhamento

---

#### 🗓️ Semana 11 – Relatórios PDF Automáticos

- [ ] Backend – Geração de PDF (pdfkit/puppeteer) + agendamento/envio
- [ ] Frontend – Tela de configuração de relatórios (produtos, regiões, periodicidade)

---

#### 🗓️ Semana 12 – Recomendação Personalizada por Perfil

- [ ] Backend – Engine de preferências (perfis: conservador, moderado, agressivo)
- [ ] Aprendizado com histórico de decisões
- [ ] Frontend – Dashboard adaptado ao perfil do usuário

---

### 💬 FASE 4 – Experiência Conversacional e Mobile (Semanas 13–16)

**Objetivo da Fase 4:**  
Levar a experiência para **chat + mobile**, aproximando ainda mais do dia a dia do produtor.

#### 🗓️ Semana 13 – Chatbot de Decisão (Web)

- [ ] Backend – Lógica de análise usando RAG + dados em tempo real
- [ ] Frontend – Interface de chat (histórico, sugestões de perguntas)

---

#### 🗓️ Semana 14 – Dados de Trânsito em Tempo Real

- [ ] Integração Google Maps Distance Matrix API
- [ ] Cálculo de frete baseado em distância/tempo real
- [ ] Exibição no mapa e nas oportunidades

---

#### 🗓️ Semanas 15–16 – App Mobile (React Native)

- [ ] Criar projeto React Native e integrar com APIs
- [ ] Funcionalidades principais (login, dashboard, mapa simplificado, alertas)
- [ ] Deploy iOS/Android (TestFlight/Google Play) e testes em dispositivos reais

---

## ⚠️ FUNCIONALIDADES ADICIONAIS (Futuro - Após 16 Semanas)

> **Nota:** Estas funcionalidades foram sugeridas mas não estão no plano de 16 semanas. Podem ser implementadas conforme necessidade e prioridade.

### **Análise de Sentimento de Mercado** ⭐⭐⭐
**Impacto:** MÉDIO | **Esforço:** ALTO (5-7 dias)

- [ ] Scraping de notícias agrícolas (Agrolink, Globo Rural)
- [ ] Análise de sentimento (positivo/negativo)
- [ ] Correlacionar com movimentos de preço

**Por que é útil:**
- Antecipa movimentos de preço baseado em notícias
- Ex: "Notícia de geada em SP → preço deve subir"

---

### **Integração com Sistemas de Gestão (ERP)** ⭐⭐⭐⭐
**Impacto:** ALTO | **Esforço:** ALTO (1-2 semanas)

- [ ] API para integrar com ERPs agrícolas
- [ ] Sincronizar: compras, vendas, estoque
- [ ] ROI calculado com dados reais do ERP

**Por que é útil:**
- Automação completa: não precisa digitar dados
- Decisões baseadas em dados reais (não estimativas)

---

### **PWA Completo (Notificações Push)** ⭐⭐⭐⭐
**Impacto:** ALTO | **Esforço:** BAIXO (1-2 dias)

- [ ] Service Worker completo
- [ ] Manifest.json
- [ ] Notificações push no navegador
- [ ] Instalação como app (Add to Home Screen)

**Por que é útil:**
- Produtor recebe alertas críticos mesmo offline
- Melhor experiência mobile
- Funciona como app sem precisar desenvolver app nativo

---

### **API Pública Limitada (Read-Only)** ⭐⭐⭐
**Impacto:** MÉDIO | **Esforço:** MÉDIO (3-5 dias)

- [ ] Criar conjunto de endpoints read-only (`/api/public/*`) com throttling
- [ ] Endpoints: preços históricos agregados, tendências de mercado, dados climáticos públicos
- [ ] Rate limiting por IP (ex: 100 req/hora)
- [ ] Documentação Swagger pública
- [ ] Sem dados sensíveis (sem oportunidades específicas, sem dados de usuários)

**Por que é útil:**
- Permite parceiros integrarem dados agregados
- Aumenta visibilidade da plataforma
- Gera potencial de receita via API premium no futuro

---

### **Sincronização de Modelos Document (Prisma ↔ SQLAlchemy)** ⭐⭐
**Impacto:** BAIXO | **Esforço:** BAIXO (1-2 horas)

- [ ] Formalizar contrato único de schema para tabela `documents`
- [ ] Documentar campos obrigatórios e tipos
- [ ] Garantir que migrações Prisma e modelos SQLAlchemy sejam atualizados em sincronia
- [ ] Script de validação que compara schema Prisma vs SQLAlchemy

**Por que é útil:**
- Evita drift entre modelos Node e Python
- Facilita manutenção futura
- Reduz bugs de incompatibilidade

---

## 🚀 ROADMAP DE EVOLUÇÃO FUTURA

### **FASE 1: Infraestrutura AWS (1-2 Meses)**
- [ ] Setup AWS (RDS PostgreSQL, ECS Fargate, S3, ElastiCache)
- [ ] Containerização otimizada
- [ ] Deploy inicial
- [ ] Migração de dados
- [ ] Variáveis de ambiente (Secrets Manager)

**Custo Estimado:** ~$100-150/mês

---

### **FASE 2: ML Avançado (2-3 Meses)**
- [ ] RAG Avançado (reranking, filtros contextuais)
- [ ] Prophet com regressores exógenos
- [ ] Sistema de recomendação de manejo (ML)
- [ ] Previsão de produtividade (XGBoost)
- [ ] Análise de risco climático melhorada

---

### **FASE 3: Integrações Externas (3-4 Meses)**
- [ ] Google Earth Engine (NDVI, imagens de satélite)
- [ ] Embrapa Solos API
- [ ] INMET (dados históricos oficiais)
- [ ] Google Maps Distance Matrix API

---

### **FASE 4: Mapa Futuro (4-6 Meses)**

> **Visão do Cliente:** "O mapa no futuro deve ser o núcleo máximo da nossa aplicação. Ele deve ser extremamente completo, com Google Maps, uma estética similar ao Google Earth (3D), uma lógica de filtragem ultra completa, com uma estética que nos permita adicionar ainda mais produtos sem que o mapa fique poluído."

- [ ] Migração para Google Maps API
- [ ] Visualização 3D (Google Earth style)
- [ ] Sistema de camadas avançado
- [ ] Filtragem ultra completa
- [ ] Design anti-poluição visual
- [ ] Personalização por usuário

---

## 📊 MÉTRICAS DE SUCESSO

### **Performance:**
- ✅ Tempo de resposta < 2s (95% das requisições)
- ✅ Cache hit rate > 80%
- ✅ Uptime > 99.5%

### **Qualidade:**
- ⚠️ Testes unitários coverage > 60% (pendente)
- ⚠️ Testes de carga passando (pendente)
- ✅ Logging estruturado (parcial)

### **Funcionalidades:**
- ✅ Todos os requisitos críticos do cliente implementados (exceto Prophet no `/batch`)
- ⚠️ Requisitos de melhoria visual pendentes
- ⚠️ Requisitos de evolução futura planejados

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

### **Prioridade ALTA (Esta Semana - Semana 1):** 🔥

1. **Integrar Prophet no `/batch`** ⭐⭐⭐ ✅ **CONCLUÍDO**
   - ✅ Adicionar logs e métricas para rastrear uso Prophet vs fallback
   - ⚠️ Validar datasets suficientes (rodar ETLs se necessário)
   - ⚠️ Testar com múltiplas regiões e produtos
   - **REQUISITO CRÍTICO DO CLIENTE** - Implementação base concluída

2. **Segurança e Infraestrutura** ⭐⭐⭐ **CRÍTICO** ✅ **CONCLUÍDO**
   - ✅ Adicionar middleware de autenticação no FastAPI (API key compartilhada)
   - ✅ Restringir CORS do Brain para origens específicas em produção
   - ✅ Endurecer RBAC em todas as rotas admin
   - ⚠️ Implementar uso efetivo de AuditLog (pendente)

3. **Formalização de Configuração** ⭐⭐ ✅ **CONCLUÍDO**
   - ✅ Criar `.env.example` completo para backend, ai-service e frontend
   - ✅ Consolidar documentação de variáveis de ambiente
   - ✅ Corrigir `.gitignore` para permitir `.env.example`

4. **Melhorar Visualizações** ⭐⭐
   - ⚠️ Comparação de chuva (ano anterior vs. atual)
   - ⚠️ Badges de eventos extremos no mapa
   - ✅ Correção de sintaxe no ClimateTab.jsx

### **Prioridade MÉDIA (Próximas 2 Semanas - Semanas 2-3):**

5. **Limpeza de Dados Legados** ⭐⭐ ✅ **SCRIPT CRIADO**
   - ✅ Script de migração: converter preços de caixa para R$/kg (`migrate_units_to_kg.py`)
   - ✅ Remover normalizações defensivas após migração (simplificadas para apenas logs)
   - ⚠️ Executar migração em ambiente de desenvolvimento (pendente execução)

6. **Extrair Scheduler de ETL** ⭐⭐
   - Mover `schedule.run_pending()` para script separado
   - Configurar job agendado no Railway
   - Esforço: 2-3 horas

7. **Filtros Avançados** ⭐
   - Safra, época de plantio (completar)
   - Esforço: 2-3 dias

8. **Testes de IA (Prophet + RAG)** ⭐⭐
   - Testes de integração Pytest para Prophet e RAG
   - Testes Jest para endpoints críticos do Node
   - Esforço: 1-2 dias

9. **Backup Automático** ⭐
   - Script e agendamento
   - Esforço: 2-3 horas

### **Prioridade BAIXA (Próximo Mês - Semanas 4+):**

10. **Validação Prophet Avançada** ⭐
    - Backtesting completo e métricas detalhadas
    - Ajuste de hiperparâmetros
    - Esforço: 1 dia

11. **Documentação Essencial** ⭐
    - Atualizar README, documentar APIs, guia de uso
    - Esforço: 1 dia

---

## 📝 NOTAS IMPORTANTES

- **Variáveis de ambiente:** Nunca commitar valores reais
- **RLS:** Aplicar no Supabase quando possível
- **Railway:** Deploy automático configurado
- **Sentry:** Configurar DSNs quando possível
- **Commits:** Manter mensagens descritivas e organizadas

---

## ✅ CONCLUSÃO

**Status Atual:**
- ✅ **FASE 0:** 100% Concluída (Fundação Sólida)
- ⚠️ **FASE 1:** 85% Concluída (Core)
- ⚠️ **FASE 2:** 80% Concluída (IA)
- ⚠️ **FASE 3:** 70% Concluída (Frontend)
- ⚠️ **FASE 4:** 10% Concluída (Qualidade)

**Próximo Foco (Semana 1):**
1. ✅ **Integrar Prophet no `/batch`** (REQUISITO CRÍTICO) - ✅ logs e métricas implementados
2. ✅ **Segurança e infraestrutura** - ✅ autenticação Python, CORS restrito, RBAC completo
3. ✅ **Formalização de configuração** - ✅ `.env.example` completo para todos os serviços
4. ⚠️ **Melhorias visuais** - comparação chuva, badges eventos extremos (pendente)
5. ✅ **Limpeza de dados legados** - ✅ script de migração criado (pendente execução)
6. ✅ **Script para criar usuário comum** - `createUser.js` criado para testes

**Foco Médio Prazo (Semanas 2-3):**
- Extrair scheduler de ETL para worker dedicado
- Testes automatizados (Prophet, RAG, endpoints Node)
- Backup automático e monitoramento

---

**Última atualização:** Dezembro 2025  
**Versão:** 1.1 (Incorporadas sugestões de análise arquitetural)
