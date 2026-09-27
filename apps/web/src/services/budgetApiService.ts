import type {
  Budget,
  YearViewModel,
  Item,
  Entry,
  Cost,
  CostItem,
  FinancialGoal,
  ReserveMovement,
  BudgetSummary,
} from '../types/budget';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// API Service — endpoints PostgreSQL (plano de migração)
// ---------------------------------------------------------------------------

export const budgetApiService = {
  // === Budget ===

  /** Lista todos os anos orçamentários. */
  async fetchBudgets(): Promise<Budget[]> {
    return request<Budget[]>('/api/v1/budgets');
  },

  /** Carrega visão completa de um ano (budget + items/entries + costs/costItems + goals). */
  async fetchBudgetYear(year: number): Promise<YearViewModel> {
    return request<YearViewModel>(`/api/v1/budgets/${year}`);
  },

  /** Cria um novo ano orçamentário. */
  async createBudget(data: {
    year: number;
    initialBalance?: number;
    emergencyReserveTarget?: number;
  }): Promise<Budget> {
    return request<Budget>('/api/v1/budgets', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Atualiza initialBalance ou emergencyReserveTarget do budget. */
  async updateBudget(
    year: number,
    patch: {
      initialBalance?: number;
      emergencyReserveTarget?: number;
    }
  ): Promise<Budget> {
    return request<Budget>(`/api/v1/budgets/${year}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  /** Retorna sumário mensal agregado (fonte de verdade para totais). */
  async fetchSummary(year: number): Promise<BudgetSummary> {
    return request<BudgetSummary>(`/api/v1/budgets/${year}/summary`);
  },

  // === Items ===

  /** Cria um item de orçamento. O backend gera automaticamente 12 entries. */
  async createItem(data: {
    budgetId: string;
    name: string;
    type: string;
  }): Promise<Item> {
    return request<Item>('/api/v1/items', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Atualiza nome do item. */
  async updateItem(id: string, patch: { name?: string }): Promise<Item> {
    return request<Item>(`/api/v1/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  /** Exclui item e todas as suas entries (cascata). */
  async deleteItem(id: string): Promise<void> {
    await request<{ success: boolean }>(`/api/v1/items/${id}`, {
      method: 'DELETE',
    });
  },

  // === Entries ===

  /**
   * Atualiza uma entry. Usa PATCH parcial de verdade:
   * - Para editar planejado: { plannedAmount: 8500 }
   * - Para confirmar realizado: { actualAmount: 8400, paidDate: '2026-10-05' }
   * - Para desconfirmar: { actualAmount: null, paidDate: null }
   * O backend só altera os campos presentes no body.
   */
  async updateEntry(
    id: string,
    patch: {
      plannedAmount?: number;
      actualAmount?: number | null;
      dueDate?: string | null;
      paidDate?: string | null;
    }
  ): Promise<Entry> {
    return request<Entry>(`/api/v1/entries/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  // === Costs ===

  /** Cria um projeto de custo pontual. */
  async createCost(data: {
    budgetId: string;
    name: string;
    defaultMonth?: number | null;
    marginPercent?: number;
    notes?: string;
  }): Promise<Cost> {
    return request<Cost>('/api/v1/costs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /**
   * Detalha um cost com items[], totalPlanned e totalWithMargin
   * (calculados no backend via SQL SUM).
   */
  async fetchCost(id: string): Promise<Cost> {
    return request<Cost>(`/api/v1/costs/${id}`);
  },

  /** Atualiza propriedades do cost (PATCH parcial). */
  async updateCost(
    id: string,
    patch: {
      name?: string;
      defaultMonth?: number | null;
      marginPercent?: number;
      notes?: string;
    }
  ): Promise<Cost> {
    return request<Cost>(`/api/v1/costs/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  /** Exclui cost e todos os seus cost_items (cascata). */
  async deleteCost(id: string): Promise<void> {
    await request<{ success: boolean }>(`/api/v1/costs/${id}`, {
      method: 'DELETE',
    });
  },

  // === Cost Items ===

  /** Cria um item dentro de um projeto de custo pontual. */
  async createCostItem(
    costId: string,
    data: {
      name: string;
      plannedAmount: number;
      month?: number | null;
    }
  ): Promise<CostItem> {
    return request<CostItem>(`/api/v1/costs/${costId}/items`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Atualiza um cost_item (PATCH parcial). */
  async updateCostItem(
    costId: string,
    id: string,
    patch: {
      name?: string;
      plannedAmount?: number;
      actualAmount?: number | null;
      month?: number | null;
      dueDate?: string | null;
      paidDate?: string | null;
    }
  ): Promise<CostItem> {
    return request<CostItem>(`/api/v1/costs/${costId}/items/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
  },

  /** Exclui um cost_item. */
  async deleteCostItem(costId: string, id: string): Promise<void> {
    await request<{ success: boolean }>(`/api/v1/costs/${costId}/items/${id}`, {
      method: 'DELETE',
    });
  },

  // === Goals & Contributions ===

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

  async deleteGoal(id: string): Promise<void> {
    await request<{ success: boolean }>(`/api/v1/goals/${id}`, {
      method: 'DELETE',
    });
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

  // === Reserve Movements (imutável — só Create e List) ===

  /** Cria movimentação de reserva (aporte ou retirada). */
  async createReserveMovement(data: {
    budgetId: string;
    month: number;
    amount: number;
    reason?: string;
  }): Promise<ReserveMovement> {
    return request<ReserveMovement>('/api/v1/reserve-movements', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },

  /** Lista histórico de movimentações da reserva para um ano. */
  async fetchReserveMovements(year: number): Promise<ReserveMovement[]> {
    return request<ReserveMovement[]>(`/api/v1/budgets/${year}/reserve-movements`);
  },
};
