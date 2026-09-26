import { test, expect } from '@playwright/test';

test.describe('FinPlan - Fluxo Principal e E2E', () => {
  test.beforeEach(async ({ page }) => {
    const currentYear = new Date().getFullYear();
    const currentYearStr = String(currentYear);

    const mockYear = {
      id: currentYearStr,
      year: currentYear,
      simulation: {
        varsPercent: 0,
        rendaPercent: 0,
        oneTimeMarginPercent: 0,
        initialBalance: 5000,
        emergencyReserve: 3000,
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const mockViewModel = {
      year: mockYear,
      months: [
        { id: `${currentYear}-10`, budgetYearId: currentYearStr, name: `Outubro ${currentYear}`, shortName: `Out/${String(currentYear).slice(-2)}`, year: currentYear, monthIndex: 9 },
        { id: `${currentYear}-11`, budgetYearId: currentYearStr, name: `Novembro ${currentYear}`, shortName: `Nov/${String(currentYear).slice(-2)}`, year: currentYear, monthIndex: 10 },
      ],
      items: [
        { id: 'inc-1', name: 'Salário Principal', category: 'renda', type: 'renda', values: { [`${currentYear}-10`]: 7000, [`${currentYear}-11`]: 7000 } },
        { id: 'c-1', name: 'Cartão Nubank', category: 'cartoes', type: 'cartao', values: { [`${currentYear}-10`]: 1500, [`${currentYear}-11`]: 1500 } },
        { id: 'f-1', name: 'Aluguel', category: 'fixas', type: 'fixa', values: { [`${currentYear}-10`]: 2000, [`${currentYear}-11`]: 2000 } },
        { id: 'v-1', name: 'Mercado', category: 'vars', type: 'var', values: { [`${currentYear}-10`]: 1000, [`${currentYear}-11`]: 1000 } },
      ],
      oneTimeCosts: [],
      goals: [],
    };

    // Intercepta listagem de anos
    await page.route('**/api/v1/budget-years', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([mockYear]),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mockYear),
        });
      }
    });

    // Intercepta visão do ano agregada
    await page.route(`**/api/v1/budget-years/${currentYear}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockViewModel),
      });
    });

    // Intercepta rota curinga para outros anos
    await page.route(/\/api\/v1\/budget-years\/\d+/, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockViewModel),
      });
    });

    // Intercepta endpoints atômicos
    await page.route('**/api/v1/budget-items**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'item-mock' }),
      });
    });

    await page.route('**/api/v1/one-time-costs**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'cost-mock' }),
      });
    });

    await page.route('**/api/v1/goals**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, id: 'goal-mock' }),
      });
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
