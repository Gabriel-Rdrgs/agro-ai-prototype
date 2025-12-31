# Arquitetura do Sistema Agro-AI Prototype

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025

---

## 1. Visão Geral da Arquitetura

### 1.1. Padrão Arquitetural

O sistema segue uma arquitetura de microsserviços com três camadas principais:

- **Frontend (React)**: Interface do usuário, comunicação via HTTP REST
- **Backend (Node.js)**: API pública, autenticação, orquestração, cache
- **AI Service (Python)**: Processamento de IA, cálculos complexos, RAG

### 1.2. Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    Cliente Web (React)                      │
│  - MapView.jsx (mapas Leaflet)                              │
│  - AgronomicChat.jsx (RAG chat)                             │
│  - Dashboard.jsx (gráficos, oportunidades)                 │
│  - Sidebar.jsx (filtros avançados)                          │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTPS (JWT Bearer Token)
                       │ Axios (baseURL: /api)
                       ↓
┌─────────────────────────────────────────────────────────────┐
│          Backend Node.js (Express) - Porta 3001             │
│  - server.js (orquestração principal)                       │
│  - authMiddleware.js (JWT + RBAC)                            │
│  - routes/etl.js (ETL assíncrono)                           │
│  - routes/ceasa.js (dados CEASA)                             │
│  - utils/cache.js (LRU cache)                                │
│  - utils/jobQueue.js (jobs em background)                    │
└──────┬───────────────────────────────┬──────────────────────┘
       │                               │
       │ Prisma ORM                    │ HTTP + X-Internal-API-Key
       │                               │
       ↓                               ↓
┌──────────────────────┐    ┌──────────────────────────────────┐
│ Supabase Auth        │    │ AI Service Python - Porta 8000  │
│ - JWT validation     │    │ - FastAPI (main.py)              │
│ - User management    │    │ - routers/predictions.py         │
└──────────────────────┘    │ - routers/chat.py (RAG)          │
                            │ - services/rag_service.py       │
                            │ - services/price_forecast.py      │
                            │ - services/storage_advisor.py     │
                            └──────┬────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    │              │              │
                    ↓              ↓              ↓
        ┌──────────────────┐  ┌──────────┐  ┌──────────────┐
        │ PostgreSQL/      │  │ OpenAI   │  │ APIs         │
        │ Supabase         │  │ API      │  │ Externas     │
        │ - PostGIS        │  │ - Embed  │  │ - Open-Meteo │
        │ - pgvector       │  │ - LLM    │  │ - NASA POWER │
        │ - Prisma Client  │  │          │  │ - CEASA      │
        │ - SQLAlchemy     │  │          │  │ - Agrolink   │
        └──────────────────┘  └──────────┘  │ - IBGE SIDRA │
                                             │ - ZARC       │
                                             │ - SoilGrids  │
                                             └──────────────┘
```

### 1.3. Stack Tecnológico

| Camada | Tecnologias | Versões | Propósito |
|--------|-------------|---------|-----------|
| **Frontend** | React, Leaflet, Chart.js, Axios | React 19.2, Leaflet 1.9.4 | Interface do usuário, visualizações |
| **Backend** | Node.js, Express, Prisma, Supabase Auth | Node 18+, Express 5.1.0, Prisma 5.22.0 | API REST, autenticação, orquestração |
| **IA/ML** | Python, FastAPI, Prophet, LangChain, OpenAI | Python 3.12, FastAPI 0.115.0, Prophet 1.1.5 | Previsões, RAG, cálculos complexos |
| **Banco** | PostgreSQL, PostGIS, pgvector | PostgreSQL 15+ | Dados de negócio + vetores para RAG |
| **Infra** | Railway, Vercel, Docker | - | Hospedagem e containers |
| **Observabilidade** | Sentry, Winston | Sentry 10.30.0 | Monitoramento de erros e logs |

---

## 2. Fluxo de Dados

### 2.1. Fluxo de Requisição RAG (Exemplo)

**Cenário:** Usuário pergunta "Qual a época ideal de plantio de tomate em Goiás?"

#### Passo 1: Frontend (`AgronomicChat.jsx`)

```javascript
// frontend/src/components/Chat/AgronomicChat.jsx
const response = await chatService.askAgronomist(question);
// Chama: POST /api/ai/chat/query
```

#### Passo 2: Backend (`server.js`)

```javascript
// backend/server.js (linha ~1500)
app.post('/api/ai/chat/query', verifyToken, async (req, res) => {
  // 1. Valida JWT via Supabase Auth
  // 2. Proxy para Python com autenticação interna
  const response = await pythonAxios.post('/api/v1/chat/query', {
    question: req.body.question
  }, {
    headers: { 'X-Internal-API-Key': INTERNAL_API_KEY }
  });
  res.json(response.data);
});
```

#### Passo 3: AI Service (`routers/chat.py`)

```python
# ai-service/routers/chat.py
@router.post("/query")
async def chat_query(request: ChatRequest):
    result = rag_service.ask(request.question)
    return result
