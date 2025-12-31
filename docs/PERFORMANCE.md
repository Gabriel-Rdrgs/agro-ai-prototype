# Otimização de Performance

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025

---

## 1. Visão Geral

O sistema implementa múltiplas estratégias de otimização para garantir baixa latência e alta disponibilidade:

- Cache em memória (LRU)
- Índices no banco de dados
- Pré-cálculo de valores
- Jobs assíncronos
- Connection pooling

---

## 2. Cache

### 2.1. Backend (Node.js)

**Arquivo:** `backend/utils/cache.js`

**Implementação:**
- Cache LRU em memória
- TTL configurável por tipo de dado
- Limpeza automática de itens expirados

**Uso:**
```javascript
const cache = require('./utils/cache');

// Verifica cache
const cached = cache.get('opportunities:all');
if (cached) return res.json(cached);

// Salva no cache
cache.set('opportunities:all', data, 900); // 15 minutos
```

**TTL por Tipo de Dado:**
- Oportunidades: 15 minutos (dados mudam pouco)
- Dados dinâmicos (dólar, clima): 5 minutos
- Dados estáticos (configurações): 1 hora

**Limitações:**
- Cache em memória: perde dados ao reiniciar o container
- Não compartilhado entre múltiplas réplicas
- **Futuro:** Migrar para Redis (persistente, compartilhado)

### 2.2. AI Service (Python)

**Arquivo:** `ai-service/utils/cache.py`

**Implementação:**
- Cache LRU de modelos Prophet (8 modelos diferentes)
- Cache de dados climáticos (12h TTL)
- Cache de embeddings de perguntas (não implementado ainda)

**Uso:**
```python
from utils.cache import CacheManager

cache = CacheManager(ttl_seconds=3600)  # 1 hora

# Verifica cache
cached = cache.get('key')
if cached:
    return cached

# Salva no cache
cache.set('key', data)
```

---

## 3. Índices no Banco de Dados

### 3.1. Tabela `Opportunity`

**Índices Criados:**
```sql
CREATE INDEX "Opportunity_product_idx" ON "Opportunity"("product");
CREATE INDEX "Opportunity_state_idx" ON "Opportunity"("state");
CREATE INDEX "Opportunity_product_state_idx" ON "Opportunity"("product", "state");
CREATE INDEX "Opportunity_roi_idx" ON "Opportunity"("roi");  -- Ordenação rápida por ROI
CREATE INDEX "Opportunity_createdAt_idx" ON "Opportunity"("createdAt");  -- Ordenação por data
CREATE INDEX "opportunity_geom_idx" ON "Opportunity" USING GIST ("geom");  -- Consultas geoespaciais
```

**Impacto:**
- Busca por produto: O(1) em vez de O(n)
- Ordenação por ROI: O(n log n) em vez de O(n²)
- Consultas geoespaciais: Otimizadas com GIST

### 3.2. Tabela `Document` (RAG)

**Índice Recomendado (HNSW):**
```sql
CREATE INDEX documents_embedding_idx ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Status:** Não criado ainda. Sistema funciona sem índice, mas será lento com muitos documentos.

**Índice GIN em Metadata (Recomendado):**
```sql
CREATE INDEX documents_metadata_idx ON documents USING GIN (metadata);
```

**Status:** Não criado ainda. Melhora performance de filtros por metadata.

### 3.3. Tabela `CeasaPrice`

**Índices Criados:**
```sql
CREATE INDEX "CeasaPrice_product_name_idx" ON "CeasaPrice"("product_name");
CREATE INDEX "CeasaPrice_ceasa_region_idx" ON "CeasaPrice"("ceasa_region");
CREATE INDEX "CeasaPrice_price_date_idx" ON "CeasaPrice"("price_date");
CREATE INDEX "CeasaPrice_product_date_idx" ON "CeasaPrice"("product_name", "price_date");
```

**Impacto:**
- Busca por produto/data: O(log n) em vez de O(n)
- Queries do Prophet: Muito mais rápidas

---

## 4. Pré-Cálculo de Valores

### 4.1. ROI Pré-Calculado

**Tabela:** `Opportunity.roi`

**Vantagem:**
- Evita cálculo em tempo real
- Resposta instantânea no mapa
- Reduz carga no servidor

**Atualização:**
- Calculado durante ETL
- Recalculado via endpoint `/api/opportunities/calculate-all-roi` (admin)

### 4.2. Previsões Prophet

**Cache de Modelos:**
- Modelos Prophet são treinados e cacheados (LRU, 8 modelos)
- Evita retreinar a cada requisição
- Reduz latência de 5-10s para <1s

---

## 5. Jobs Assíncronos

### 5.1. ETL em Background

**Arquivo:** `backend/utils/jobQueue.js`

**Implementação:**
- Jobs em background via fila
- Não bloqueia requisições HTTP
- Progress tracking via WebSocket (opcional)

**Uso:**
```javascript
const jobId = jobQueue.createJob('etl', { type: 'all' });
jobQueue.startJob(jobId, async (job) => {
  // Processamento em background
});
```

**Vantagem:**
- Usuário recebe resposta imediata (job iniciado)
- Processamento pesado não bloqueia servidor
- Múltiplos jobs podem rodar em paralelo

### 5.2. Scheduler Worker

**Arquivo:** `ai-service/scripts/scheduler_worker.py`

**Implementação:**
- Script separado do FastAPI
- Executa ETLs periódicos
- Não roda no mesmo processo (evita execução duplicada)

**Vantagem:**
- ETLs não competem com requisições HTTP
- Pode escalar independentemente
- Fácil de monitorar e debugar

---

## 6. Connection Pooling

### 6.1. Prisma (Backend)

**Configuração:**
```javascript
// backend/utils/prisma.js
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
  // Connection pool
  __internal: {
    engine: {
      connectTimeout: 10000,
    },
  },
});
```

**Pool Size:**
- Padrão: 10 conexões
- Ajustável via `DATABASE_URL` (query parameter `?connection_limit=20`)

### 6.2. SQLAlchemy (AI Service)

**Configuração:**
```python
# ai-service/utils/database.py
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True  # Verifica conexões antes de usar
)
```

**Pool Size:**
- `pool_size=10`: Conexões mantidas no pool
- `max_overflow=20`: Conexões extras permitidas
- `pool_pre_ping=True`: Valida conexões antes de usar (evita erros)

---

## 7. Circuit Breaker

### 7.1. Implementação

**Arquivo:** `backend/utils/circuitBreaker.js`

**Funcionalidade:**
- Protege pool de conexões contra sobrecarga
- Abre circuito após N falhas consecutivas
- Fecha circuito após timeout

**Uso:**
```javascript
const { dbCircuitBreaker } = require('./utils/circuitBreaker');

