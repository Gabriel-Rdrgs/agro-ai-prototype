# 🏗️ ANÁLISE ARQUITETURAL COMPLETA - AGRO-AI PROTOTYPE

**Data:** Dezembro 2025  
**Analista:** Arquitetura de Software & Engenharia de IA  
**Repositório:** https://github.com/Gabriel-Rdrgs/agro-ai-prototype

---

## 1. VISÃO GERAL DO PROJETO

### Stack Principal

| Camada | Tecnologias |
|--------|-------------|
| **Frontend** | React 18, Leaflet (mapas), Chart.js, Axios |
| **Backend** | Node.js 18+, Express 5, Prisma ORM, Supabase Auth |
| **IA/ML** | Python 3.12, FastAPI, Prophet (séries temporais), LangChain, OpenAI (RAG) |
| **Banco de Dados** | PostgreSQL (Supabase) com PostGIS e pgvector |
| **Infraestrutura** | Railway (backend + AI), Vercel (frontend), Docker (local) |
| **Observabilidade** | Sentry, Winston (logging estruturado) |

### Objetivo Funcional

O **Agro-AI Prototype** é um **Sistema de Suporte à Decisão (DSS)** para operações agrícolas e arbitragem de hortifrúti, focado em **tomate de mesa no Brasil**. O sistema integra três pilares: (1) **Arbitragem comercial** com cálculo de ROI considerando frete, dólar e sazonalidade; (2) **Inteligência climática** usando APIs meteorológicas para análise de armazenagem e risco; (3) **RAG em documentos técnicos** (PDFs da Embrapa, UFG, ZARC) para consultas agronômicas via chat.

---

## 2. ARQUITETURA E FLUXO DE DADOS

### Diagrama Textual dos Componentes

```
[Cliente Web (React)]
    ↓ HTTPS (JWT)
[Backend Node.js (Express)]
    ├─→ [Supabase Auth] (autenticação)
    ├─→ [PostgreSQL/Supabase] (dados de negócio via Prisma)
    └─→ [AI Service Python (FastAPI)] (cálculos, IA, RAG)
            ├─→ [PostgreSQL/Supabase] (dados de IA via SQLAlchemy)
            ├─→ [OpenAI API] (embeddings + LLM)
            └─→ [APIs Externas] (Open-Meteo, NASA POWER, CEASA, Agrolink, IBGE, ZARC)
```

### Fluxo de uma Requisição Típica: Consulta RAG

**Exemplo:** Usuário pergunta "Qual a época ideal de plantio de tomate em Goiás?"

1. **Frontend (`AgronomicChat.jsx`)**:
   - Usuário digita pergunta no chat
   - Componente chama `POST /api/ai/chat/query` via Axios

2. **Backend (`server.js`)**:
   - Middleware `verifyToken` valida JWT via Supabase Auth
   - Rota `/api/ai/chat/query` não existe no backend → **PROBLEMA IDENTIFICADO**
   - Backend deveria fazer proxy para Python, mas não há rota dedicada

3. **AI Service (`routers/chat.py`)**:
   - Endpoint `POST /api/v1/chat/query` recebe `{"question": "..."}`
   - `RagService.ask()` é chamado:
     - Gera embedding da pergunta via `OpenAIEmbeddings` (text-embedding-3-small)
     - Busca vetorial no PostgreSQL usando `pgvector` (cosine_distance)
     - Recupera top 8 chunks mais similares
     - Monta contexto + pergunta
     - Chama `ChatOpenAI` (gpt-4o-mini) com prompt especializado
     - Retorna resposta + fontes (metadados dos PDFs)

4. **Banco de Dados**:
   - Tabela `Document` (schema Prisma):
     - `id` (UUID)
     - `content` (texto do chunk)
     - `metadata` (JSON: source, page)
     - `embedding` (vector(1536)) - pgvector
   - Query: `SELECT * FROM documents ORDER BY embedding <-> query_vector LIMIT 8`

### Fluxo de Dados de Mercado (ETL)

1. **Scheduler** (`main.py` linha 127-128):
   - Thread background roda `schedule.run_pending()` em loop
   - Agenda ETLs periódicos (ex: a cada 6h)

