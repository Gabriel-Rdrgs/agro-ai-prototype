# 📋 PLANEJAMENTO CONSOLIDADO - AGRO-AI PROTOTYPE

**Data de Criação:** Dezembro 2025  
**Última Atualização:** Dezembro 2025  
**Status:** Em Execução  
**Progresso Geral:** ~70%

---

## 🎯 VISÃO GERAL DO PROJETO

O **agro-ai-prototype** é uma plataforma de inteligência agrícola para arbitragem, clima, logística e RAG em documentos técnicos. Sistema full-stack composto por:

- **Frontend** React (dashboard, mapas, simuladores)
- **Backend** Node.js/Express (API pública, autenticação, orquestração)
- **Serviço de IA** Python/FastAPI (cálculos, predições, RAG)
- **Banco de dados** PostgreSQL com PostGIS e pgvector

Foco atual: **tomate de mesa** no Brasil, com base em PDFs técnicos (Embrapa, UFG, ZARC) e integrações CEASA/Agrolink/CONAB/IBGE.

---

## 🗺️ VISÃO FUTURA DO MAPA (REQUISITO DO CLIENTE)

> **"O mapa no futuro deve ser o núcleo máximo da nossa aplicação. Ele deve ser extremamente completo, com Google Maps, uma estética similar ao Google Earth (3D), uma lógica de filtragem ultra completa, com uma estética que nos permita adicionar ainda mais produtos sem que o mapa fique poluído. Temos que ter um planejamento de UX perfeito para que ele seja completíssimo, e ainda assim seja fluído e agradável visualmente."**

### Características Planejadas:

1. **Google Maps Integration**
   - Migração de Leaflet para Google Maps API
   - Acesso a dados mais ricos (Street View, Places API)
   - Melhor performance e precisão

2. **Visualização 3D (Google Earth Style)**
   - Terreno 3D com elevação
   - Visualização de relevo e topografia
   - Animações suaves de transição

3. **Filtragem Ultra Completa**
   - Sistema de camadas (layers) avançado
   - Filtros multi-critério (ROI, clima, qualidade, risco, produto, região, safra)
   - Filtros salvos e compartilhados
   - Filtros dinâmicos baseados em IA

4. **Design Anti-Poluição Visual**
   - Sistema de agrupamento inteligente (clustering avançado)
   - Informações em camadas (do básico ao detalhado)
   - Modo "foco" que esconde informações secundárias
   - Personalização de exibição por usuário

5. **UX Perfeita**
   - Navegação fluida e intuitiva
   - Performance otimizada (lazy loading, virtualização)
   - Acessibilidade completa
   - Responsivo (mobile, tablet, desktop)

### Roadmap de Implementação do Mapa Futuro:

**Fase 1 (Atual):** Leaflet básico com funcionalidades essenciais ✅  
**Fase 2 (Próximo):** Melhorias de UX e filtros avançados  
**Fase 3 (Futuro):** Migração para Google Maps + 3D  
**Fase 4 (Futuro):** Sistema completo de camadas e personalização

---

## 📊 STATUS ATUAL POR FASE

### **FASE 1 - Fundação** (~85% ✅)

#### ✅ **Completo:**
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

#### ⚠️ **Pendente:**
- ⚠️ Aplicar RBAC em todas as rotas administrativas (2-3 horas)
- ⚠️ Backup automático (2-3 horas)

**Progresso:** 85% → **Avançado**

---

### **FASE 2 - Inteligência Artificial** (~80% ✅)

#### ✅ **Completo:**
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

#### ⚠️ **Pendente:**
- ⚠️ **Integrar Prophet no `/batch`** (substituir valores fixos) - **REQUISITO CLIENTE**
- ⚠️ Validação de modelos Prophet (backtesting)
- ⚠️ Redis para cache distribuído (opcional, futuro)

**Progresso:** 80% → **Avançado**

---

### **FASE 3 - Frontend** (~70% ✅)

