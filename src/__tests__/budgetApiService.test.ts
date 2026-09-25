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

  it('fetchBudget retorna dados quando o documento existe no MongoDB', async () => {
    const mockResponse = {
      exists: true,
      data: INITIAL_BUDGET_STATE,
      updatedAt: '2026-09-24T19:00:00.000Z',
    };

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    } as unknown as Response);

    const result = await budgetApiService.fetchBudget();
    expect(result.state).not.toBeNull();
    expect(result.state?.simulation.initialBalance).toBe(INITIAL_BUDGET_STATE.simulation.initialBalance);
    expect(result.updatedAt).toEqual(new Date('2026-09-24T19:00:00.000Z'));
  });

  it('fetchBudget retorna null quando o documento não existe', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => ({ exists: false, data: null }),
    } as unknown as Response);

    const result = await budgetApiService.fetchBudget();
    expect(result.state).toBeNull();
    expect(result.updatedAt).toBeNull();
  });

  it('saveBudget envia POST com payload correto', async () => {
    let capturedBody = '';
    vi.spyOn(globalThis, 'fetch').mockImplementationOnce(async (_url, init) => {
      capturedBody = init?.body as string;
      return {
        ok: true,
        json: async () => ({ success: true }),
      } as unknown as Response;
    });

    const result = await budgetApiService.saveBudget(INITIAL_BUDGET_STATE);
    expect(result.success).toBe(true);
    expect(capturedBody).toContain(String(INITIAL_BUDGET_STATE.simulation.initialBalance));
  });

  it('saveBudget lança erro quando status não for ok', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Falha de conexão com MongoDB' }),
    } as unknown as Response);

    await expect(budgetApiService.saveBudget(INITIAL_BUDGET_STATE)).rejects.toThrow(
      'Falha de conexão com MongoDB'
    );
  });
});