await dbCircuitBreaker.execute(async () => {
  await prisma.$queryRaw`SELECT 1`;
});
```

**Estados:**
- **CLOSED**: Normal (requisições passam)
- **OPEN**: Circuito aberto (requisições bloqueadas)
- **HALF_OPEN**: Testando (algumas requisições passam)

---

## 8. Otimizações de Queries

### 8.1. Seleção de Campos

**Evitar `SELECT *`:**
```javascript
// ❌ Ruim
const opportunities = await prisma.opportunity.findMany();

// ✅ Bom
const opportunities = await prisma.opportunity.findMany({
  select: {
    id: true,
    product: true,
    state: true,
    roi: true,
    // Apenas campos necessários
  }
});
```

### 8.2. Paginação

**Implementação:**
```javascript
const opportunities = await prisma.opportunity.findMany({
  take: limit,
  skip: skip,
  orderBy: { roi: 'desc' }
});
```

**Vantagem:**
- Reduz quantidade de dados transferidos
- Melhora tempo de resposta
- Reduz uso de memória

### 8.3. Agregações no Banco

**Evitar processamento em memória:**
```javascript
// ❌ Ruim
const all = await prisma.opportunity.findMany();
const avg = all.reduce((sum, o) => sum + o.roi, 0) / all.length;

// ✅ Bom
const result = await prisma.opportunity.aggregate({
  _avg: { roi: true }
});
```

---

## 9. Métricas de Performance

### 9.1. Tempo de Resposta

**Meta:** < 2s (95% das requisições)

**Monitoramento:**
- Logs estruturados com duração
- Sentry performance tracking
- Health checks detalhados

### 9.2. Cache Hit Rate

**Meta:** > 80%

**Monitoramento:**
- Logs de cache hit/miss
- Métricas no health check (futuro)

### 9.3. Uptime

**Meta:** > 99.5%

**Monitoramento:**
- Railway health checks
- Vercel uptime monitoring
- Sentry alerts

---

## 10. Próximas Otimizações

### 10.1. Curto Prazo

1. **Redis para Cache Distribuído**
   - Cache persistente e compartilhado
   - Suporta múltiplas réplicas
   - TTL automático

2. **Índice HNSW no pgvector**
   - Busca vetorial O(log n) em vez de O(n)
   - Essencial para RAG com muitos documentos

3. **Índice GIN em Document.metadata**
   - Filtros por metadata muito mais rápidos
   - Essencial para RAG com filtros

### 10.2. Médio Prazo

4. **CDN para Assets Estáticos**
   - Reduz latência de carregamento
   - Reduz carga no servidor

5. **Database Read Replicas**
   - Distribui carga de leitura
   - Melhora performance de queries

6. **Query Optimization**
   - Analisar queries lentas com `EXPLAIN ANALYZE`
   - Otimizar queries complexas

### 10.3. Longo Prazo

7. **GraphQL para Frontend**
   - Reduz over-fetching
   - Permite queries específicas

8. **Microservices Adicionais**
   - Separar ETL em serviço dedicado
   - Separar RAG em serviço dedicado

---

## 11. Referências

- [Guia de Otimização de Performance](./OTIMIZACAO_PERFORMANCE.md) - Guia detalhado
- [Próximos Passos Otimização](./PROXIMOS_PASSOS_OTIMIZACAO.md) - Roadmap de otimizações

---

**Última atualização:** Dezembro 2025

