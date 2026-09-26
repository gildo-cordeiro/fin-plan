import { test, expect } from '@playwright/test';

test.describe('FinPlan - Fluxo Principal e E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Intercepta rotas da API para testes E2E herméticos
    await page.route('/api/budget', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            exists: true,
            data: {
              version: 5,
              months: [
                { id: '2026-10', name: 'Outubro 2026', shortName: 'Out/26', year: 2026, monthIndex: 9 },
                { id: '2026-11', name: 'Novembro 2026', shortName: 'Nov/26', year: 2026, monthIndex: 10 },
              ],
              simulation: {
                varsPercent: 0,
                rendaPercent: 0,
                oneTimeMarginPercent: 0,
                initialBalance: 5000,
                emergencyReserve: 3000,
              },
              incomes: [
                { id: 'inc-1', name: 'Salário Principal', category: 'renda', values: { '2026-10': 7000, '2026-11': 7000 } },
              ],
              lists: {
                cartoes: [
                  { id: 'c-1', name: 'Cartão Nubank', category: 'cartoes', values: { '2026-10': 1500, '2026-11': 1500 } },
                ],
                fixas: [
                  { id: 'f-1', name: 'Aluguel', category: 'fixas', values: { '2026-10': 2000, '2026-11': 2000 } },
                ],
                vars: [
                  { id: 'v-1', name: 'Mercado', category: 'vars', values: { '2026-10': 1000, '2026-11': 1000 } },
                ],
              },
              oneTimeCosts: [],
              goals: [],
            },
            updatedAt: new Date().toISOString(),
          }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, updatedAt: new Date().toISOString() }),
        });
      }
    });

    await page.goto('/');
  });

  test('carrega a aplicação e exibe o cabeçalho e navegação fixa', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'FinPlan' })).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'Navegação Principal' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mês Atual' })).toBeVisible();
    await expect(page.getByRole('button', { name: '12 Meses & Gráficos' })).toBeVisible();
  });

  test('permite navegar entre as abas principais', async ({ page }) => {
    // Aba 12 Meses & Gráficos
    await page.getByRole('button', { name: '12 Meses & Gráficos' }).click();
    await expect(page.getByRole('button', { name: 'Visualizar horizonte de 12 Meses (1 ano)' })).toBeVisible();

    // Aba Metas & Reserva
    await page.getByRole('button', { name: 'Metas & Reserva' }).click();
    await expect(page.getByText('Metas & Eventos Financeiros')).toBeVisible();

    // Aba Simulações
    await page.getByRole('button', { name: 'Simulações' }).click();
    await expect(page.getByRole('heading', { name: 'Simulador de Cenários Financeiros' })).toBeVisible();

    // Volta para o Mês Atual
    await page.getByRole('button', { name: 'Mês Atual' }).click();
    await expect(page.getByText('Renda Prevista')).toBeVisible();
  });

  test('abre accordions fechados por padrão e exibe totais', async ({ page }) => {
    // Accordion de Despesas Fixas deve estar fechado inicialmente e exibir o total de R$ 2.000,00
    const fixasButton = page.getByRole('button', { name: /Despesas Fixas/i });
    await expect(fixasButton).toBeVisible();
    await expect(fixasButton).toContainText('2.000,00');

    // Clica para expandir
    await fixasButton.click();
    await expect(page.locator('input[value="Aluguel"]')).toBeVisible();
  });
});
