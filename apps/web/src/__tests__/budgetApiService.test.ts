import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { budgetApiService } from '../services/budgetApiService';

describe('budgetApiService (PostgreSQL schema)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchBudgets lista orçamentos anuais', async () => {
    const mockBudgets = [
      { id: '2026', year: 2026, initialBalance: 5000, emergencyReserveTarget: 15000 },
      { id: '2027', year: 2027, initialBalance: 8000, emergencyReserveTarget: 18000 },
    ];

    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url) => {
      capturedUrl = String(url);
      return {
        ok: true,
        json: async () => mockBudgets,
      } as unknown as Response;
    });

    const result = await budgetApiService.fetchBudgets();
    expect(capturedUrl).toBe('/api/v1/budgets');
    expect(result).toHaveLength(2);
    expect(result[0].year).toBe(2026);
  });

  it('fetchBudgetYear busca visão anual completa', async () => {
    const mockVm = {
      budget: { id: '2026', year: 2026, initialBalance: 5000, emergencyReserveTarget: 15000 },
      items: [],
      costs: [],
      goals: [],
    };

    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url) => {
      capturedUrl = String(url);
      return {
        ok: true,
        json: async () => mockVm,
      } as unknown as Response;
    });

    const result = await budgetApiService.fetchBudgetYear(2026);
    expect(capturedUrl).toBe('/api/v1/budgets/2026');
    expect(result.budget.year).toBe(2026);
  });

  it('fetchSummary busca resumo agregado do backend', async () => {
    const mockSummary = {
      year: 2026,
      initialBalance: 5000,
      emergencyReserveTarget: 15000,
      months: [
        {
          month: 1,
          income: 10000,
          cards: 2000,
          fixed: 3000,
          variable: 1500,
          oneTimeCosts: 0,
          totalExpenses: 6500,
          monthBalance: 3500,
          accumulatedBalance: 8500,
        },
      ],
      totals: {
        income: 120000,
        cards: 24000,
        fixed: 36000,
        variable: 18000,
        oneTimeCosts: 0,
        totalExpenses: 78000,
        netBalance: 42000,
        finalAccumulated: 47000,
      },
    };

    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url) => {
      capturedUrl = String(url);
      return {
        ok: true,
        json: async () => mockSummary,
      } as unknown as Response;
    });

    const result = await budgetApiService.fetchSummary(2026);
    expect(capturedUrl).toBe('/api/v1/budgets/2026/summary');
    expect(result.year).toBe(2026);
    expect(result.months).toHaveLength(1);
  });

  it('createItem dispara POST atômico com body correto', async () => {
    const itemData = {
      budgetId: '2026',
      name: 'Aluguel',
      type: 'fixa',
    };

    let capturedBody = '';
    let capturedMethod = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      capturedMethod = init?.method || '';
      capturedBody = init?.body as string;
      return {
        ok: true,
        json: async () => ({ id: 'fix-1', ...itemData }),
      } as unknown as Response;
    });

    const res = await budgetApiService.createItem(itemData);
    expect(capturedMethod).toBe('POST');
    expect(JSON.parse(capturedBody).name).toBe('Aluguel');
    expect(res.id).toBe('fix-1');
  });

  it('updateEntry dispara PATCH atômico parcial', async () => {
    let capturedMethod = '';
    let capturedUrl = '';
    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || '';
      capturedBody = init?.body as string;
      return {
        ok: true,
        json: async () => ({ id: 'entry-1', plannedAmount: 8500 }),
      } as unknown as Response;
    });

    const res = await budgetApiService.updateEntry('entry-1', { plannedAmount: 8500 });
    expect(capturedMethod).toBe('PATCH');
    expect(capturedUrl).toBe('/api/v1/entries/entry-1');
    expect(JSON.parse(capturedBody).plannedAmount).toBe(8500);
    expect(res.plannedAmount).toBe(8500);
  });

  it('deleteItem dispara DELETE atômico', async () => {
    let capturedMethod = '';
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || '';
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as unknown as Response;
    });

    await budgetApiService.deleteItem('item-123');
    expect(capturedMethod).toBe('DELETE');
    expect(capturedUrl).toBe('/api/v1/items/item-123');
  });

  it('createReserveMovement dispara POST imutável', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || '';
      capturedBody = init?.body as string;
      return {
        ok: true,
        json: async () => ({ id: 'res-1', budgetId: '2026', month: 5, amount: 2000 }),
      } as unknown as Response;
    });

    const res = await budgetApiService.createReserveMovement({
      budgetId: '2026',
      month: 5,
      amount: 2000,
      reason: 'Aporte extra',
    });
    expect(capturedMethod).toBe('POST');
    expect(capturedUrl).toBe('/api/v1/reserve-movements');
    expect(JSON.parse(capturedBody).amount).toBe(2000);
    expect(res.amount).toBe(2000);
  });
});