```

#### Passo 4: RAG Service (`services/rag_service.py`)

```python
# ai-service/services/rag_service.py
def ask(self, question: str) -> dict:
    # 1. Gera embedding da pergunta (OpenAI text-embedding-3-small)
    query_vector = self.embeddings.embed_query(question)
    
    # 2. Busca vetorial no PostgreSQL (pgvector)
    stmt = select(Document).order_by(
        Document.embedding.cosine_distance(query_vector)
    ).limit(8)
    
    # 3. Recupera top 8 chunks mais similares
    results = session.execute(stmt).scalars().all()
    
    # 4. Monta contexto + pergunta
    context_text = "\n\n".join([d['content'] for d in relevant_docs])
    
    # 5. Chama LLM (gpt-4o-mini)
    response = self.llm.invoke([
        SystemMessage(content=system_prompt),
        HumanMessage(content=user_prompt)
    ])
    
    return {"answer": response.content, "sources": sources}
```

#### Passo 5: Banco de Dados

**Tabela `Document` (schema Prisma + SQLAlchemy):**
- `id` (UUID, String)
- `content` (Text) - chunk de texto do PDF
- `metadata` (JSONB) - {source, page, crop, theme}
- `embedding` (vector(1536)) - pgvector

**Query SQL executada:**
```sql
SELECT * FROM documents 
ORDER BY embedding <-> $1::vector 
LIMIT 8;
```

### 2.2. Fluxo de ETL de Dados de Mercado

#### Trigger

- **Manual**: Admin chama `POST /api/admin/etl/start` (requer role 'admin')
- **Automático**: Scheduler worker (`scripts/scheduler_worker.py`) executa periodicamente

#### Backend (`routes/etl.js`)

```javascript
// Cria job assíncrono (não bloqueia request)
const jobId = jobQueue.createJob('etl', { type: 'all' });
jobQueue.startJob(jobId, async (job) => {
  await pythonAxios.post('/api/v1/admin/etl/all');
});
```

#### AI Service (`routers/admin.py`)

```python
@router.post("/etl/all")
async def run_etl_all(skip_ibge: bool = False):
    # 1. Market Scraper (CEASA, Agrolink, CONAB)
    market_scraper.sync_all()
    
    # 2. IBGE Scraper (produção agrícola)
    if not skip_ibge:
        ibge_scraper.sync_production()
