# 🧪 Testes Automatizados - Backend Node.js

Este diretório contém testes automatizados usando **Jest** e **Supertest** para validar o funcionamento dos endpoints do backend.

---

## 📋 Estrutura

```
tests/
├── __mocks__/          # Mocks de dependências (Prisma, Axios, etc.)
│   ├── prisma.js
│   └── axios.js
├── helpers/            # Funções auxiliares para testes
│   └── authHelper.js
├── api/                # Testes de endpoints
│   ├── opportunities.test.js
│   ├── batch.test.js
│   └── chat.test.js
├── setup.js            # Configuração global
└── README.md           # Este arquivo
```

---

## 🚀 Como Rodar os Testes

### 1. Instalar Dependências

```bash
cd backend
npm install
```

### 2. Rodar Todos os Testes

```bash
npm test
```

### 3. Rodar em Modo Watch (desenvolvimento)

```bash
npm run test:watch
```

### 4. Com Cobertura de Código

```bash
npm run test:coverage
```

Isso gera um relatório HTML em `coverage/lcov-report/index.html`.

---

## 📝 Testes Disponíveis

### Testes de API

#### `opportunities.test.js`
- ✅ Autenticação (401 sem token)
- ✅ Retorno de oportunidades com token válido
- ✅ Cache HIT/MISS
- ✅ Limites e paginação
- ✅ Tratamento de erros

#### `batch.test.js`
- ✅ Validação de payload (items obrigatório)
- ✅ Sanitização de dados (conversão de tipos)
- ✅ Valores padrão quando campos faltam
- ✅ Integração com Python
- ✅ Tratamento de erros (ECONNREFUSED, timeout)

#### `chat.test.js`
- ✅ Validação de question (obrigatório, não vazio)
- ✅ Trim de espaços
- ✅ Proxy para Python
- ✅ Resposta padrão quando Python não retorna answer
- ✅ Tratamento de erros (ECONNREFUSED, timeout)

---

## 🔧 Configuração

### Jest Config (`jest.config.js`)

- **Test Environment:** Node.js
- **Test Match:** `**/tests/**/*.test.js`
- **Coverage:** Inclui `server.js`, `routes/`, `services/`, `utils/`
- **Timeout:** 10 segundos por teste

### Variáveis de Ambiente

Os testes usam variáveis de ambiente de teste (definidas em `setup.js`):
- `NODE_ENV=test`
- `JWT_SECRET=test-jwt-secret`
- `PYTHON_API_URL=http://localhost:8000`
- `DATABASE_URL=postgresql://test:test@localhost:5432/test_db`

---

## 🎯 Mocks

### Prisma Mock

O mock do Prisma (`__mocks__/prisma.js`) simula:
- `opportunity.findMany()`
- `ceasaPrice.findMany()`
- `user.findUnique()`
- `auditLog.create()`
- etc.

### Axios Mock

O mock do Axios (`__mocks__/axios.js`) permite simular:
- Chamadas HTTP para Python
- Respostas de sucesso/erro
- Timeouts
- Erros de conexão

---

## 📊 Exemplo de Saída

```
PASS  tests/api/opportunities.test.js
  GET /api/opportunities
    ✓ deve retornar 401 sem token (15ms)
    ✓ deve retornar oportunidades com token válido (12ms)
    ✓ deve usar cache quando disponível (HIT) (8ms)
    ✓ deve respeitar limite de registros (10ms)
    ✓ deve limitar máximo a 1000 registros (9ms)
    ✓ deve tratar erro do banco de dados (7ms)

PASS  tests/api/batch.test.js
  POST /api/ai/batch
    ✓ deve retornar 401 sem token (8ms)
    ✓ deve retornar 400 se items não for array (6ms)
    ✓ deve sanitizar dados corretamente (25ms)
    ✓ deve usar valores padrão quando campos faltarem (12ms)
    ✓ deve tratar erro quando Python não está disponível (5ms)

PASS  tests/api/chat.test.js
  POST /api/ai/chat/query
    ✓ deve retornar 401 sem token (7ms)
    ✓ deve retornar 400 se question não for fornecido (5ms)
    ✓ deve retornar resposta do Python com sucesso (18ms)
    ✓ deve trimar espaços da question (8ms)
    ✓ deve tratar timeout do Python (6ms)

Test Suites: 3 passed, 3 total
Tests:       18 passed, 18 total
Time:        2.5s
```

---

## 🐛 Troubleshooting

### Erro: "Cannot find module 'supertest'"

**Solução:**
```bash
npm install --save-dev supertest
```

### Erro: "JWT_SECRET is not defined"

**Solução:**
Verifique se `setup.js` está sendo carregado (definido em `jest.config.js`).

### Testes falhando com "ECONNREFUSED"

**Causa:** Mock do Axios não está configurado corretamente.

**Solução:**
Certifique-se de que `jest.mock('axios')` está no topo do arquivo de teste.

### Testes muito lentos

**Causa:** Timeout padrão pode ser insuficiente.

**Solução:**
Aumente o timeout em `jest.config.js` ou use `jest.setTimeout()` no teste específico.

---

## 📚 Próximos Passos

- [ ] Adicionar testes de autenticação/RBAC
- [ ] Adicionar testes de integração end-to-end
- [ ] Adicionar testes de performance
- [ ] Configurar CI/CD (GitHub Actions) para rodar testes automaticamente
- [ ] Adicionar testes de carga (stress tests)

---

**Última atualização:** Dezembro 2025

