# 📚 Ingestão Completa de PDFs Agronômicos

## 🎯 Objetivo

Ingerir **TODOS os 9 PDFs** disponíveis no banco vetorial para maximizar o conhecimento da IA sobre:
- **Clima e Produção** (Soja, Milho, Tomate)
- **Épocas de Plantio** (Soja, Milho, Tomate)
- **Custo de Armazenagem** (Soja, Milho, Tomate)

---

## 📋 PDFs a Serem Ingeridos

### 1. Clima e Produção (3 PDFs)
- ✅ `Clima e Produção de Soja.pdf` (já ingerido anteriormente)
- ✅ `Clima e Produção de Milho no Brasil.pdf` (já ingerido anteriormente)
- ⚠️ `Clima e Produção de Tomates no Brasil.pdf` (novo)

### 2. Épocas de Plantio (3 PDFs)
- ⚠️ `Épocas de Plantio e Métricas de Decisão para Cultivo de Soja no Brasil.pdf` (novo)
- ⚠️ `Épocas de Plantio e Métricas de Decisão para Cultivo de Milho no Brasil.pdf` (novo)
- ⚠️ `Épocas de Plantio e Métricas de Decisão paraCultivo de Tomate no Brasil.pdf` (novo)

### 3. Custo de Armazenagem (3 PDFs)
- ⚠️ `Função Custo Armazenagem Soja.pdf` (novo)
- ⚠️ `Função Custo de Armazenagem de Milho.pdf` (novo)
- ⚠️ `Função Custo de Armazenagem de Tomate.pdf` (novo)

**Total:** 9 PDFs (2 já ingeridos, 7 novos)

---

## 🚀 Como Executar

### Pré-requisitos

1. **PDFs na raiz do projeto**
   - Verifique se todos os 9 PDFs estão na raiz: `/home/soares/Área de Trabalho/agro-ai-prototype/`

2. **Variáveis de ambiente configuradas**
   - `OPENAI_API_KEY` deve estar configurada no `.env` do `ai-service/`
   - Banco de dados acessível (Supabase)

3. **Ambiente Python ativo**
   ```bash
   cd ai-service
   source venv/bin/activate  # ou seu ambiente virtual
   ```

### Execução

```bash
cd ai-service
python scripts/ingest_all_pdfs.py
```

### O que o script faz:

1. **Lista todos os PDFs** encontrados na raiz do projeto
2. **Processa cada PDF** em sequência:
   - Extrai texto e divide em chunks
   - Gera embeddings via OpenAI
   - Salva no banco vetorial com metadata rica
3. **Gera relatório detalhado** ao final:
   - PDFs ingeridos com sucesso
   - PDFs não encontrados
   - Erros (se houver)
   - Total de chunks salvos

---

## 📊 Metadata Organizada

Cada PDF será salvo com metadata estruturada:

```json
{
  "crop": "Soja|Milho|Tomate",
  "theme": "Clima|Épocas de Plantio|Custo de Armazenagem",
  "source_type": "ClimaProducao|EpocasPlantio|CustoArmazenagem",
  "category": "Clima e Produção|Épocas de Plantio|Custo de Armazenagem",
  "source": "nome_do_arquivo.pdf",
  "page": 0
}
```

Isso permite:
- **Filtros precisos** por cultura e tema
- **Busca contextual** mais relevante
- **Rastreabilidade** da fonte de informação

---

## ⏱️ Tempo Estimado

- **Por PDF:** ~2-5 minutos (depende do tamanho e da API OpenAI)
- **Total (9 PDFs):** ~20-45 minutos

**Nota:** O script processa sequencialmente para evitar sobrecarga na API.

---

## ✅ Resultado Esperado

Após a execução bem-sucedida:

1. **Chat RAG expandido:**
   - Responde sobre **3 culturas** (Soja, Milho, Tomate)
   - Cobre **3 temas** (Clima, Épocas de Plantio, Custo de Armazenagem)
   - Total de **~100-200 chunks** no banco vetorial

2. **Exemplos de perguntas que a IA poderá responder:**
   - "Qual a temperatura ideal para soja?"
   - "Quando é a melhor época para plantar milho em Goiás?"
   - "Qual o custo de armazenagem de tomate?"
   - "Quais são as épocas de plantio de soja no Sul do Brasil?"
   - "Como o clima afeta a produção de milho?"

---

## 🔍 Verificação

### Verificar PDFs ingeridos no banco:

```sql
-- No Supabase SQL Editor
SELECT 
    metadata->>'crop' as cultura,
    metadata->>'category' as categoria,
    COUNT(*) as chunks
FROM documents
GROUP BY metadata->>'crop', metadata->>'category'
ORDER BY cultura, categoria;
```

### Resultado esperado:

| cultura | categoria | chunks |
|---------|-----------|--------|
| Milho | Clima e Produção | ~21 |
| Milho | Custo de Armazenagem | ~X |
| Milho | Épocas de Plantio | ~X |
| Soja | Clima e Produção | ~15 |
| Soja | Custo de Armazenagem | ~X |
| Soja | Épocas de Plantio | ~X |
| Tomate | Clima e Produção | ~X |
| Tomate | Custo de Armazenagem | ~X |
| Tomate | Épocas de Plantio | ~X |

---

## 🐛 Troubleshooting

### Erro: "PDF não encontrado"
- **Solução:** Verifique se o PDF está na raiz do projeto
- **Verificar:** `ls -la *.pdf` na raiz

### Erro: "OPENAI_API_KEY não encontrada"
- **Solução:** Configure a variável no `.env` do `ai-service/`
- **Verificar:** `cat ai-service/.env | grep OPENAI_API_KEY`

### Erro: "A string literal cannot contain NUL (0x00) characters"
- **Solução:** Já corrigido! O script limpa caracteres NUL automaticamente

### Erro: "Connection timeout" ou "Rate limit"
- **Solução:** Aguarde alguns minutos e execute novamente
- **Nota:** O script processa sequencialmente para evitar rate limits

---

## 📝 Notas Importantes

1. **PDFs já ingeridos serão processados novamente:**
   - Isso criará **duplicatas** no banco
   - Se quiser evitar, remova os PDFs já ingeridos da lista ou verifique antes

2. **Custo da API OpenAI:**
   - Cada PDF gera ~15-30 embeddings
   - Custo estimado: ~$0.01-0.05 por PDF
   - Total (9 PDFs): ~$0.10-0.50

3. **Performance:**
   - Com os índices HNSW e GIN criados, a busca será muito rápida
   - Mesmo com 200+ chunks, a busca vetorial será instantânea

---

## 🎉 Próximos Passos

Após a ingestão completa:

1. **Testar o chat** com perguntas sobre todas as culturas e temas
2. **Verificar performance** da busca RAG
3. **Documentar** exemplos de perguntas e respostas
4. **Considerar** adicionar mais PDFs no futuro (outras culturas, temas)

---

**Última atualização:** Dezembro 2025

