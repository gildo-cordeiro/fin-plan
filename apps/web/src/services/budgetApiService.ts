import type {
  BudgetYear,
  YearViewModel,
  BudgetItem,
  OneTimeCost,
  FinancialGoal,
  SimulationSettings,
  MonthItem,
} from '../types/budget';

function getBaseUrl(): string {
  const envUrl = (import.meta as any).env?.VITE_API_URL;
  return envUrl ? envUrl.replace(/\/$/, '') : '';
}

function getAuthHeaders(): Record<string, string> {
  const apiKey = (import.meta as any).env?.VITE_API_SECRET_KEY;
  return apiKey ? { 'x-api-key': apiKey } : {};
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  timeoutMs = 15000
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${getBaseUrl()}${endpoint}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorJson = await res.json().catch(() => null);
      throw new Error(errorJson?.error || `Falha na requisição (status ${res.status})`);
    }

    return (await res.json()) as T;
  } catch (err: unknown) {
    clearTimeout(timeoutId);
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(`Tempo limite esgotado (${timeoutMs / 1000}s).`);
    }
    throw err;
  }
}

export interface FetchBudgetOptions {
  timeoutMs?: number;
  retries?: number;
}

export const budgetApiService = {
  // === Métodos Agregados por Ano (Nova API v1) ===

  async fetchBudgetYears(): Promise<BudgetYear[]> {
    return request<BudgetYear[]>('/api/v1/budget-years');
  },

  async fetchBudgetYear(year: number): Promise<YearViewModel> {
    return request<YearViewModel>(`/api/v1/budget-years/${year}`);
  },

  async createBudgetYear(year: number, simulation?: Partial<SimulationSettings>): Promise<BudgetYear> {
    return request<BudgetYear>('/api/v1/budget-years', {
      method: 'POST',
      body: JSON.stringify({ year, simulation }),
    });
  },

  async updateYearSimulation(year: number, patch: Partial<SimulationSettings>): Promise<BudgetYear> {
    return request<BudgetYear>(`/api/v1/budget-years/${year}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async addMonthToYear(year: number, month: Partial<MonthItem>): Promise<MonthItem> {
    return request<MonthItem>(`/api/v1/budget-years/${year}/months`, {
      method: 'POST',
      body: JSON.stringify(month),
    });
  },

  // === Métodos Atômicos: Budget Items ===

  async createBudgetItem(item: Partial<BudgetItem>): Promise<BudgetItem> {
    return request<BudgetItem>('/api/v1/budget-items', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  async updateBudgetItem(id: string, patch: Partial<BudgetItem>): Promise<BudgetItem> {
    return request<BudgetItem>(`/api/v1/budget-items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async deleteBudgetItem(id: string): Promise<boolean> {
    await request<{ success: boolean }>(`/api/v1/budget-items/${id}`, {
      method: 'DELETE',
    });
    return true;
  },

  // === Métodos Atômicos: One-Time Costs ===

  async createOneTimeCost(cost: Partial<OneTimeCost>): Promise<OneTimeCost> {
    return request<OneTimeCost>('/api/v1/one-time-costs', {
      method: 'POST',
      body: JSON.stringify(cost),
    });
  },

  async updateOneTimeCost(id: string, patch: Partial<OneTimeCost>): Promise<OneTimeCost> {
    return request<OneTimeCost>(`/api/v1/one-time-costs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async deleteOneTimeCost(id: string): Promise<boolean> {
    await request<{ success: boolean }>(`/api/v1/one-time-costs/${id}`, {
      method: 'DELETE',
    });
    return true;
  },

  // === Métodos Atômicos: Goals & Contributions ===

  async createGoal(goal: Partial<FinancialGoal>): Promise<FinancialGoal> {
    return request<FinancialGoal>('/api/v1/goals', {
      method: 'POST',
      body: JSON.stringify(goal),
    });
  },

  async updateGoal(id: string, patch: Partial<FinancialGoal>): Promise<FinancialGoal> {
    return request<FinancialGoal>(`/api/v1/goals/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  async deleteGoal(id: string): Promise<boolean> {
    await request<{ success: boolean }>(`/api/v1/goals/${id}`, {
      method: 'DELETE',
    });
    return true;
  },

  async addGoalContribution(
    goalId: string,
    contribution: { amount: number; note?: string; date?: string }
  ): Promise<FinancialGoal> {
    return request<FinancialGoal>(`/api/v1/goals/${goalId}/contributions`, {
      method: 'POST',
      body: JSON.stringify(contribution),
    });
  },

  async deleteGoalContribution(goalId: string, contributionId: string): Promise<FinancialGoal> {
    return request<FinancialGoal>(`/api/v1/goals/${goalId}/contributions/${contributionId}`, {
      method: 'DELETE',
    });
  },
};
