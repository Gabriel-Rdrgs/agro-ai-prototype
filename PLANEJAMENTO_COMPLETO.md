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
8. [Plano de Ação Imediato (4 Semanas)](#plano-de-acao-imediato)
9. [Plano Expandido (16 Semanas)](#plano-expandido-16-semanas)
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
- ✅ Cache com `@lru_cache` (10 consultas)
- ✅ Integrado no `ai-service/main.py`

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

## 🎯 PLANO DE AÇÃO IMEDIATO (4 Semanas)

> **Foco:** Finalizar requisitos críticos do cliente e melhorias de alto impacto.

---

### **SEMANA 1: Finalizar Requisitos Críticos** 🔥

**Objetivo:** Completar funcionalidades pendentes de alta prioridade.

#### **Dia 1-2: Melhorias Visuais** ⚠️
- [ ] Melhorar visualização de comparação de chuva
- [ ] Adicionar badges de eventos extremos no mapa
- [ ] Melhorar exibição de safra no ClimateTab

#### **Dia 3: Integrar Prophet no `/batch`** 🔥 **PRIORIDADE MÁXIMA**
- [ ] Modificar `/api/v1/predict/batch` para usar Prophet
- [ ] Substituir valores fixos (+2%/+8%) por previsões reais
- [ ] Manter fallback para casos sem dados históricos

#### **Dia 4-5: Polimento e Testes**
- [ ] Ajustes visuais
- [ ] Testes de usabilidade
- [ ] Correções de bugs

**Esforço Total:** 3-4 dias  
**Impacto:** ✅ Finaliza requisitos críticos do cliente

---

### **SEMANA 2: Melhorias de UX e Performance**

#### **Dia 1-3: Filtros Avançados**
- [ ] Filtro por safra (parcialmente implementado)
- [ ] Filtro por época de plantio (parcialmente implementado)
- [ ] Filtros salvos e compartilhados

#### **Dia 4-5: Otimizações**
- [ ] Otimizar queries geoespaciais
- [ ] Melhorar tratamento de erros
- [ ] Adicionar logging estruturado (completar)

**Esforço Total:** 3-4 dias

---

### **SEMANA 3: Produção e Qualidade**

#### **Dia 1-2: Backup e Monitoramento**
- [ ] Script de backup PostgreSQL
- [ ] Agendamento automático (cron)
- [ ] Health checks melhorados

#### **Dia 3-4: Validação Prophet**
- [ ] Script de backtesting
- [ ] Validar previsões com dados históricos
- [ ] Ajustar hiperparâmetros se necessário

#### **Dia 5: Documentação**
- [ ] Atualizar README
- [ ] Documentar APIs
- [ ] Guia de uso para cliente

**Esforço Total:** 3-4 dias

---

### **SEMANA 4: Preparação para Evolução Futura**

#### **Dia 1-3: Pesquisa e Planejamento**
- [ ] Pesquisar Google Maps API
- [ ] Planejar migração de Leaflet para Google Maps
- [ ] Definir arquitetura de camadas 3D

#### **Dia 4-5: Protótipos**
- [ ] Protótipo básico de Google Maps
- [ ] Teste de visualização 3D
- [ ] Avaliar performance

**Esforço Total:** 3-4 dias

---

## 📋 PLANO EXPANDIDO (16 Semanas)

> **Nota:** Este plano incorpora todas as sugestões de melhorias para tornar a aplicação um programa de previsão de mercado completo.

### **SEMANA 1: Quick Wins - Visualizações e Exportação** ⚡
- [ ] Gráfico de Candle (Candlestick)
- [ ] Exportação Excel/CSV
- [ ] Comparador de Oportunidades

### **SEMANA 2: Sistema de Alertas Inteligentes** 🔔
- [ ] Backend - Sistema de Jobs
- [ ] Frontend - Configuração de Alertas
- [ ] Integração Email

### **SEMANA 3: Dashboard de Tendências de Mercado** 📊
- [ ] Backend - Endpoint de Tendências
- [ ] Frontend - Gráficos de Tendência
- [ ] Alertas Automáticos de Tendência

### **SEMANA 4: Histórico de Decisões e ROI Realizado** 📈
- [ ] Banco de Dados
- [ ] Backend - API de Decisões
- [ ] Frontend - Interface de Decisões

### **SEMANA 5: Análise de Correlação entre Regiões** 🔗
- [ ] Backend - Cálculo de Correlação
- [ ] Frontend - Visualização
- [ ] Integração com Recomendações

### **SEMANA 6: Previsão de Oferta e Demanda** ⚖️
- [ ] Backend - Serviço de Previsão
- [ ] Endpoint e Lógica
- [ ] Frontend - Visualização

### **SEMANA 7: Integração WhatsApp Business API** 📱
- [ ] Setup WhatsApp Business API
- [ ] Backend - Integração
- [ ] Chatbot via WhatsApp

### **SEMANA 8: Mapa de Calor de Preços** 🗺️
- [ ] Backend - Cálculo de Preços por Região
- [ ] Frontend - Visualização
- [ ] Integração e Interatividade

### **SEMANA 9: Timeline de Eventos** 📅
- [ ] Backend - Agregação de Eventos
- [ ] Frontend - Timeline Visual
- [ ] Integração e Interatividade

### **SEMANA 10: Relatórios PDF Automáticos** 📄
- [ ] Backend - Geração de PDF
- [ ] Agendamento e Envio
- [ ] Frontend - Configuração

### **SEMANA 11-12: Recomendação Personalizada por Perfil** 🤖
- [ ] Backend - Engine de Preferências
- [ ] Frontend - Dashboard Personalizado

### **SEMANA 13: Chatbot de Decisão** 💬
- [ ] Backend - Lógica de Análise
- [ ] Frontend - Interface de Chat
- [ ] Integração com IA

### **SEMANA 14: Dados de Trânsito em Tempo Real** 🚗
- [ ] Integração Google Maps Distance Matrix
- [ ] Frontend - Visualização
- [ ] Otimização

### **SEMANA 15-16: App Mobile (React Native)** 📱
- [ ] Setup e Estrutura Base
- [ ] Funcionalidades Principais
- [ ] Deploy iOS e Android

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

### **Prioridade ALTA (Esta Semana):** 🔥

1. **Integrar Prophet no `/batch`** ⭐⭐⭐
   - Substituir valores fixos por previsões reais
   - Esforço: 2-3 horas
   - **REQUISITO CRÍTICO DO CLIENTE**

2. **Melhorar Visualizações** ⭐⭐
   - Comparação de chuva
   - Badges de eventos extremos
   - Esforço: 4-5 horas

### **Prioridade MÉDIA (Próximas 2 Semanas):**

3. **Filtros Avançados** ⭐
   - Safra, época de plantio (completar)
   - Esforço: 2-3 dias

4. **Backup Automático** ⭐
   - Script e agendamento
   - Esforço: 2-3 horas

### **Prioridade BAIXA (Próximo Mês):**

5. **Validação Prophet** ⭐
   - Backtesting e métricas
   - Esforço: 1 dia

6. **Documentação** ⭐
   - README, APIs, guias
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

**Próximo Foco:**
1. Integrar Prophet no `/batch` (REQUISITO CRÍTICO)
2. Melhorias visuais (comparação chuva, badges eventos)
3. Completar filtros avançados

---

**Última atualização:** Dezembro 2025  
**Versão:** 1.0 (Consolidado)
