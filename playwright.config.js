// playwright.config.js
// ✅ FEAT-002: Configuração do Playwright para testes E2E

const { defineConfig, devices } = require('@playwright/test');

/**
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
  testDir: './e2e',
  
  /* Tempo máximo para um único teste */
  timeout: 30 * 1000,
  
  /* Tempo máximo para expect (assertions) */
  expect: {
    timeout: 5000
  },
  
  /* Executa testes em paralelo */
  fullyParallel: true,
  
  /* Falha o build se você deixou test.only no CI */
  forbidOnly: !!process.env.CI,
  
  /* Retry em CI se os testes falharem */
  retries: process.env.CI ? 2 : 0,
  
  /* Workers em CI vs local */
  workers: process.env.CI ? 1 : undefined,
  
  /* Reporter para usar. Ver https://playwright.dev/docs/test-reporters */
  reporter: [
    ['html'],
    ['list'],
    process.env.CI ? ['github'] : ['json', { outputFile: 'test-results.json' }]
  ],
  
  /* Compartilhado configurações para todos os projetos abaixo. Ver https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* URL base para usar em navegação como `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    
    /* Coleta trace quando retenta o teste. Ver https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',
    
    /* Screenshot apenas em falhas */
    screenshot: 'only-on-failure',
    
    /* Video apenas em falhas */
    video: 'retain-on-failure',
  },

  /* Configura projetos para múltiplos navegadores */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Testes em dispositivos móveis */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* Executa o servidor de desenvolvimento local antes de iniciar os testes */
  webServer: {
    command: 'cd frontend && npm start',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

