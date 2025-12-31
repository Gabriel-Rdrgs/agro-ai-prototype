# 📊 BASELINE METRICS - Estado Antes da Refatoração

**Data:** 2025-01-01  
**Branch:** `main` (antes de criar branch de trabalho)  
**Tag de Backup:** `backup-pre-refactor-20250101`

---

## ✅ Status dos Testes

### Backend (Jest)
- **Status:** ✅ PASS (com warnings esperados)
- **Testes Executados:**
  - `tests/api/batch.test.js`: 7 testes PASS
  - `tests/api/chat.test.js`: 8 testes PASS
- **Warnings:** Erros esperados de validação Supabase (testes de autenticação)

### Python (Pytest)
- **Status:** ⏳ Não executado ainda (será feito na ONDA 1)

---

## 📦 Dependências Atuais

### Backend (package.json)
```json
{
  "axios": "^1.13.2",  // ⚠️ RELATÓRIO DIZ QUE NÃO EXISTE - VERIFICAR
  "express": "^5.1.0",  // ⚠️ BETA (não-LTS)
  "@prisma/client": "^5.22.0",
  "@sentry/node": "^10.30.0",
  "@supabase/supabase-js": "^2.87.1"
}
```

### Versão Instalada vs Declarada
- **Axios:** Declarado `^1.13.2`, Instalado `1.13.2` (npm list confirma)
- **Nota:** Relatório indica que versão não existe no npm. Verificar se é typo ou versão customizada.

---

## 📁 Estrutura de Arquivos

### Arquivos Monolíticos Identificados
- `backend/server.js`: **77KB** (77.299 bytes) - ⚠️ CRÍTICO

### Arquivos de Backup (a remover)
- `Dockerfile.backup`
- `Dockerfile.backup-worker`
- `railway.backup.json`
- Possivelmente: `authController_supabase.js` vs `authController.js`

### PDFs no Repositório
- 6 PDFs (~2.4MB total) - ⚠️ Migrar para Git LFS ou storage externo

---

## 🔍 Problemas Críticos Confirmados

1. ✅ **Axios version:** Confirmado `^1.13.2` no package.json
2. ✅ **server.js monolítico:** Confirmado (77KB)
3. ✅ **Express 5.x beta:** Confirmado `^5.1.0`
4. ⏳ **Rate limiting:** A verificar
5. ⏳ **Validação env vars:** A verificar
6. ⏳ **Graceful shutdown:** A verificar

---

## 📝 Próximos Passos

1. Verificar versão correta do Axios no npm registry
2. Corrigir versão do Axios (CRIT-002)
3. Adicionar Helmet.js (CRIT-010)
4. Implementar rate limiting (CRIT-003)
5. Adicionar validação de env vars (CRIT-004)

---

**Última atualização:** 2025-01-01

