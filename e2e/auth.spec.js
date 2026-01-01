// e2e/auth.spec.js
// ✅ FEAT-002: Testes E2E de autenticação

const { test, expect } = require('@playwright/test');

test.describe('Autenticação', () => {
  test.beforeEach(async ({ page }) => {
    // Limpa localStorage antes de cada teste
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('deve exibir formulário de login na página inicial', async ({ page }) => {
    await page.goto('/');
    
    // Verifica se o formulário de login está visível
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('deve mostrar erro ao tentar login com credenciais inválidas', async ({ page }) => {
    await page.goto('/');
    
    // Preenche formulário com credenciais inválidas
    await page.fill('input[type="email"]', 'teste@invalido.com');
    await page.fill('input[type="password"]', 'senhaerrada');
    
    // Submete o formulário
    await page.click('button[type="submit"]');
    
    // Aguarda mensagem de erro (pode demorar um pouco)
    await expect(page.locator('text=/erro|incorreto|inválido/i')).toBeVisible({ timeout: 10000 });
  });

  test('deve fazer login com credenciais válidas', async ({ page }) => {
    // ⚠️ NOTA: Este teste requer credenciais válidas configuradas
    // Configure TEST_USER_EMAIL e TEST_USER_PASSWORD nas variáveis de ambiente
    const testEmail = process.env.TEST_USER_EMAIL || 'admin@agro.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'admin123';
    
    await page.goto('/');
    
    // Preenche formulário
    await page.fill('input[type="email"]', testEmail);
    await page.fill('input[type="password"]', testPassword);
    
    // Submete o formulário
    await page.click('button[type="submit"]');
    
    // Aguarda redirecionamento ou mudança na UI (mapa deve aparecer)
    // O mapa ou dashboard deve aparecer após login bem-sucedido
    await expect(
      page.locator('text=/mapa|dashboard|oportunidades/i').first()
    ).toBeVisible({ timeout: 15000 });
    
    // Verifica se o token foi salvo no localStorage
    const token = await page.evaluate(() => localStorage.getItem('token'));
    expect(token).toBeTruthy();
  });
});