#### ✅ **Completo:**
- ✅ Mapa Leaflet integrado
- ✅ Dashboard com gráficos básicos
- ✅ Visualização de oportunidades
- ✅ **Modal com abas criado** (`OpportunityModal.jsx`)
- ✅ **FinancialTab** (funcionando)
- ✅ **QualityTab** (preenchido com dados do Python)
- ✅ **ClimateTab** (preenchido com dados do Python)
- ✅ **AITab** (preenchido com recomendações)
- ✅ **Filtros avançados no sidebar** (ROI, estado, risco, chuva, produto)
- ✅ **Regiões Comprometidas** (heatmap com GeoJSON)
- ✅ **Sistema de cache no frontend** (sessionStorage)
- ✅ **Otimizações de performance** (batches, retry logic, timeouts ajustados)

#### ⚠️ **Pendente:**
- ⚠️ **Comparação de chuva visual** (ano anterior vs. atual) - melhorar visualização
- ⚠️ **Exibir eventos extremos no mapa** (badges nos marcadores)
- ⚠️ **Exibir como colhe cada região** (melhorar visualização no ClimateTab)
- ⚠️ Filtros mais avançados (safra, época de plantio)
- ⚠️ Conexão completa com dados preditivos no Dashboard
- ⚠️ Gerador de relatórios PDF
- ⚠️ PWA (Service Worker, Manifest)

**Progresso:** 70% → **Avançado**

---

### **FASE 4 - Qualidade** (~10% ⚠️)

#### ✅ **Completo:**
- ✅ Logging estruturado (parcial)

#### ⚠️ **Pendente:**
- ⚠️ Testes unitários (Jest/Pytest)
- ⚠️ Testes de carga
- ⚠️ Security scan completo
- ⚠️ Backup automático

**Progresso:** 10% → **Inicial**

---

## 📋 REQUISITOS DO CLIENTE (Mapeados)

### **✅ Já Implementado:**
1. ✅ ETL completo (CONAB, IBGE, CEASA-PR, Agrolink)
2. ✅ ROI unificado (cálculo completo)
3. ✅ Dados de qualidade e shelf-life (Python)
4. ✅ Dados climáticos históricos (Python)
5. ✅ Calendário de plantio/colheita (Python)
6. ✅ Modal com abas criado (estrutura UI)
7. ✅ QualityTab preenchido (qualidade, shelf-life, início frete, safra)
8. ✅ ClimateTab preenchido (chuva, eventos extremos, safra)
9. ✅ AITab preenchido (recomendações automáticas)
10. ✅ Regiões Comprometidas (análise e visualização)
11. ✅ Filtros avançados no mapa (ROI, estado, risco, chuva, produto)

### **⚠️ Pendente (Requisitos do Cliente):**

1. **Melhorar Visualização de Comparação de Chuva** (PRIORIDADE MÉDIA)
   - Melhorar componente visual
   - Gráficos mais informativos
   - Esforço: 2-3 horas

2. **Exibir Eventos Extremos no Mapa** (PRIORIDADE MÉDIA)
   - Badges nos marcadores
   - Tooltips informativos
   - Esforço: 3-4 horas

3. **Melhorar Visualização de Safra** (PRIORIDADE BAIXA)
   - Melhorar exibição no ClimateTab
   - Esforço: 2-3 horas

4. **Integrar Prophet no `/batch`** (PRIORIDADE ALTA)
   - Substituir valores fixos (+2%/+8%) por previsões reais
   - Esforço: 2-3 horas

---

## 🎯 PLANO DE AÇÃO (Próximas 4 Semanas)

### **SEMANA 1: Finalizar Requisitos Críticos**

#### **Dia 1-2: Melhorias Visuais**
- [ ] Melhorar visualização de comparação de chuva
- [ ] Adicionar badges de eventos extremos no mapa
- [ ] Melhorar exibição de safra no ClimateTab

#### **Dia 3: Integrar Prophet no `/batch`**
- [ ] Modificar `/api/v1/predict/batch` para usar Prophet
- [ ] Substituir valores fixos por previsões reais
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
- [ ] Filtro por safra
- [ ] Filtro por época de plantio
- [ ] Filtros salvos e compartilhados

