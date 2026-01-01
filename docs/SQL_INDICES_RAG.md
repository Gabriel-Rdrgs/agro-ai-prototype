# 📊 SQL - Índices para RAG (Performance)

Este documento contém os comandos SQL para criar índices que melhoram drasticamente a performance do RAG.

## ⚠️ IMPORTANTE

Execute estes comandos **diretamente no Supabase** (SQL Editor) ou via `psql`.

---

## 🔥 A1: Índice HNSW no pgvector

**Impacto:** 100-1000x mais rápido em busca vetorial  
**Tempo estimado:** 5 minutos  
**Status:** ⚠️ **PENDENTE**

### Comando SQL:

```sql
-- Cria índice HNSW para busca vetorial otimizada
CREATE INDEX IF NOT EXISTS documents_embedding_idx 
ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

### Verificação:

```sql
-- Verifica se o índice foi criado
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'documents' 
AND indexname = 'documents_embedding_idx';
```

### Notas:

- **HNSW (Hierarchical Navigable Small World):** Algoritmo de busca aproximada otimizado para vetores
- **m = 16:** Número de conexões bidirecionais (maior = mais preciso, mas mais lento para construir)
- **ef_construction = 64:** Número de candidatos durante construção (maior = mais preciso, mas mais lento)
- **vector_cosine_ops:** Operador para distância de cosseno (padrão para embeddings)

---

## 🔥 A6: Índice GIN em Document.metadata

**Impacto:** Performance de filtros por metadata  
**Tempo estimado:** 5 minutos  
**Status:** ⚠️ **PENDENTE**

### Comando SQL:

```sql
-- Cria índice GIN para busca rápida em campos JSONB (metadata)
CREATE INDEX IF NOT EXISTS documents_metadata_idx 
ON documents 
USING GIN (metadata);
```

### Verificação:

```sql
-- Verifica se o índice foi criado
SELECT 
    indexname, 
    indexdef 
FROM pg_indexes 
WHERE tablename = 'documents' 
AND indexname = 'documents_metadata_idx';
```

### Notas:

- **GIN (Generalized Inverted Index):** Otimizado para busca em campos JSONB
- Permite queries como: `WHERE metadata->>'crop' = 'Soja'`
- Melhora performance de filtros por cultura, tema, etc.

---

## 📋 Checklist de Execução

- [ ] Conectar ao Supabase (SQL Editor)
- [ ] Executar comando A1 (HNSW)
- [ ] Verificar criação do índice HNSW
- [ ] Executar comando A6 (GIN)
- [ ] Verificar criação do índice GIN
- [ ] Testar busca RAG (deve estar mais rápida)

---

## 🔍 Queries de Teste (Após Criar Índices)

### Teste de Busca Vetorial:

```sql
-- Busca similar (deve usar índice HNSW)
SELECT 
    id,
    content,
    metadata,
    embedding <-> (
        SELECT embedding 
        FROM documents 
        LIMIT 1
    ) AS distance
FROM documents
ORDER BY embedding <-> (
    SELECT embedding 
    FROM documents 
    LIMIT 1
)
LIMIT 8;
```

### Teste de Filtro por Metadata:

```sql
-- Busca por cultura (deve usar índice GIN)
SELECT 
    id,
    content,
    metadata->>'crop' AS crop,
    metadata->>'theme' AS theme
FROM documents
WHERE metadata->>'crop' = 'Tomate'
LIMIT 10;
```

---

**Fonte:** `PLANO_ACAO_CONSOLIDADO.md` - FASE A: A1 e A6

