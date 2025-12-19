fix(backend): corrige autenticação com AI Service e atualiza documentação

### 🔧 Correções de Autenticação

**Problema:**
- Backend fazendo requisições ao AI Service sem header `X-Internal-API-Key`
- Todas as requisições retornando `401 Unauthorized`
- Erro nos logs: `❌ Requisição sem X-Internal-API-Key`

**Solução:**
- `backend/routes/etl.js`: Agora usa cliente axios configurado (`pythonAxios`) com autenticação
- Adiciona função `createPythonAxiosClient()` no arquivo ETL para garantir header correto
- Todas as requisições ao AI Service agora incluem `X-Internal-API-Key`

### 📚 Documentação

- `docs/GUIA_RAILWAY.md`:
  - Adicionada seção completa de configuração do **Backend**
  - Instruções claras sobre `INTERNAL_API_KEY` (CRÍTICO)
  - Aviso sobre necessidade de mesma chave no Backend e AI Service
  - Troubleshooting para erro 401 Unauthorized
  - Checklist atualizado com variáveis obrigatórias

### ⚠️ Ação Necessária no Railway

**IMPORTANTE:** Configure a variável `INTERNAL_API_KEY` no serviço Backend:
1. Railway Dashboard → Backend Service → Settings → Variables
2. Adicione: `INTERNAL_API_KEY` = (mesmo valor do AI Service)
3. Faça redeploy do Backend

Sem essa variável, todas as requisições ao AI Service continuarão falhando.

### 📝 Arquivos Alterados

- `backend/routes/etl.js` (correção de autenticação)
- `docs/GUIA_RAILWAY.md` (documentação do Backend)