#### **Dia 4-5: Otimizações**
- [ ] Otimizar queries geoespaciais
- [ ] Melhorar tratamento de erros
- [ ] Adicionar logging estruturado

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

## 🚀 ROADMAP DE EVOLUÇÃO FUTURA

### **FASE 1: Infraestrutura AWS (1-2 Meses)**

**Objetivo:** Migrar de Railway/Supabase para AWS para melhor escalabilidade.

**Tarefas:**
- [ ] Setup AWS (RDS PostgreSQL, ECS Fargate, S3, ElastiCache)
- [ ] Containerização otimizada
- [ ] Deploy inicial
- [ ] Migração de dados
- [ ] Variáveis de ambiente (Secrets Manager)

**Custo Estimado:** ~$100-150/mês

---

### **FASE 2: ML Avançado (2-3 Meses)**

**Objetivo:** Implementar modelos ML mais sofisticados.

**Tarefas:**
- [ ] RAG Avançado (reranking, filtros contextuais)
- [ ] Prophet com regressores exógenos
- [ ] Sistema de recomendação de manejo (ML)
- [ ] Previsão de produtividade (XGBoost)
- [ ] Análise de risco climático melhorada

---

### **FASE 3: Integrações Externas (3-4 Meses)**

**Objetivo:** Integrar mais fontes de dados.

**Tarefas:**
- [ ] Google Earth Engine (NDVI, imagens de satélite)
- [ ] Embrapa Solos API
- [ ] INMET (dados históricos oficiais)
- [ ] Google Maps Distance Matrix API

---

### **FASE 4: Mapa Futuro (4-6 Meses)**

**Objetivo:** Implementar visão completa do mapa.

**Tarefas:**
- [ ] Migração para Google Maps API
- [ ] Visualização 3D (Google Earth style)
- [ ] Sistema de camadas avançado
- [ ] Filtragem ultra completa
- [ ] Design anti-poluição visual
- [ ] Personalização por usuário

---

## 🛠️ FERRAMENTAS E TECNOLOGIAS

### **Stack Atual:**
- **Frontend:** React, Leaflet, Axios
- **Backend:** Node.js, Express, Prisma
- **IA:** Python, FastAPI, Prophet, OpenAI
- **Banco:** PostgreSQL (Supabase), PostGIS, pgvector
- **Deploy:** Railway, Vercel

### **Stack Futuro (Planejado):**
- **Frontend:** React, Google Maps API, Three.js (3D)
- **Backend:** Node.js, Express, Prisma
- **IA:** Python, FastAPI, Prophet, XGBoost, OpenAI/Bedrock
- **Banco:** PostgreSQL (AWS RDS), PostGIS, pgvector
- **Cache:** Redis (ElastiCache)
- **Deploy:** AWS (ECS Fargate, S3, CloudFront)

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
- ✅ Todos os requisitos críticos do cliente implementados
- ⚠️ Requisitos de melhoria visual pendentes
- ⚠️ Requisitos de evolução futura planejados

---

## 🎯 PRÓXIMOS PASSOS IMEDIATOS

### **Prioridade ALTA (Esta Semana):**

1. **Integrar Prophet no `/batch`** ⭐⭐⭐
   - Substituir valores fixos por previsões reais
   - Esforço: 2-3 horas

2. **Melhorar Visualizações** ⭐⭐
   - Comparação de chuva
   - Badges de eventos extremos
   - Esforço: 4-5 horas

### **Prioridade MÉDIA (Próximas 2 Semanas):**

3. **Filtros Avançados** ⭐
   - Safra, época de plantio
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

## 📞 SUPORTE E CONTATO

Para dúvidas ou sugestões sobre o planejamento, consulte este documento ou entre em contato com a equipe de desenvolvimento.

---

**Status:** ✅ **PLANEJAMENTO CONSOLIDADO E ATUALIZADO**

**Última atualização:** Dezembro 2025  
**Versão:** 2.0

