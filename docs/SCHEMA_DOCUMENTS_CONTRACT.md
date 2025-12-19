# 📋 Contrato de Schema - Tabela `documents`

Este documento define o **contrato único** da tabela `documents` para evitar drift entre Prisma (Node.js) e SQLAlchemy (Python).

---

## 🎯 Objetivo

Garantir que ambos os ORMs (Prisma e SQLAlchemy) usem a **mesma estrutura** da tabela `documents`, evitando inconsistências e erros de migração.

---

## 📊 Schema da Tabela

### Nome da Tabela
```sql
documents
```

### Estrutura Completa

| Coluna | Tipo | Nullable | Default | Descrição |
|--------|------|----------|---------|-----------|
| `id` | `UUID` (String) | ❌ NOT NULL | `gen_random_uuid()` | Identificador único (chave primária) |
| `content` | `TEXT` | ❌ NOT NULL | - | Conteúdo do chunk de texto |
| `metadata` | `JSONB` | ✅ NULL | `NULL` | Metadados do documento (JSON) |
| `embedding` | `vector(1536)` | ✅ NULL | `NULL` | Vetor de embedding (OpenAI `text-embedding-3-small`) |
| `createdAt` | `TIMESTAMP WITH TIME ZONE` | ❌ NOT NULL | `now()` | Data de criação |

---

## 🔧 Implementação em Prisma

**Arquivo:** `backend/prisma/schema.prisma`

```prisma
model Document {
  id        String                 @id @default(uuid())
  content   String
  metadata  Json?
  embedding Unsupported("vector")?
  createdAt DateTime               @default(now())

  @@map("documents")
}
```

**Notas:**
- `id` usa `@default(uuid())` (Prisma gera UUID)
- `metadata` é `Json?` (nullable JSON)
- `embedding` é `Unsupported("vector")?` (pgvector não suportado nativamente pelo Prisma)
- `createdAt` usa `@default(now())` (timestamp automático)

---

## 🐍 Implementação em SQLAlchemy

**Arquivo:** `ai-service/models/document_model.py`

```python
from sqlalchemy import Column, String, Text, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from pgvector.sqlalchemy import Vector
import uuid

class Document(Base):
    __tablename__ = "documents"

    # ID gerado pelo Python antes de inserir no banco
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    content = Column(Text, nullable=False)
    
    # metadata é mapeado para coluna "metadata" no banco
    metadata_ = Column("metadata", JSONB)
    
    # Vetor de 1536 dimensões (OpenAI text-embedding-3-small)
    embedding = Column(Vector(1536))
    
    createdAt = Column("createdAt", DateTime(timezone=True), server_default=func.now())
```

**Notas:**
- `id` usa `default=lambda: str(uuid.uuid4())` (Python gera UUID antes de inserir)
- `metadata_` é mapeado para coluna `metadata` no banco (JSONB)
- `embedding` usa `Vector(1536)` (pgvector)
- `createdAt` usa `server_default=func.now()` (timestamp automático do banco)

---

## 📝 Estrutura do Metadata (JSON)

O campo `metadata` deve seguir esta estrutura:

```json
{
  "source": "nome_do_arquivo.pdf",
  "page": 1,
  "crop": "Tomate",
  "theme": "Clima",
  "source_type": "ClimaProducao"
}
```

### Campos do Metadata

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `source` | `string` | ✅ Sim | Nome do arquivo PDF de origem |
| `page` | `number` | ✅ Sim | Número da página (1-indexed) |
| `crop` | `string` | ❌ Não | Cultura (ex: "Tomate", "Soja") |
| `theme` | `string` | ❌ Não | Tema do documento (ex: "Clima", "Armazenagem") |
| `source_type` | `string` | ❌ Não | Tipo de fonte (ex: "ClimaProducao", "CustoArmazenagem") |

---

## 🔍 Validação e Testes

### Checklist de Validação

- [ ] Prisma schema está sincronizado com este contrato
- [ ] SQLAlchemy model está sincronizado com este contrato
- [ ] Migrations do Prisma criam a tabela corretamente
- [ ] SQLAlchemy consegue ler/escrever na tabela
- [ ] Embeddings são vetores de 1536 dimensões
- [ ] Metadata segue o formato JSON especificado

### Comandos de Validação

**Prisma:**
```bash
cd backend
npx prisma db pull  # Verifica se o schema está sincronizado
npx prisma generate # Gera o cliente Prisma
```

**SQLAlchemy:**
```python
# Teste de leitura/escrita
from models.document_model import Document
from utils.database import get_db_session

with get_db_session() as session:
    doc = session.query(Document).first()
    print(doc.id, doc.content, doc.metadata)
```

---

## ⚠️ Regras Importantes

### 1. ID (UUID)

- **Prisma**: Gera UUID via `@default(uuid())` (no banco)
- **SQLAlchemy**: Gera UUID via `default=lambda: str(uuid.uuid4())` (no Python)
- **Ambos funcionam**, mas **SQLAlchemy gera antes de inserir** (mais seguro)

### 2. Embedding (Vector)

- **Dimensões**: Sempre `1536` (OpenAI `text-embedding-3-small`)
- **Tipo**: `vector(1536)` no PostgreSQL
- **Nullable**: Sim (pode ser NULL se não foi gerado ainda)

### 3. Metadata (JSONB)

- **Estrutura**: Sempre seguir o formato especificado acima
- **Nullable**: Sim (pode ser NULL)
- **Acesso**:
  - Prisma: `document.metadata.source`
  - SQLAlchemy: `document.metadata_["source"]` (note o `_` no nome do atributo)

### 4. CreatedAt (Timestamp)

- **Tipo**: `TIMESTAMP WITH TIME ZONE`
- **Default**: `now()` (automático)
- **Timezone**: Sempre UTC

---

## 🔄 Migrações

### Criar Migration no Prisma

```bash
cd backend
npx prisma migrate dev --name add_documents_table
```

### Verificar SQL Gerado

```bash
npx prisma migrate dev --create-only
# Verifica o arquivo gerado em prisma/migrations/
```

### Aplicar Migration

```bash
npx prisma migrate deploy
```

---

## 📚 Referências

- **Prisma Schema**: `backend/prisma/schema.prisma`
- **SQLAlchemy Model**: `ai-service/models/document_model.py`
- **Ingestão RAG**: `ai-service/services/rag_ingestion.py`
- **Serviço RAG**: `ai-service/services/rag_service.py`

---

## ✅ Checklist de Sincronização

Ao fazer mudanças no schema, verifique:

- [ ] Atualizar este documento
- [ ] Atualizar Prisma schema (`backend/prisma/schema.prisma`)
- [ ] Atualizar SQLAlchemy model (`ai-service/models/document_model.py`)
- [ ] Criar migration do Prisma
- [ ] Testar leitura/escrita em ambos os ORMs
- [ ] Validar estrutura do metadata
- [ ] Atualizar testes (se houver)

---

**Última atualização:** Dezembro 2025