2. **ETL Script** (`scripts/run_etl.py`):
   - Chama `MarketScraper` para coletar preços:
     - CEASA-PR (web scraping)
     - Agrolink (API/parsing)
     - CONAB (portal oficial)
     - Outras CEASAs (SP, MG, RJ, RS)
   - Chama `IBGEScraper` para dados de produção
   - Salva em `CeasaPrice` e `IBGEProduction` via SQLAlchemy

3. **Prophet** (`services/price_forecast.py`):
   - Lê dados históricos de `CeasaPrice`
   - Treina modelo Prophet (sazonalidade, tendências)
   - Gera previsões de 7d e 30d
   - Cache LRU para evitar retreinar modelos repetidamente

---

## 3. MAPA DE CÓDIGO

| Área | Arquivos/Pastas Principais | Função no Sistema |
|------|----------------------------|-------------------|
| **Frontend** | `frontend/src/App.js` | Entrypoint React, roteamento de abas (Mapa, Dashboard, Simulador, Clima, Chat) |
| | `frontend/src/components/Map/MapView.jsx` | Visualização Leaflet com marcadores de oportunidades, filtros, heatmap |
| | `frontend/src/components/Chat/AgronomicChat.jsx` | Interface de chat RAG, comunicação com backend |
| | `frontend/src/services/api.js` | Cliente Axios configurado com JWT, baseURL |
| **Backend** | `backend/server.js` | Entrypoint Express, orquestração de rotas, proxy para Python |
| | `backend/authMiddleware.js` | Validação JWT via Supabase Auth, RBAC (`checkRole`) |
| | `backend/routes/ceasa.js` | Rotas específicas de CEASA (preços, sincronização) |
| | `backend/utils/cache.js` | Cache em memória (LRU) para reduzir queries |
| | `backend/utils/circuitBreaker.js` | Circuit breaker para proteger pool de conexões |
| **AI Service** | `ai-service/main.py` | Entrypoint FastAPI, lifespan, scheduler thread |
| | `ai-service/routers/predictions.py` | Endpoints de previsão (Prophet, batch, storage) |
| | `ai-service/routers/chat.py` | Endpoint RAG (`/api/v1/chat/query`) |
| | `ai-service/services/rag_service.py` | Lógica RAG: embedding, busca vetorial, LLM |
| | `ai-service/services/rag_ingestion.py` | Ingestão de PDFs: chunking, vetorização, persistência |
| | `ai-service/services/price_forecast.py` | Prophet: treinamento, previsão, fallback |
| | `ai-service/services/climate/intelligence.py` | Integração Open-Meteo, NASA POWER, análise climática |
| | `ai-service/services/data_sync/market_scraper.py` | ETL de preços (CEASA, Agrolink, CONAB) |
| | `ai-service/services/arbitrage_calculator.py` | Cálculo de ROI de arbitragem interestadual |
| | `ai-service/utils/auth_middleware.py` | Middleware de autenticação interna (X-Internal-API-Key) |
| **Banco** | `backend/prisma/schema.prisma` | Schema Prisma: modelos de dados, índices, extensões (PostGIS, pgvector) |
| | `ai-service/models/document_model.py` | Modelo SQLAlchemy para tabela `Document` (RAG) |
| **Config** | `ai-service/config/crops.py` | Especificações de culturas (perdas, radiação, produtividade) |
| | `ai-service/config/calendar.py` | Calendário de plantio/colheita por estado |
| | `ai-service/config/settings.py` | Configurações Pydantic (env vars, validação) |
| **Scripts** | `ai-service/scripts/backfill_history.py` | Gera dados históricos sintéticos para Prophet |
| | `ai-service/scripts/run_etl.py` | Executa ETL completo (preços + produção) |
| | `ai-service/scripts/validate_prophet_data.py` | Validação de dados para Prophet |

---

## 4. CAMADA DE IA / RAG

### Localização da Lógica

