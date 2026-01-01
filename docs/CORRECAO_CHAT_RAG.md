# 🔧 Correção: Erro 400 no Chat RAG

**Data:** Janeiro 2026  
**Problema:** Erro 400 (Bad Request) ao fazer perguntas no chat RAG  
**Status:** ✅ **CORRIGIDO**

---

## 🐛 Problema Identificado

O endpoint `/api/ai/chat/query` estava retornando erro 400 devido a uma **inconsistência entre o schema de validação e o formato esperado**:

- **Schema Zod esperava:** `query` (campo obrigatório)
- **Frontend enviava:** `question` (campo obrigatório)
- **Endpoint processava:** `question` (campo obrigatório)

Isso causava falha na validação Zod antes mesmo de chegar ao processamento do endpoint.

---

## ✅ Correção Aplicada

### 1. Schema de Validação Atualizado

**Arquivo:** `backend/validators/aiValidators.js`

```javascript
// ANTES (incorreto):
const chatQueryBodySchema = z.object({
  query: z.string().min(1, 'Query é obrigatória'),
  context: z.string().optional(),
  product: z.string().optional()
});

// DEPOIS (corrigido):
const chatQueryBodySchema = z.object({
  question: z.string().min(1, 'Question é obrigatória').optional(),
  query: z.string().min(1, 'Query é obrigatória').optional(),
  context: z.string().optional(),
  product: z.string().optional()
}).refine((data) => data.question || data.query, {
  message: 'É necessário fornecer "question" ou "query"',
  path: ['question']
});
```

**Mudanças:**
- ✅ Aceita tanto `question` quanto `query` (retrocompatibilidade)
- ✅ Valida que pelo menos um dos dois está presente
- ✅ Prioriza `question` (formato usado pelo frontend)

### 2. Endpoint Atualizado

**Arquivo:** `backend/server.js`

```javascript
// ANTES:
if (!req.body.question || typeof req.body.question !== 'string' || req.body.question.trim().length === 0) {
  return res.status(400).json({ error: 'Campo "question" é obrigatório...' });
}

// DEPOIS:
const questionText = (req.body.question || req.body.query || '').trim();

if (!questionText || questionText.length === 0) {
  return res.status(400).json({ error: 'Campo "question" ou "query" é obrigatório...' });
}
```

**Mudanças:**
- ✅ Normaliza `question` ou `query` para `question`
- ✅ Mensagem de erro mais clara
- ✅ Mantém compatibilidade com ambos os formatos

---

## 🧪 Como Testar

1. **Reinicie o backend:**
   ```bash
   # No terminal do Docker
   docker compose restart agro_backend
   ```

2. **Teste no frontend:**
   - Acesse o chat agronômico
   - Faça uma pergunta: "Qual a temperatura ideal para soja?"
   - Deve funcionar sem erro 400

3. **Verifique os logs:**
   ```bash
   docker compose logs -f agro_backend | grep "Chat RAG"
   ```

---

## 📊 Fluxo Corrigido

```
Frontend (React)
  ↓
POST /api/ai/chat/query
  Body: { question: "Qual a temperatura ideal para soja?" }
  ↓
Backend Node.js
  ↓
1. Validação Zod ✅ (aceita 'question')
  ↓
2. Normalização ✅ (question || query)
  ↓
3. Proxy para Python ✅
  POST http://ai-service:8000/api/v1/chat/query
  Body: { question: "..." }
  ↓
Python FastAPI
  ↓
4. RAG Service ✅
  ↓
5. Resposta ✅
  { answer: "...", sources: [...] }
```

---

## 🔍 Verificação Adicional

Se ainda houver problemas, verifique:

1. **Token de autenticação:**
   - O endpoint requer `verifyToken`
   - Verifique se o token está sendo enviado no header

2. **Conexão com Python:**
   - Verifique se `ai-service` está rodando
   - Verifique logs: `docker compose logs -f agro_brain`

3. **Variáveis de ambiente:**
   - `OPENAI_API_KEY` deve estar configurada no `ai-service/.env`
   - Verifique: `docker compose exec agro_brain env | grep OPENAI`

---

## ✅ Status

- ✅ Schema de validação corrigido
- ✅ Endpoint atualizado para normalizar campos
- ✅ Retrocompatibilidade mantida
- ✅ Pronto para teste

---

**Última atualização:** Janeiro 2026

