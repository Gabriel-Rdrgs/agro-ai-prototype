# Sistema RAG (Retrieval-Augmented Generation)

**Versão:** 1.0  
**Última Atualização:** Dezembro 2025

---

## 1. Visão Geral

O sistema RAG permite consultas em linguagem natural sobre documentos técnicos agrícolas (PDFs da Embrapa, UFG, ZARC), gerando respostas precisas baseadas no conhecimento científico.

**Arquitetura:**
- **Ingestão:** PDFs → Chunks → Embeddings → Banco Vetorial
- **Consulta:** Pergunta → Embedding → Busca Vetorial → Contexto → LLM → Resposta

---

## 2. Componentes

### 2.1. Serviços Principais

| Serviço | Arquivo | Função |
|---------|---------|--------|
| **RAG Service** | `ai-service/services/rag_service.py` | Consulta RAG: busca vetorial + LLM |
| **Ingestion Service** | `ai-service/services/rag_ingestion.py` | Ingestão de PDFs: chunking + embeddings |
| **Document Model** | `ai-service/models/document_model.py` | Modelo SQLAlchemy da tabela `documents` |

### 2.2. Modelos e APIs

| Componente | Tecnologia | Versão |
|------------|------------|--------|
| **Embeddings** | OpenAI `text-embedding-3-small` | 1536 dimensões |
| **LLM** | OpenAI `gpt-4o-mini` | - |
| **Banco Vetorial** | PostgreSQL + pgvector | - |
| **Framework** | LangChain | - |

---

## 3. Ingestão de Documentos

### 3.1. Processo de Ingestão

#### Passo 1: Leitura de PDF

```python
# ai-service/services/rag_ingestion.py
from langchain_community.document_loaders import PyPDFLoader

loader = PyPDFLoader(file_path)
raw_docs = loader.load()
```

#### Passo 2: Chunking (Quebra de Texto)

```python
from langchain.text_splitter import RecursiveCharacterTextSplitter

text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,      # 1000 caracteres por chunk
    chunk_overlap=200,    # 200 caracteres de sobreposição
    separators=["\n\n", "\n", " ", ""]
)
chunks = text_splitter.split_documents(raw_docs)
```

**Parâmetros:**
- `chunk_size=1000`: Tamanho ideal para contexto do LLM
- `chunk_overlap=200`: Mantém contexto entre chunks adjacentes
- `separators`: Prioriza quebras naturais (parágrafos, linhas)

#### Passo 3: Geração de Embeddings

```python
from langchain_openai import OpenAIEmbeddings

embeddings_model = OpenAIEmbeddings(
    model="text-embedding-3-small",  # 1536 dimensões
    openai_api_key=OPENAI_API_KEY
)

vectors = embeddings_model.embed_documents(texts)
```

**Modelo:** `text-embedding-3-small`
- **Dimensões:** 1536
- **Custo:** $0.02 por 1M tokens
- **Performance:** Rápido e eficiente

#### Passo 4: Persistência no Banco

```python
from models.document_model import Document

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
session.commit()
```

### 3.2. PDFs Ingeridos

**Status Atual:**
- ✅ Clima e Produção de Tomates no Brasil.pdf
- ✅ Função Custo de Armazenagem de Tomate.pdf
- ✅ Épocas de Plantio e Métricas de Decisão para Cultivo de Tomate no Brasil.pdf
- ❌ Clima e Produção de Soja.pdf (existe na raiz, não ingerido)
- ❌ Clima e Produção de Milho.pdf (existe na raiz, não ingerido)

### 3.3. Executar Ingestão

**Local:**
```bash
cd ai-service
python services/rag_ingestion.py
```

**Docker:**
```bash
docker exec -it agro_brain python services/rag_ingestion.py
```

**Railway:**
1. Acesse Railway → AI Service → Console
2. Execute: `python services/rag_ingestion.py`

---

## 4. Consulta RAG

### 4.1. Fluxo de Consulta

#### Passo 1: Vetorização da Pergunta

```python
# ai-service/services/rag_service.py
query_vector = self.embeddings.embed_query(question)
```

#### Passo 2: Busca Vetorial

```python
from sqlalchemy import select
from pgvector.sqlalchemy import Vector

stmt = select(Document).order_by(
    Document.embedding.cosine_distance(query_vector)
).limit(8)

results = session.execute(stmt).scalars().all()
```

**Métrica:** Cosine Distance (similaridade de cosseno)
- **Vantagem:** Normalizada, não depende do tamanho do vetor
- **Range:** 0 (idêntico) a 2 (oposto)

#### Passo 3: Montagem de Contexto

```python
context_text = "\n\n".join([
    f"[Fonte: {doc.metadata_['source']}, Página {doc.metadata_['page']}]\n{doc.content}"
    for doc in relevant_docs
])
```

#### Passo 4: Geração de Resposta (LLM)

```python
from langchain_openai import ChatOpenAI
from langchain.schema import SystemMessage, HumanMessage

llm = ChatOpenAI(
    model="gpt-4o-mini",
    temperature=0.1,  # Baixa temperatura = respostas mais determinísticas
    openai_api_key=OPENAI_API_KEY
)

system_prompt = """Você é um assistente agronômico especializado em cultivos brasileiros.
Responda baseado APENAS no contexto fornecido. Se não souber, diga que não tem informação suficiente."""

user_prompt = f"""Contexto:
{context_text}

Pergunta: {question}

Resposta:"""

response = llm.invoke([
    SystemMessage(content=system_prompt),
    HumanMessage(content=user_prompt)
])
```