- **Ingestão**: `ai-service/services/rag_ingestion.py`
- **Consulta**: `ai-service/services/rag_service.py`
- **Endpoint**: `ai-service/routers/chat.py` → `POST /api/v1/chat/query`
- **Modelo de Dados**: `ai-service/models/document_model.py` (SQLAlchemy) + `backend/prisma/schema.prisma` (Prisma)

### Fluxo de Ingestão de PDFs

1. **Leitura**:
   - `PyPDFLoader` (LangChain) extrai texto do PDF
   - `RecursiveCharacterTextSplitter` quebra em chunks de 1000 caracteres (overlap 200)

2. **Vetorização**:
   - `OpenAIEmbeddings` (text-embedding-3-small) gera vetores de 1536 dimensões
   - Cada chunk → 1 embedding

3. **Persistência**:
   - Salva em `Document` (PostgreSQL):
     - `content`: texto do chunk
     - `metadata`: JSON com `source` (nome do PDF) e `page`
     - `embedding`: vector(1536) via pgvector

### Fluxo de Consulta RAG

1. **Query do Usuário**:
   - Frontend envia `{"question": "..."}` para `/api/v1/chat/query`

2. **Busca Vetorial**:
   - `RagService._retrieve_context()`:
     - Gera embedding da pergunta
     - Query SQL: `SELECT * FROM documents ORDER BY embedding <-> query_vector LIMIT 8`
     - Retorna top 8 chunks mais similares (cosine distance)

3. **Geração de Resposta**:
   - Monta prompt com contexto + pergunta
   - Chama `ChatOpenAI` (gpt-4o-mini, temperature=0)
   - System prompt: "Você é um Agrônomo Senior IA especialista em Tomate"
   - Retorna resposta + lista de fontes (nomes dos PDFs)

### Estado Atual da Implementação

**✅ Funcional:**
- Ingestão básica de PDFs funciona
- Busca vetorial com pgvector implementada
- LLM integrado (gpt-4o-mini)
- Tratamento de erros (quota, rate-limit, API key inválida)

**⚠️ Limitações Identificadas:**
1. **Chunking simples**: Usa apenas `RecursiveCharacterTextSplitter` sem respeitar estrutura do PDF (seções, capítulos)
2. **Sem reranking**: Retorna top-k por similaridade, sem priorizar chunks com termos-chave relevantes
3. **Metadata limitada**: Apenas `source` e `page`; falta `crop`, `theme`, `region`, `source_type`
4. **Sem filtros contextuais**: Não filtra por tipo de documento antes da busca
5. **Frontend não conectado**: `AgronomicChat.jsx` existe, mas não há rota no backend para fazer proxy

### Sugestões para Expansão (3 PDFs de Tomate)

1. **Melhorar Chunking**:
   ```python
   # Usar LangChain PDF loader com estrutura preservada
   from langchain_community.document_loaders import PyPDFLoader
   from langchain_text_splitters import MarkdownHeaderTextSplitter
   
   # Respeitar títulos/seções do PDF
   headers_to_split_on = [
       ("#", "Header 1"),
       ("##", "Header 2"),
   ]
   ```

2. **Metadata Rica**:
   ```python
   metadata = {
       "source": "Clima e Produção de Tomates no Brasil.pdf",
       "page": chunk.metadata.get("page", 0),
       "crop": "Tomate",
       "theme": "Clima",  # ou "Plantio", "Armazenagem", "Pós-colheita"
       "region": "Brasil",  # ou estado específico
       "source_type": "Embrapa"  # ou "UFG", "ZARC"
   }
   ```

3. **Reranking**:
   ```python
   # Após busca vetorial, rerank por relevância de termos
   from sentence_transformers import CrossEncoder
   reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
   scores = reranker.predict([(question, chunk.content) for chunk in chunks])
   ```

4. **Filtros Contextuais**:
   ```python
   # Endpoint aceita parâmetros opcionais
   @router.post("/query")
   async def ask_agronomist(
       request: ChatQueryRequest,
       crop: str = None,
       theme: str = None
   ):
       # Filtra documentos antes da busca vetorial
       stmt = select(Document)
       if crop:
           stmt = stmt.where(Document.metadata['crop'] == crop)
   ```

