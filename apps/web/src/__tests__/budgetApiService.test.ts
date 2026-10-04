import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { budgetApiService } from '../services/budgetApiService';

describe('budgetApiService (PostgreSQL schema)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockFetch(responseData: any) {
    let capturedMethod = '';
    let capturedUrl = '';
    let capturedBody = '';

    const fetchMock = async (req: any, init?: any) => {
      capturedUrl = typeof req === 'string' ? req : req.url;
      capturedMethod = init?.method || (typeof req === 'string' ? 'GET' : req.method);
      
      const bodySource = init?.body || (typeof req === 'string' ? undefined : req.body);
      if (typeof bodySource === 'string') {
        capturedBody = bodySource;
      } else if (req && typeof req !== 'string' && req.text) {
        capturedBody = await req.text();
      }

      if (responseData === null) {
          return new Response(null, { status: 204 });
      }

      return new Response(JSON.stringify(responseData), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    };

    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(fetchMock as any);

    return () => ({ capturedMethod, capturedUrl, capturedBody });
  }

  it('fetchBudgets lista orçamentos anuais', async () => {
    const getMock = mockFetch([{ id: '2026', year: 2026, initialBalance: 5000, emergencyReserveTarget: 15000 }]);
    const result = await budgetApiService.fetchBudgets();
    expect(getMock().capturedUrl).toBe('http://localhost:8080/api/v1/budgets');
    expect(result).toHaveLength(1);
    expect(result[0].year).toBe(2026);
  });

  it('fetchBudgetYear busca visão anual completa', async () => {
    const getMock = mockFetch({ budget: { id: '2026', year: 2026 } });
    const result = await budgetApiService.fetchBudgetYear(2026);
    expect(getMock().capturedUrl).toBe('http://localhost:8080/api/v1/budgets/2026');
    expect(result.budget.year).toBe(2026);
  });

  it('fetchSummary busca resumo agregado do backend', async () => {
    const getMock = mockFetch({ year: 2026, months: [{ month: 1, income: 100 }] });
    const result = await budgetApiService.fetchSummary(2026);
    expect(getMock().capturedUrl).toBe('http://localhost:8080/api/v1/budgets/2026/summary');
    expect(result.year).toBe(2026);
  });

  it('createItem dispara POST atômico', async () => {
    const getMock = mockFetch({ id: 'fix-1', name: 'Aluguel' });
    const res = await budgetApiService.createItem({ budgetId: '2026', name: 'Aluguel', type: 'FIXED' });
    expect(getMock().capturedMethod).toBe('POST');
    expect(getMock().capturedUrl).toBe('http://localhost:8080/api/v1/items');
    expect(JSON.parse(getMock().capturedBody).name).toBe('Aluguel');
    expect(res.id).toBe('fix-1');
  });

  it('updateEntry dispara PATCH atômico', async () => {
    const getMock = mockFetch({ id: 'entry-1', plannedAmount: 8500 });
    const res = await budgetApiService.updateEntry('entry-1', { plannedAmount: 8500 });
    expect(getMock().capturedMethod).toBe('PATCH');
    expect(getMock().capturedUrl).toBe('http://localhost:8080/api/v1/entries/entry-1');
    expect(JSON.parse(getMock().capturedBody).plannedAmount).toBe(8500);
    expect(res.plannedAmount).toBe(8500);
  });

  it('deleteItem dispara DELETE atômico', async () => {
    const getMock = mockFetch(null);
    await budgetApiService.deleteItem('item-123');
    expect(getMock().capturedMethod).toBe('DELETE');
    expect(getMock().capturedUrl).toBe('http://localhost:8080/api/v1/items/item-123');
  });

  it('createReserveMovement dispara POST', async () => {
    const getMock = mockFetch({ id: 'mov-1', amount: 2000 });
    const res = await budgetApiService.createReserveMovement({ budgetId: '2026', month: 1, amount: 2000 });
    expect(getMock().capturedMethod).toBe('POST');
    expect(getMock().capturedUrl).toBe('http://localhost:8080/api/v1/reserve-movements');
    expect(JSON.parse(getMock().capturedBody).amount).toBe(2000);
    expect(res.amount).toBe(2000);
  });
});
