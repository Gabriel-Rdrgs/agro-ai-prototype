# 📋 PLANEJAMENTO COMPLETO - AGRO-AI PROTOTYPE

**Data de Criação:** Dezembro 2025  
**Última Atualização:** Dezembro 2025 (Revisão e Correção de Status)  
**Status:** Em Execução  
**Progresso Geral:** ~85% (corrigido após revisão de código)

> **📝 NOTA DE REVISÃO:** Este documento foi revisado e corrigido em Dezembro 2025. Itens marcados como concluídos foram validados através de análise do código-fonte. Alguns itens foram ajustados para refletir o status real da implementação.

> **Este é o ÚNICO arquivo de planejamento.** Consolida toda a estratégia, fases, semanas e progresso do projeto.

---

## 📊 ÍNDICE

1. [Visão Geral do Projeto](#visão-geral)
2. [Progresso por Fase](#progresso-por-fase)
3. [FASE 0: Fundação Sólida](#fase-0-fundacao-solida) ✅ **100% CONCLUÍDA**
4. [FASE 1: Funcionalidades Core](#fase-1-funcionalidades-core) ✅ **100% CONCLUÍDA**
5. [FASE 2: Inteligência Artificial](#fase-2-inteligencia-artificial) ⚠️ **80% CONCLUÍDA**
6. [FASE 3: Frontend e UX](#fase-3-frontend-e-ux) ⚠️ **70% CONCLUÍDA**
7. [FASE 4: Qualidade e Produção](#fase-4-qualidade-e-producao) ⚠️ **10% CONCLUÍDA**
8. [🎯 FASE 5: Features de Decisão](#-fase-5-features-de-decisão) 📋 **PLANEJADA**
9. [🧭 Plano Detalhado por Fase, Semana e Tarefas](#🧭-plano-detalhado-por-fase-semana-e-tarefas)
10. [Roadmap de Evolução Futura](#roadmap-evolucao-futura)

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
| **FASE 1** | ✅ **CONCLUÍDA** | 100% | 🔥 Alta - Core funcional |
| **FASE 2** | ⚠️ **EM PROGRESSO** | 80% | 🔥 Alta - IA e previsões |
| **FASE 3** | ⚠️ **EM PROGRESSO** | 75% | ⭐ Média - UX e visualizações |
| **FASE 4** | ⚠️ **PENDENTE** | 10% | ⭐ Média - Qualidade |
| **FASE 5** | 📋 **PLANEJADA** | 0% | 🔥🔥🔥 **CRÍTICA** - Features de Decisão |

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

#### ⚠️ **1.4. Variáveis de Ambiente**
- ⚠️ `.env.example` criado - **PENDENTE** (arquivos não encontrados no repositório)
- ✅ Documentação completa de variáveis (no README.md)
- ✅ Separação dev/prod (via variáveis de ambiente)

**Progresso Semana 1:** ⚠️ **90%** (implementação quase completa, `.env.example` pendente, pendências manuais de configuração)

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

## ✅ FASE 1: FUNCIONALIDADES CORE

**Status:** ✅ **100% CONCLUÍDA**  
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
- ✅ Aplicar RBAC em todas as rotas administrativas - ✅ **VERIFICADO: Todas as rotas administrativas têm RBAC**
- ✅ Backup automático - ✅ **CONCLUÍDO: Funcionando no Railway**

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
- ✅ **Integrar Prophet no `/batch`** - ✅ **CONCLUÍDO** (implementado em `predictions.py` linhas 294-370)
- ⚠️ Validação de modelos Prophet (backtesting) - **PENDENTE**
- ⚠️ Redis para cache distribuído (opcional, futuro) - **PENDENTE**

---

## ⚠️ FASE 3: FRONTEND E UX

**Status:** ⚠️ **75% CONCLUÍDA**  
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
- ✅ **Comparação de chuva visual** (ano anterior vs. atual) - ✅ **IMPLEMENTADO** em ClimateTab.jsx
- ✅ **Exibir eventos extremos no mapa** (badges nos marcadores) - ✅ **IMPLEMENTADO** em MapView.jsx e mapIcons.js
- ⚠️ **Exibir como colhe cada região** (melhorar visualização no ClimateTab) - **PENDENTE**
- ✅ Filtros mais avançados (safra, época de plantio) - ✅ **IMPLEMENTADO** (Sidebar.jsx e MapView.jsx)
- ✅ **Adição de 20 maiores produtores de soja** - ✅ **IMPLEMENTADO** (seed.js + script auxiliar)
- ✅ **Visualização melhorada do mapa com múltiplas culturas** - ✅ **IMPLEMENTADO** (ícones por produto, clustering otimizado, filtro de produtos)
- ⚠️ Conexão completa com dados preditivos no Dashboard - **PENDENTE**
- ⚠️ Gerador de relatórios PDF (no Plano Expandido - Semana 10) - **PENDENTE**
- ⚠️ PWA Completo (notificações push) - ver "Funcionalidades Adicionais" - **PENDENTE**

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

0

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
- [x] Google Maps Distance Matrix API ✅ **IMPLEMENTADO (Opcional - Ativação Futura)**
  - ✅ Código completo em `ai-service/services/distance_matrix.py`
  - ✅ Integrado em `ai-service/services/logistics.py`
  - ✅ Fallback automático para Haversine (funciona sem chave)
  - ✅ Documentação completa em `docs/GOOGLE_MAPS_ATIVACAO_FUTURA.md`
  - ⏸️ **Aguardando:** Decisão do proprietário e configuração de domínio

---

### **FASE 4: Mapa Futuro (4-6 Meses)**

> **Visão do Cliente:** "O mapa no futuro deve ser o núcleo máximo da nossa aplicação. Ele deve ser extremamente completo, com Google Maps, uma estética similar ao Google Earth (3D), uma lógica de filtragem ultra completa, com uma estética que nos permita adicionar ainda mais produtos sem que o mapa fique poluído."

- [x] Migração para Google Maps API ✅ **PRONTO PARA ATIVAÇÃO**
  - ✅ Implementação completa com fallback automático
  - ✅ Sistema funciona perfeitamente sem Google Maps (usa Haversine)
  - ✅ Pode ser ativado a qualquer momento adicionando `GOOGLE_MAPS_API_KEY`
  - 📖 Ver: `docs/GOOGLE_MAPS_ATIVACAO_FUTURA.md`
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

## 🎯 FASE 5: FEATURES DE DECISÃO

**Status:** 📋 **PLANEJADA**  
**Prioridade:** 🔥🔥🔥 **CRÍTICA**  
**Duração Estimada:** 4-6 Semanas

### **Objetivo:**
Transformar dados em decisões práticas e acionáveis para o cliente. Focar em features que guiam decisões reais de compra/venda.

### **Features Principais:**

1. **📈 Histórico Visual de Preços e ROI** ⭐⭐⭐⭐⭐
   - Gráfico de evolução temporal (7d, 30d, 90d, 1 ano)
   - Comparação com ano anterior
   - Indicadores de tendência

2. **🔄 Comparador de Oportunidades** ⭐⭐⭐⭐⭐
   - Seleção múltipla (até 5 oportunidades)
   - Tabela comparativa lado a lado
   - Gráfico radar de múltiplas dimensões

3. **🎯 Simulador de Cenários Interativo** ⭐⭐⭐⭐⭐
   - Testa "e se..." (dólar, frete, preço, clima)
   - Análise de sensibilidade
   - Cenários pré-definidos

4. **📢 Sistema de Alertas Inteligentes** ⭐⭐⭐⭐⭐
   - Alertas de ROI, mudança de preço, eventos climáticos
   - Notificações via Email, WhatsApp, Push
   - Dashboard de gerenciamento

5. **💼 Portfolio Tracking** ⭐⭐⭐⭐⭐
   - Registro de operações realizadas
   - Comparação: ROI Projetado vs Real
   - Aprendizado com histórico

6. **💡 Insights Personalizados** ⭐⭐⭐⭐
   - Recomendações baseadas em histórico do usuário
   - Padrões identificados automaticamente

### **Roadmap Detalhado:**

> **📖 Documento Completo:** `PLANEJAMENTO_INCREMENTAL_DECISOES.md`

**Sprint 1 (Semanas 1-2):** Contexto Temporal
- Histórico Visual de Preços
- Comparação com Ano Anterior

**Sprint 2 (Semanas 2-3):** Comparação
- Comparador de Oportunidades
- Ranking Inteligente

**Sprint 3 (Semanas 3-4):** Simulação
- Simulador de Cenários
- Análise de Sensibilidade

**Sprint 4 (Semanas 4-5):** Proatividade
- Sistema de Alertas
- Dashboard de Alertas

**Sprint 5 (Semanas 5-6):** Aprendizado
- Portfolio Tracking
- Insights Personalizados

**Sprint 6 (Semana 6):** Automação
- Integração WhatsApp
- Relatórios Agendados

### **Impacto Esperado:**

- **Engajamento:** +50% tempo médio na aplicação
- **Conversão:** 40%+ usuários criam alertas, 60%+ usam simulador
- **Retenção:** 70%+ taxa de retorno semanal
- **Valor:** 75%+ taxa de acerto de recomendações

---

## 🚀 SUGESTÕES PARA MERCADO REAL

> **📖 Documento Completo:** `docs/SUGESTOES_MERCADO_REAL.md`  
> **📖 Planejamento Incremental:** `PLANEJAMENTO_INCREMENTAL_DECISOES.md`

### **Top 5 Features que Transformam em Ferramenta de Decisão:**

1. 🔥 **Simulador de Cenários** ⭐⭐⭐⭐⭐
   - Testa "e se..." antes de decidir
   - Diferencial competitivo único

2. 🔥 **Sistema de Alertas** ⭐⭐⭐⭐⭐
   - App proativo, não reativo
   - Transforma app passivo em ativo

3. 🔥 **Histórico Visual** ⭐⭐⭐⭐⭐
   - Contexto temporal essencial
   - Facilita identificação de tendências

4. 🔥 **Comparador de Oportunidades** ⭐⭐⭐⭐⭐
   - Facilita escolha entre múltiplas opções
   - Reduz tempo de análise

5. 🔥 **Portfolio Tracking** ⭐⭐⭐⭐⭐
   - Aprende com histórico
   - Calcula lucro real vs projetado

**Ver documentos completos para detalhes de implementação e roadmap.**

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

3. **Formalização de Configuração** ⭐⭐ ⚠️ **PARCIALMENTE CONCLUÍDO**
   - ⚠️ Criar `.env.example` completo para backend, ai-service e frontend - **PENDENTE**
   - ✅ Consolidar documentação de variáveis de ambiente (no README.md)
   - ⚠️ Corrigir `.gitignore` para permitir `.env.example` - **PENDENTE** (arquivos não existem ainda)

4. **Melhorar Visualizações** ⭐⭐ ✅ **CONCLUÍDO**
   - ✅ Comparação de chuva (ano anterior vs. atual) - Implementado em ClimateTab.jsx (linhas 325-360)
   - ✅ Badges de eventos extremos no mapa - Implementado em MapView.jsx (linhas 1336-1358) e mapIcons.js (linhas 55-64)
   - ✅ Correção de sintaxe no ClimateTab.jsx

### **Prioridade MÉDIA (Próximas 2 Semanas - Semanas 2-3):**

5. **Limpeza de Dados Legados** ⭐⭐ ✅ **SCRIPT CRIADO**
   - ✅ Script de migração: converter preços de caixa para R$/kg (`migrate_units_to_kg.py`)
   - ✅ Remover normalizações defensivas após migração (simplificadas para apenas logs)
   - ⚠️ Executar migração em ambiente de desenvolvimento (pendente execução)

6. **Extrair Scheduler de ETL** ⭐⭐ ✅ **CONCLUÍDO**
   - ✅ Script `scheduler_worker.py` criado e separado
   - ✅ Documentado no `docs/GUIA_RAILWAY.md`
   - ✅ Comentário no `main.py` indicando que scheduler foi extraído
   - ⚠️ **Pendente:** Configurar job agendado no Railway (tarefa manual)

7. **Filtros Avançados** ⭐ ✅ **CONCLUÍDO**
   - ✅ Filtro de safra/época de plantio implementado em Sidebar.jsx e MapView.jsx
   - ✅ Utiliza `getPlantingSeasonStatus()` de `utils/plantingCalendar.js`
   - ✅ Integrado com filtros avançados (ROI, Estado, Risco, Produto)

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

**Status Atual (CORRIGIDO após revisão de código):**
- ⚠️ **FASE 0:** 95% Concluída (Fundação Sólida) - `.env.example` pendente
- ✅ **FASE 1:** 100% Concluída (Core) - Todas as funcionalidades core implementadas
- ✅ **FASE 2:** 85% Concluída (IA) - Prophet no `/batch` implementado, validação pendente
- ✅ **FASE 3:** 75% Concluída (Frontend) - Visualizações implementadas, suporte a múltiplas culturas, dashboard preditivo pendente
- ⚠️ **FASE 4:** 10% Concluída (Qualidade) - Testes e validações pendentes

**Próximo Foco (Semana 1):**
1. ✅ **Integrar Prophet no `/batch`** (REQUISITO CRÍTICO) - ✅ Implementado em `predictions.py` (linhas 294-370)
2. ✅ **Segurança e infraestrutura** - ✅ Autenticação Python, CORS restrito, RBAC completo
3. ⚠️ **Formalização de configuração** - ⚠️ `.env.example` **PENDENTE** (arquivos não existem)
4. ✅ **Melhorias visuais** - ✅ Comparação chuva e badges eventos extremos **IMPLEMENTADAS**
5. ✅ **Limpeza de dados legados** - ✅ Script de migração criado (`migrate_units_to_kg.py`), pendente execução
6. ✅ **Script para criar usuário comum** - ✅ `createUser.js` e `createAdmin.js` criados

**Foco Médio Prazo (Semanas 2-3):**
- Extrair scheduler de ETL para worker dedicado
- Testes automatizados (Prophet, RAG, endpoints Node)
- Backup automático e monitoramento

**Foco Incremental (FASE 5 - 4-6 Semanas):**
> **📖 Ver:** `PLANEJAMENTO_INCREMENTAL_DECISOES.md`

**Prioridade ALTA - Features de Decisão:**
1. 📈 Histórico Visual de Preços (Sprint 1)
2. 🔄 Comparador de Oportunidades (Sprint 2)
3. 🎯 Simulador de Cenários (Sprint 3)
4. 📢 Sistema de Alertas (Sprint 4)
5. 💼 Portfolio Tracking (Sprint 5)

**Objetivo:** Transformar dados em decisões práticas e acionáveis para o cliente.

---

**Última atualização:** Dezembro 2025  
**Versão:** 1.1 (Incorporadas sugestões de análise arquitetural)
