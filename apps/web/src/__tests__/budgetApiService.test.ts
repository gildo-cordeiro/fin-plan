import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { budgetApiService } from '../services/budgetApiService';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';

describe('budgetApiService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('fetchBudgetYears lista anos disponíveis', async () => {
    const mockYears = [
      { id: '2026', year: 2026, simulation: INITIAL_BUDGET_STATE.simulation, createdAt: '2026-01-01', updatedAt: '2026-01-01' },
      { id: '2027', year: 2027, simulation: INITIAL_BUDGET_STATE.simulation, createdAt: '2027-01-01', updatedAt: '2027-01-01' },
    ];

    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url) => {
      capturedUrl = String(url);
      return {
        ok: true,
        json: async () => mockYears,
      } as unknown as Response;
    });

    const result = await budgetApiService.fetchBudgetYears();
    expect(capturedUrl).toBe('/api/v1/budget-years');
    expect(result).toHaveLength(2);
    expect(result[0].year).toBe(2026);
  });

  it('fetchBudgetYear busca visão anual agregada', async () => {
    const mockVm = {
      year: { id: '2026', year: 2026, simulation: INITIAL_BUDGET_STATE.simulation },
      months: INITIAL_BUDGET_STATE.months,
      items: [],
      oneTimeCosts: [],
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
    expect(capturedUrl).toBe('/api/v1/budget-years/2026');
    expect(result.year.year).toBe(2026);
    expect(result.months).toHaveLength(INITIAL_BUDGET_STATE.months.length);
  });

  it('createBudgetItem dispara POST atômico com body correto', async () => {
    const itemData = {
      name: 'Aluguel',
      type: 'fixa' as const,
      values: { '2026-10': 2500 },
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

    const res = await budgetApiService.createBudgetItem(itemData);
    expect(capturedMethod).toBe('POST');
    expect(JSON.parse(capturedBody).name).toBe('Aluguel');
    expect(res.id).toBe('fix-1');
  });

  it('updateBudgetItem dispara PATCH atômico', async () => {
    let capturedMethod = '';
    let capturedUrl = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || '';
      return {
        ok: true,
        json: async () => ({ id: 'fix-1', name: 'Aluguel Reajustado' }),
      } as unknown as Response;
    });

    const res = await budgetApiService.updateBudgetItem('fix-1', { name: 'Aluguel Reajustado' });
    expect(capturedMethod).toBe('PATCH');
    expect(capturedUrl).toBe('/api/v1/budget-items/fix-1');
    expect(res.name).toBe('Aluguel Reajustado');
  });

  it('deleteBudgetItem dispara DELETE atômico', async () => {
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

    const res = await budgetApiService.deleteBudgetItem('item-123');
    expect(capturedMethod).toBe('DELETE');
    expect(capturedUrl).toBe('/api/v1/budget-items/item-123');
    expect(res).toBe(true);
  });

  it('updateYearSimulation dispara PATCH na rota do ano', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || '';
      return {
        ok: true,
        json: async () => ({ id: '2026', year: 2026, simulation: INITIAL_BUDGET_STATE.simulation }),
      } as unknown as Response;
    });

    const res = await budgetApiService.updateYearSimulation(2026, INITIAL_BUDGET_STATE.simulation);
    expect(capturedMethod).toBe('PATCH');
    expect(capturedUrl).toBe('/api/v1/budget-years/2026');
    expect(res.year).toBe(2026);
  });

  it('addGoalContribution dispara POST na rota de aportes', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (url, init) => {
      capturedUrl = String(url);
      capturedMethod = init?.method || '';
      return {
        ok: true,
        json: async () => ({ id: 'goal-1', name: 'Carro', contributions: [{ id: 'c1', amount: 500, date: '2026-10-01' }] }),
      } as unknown as Response;
    });

    const res = await budgetApiService.addGoalContribution('goal-1', { amount: 500, date: '2026-10-01' });
    expect(capturedMethod).toBe('POST');
    expect(capturedUrl).toBe('/api/v1/goals/goal-1/contributions');
    expect(res.contributions).toHaveLength(1);
  });

  it('lança erro apropriado quando status HTTP não for ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Ano orçamentário não encontrado.' }),
    } as unknown as Response);

    await expect(budgetApiService.fetchBudgetYear(2099)).rejects.toThrow(
      'Ano orçamentário não encontrado.'
    );
  });
});
