# 🚀 Guia de CI/CD - GitHub Actions

Este guia explica como o pipeline de CI/CD funciona e como interpretar os resultados.

---

## 📋 Workflow: `.github/workflows/test.yml`

### Triggers (Quando Roda)

- **Push** para branches `main` ou `develop`
- **Pull Request** para branches `main` ou `develop`
- **Manual** (via GitHub Actions UI)

---

## 🔧 Jobs Executados

### 1. Backend Tests (Jest)

**Nome:** `backend-test`

**O que faz:**
- Instala dependências Node.js
- Valida schema do Prisma
- Executa testes Jest (41 testes)
- Gera relatório de cobertura
- Faz upload do relatório como artifact

**Testes executados:**
- `tests/api/opportunities.test.js` (6 testes)
- `tests/api/batch.test.js` (7 testes)
- `tests/api/chat.test.js` (8 testes)
- `tests/auth/auth.test.js` (13 testes)
- `tests/auth/rbac.test.js` (7 testes)

**Variáveis de ambiente:**
- `NODE_ENV=test`
- `JWT_SECRET=test-jwt-secret`
- `PYTHON_API_URL=http://localhost:8000`
- `DATABASE_URL=postgresql://test:test@localhost:5432/test`

---

### 2. Python Tests (Pytest)

**Nome:** `python-test`

**O que faz:**
- Instala dependências Python
- Executa testes Pytest (15 testes)
- Gera relatório de cobertura HTML
- Faz upload do relatório como artifact

**Testes executados:**
- `tests/test_prophet.py` (8 testes)
- `tests/test_rag.py` (7 testes)

**Variáveis de ambiente:**
- `NODE_ENV=test`
- `DATABASE_URL=postgresql://test:test@localhost:5432/test`
- `OPENAI_API_KEY` (do secrets, ou 'test-key' como fallback)

---

### 3. Frontend Test (Build)

**Nome:** `frontend-test`

**O que faz:**
- Instala dependências Node.js
- Executa ESLint (se configurado)
- Faz build do React (validação)

**Variáveis de ambiente:**
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_API_URL`

---

### 4. Python Service Check

**Nome:** `python-check`

**O que faz:**
- Valida que dependências principais podem ser importadas
- Verifica que não há erros de sintaxe

---

### 5. Test Summary

**Nome:** `test-summary`

**O que faz:**
- Baixa artifacts de cobertura
- Gera resumo dos resultados
- Exibe no GitHub Actions UI

---

## 📊 Como Ver os Resultados

### 1. No GitHub

1. Acesse: `https://github.com/[seu-usuario]/agro-ai-prototype/actions`
2. Clique no workflow mais recente
3. Veja o status de cada job
4. Clique em um job para ver logs detalhados

### 2. Artifacts (Relatórios de Cobertura)

1. No workflow, role até "Artifacts"
2. Baixe `backend-coverage` ou `python-coverage`
3. Abra `index.html` no navegador para ver cobertura detalhada

### 3. Resumo dos Testes

O resumo aparece automaticamente no final do workflow:
- Status de cada job
- Total de testes executados
- Links para logs detalhados

---

## ✅ Status dos Testes

### Sucesso (Verde)

Todos os testes passaram:
- ✅ Backend: 41/41 testes passando
- ✅ Python: 15/15 testes passando
- ✅ Frontend: Build bem-sucedido

### Falha (Vermelho)

Algum teste falhou:
- ❌ Verifique os logs do job que falhou
- ❌ Corrija o problema
- ❌ Faça commit e push novamente

### Parcial (Amarelo)

Alguns jobs falharam, mas não críticos:
- ⚠️ Verifique warnings nos logs
- ⚠️ Alguns testes podem estar pulados (skip)

---

## 🔍 Troubleshooting

### Erro: "Tests failed"

**Causa:** Algum teste falhou

**Solução:**
1. Veja os logs do job que falhou
2. Identifique qual teste falhou
3. Corrija o código ou o teste
4. Faça commit e push

### Erro: "Module not found"

**Causa:** Dependência não instalada

**Solução:**
1. Verifique se está no `package.json` ou `requirements.txt`
2. Execute `npm install` ou `pip install` localmente
3. Faça commit das mudanças

### Erro: "Database connection failed"

**Causa:** Testes tentam conectar ao banco real

**Solução:**
- Os testes usam mocks, não deveriam conectar ao banco real
- Verifique se mocks estão configurados corretamente
- Verifique variáveis de ambiente no workflow

### Erro: "Coverage report not generated"

**Causa:** Cobertura pode falhar sem quebrar o workflow

**Solução:**
- Não é crítico, mas verifique se testes estão rodando
- Verifique se `pytest-cov` ou `jest --coverage` está instalado

---

## 🔐 Secrets Necessários

Configure no GitHub: `Settings → Secrets and variables → Actions`

**Opcionais (para testes):**
- `OPENAI_API_KEY` - Para testes de integração do RAG (opcional, usa 'test-key' como fallback)
- `DATABASE_URL` - Para validação do Prisma (opcional, usa URL de teste)
- `DIRECT_URL` - Para validação do Prisma (opcional)

**Para produção (não usado nos testes):**
- `REACT_APP_SUPABASE_URL`
- `REACT_APP_SUPABASE_ANON_KEY`
- `REACT_APP_API_URL`

---

## 📈 Melhorias Futuras

- [ ] Badge de status no README
- [ ] Notificações (Slack/Email) em caso de falha
- [ ] Testes de integração end-to-end
- [ ] Testes de performance
- [ ] Deploy automático após testes passarem
- [ ] Análise de código (SonarQube, CodeQL)

---

## 🎯 Boas Práticas

1. **Sempre verifique os testes antes de fazer merge**
2. **Corrija testes quebrados imediatamente**
3. **Mantenha cobertura de código acima de 60%**
4. **Use mocks para testes isolados**
5. **Documente testes complexos**

---

**Última atualização:** Dezembro 2025