5. **Múltiplos PDFs**:
   - Ingerir os 3 PDFs separadamente
   - Manter metadata diferenciada
   - Busca vetorial retorna chunks de qualquer PDF, mas cita fonte

---

## 5. PONTOS FORTES E PROBLEMAS

### ✅ Pontos Fortes

1. **Arquitetura Modular**:
   - Separação clara: Frontend (React) → Backend (Node) → AI Service (Python)
   - Routers organizados por funcionalidade (`predictions.py`, `chat.py`, `weather.py`)
   - Services isolados (`rag_service.py`, `price_forecast.py`)

2. **Segurança Básica**:
   - Autenticação JWT via Supabase Auth
   - RBAC implementado (`checkRole`)
   - Middleware de autenticação interna (X-Internal-API-Key) entre Node ↔ Python
   - CORS configurável via `ALLOWED_ORIGINS`

3. **Observabilidade**:
   - Sentry integrado (backend + frontend)
   - Logging estruturado (Winston no backend)
   - Circuit breaker para proteger pool de conexões
   - AuditLog para ações críticas

4. **Performance**:
   - Cache em múltiplas camadas (LRU no Python, cache no Node)
   - Cache de modelos Prophet (evita retreinar)
   - Índices otimizados no Prisma (product, state, date, geoespaciais)

5. **Extensibilidade**:
   - PostGIS para queries geoespaciais
   - pgvector para RAG
   - Estrutura preparada para múltiplos produtos (config/crops.py)

### ❌ Problemas / Débitos Técnicos

#### **CRÍTICOS (Alta Prioridade)**

1. **RAG não acessível via Frontend**:
   - `AgronomicChat.jsx` existe, mas não há rota no backend para fazer proxy
   - Frontend não consegue chamar `/api/v1/chat/query` diretamente (CORS/autenticação)
   - **Solução**: Adicionar rota `POST /api/ai/chat/query` no `server.js` que faz proxy para Python

2. **Scheduler inline no FastAPI**:
   - `schedule.run_pending()` roda em thread dentro do `main.py` (linha 127-128)
   - **Problema**: Se Railway escalar para múltiplas réplicas, cada uma vai tentar rodar ETLs
   - **Solução**: Extrair para worker separado (script `scheduler_worker.py`) ou usar Railway Cron Jobs

3. **Falta validação de entrada**:
   - Endpoints Python não validam tipos/formatos de entrada consistentemente
   - Exemplo: `predictions.py` linha 244 aceita `BatchPredictionRequest` mas não valida ranges
   - **Solução**: Usar Pydantic validators mais rigorosos

4. **Secrets em logs**:
   - `auth_middleware.py` linha 67 loga parte da API key (`api_key_header[:10]`)
   - **Solução**: Remover logs de secrets ou mascarar completamente

#### **MÉDIOS (Média Prioridade)**

5. **Duplicação de modelos**:
   - `Document` definido em Prisma (`schema.prisma`) e SQLAlchemy (`document_model.py`)
   - Risco de drift entre modelos
   - **Solução**: Gerar modelo SQLAlchemy a partir do Prisma ou usar apenas um ORM

6. **Cache não distribuído**:
   - Cache em memória (LRU) não funciona em múltiplas réplicas
   - **Solução**: Migrar para Redis (Railway oferece Redis addon)

7. **Falta de testes automatizados**:
   - Apenas scripts de teste manuais (`test_*.py`)
   - Sem suíte Jest (backend) ou Pytest (Python)
   - **Solução**: Criar testes unitários e de integração

8. **Normalização de preços inconsistente**:
   - Lógica de conversão caixa→kg espalhada em múltiplos lugares
   - `price_forecast.py` linha 92-95 normaliza, mas `predictions.py` linha 280 também
   - **Solução**: Centralizar em função utilitária

#### **BAIXOS (Baixa Prioridade)**

9. **Documentação de API incompleta**:
   - FastAPI gera Swagger automático (`/docs`), mas não há documentação de contratos
   - **Solução**: Adicionar exemplos de request/response nos docstrings