**Modelo:** `gpt-4o-mini`
- **Custo:** $0.15 por 1M tokens de entrada, $0.60 por 1M tokens de saída
- **Performance:** Rápido e eficiente para RAG
- **Temperatura:** 0.1 (respostas determinísticas)

### 4.2. Endpoint API

**Backend (Node.js):**
```javascript
// backend/server.js
app.post('/api/ai/chat/query', verifyToken, async (req, res) => {
  const response = await pythonAxios.post('/api/v1/chat/query', {
    question: req.body.question
  }, {
    headers: { 'X-Internal-API-Key': INTERNAL_API_KEY }
  });
  res.json(response.data);
});
```

**AI Service (Python):**
```python
# ai-service/routers/chat.py
@router.post("/query")
async def chat_query(request: ChatRequest):
    result = rag_service.ask(request.question)
    return result
```

**Frontend:**
```javascript
// frontend/src/components/Chat/AgronomicChat.jsx
const response = await chatService.askAgronomist(question);
```

---

## 5. Schema do Banco de Dados

### 5.1. Tabela `documents`

**Schema:**
```sql
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    metadata JSONB,
    embedding vector(1536),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

**Campos:**
- `id`: UUID (chave primária)
- `content`: Texto do chunk
- `metadata`: JSONB com {source, page, crop, theme}
- `embedding`: Vetor de 1536 dimensões (pgvector)
- `createdAt`: Timestamp de criação

### 5.2. Índices

**Índice HNSW (Recomendado, não criado ainda):**
```sql
CREATE INDEX documents_embedding_idx ON documents 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Índice GIN em Metadata (Recomendado, não criado ainda):**
```sql
CREATE INDEX documents_metadata_idx ON documents USING GIN (metadata);
```

**Status Atual:** Sistema funciona sem índices, mas será lento com muitos documentos.

---

## 6. Limitações e Melhorias

### 6.1. Limitações Atuais

1. **Sem Filtros por Metadata**
   - Busca retorna chunks de todas as culturas, mesmo quando pergunta é específica
   - **Solução:** Adicionar filtros opcionais `crop` e `theme` em `rag_service.py`

2. **Sem Cache de Embeddings de Perguntas**
   - Recalcula embedding a cada consulta (custo OpenAI)
   - **Solução:** Cache LRU de embeddings

3. **Sem Reranking**
   - Usa apenas similaridade de embedding (sem BM25, sem reranking com LLM)
   - **Solução:** Adicionar reranking com LLM após busca vetorial

4. **Top k Fixo**
   - Sempre retorna 8 chunks (não adapta por relevância)
   - **Solução:** Adaptar k baseado em score de similaridade

5. **Chunking Simples**
   - Quebra apenas por tamanho (não considera estrutura do PDF)
   - **Solução:** Quebrar por estrutura (títulos, tabelas)

### 6.2. Melhorias Recomendadas

#### Curto Prazo

1. **Adicionar Filtros por Metadata**
   ```python
   def _retrieve_context(self, question: str, crop: str = None, theme: str = None, k=8):
       stmt = select(Document)
       if crop:
           stmt = stmt.where(Document.metadata_['crop'].astext == crop)
       if theme:
           stmt = stmt.where(Document.metadata_['theme'].astext == theme)
       # ... busca vetorial
   ```

2. **Criar Índice HNSW**
   ```sql
   CREATE INDEX documents_embedding_idx ON documents 
   USING hnsw (embedding vector_cosine_ops)
   WITH (m = 16, ef_construction = 64);
   ```

3. **Cache de Embeddings**
   ```python
   from functools import lru_cache
   
   @lru_cache(maxsize=100)
   def _get_query_embedding(self, question: str):
       return self.embeddings.embed_query(question)
   ```

#### Médio Prazo

4. **Reranking com LLM**
   - Após busca vetorial, rerank top 20 → top 3
   - Melhora precisão de respostas

5. **Busca Híbrida (Vetorial + BM25)**
   - Combina pgvector com PostgreSQL full-text search
   - Melhor recall para termos específicos

#### Longo Prazo

6. **Multi-modal RAG**
   - Extrair tabelas e figuras dos PDFs
   - Embeddings de imagens (ex: gráficos de produtividade)

7. **Grafo de Conhecimento**
   - Construir grafo de conhecimento (entidades: culturas, regiões, épocas)
   - Busca por relacionamentos (ex: "Quais culturas são plantadas em GO?")

---

## 7. Custos

### 7.1. Embeddings

**Modelo:** `text-embedding-3-small`
- **Custo:** $0.02 por 1M tokens
- **Exemplo:** 1000 chunks de 1000 caracteres ≈ 1M tokens ≈ $0.02

### 7.2. LLM

**Modelo:** `gpt-4o-mini`
- **Entrada:** $0.15 por 1M tokens
- **Saída:** $0.60 por 1M tokens
- **Exemplo:** 1 pergunta com 8 chunks ≈ 10k tokens ≈ $0.0015

### 7.3. Estimativa Mensal

**Cenário Conservador (100 usuários, 10 perguntas/dia):**
- Embeddings: ~$5/mês
- LLM: ~$50/mês
- **Total:** ~$55/mês

**Cenário Médio (500 usuários, 20 perguntas/dia):**
- Embeddings: ~$25/mês
- LLM: ~$250/mês
- **Total:** ~$275/mês

---

## 8. Referências

- [Schema Documents Contract](./SCHEMA_DOCUMENTS_CONTRACT.md) - Contrato de schema da tabela `documents`
- [Arquitetura](./ARQUITETURA.md) - Visão geral da arquitetura do sistema

---

**Última atualização:** Dezembro 2025

