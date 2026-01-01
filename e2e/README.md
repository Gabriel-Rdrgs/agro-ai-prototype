# 🧪 Testes E2E com Playwright

## ✅ FEAT-002: Testes End-to-End

Este diretório contém os testes E2E (End-to-End) da aplicação Agro-AI usando Playwright.

## 📋 Pré-requisitos

1. **Instalar Playwright:**
   ```bash
   npm install -D @playwright/test
   npx playwright install
   ```

2. **Configurar variáveis de ambiente:**
   ```bash
   export TEST_USER_EMAIL=admin@agro.com
   export TEST_USER_PASSWORD=admin123
   ```

## 🚀 Como executar

### Executar todos os testes
```bash
npx playwright test
```

### Executar testes específicos
```bash
npx playwright test e2e/auth.spec.js
npx playwright test e2e/map.spec.js
```

### Executar em modo UI (interativo)
```bash
npx playwright test --ui
```

### Executar em modo debug
```bash
npx playwright test --debug
```

### Executar em navegador específico
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## 📁 Estrutura dos Testes

- `auth.spec.js` - Testes de autenticação (login, logout)
- `map.spec.js` - Testes do mapa e interação com oportunidades
- `dashboard.spec.js` - Testes do dashboard e visualizações
- `calculator.spec.js` - Testes da calculadora de ROI
- `example.spec.js` - Exemplo básico de teste

## ⚙️ Configuração

A configuração do Playwright está em `playwright.config.js` na raiz do projeto.

### Variáveis de Ambiente

- `PLAYWRIGHT_BASE_URL` - URL base da aplicação (padrão: http://localhost:3000)
- `TEST_USER_EMAIL` - Email do usuário de teste
- `TEST_USER_PASSWORD` - Senha do usuário de teste

## 📊 Relatórios

Após executar os testes, um relatório HTML é gerado:

```bash
npx playwright show-report
```

## 🔧 Troubleshooting

### Testes falhando por timeout

Aumente o timeout no `playwright.config.js`:
```javascript
timeout: 60 * 1000, // 60 segundos
```

### Servidor não inicia

Certifique-se de que a porta 3000 está livre e que o frontend está configurado corretamente.

### Erros de autenticação

Verifique se as credenciais de teste estão corretas e se o backend está rodando.

## 📝 Notas

- Os testes são configurados para executar o servidor de desenvolvimento automaticamente
- Em CI/CD, o servidor deve estar rodando antes dos testes
- Alguns testes podem ser pulados se elementos não forem encontrados (anotações de skip)

