# 🧪 Guia Completo: Testes Automatizados

Este guia consolida toda a documentação sobre testes do projeto, incluindo resultados e resumos.

---

## 📋 Índice

1. [Resumo dos Testes](#resumo-dos-testes)
2. [Testes de Backend](#testes-de-backend)
3. [Testes de Autenticação e RBAC](#testes-de-autenticação-e-rbac)
4. [Executando Testes](#executando-testes)

---

## 📊 Resumo dos Testes

### Cobertura Geral

O projeto possui testes automatizados para:
- ✅ **Backend Node.js** (Jest)
- ✅ **AI Service Python** (Pytest)
- ✅ **Autenticação e RBAC**
- ✅ **Integração de APIs**

### Status Atual

- **Backend:** Testes implementados e passando
- **AI Service:** Testes de Prophet e RAG implementados
- **Autenticação:** Testes de RBAC implementados
- **CI/CD:** Testes executados automaticamente no GitHub Actions

---

## 🔧 Testes de Backend

### Executar Testes

```bash
cd backend
npm test
```

### Cobertura

- Rotas de API
- Middleware de autenticação
- Serviços de negócio
- Integração com banco de dados

---

## 🔐 Testes de Autenticação e RBAC

### Executar Testes

```bash
cd backend
npm test -- auth
```

### Cobertura

- Login e autenticação
- Controle de acesso baseado em roles
- Proteção de rotas
- Validação de tokens JWT

---

## 🐍 Testes do AI Service

### Executar Testes

```bash
cd ai-service
pytest
```

### Cobertura

- Serviço Prophet (previsões de preço)
- Serviço RAG (análise de documentos)
- Integração com OpenAI
- Validação de dados

---

## 📈 CI/CD

Os testes são executados automaticamente no GitHub Actions em cada push e pull request.

Veja [Guia de CI/CD](./GUIA_CI_CD.md) para mais detalhes.

---

## 🔗 Referências

- [Resultados Detalhados dos Testes](./RESULTADOS_TESTES.md)
- [Resultados de Backend](./RESULTADOS_TESTES_BACKEND.md)
- [Resultados de Auth/RBAC](./RESULTADOS_TESTES_AUTH_RBAC.md)