```

#### Market Scraper (`services/data_sync/market_scraper.py`)

- Web scraping CEASA-PR
- API parsing Agrolink
- Portal CONAB (Excel)
- Salva em `CeasaPrice` via SQLAlchemy

#### Prophet (`services/price_forecast.py`)

- Lê dados históricos de `CeasaPrice` (últimos 180 dias)
- Treina modelo Prophet (sazonalidade anual/semanal)
- Cache LRU (8 modelos diferentes)
- Gera previsões de 7d e 30d para endpoint `/batch`

---

## 3. Mapa de Código

| Área | Arquivos/Pastas Principais | Função no Sistema |
|------|----------------------------|-------------------|
| **Frontend - Entry Point** | `frontend/src/index.js`, `App.js` | Inicialização React, roteamento, autenticação Supabase |
| **Frontend - Componentes** | `frontend/src/components/Map/MapView.jsx`, `Dashboard.jsx`, `Chat/AgronomicChat.jsx` | UI principal: mapas, gráficos, chat RAG |
| **Frontend - Serviços** | `frontend/src/services/api.js`, `opportunityService.js`, `favoriteService.js` | Comunicação com backend (Axios), lógica de negócio |
| **Backend - Entry Point** | `backend/server.js` (1464 linhas) | Servidor Express, middlewares, rotas principais, orquestração |
| **Backend - Autenticação** | `backend/authController_supabase.js`, `authMiddleware.js` | Supabase Auth, JWT validation, RBAC (admin/analyst) |
| **Backend - Rotas** | `backend/routes/etl.js`, `routes/ceasa.js`, `routes/favorites.js` | Endpoints REST organizados por domínio |
| **Backend - Utils** | `backend/utils/cache.js`, `jobQueue.js`, `circuitBreaker.js`, `prisma.js` | Cache LRU, fila de jobs, circuit breaker, singleton Prisma |
| **Backend - Banco** | `backend/prisma/schema.prisma`, `migrations/` | Schema Prisma, migrations, modelos (Opportunity, User, Document, etc.) |
| **AI Service - Entry Point** | `ai-service/main.py` (481 linhas) | FastAPI app, lifespan events, routers, middlewares |
| **AI Service - RAG** | `ai-service/services/rag_service.py`, `rag_ingestion.py` | RAG: embeddings, busca vetorial, LLM (gpt-4o-mini) |
| **AI Service - ML** | `ai-service/services/price_forecast.py` | Prophet (séries temporais), previsão de preços |
| **AI Service - Cálculos** | `ai-service/services/storage_advisor.py`, `arbitrage_calculator.py`, `production_calculator.py` | ROI, armazenagem, arbitragem, produção |
| **AI Service - Clima** | `ai-service/services/climate/intelligence.py`, `extreme_events.py`, `risk_analyzer.py` | APIs meteorológicas, eventos extremos, análise de risco |
| **AI Service - ETL** | `ai-service/services/data_sync/market_scraper.py`, `ibge_scraper.py` | Scraping CEASA/Agrolink/CONAB, IBGE SIDRA |
| **AI Service - Routers** | `ai-service/routers/predictions.py`, `calculations.py`, `chat.py`, `admin.py` | Endpoints FastAPI organizados por funcionalidade |
| **AI Service - Config** | `ai-service/config/crops.py`, `calendar.py`, `soybean_formulas.py`, `corn_formulas.py` | Especificações de culturas, fórmulas matemáticas, calendário de plantio |
| **AI Service - Models** | `ai-service/models/schemas.py`, `document_model.py` | Pydantic schemas (request/response), SQLAlchemy models |
| **AI Service - Utils** | `ai-service/utils/database.py`, `cache.py`, `auth_middleware.py` | SQLAlchemy engine, cache manager, autenticação interna |
| **Scripts** | `ai-service/scripts/run_etl.py`, `scheduler_worker.py`, `migrate_units_to_kg.py` | ETL manual, scheduler, migrações de dados |
| **Infra** | `docker-compose.yml`, `Dockerfile`, `railway.json` | Docker Compose, containers, deploy Railway |
| **Docs** | `docs/` | Documentação técnica, planejamento, guias |

---

## 4. Camada de IA / RAG

### 4.1. Localização da Lógica de IA

**RAG (Retrieval-Augmented Generation):**
- Serviço Principal: `ai-service/services/rag_service.py` (169 linhas)
- Ingestão: `ai-service/services/rag_ingestion.py` (140 linhas)
- Modelo de Dados: `ai-service/models/document_model.py` (SQLAlchemy)
- Router: `ai-service/routers/chat.py`
- Frontend: `frontend/src/components/Chat/AgronomicChat.jsx`

**ML (Machine Learning):**
- Previsão de Preços: `ai-service/services/price_forecast.py` (407 linhas) - Prophet
- Recomendações: `ai-service/services/recommendation_engine.py`
- Análise de Armazenagem: `ai-service/services/storage_advisor.py` (324 linhas) - modelos econométricos

### 4.2. Processo de Ingestão de PDFs

#### 1. Leitura e Chunking

```python
# ai-service/services/rag_ingestion.py
loader = PyPDFLoader(file_path)
raw_docs = loader.load()

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # 1000 caracteres por chunk
    chunk_overlap=200,    # 200 caracteres de sobreposição
    separators=["\n\n", "\n", " ", ""]
)
chunks = text_splitter.split_documents(raw_docs)
```

#### 2. Geração de Embeddings

```python
# Modelo: text-embedding-3-small (1536 dimensões)
vectors = self.embeddings_model.embed_documents(texts)
```

#### 3. Persistência no Banco

```python
doc = Document(
    content=chunk.page_content,
    metadata_={
        "source": "Clima e Produção de Tomates no Brasil.pdf",
        "page": chunk.metadata.get("page", 0),
        "crop": "Tomate",
        "theme": "Clima"
    },
    embedding=vectors[i]  # vector(1536)
)
session.add(doc)
```

**PDFs Ingeridos Atualmente:**
- Clima e Produção de Tomates no Brasil.pdf
- Função Custo de Armazenagem de Tomate.pdf
- Épocas de Plantio e Métricas de Decisão para Cultivo de Tomate no Brasil.pdf

**Status:** PDFs de Soja e Milho existem na raiz, mas não foram ingeridos ainda.

### 4.3. Indexação (pgvector)

**Tabela Document (PostgreSQL):**
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY,
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(1536),  -- pgvector
    "createdAt" TIMESTAMP DEFAULT NOW()
);
```