10. **Falta de rate limiting**:
    - Endpoints públicos (health, docs) não têm rate limiting
    - **Solução**: Adicionar middleware de rate limiting (ex: `slowapi`)

---

## 6. PRÓXIMOS PASSOS RECOMENDADOS

### 🔥 Curto Prazo (1-2 Semanas)

1. **Conectar RAG ao Frontend** (2-3 horas):
   - Adicionar rota `POST /api/ai/chat/query` no `server.js`
   - Fazer proxy para `POST /api/v1/chat/query` do Python
   - Testar fluxo completo: Frontend → Backend → Python → Resposta

2. **Extrair Scheduler de ETL** (2-3 horas):
   - Criar `ai-service/scripts/scheduler_worker.py`
   - Mover lógica de `schedule.run_pending()` para script separado
   - Configurar Railway Cron Job para rodar worker

3. **Melhorar Ingestão de PDFs** (1 dia):
   - Adicionar metadata rica (crop, theme, region, source_type)
   - Melhorar chunking (respeitar seções do PDF)
   - Ingerir os 3 PDFs de tomate com metadata diferenciada

4. **Validação de Dados Prophet** (2-3 horas):
   - Executar `validate_prophet_data.py`
   - Rodar `backfill_history.py` se necessário
   - Testar Prophet com múltiplas regiões/produtos

5. **Testes Básicos** (2-3 dias):
   - Criar testes Pytest para `rag_service.py` e `price_forecast.py`
   - Criar testes Jest para endpoints críticos do backend (`/api/opportunities`, `/api/ai/batch`)

### 📈 Médio Prazo (1 Mês)

6. **Reranking no RAG** (1 dia):
   - Integrar CrossEncoder para reranking de chunks
   - Priorizar chunks com termos-chave relevantes à pergunta

7. **Cache Distribuído** (2-3 dias):
   - Migrar cache LRU para Redis
   - Configurar Redis no Railway
   - Atualizar `utils/cache.py` para usar Redis

8. **Filtros Contextuais no RAG** (1 dia):
   - Adicionar parâmetros opcionais (`crop`, `theme`, `region`) no endpoint
   - Filtrar documentos antes da busca vetorial

9. **Backup Automático** (1 dia):
   - Script de backup PostgreSQL (pg_dump)
   - Agendamento via Railway Cron

10. **Documentação de API** (1 dia):
    - Adicionar exemplos de request/response nos docstrings
    - Criar guia de uso para desenvolvedores

### 🚀 Longo Prazo (2-3 Meses)

11. **Feature Flags**:
    - Tabela `FeatureFlags` no Prisma
    - Middleware para verificar flags antes de executar features
    - Permite experimentar sem quebrar demo

12. **Multi-tenant**:
    - Adicionar `organizationId` nas tabelas principais
    - RLS (Row Level Security) no Supabase
    - Isolamento de dados por organização

13. **Mobile App**:
    - React Native com funcionalidades principais
    - Offline-first com sincronização

14. **Integração Google Maps**:
    - Substituir Leaflet por Google Maps API
    - Visualização 3D (Google Earth style)
    - Distance Matrix API para frete em tempo real

---

## 📊 MÉTRICAS DE QUALIDADE

| Métrica | Estado Atual | Meta |
|---------|--------------|------|
| **Cobertura de Testes** | ~0% | >60% |
| **Tempo de Resposta (p95)** | <2s (estimado) | <2s |
| **Uptime** | N/A | >99.5% |
| **Cache Hit Rate** | N/A | >80% |
| **Documentação de API** | Parcial (Swagger) | Completa |

---

## 🎯 CONCLUSÃO

O **Agro-AI Prototype** é um sistema bem estruturado com arquitetura modular e separação de responsabilidades clara. A camada de RAG está implementada funcionalmente, mas precisa de melhorias (reranking, metadata rica, filtros contextuais) e **correção crítica** (conectar ao frontend). Os principais débitos técnicos são relacionados a escalabilidade (scheduler inline, cache não distribuído) e qualidade (falta de testes, validação inconsistente).

**Prioridade imediata**: Conectar RAG ao frontend e extrair scheduler para worker separado.

---

**Última atualização:** Dezembro 2025


