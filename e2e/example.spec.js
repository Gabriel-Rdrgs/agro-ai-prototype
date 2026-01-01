// e2e/example.spec.js
// ✅ FEAT-002: Exemplo de teste E2E básico

const { test, expect } = require('@playwright/test');

test('exemplo básico - página inicial carrega', async ({ page }) => {
  await page.goto('/');
  
  // Verifica se a página carregou
  await expect(page).toHaveTitle(/agro|ai/i);
  
  // Ou verifica algum elemento específico
  const body = page.locator('body');
  await expect(body).toBeVisible();
});