**Índice Recomendado (HNSW):**
```sql
CREATE INDEX documents_embedding_idx ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Status Atual:** Índice HNSW não foi criado ainda. O sistema funciona sem índice, mas será lento com muitos documentos.

### 4.4. Consulta RAG

```python
def _retrieve_context(self, question: str, k=8):
    # 1. Vetoriza a pergunta
    query_vector = self.embeddings.embed_query(question)
    
    # 2. Busca vetorial (cosine distance)
    stmt = select(Document).order_by(
        Document.embedding.cosine_distance(query_vector)
    ).limit(k)
    
    # 3. Retorna top k chunks mais similares
    results = session.execute(stmt).scalars().all()
    return [{"content": doc.content, "metadata": doc.metadata_} for doc in results]
```

**Limitações Identificadas:**
- Sem reranking: Usa apenas similaridade de embedding (sem BM25, sem reranking com LLM)
- Sem filtros por metadata: Não filtra por `crop`, `theme` antes da busca
- Sem cache de embeddings: Recalcula embedding da pergunta a cada consulta
- Top k fixo: Sempre retorna 8 chunks (não adapta por relevância)

---

## 5. Segurança

### 5.1. Autenticação e Autorização

**Autenticação:**
- Supabase Auth (JWT tokens)
- Tokens armazenados em `localStorage` (frontend)
- Validação via middleware `verifyToken` (backend)

**Autorização:**
- RBAC (Role-Based Access Control)
- Roles: `admin`, `analyst`
- Middleware `checkRole(['admin'])` para rotas administrativas

**Autenticação Interna:**
- Header `X-Internal-API-Key` para comunicação entre Node.js e Python
- Variável `INTERNAL_API_KEY` compartilhada entre serviços

### 5.2. Proteções Implementadas

| Recurso | Implementação | Localização |
|---------|---------------|-------------|
| **CORS** | Validação de origem dinâmica | `backend/server.js` (linhas 88-109) |
| **Circuit Breaker** | Proteção contra sobrecarga do banco | `backend/utils/circuitBreaker.js` |
| **Rate Limiting** | Limite de requisições (Distance Matrix) | `ai-service/services/distance_matrix.py` |
| **Hash de Senhas** | Bcrypt (10 rounds) | `backend/authController.js` |
| **Audit Logs** | Rastreamento de ações críticas | `backend/services/auditService.js` |
| **Validação de Input** | Pydantic schemas (Python), Joi (Node.js) | `ai-service/models/schemas.py` |

---

## 6. Performance

### 6.1. Cache

**Backend (Node.js):**
- Cache LRU em memória (`utils/cache.js`)
- TTL configurável por tipo de dado
- Cache de 15 minutos para `/api/opportunities`
- Cache de 5 minutos para dados dinâmicos (dólar, clima)

**AI Service (Python):**
- Cache LRU de modelos Prophet (8 modelos diferentes)
- Cache de embeddings de perguntas (não implementado ainda)
- Cache de dados climáticos (12h TTL)

### 6.2. Índices no Banco de Dados

**Tabela `Opportunity`:**
- `@@index([product])`
- `@@index([state])`
- `@@index([product, state])`
- `@@index([roi])` - Ordenação rápida por ROI
- `@@index([createdAt])` - Ordenação por data
- `@@index([geom], type: Gist)` - Consultas geoespaciais

**Tabela `Document`:**
- Índice HNSW recomendado (não criado ainda)

### 6.3. Jobs Assíncronos

**ETL:**
- Jobs em background via `jobQueue.js`
- Não bloqueia requisições HTTP
- Progress tracking via WebSocket (opcional)

**Scheduler Worker:**
- Script separado (`scripts/scheduler_worker.py`)
- Executa ETLs periódicos
- Não roda no mesmo processo do FastAPI (evita execução duplicada)

---

## 7. Observabilidade

### 7.1. Logging

**Backend:**
- Winston (formato JSON em produção, colorido em dev)
- Rotação de logs (5MB, 5 arquivos)
- Níveis: error, warn, info, debug

**AI Service:**
- Logging padrão Python
- Arquivo `agro_ai.log`
- Níveis: ERROR, WARNING, INFO, DEBUG

### 7.2. Monitoramento

**Sentry:**
- Integrado no backend e frontend
- Captura erros e exceções
- Rastreamento de performance

**Health Checks:**
- `GET /health` - Básico (rápido, para load balancers)
- `GET /health/detailed` - Completo (banco, serviços, APIs, recursos)

### 7.3. Audit Logs

**Tabela `AuditLog`:**
- Campos: `id`, `action`, `details`, `userId`, `createdAt`
- Serviço: `backend/services/auditService.js`
- Uso: Login, criação de oportunidades, ETL (parcialmente implementado)

---

## 8. Débitos Técnicos

### 8.1. Críticos

1. **RAG: Falta Índice HNSW no pgvector**
   - Impacto: Busca vetorial será lenta com muitos documentos (O(n) sem índice)
   - Solução: Criar índice HNSW no PostgreSQL

2. **RAG: PDFs de Soja e Milho Não Ingeridos**
   - Impacto: Chat não responde perguntas sobre soja e milho
   - Solução: Executar `rag_ingestion.py` com configuração para Soja e Milho

3. **Falta `.env.example`**
   - Impacto: Dificulta setup para novos desenvolvedores
   - Solução: Criar `backend/.env.example`, `ai-service/.env.example`, `frontend/.env.local.example`

4. **AuditLog Não Usado Efetivamente**
   - Impacto: Falta rastreabilidade de ações críticas
   - Solução: Adicionar `logAction()` em rotas críticas

### 8.2. Importantes

5. **RAG: Sem Filtros por Metadata**
   - Impacto: Busca retorna chunks de todas as culturas, mesmo quando pergunta é específica
   - Solução: Adicionar filtros opcionais `crop` e `theme` em `rag_service.py`

6. **RAG: Sem Cache de Embeddings de Perguntas**
   - Impacto: Recalcula embedding a cada consulta (custo OpenAI)
   - Solução: Cache LRU de embeddings

7. **Prophet: Validação de Modelos Pendente**
   - Impacto: Não há métricas de qualidade (MAE, RMSE)
   - Solução: Adicionar backtesting em `price_forecast.py`

8. **ETL: Scheduler Worker Não Configurado no Railway**
   - Impacto: ETLs não rodam automaticamente em produção
   - Solução: Configurar como Job separado no Railway

9. **Frontend: Hardcoded URLs**
   - Impacto: Dificulta deploy em diferentes ambientes
   - Solução: Usar `process.env.REACT_APP_API_URL` sempre

10. **Banco: Falta Índice GIN em Document.metadata**
    - Impacto: Busca por metadata pode ser lenta
    - Solução: Criar índice GIN em metadata

---

## 9. Extensibilidade

### 9.1. Adicionar Nova Cultura

**Passos:**
1. Criar `{crop}_formulas.py` com fórmulas específicas
2. Criar `{crop}_params.py` importando de `{crop}_formulas.py`
3. Atualizar `crops.py` para importar `{CROP}_SPECS`
4. Atualizar `calendar.py` com calendário regional
5. Atualizar `storage_advisor.py` para detectar nova cultura

**Exemplo para Trigo:**
```python
# 1. Criar wheat_formulas.py
# 2. Criar wheat_params.py
# 3. Em crops.py:
from .wheat_params import WHEAT_SPECS
CROPS_SPECS['Trigo'] = WHEAT_SPECS
```

### 9.2. Adicionar Nova Integração Externa

**Padrão:**
1. Criar serviço em `ai-service/services/data_sync/{service}_service.py`
2. Criar router em `ai-service/routers/{service}.py`
3. Integrar no `main.py`
4. Adicionar cache se necessário
5. Documentar no README

---

## 10. Referências

- [Análise Exaustiva de Arquitetura](./ANALISE_EXAUSTIVA_ARQUITETURA.md) - Análise detalhada com débitos técnicos
- [API Reference](./API_REFERENCE.md) - Documentação completa de endpoints
- [Schema Documents Contract](./SCHEMA_DOCUMENTS_CONTRACT.md) - Contrato de schema da tabela `documents`

---

**Última atualização:** Dezembro 2025

