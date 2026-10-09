import createClient from 'openapi-fetch';
import type { paths, components } from '../types/api';
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

const envUrl = (import.meta as any).env?.VITE_API_URL;
const baseUrl = envUrl ? envUrl.replace(/\/$/, '') : 'http://localhost:8080';

const client = createClient<paths>({ 
  baseUrl, fetch: (...args) => fetch(...args),
  headers: (() => {
    const apiKey = (import.meta as any).env?.VITE_API_SECRET_KEY;
    return apiKey ? { 'x-api-key': apiKey } : {};
  })(),
});

export const budgetApiService = {
  async fetchBudgets(): Promise<Budget[]> {
    const { data, error } = await client.GET('/api/v1/budgets');
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as Budget[];
  },

  async fetchBudgetYear(year: number): Promise<YearViewModel> {
    const { data, error } = await client.GET('/api/v1/budgets/{year}', {
      params: { path: { year: year.toString() } },
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as YearViewModel;
  },

  async createBudget(data: {
    year: number;
    initialBalance?: number;
    emergencyReserveInitialBalance?: number;
    emergencyReserveTarget?: number;
  }): Promise<Budget> {
    const { data: res, error } = await client.POST('/api/v1/budgets', {
      body: {
        year: data.year,
        initialBalance: data.initialBalance || 0,
        emergencyReserveInitialBalance: data.emergencyReserveInitialBalance || 0,
        emergencyReserveTarget: data.emergencyReserveTarget || 0,
      },
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as Budget;
  },

  async updateBudget(
    year: number,
    patch: {
      initialBalance?: number;
      emergencyReserveInitialBalance?: number;
      emergencyReserveTarget?: number;
    }
  ): Promise<Budget> {
    const { data, error } = await client.PATCH('/api/v1/budgets/{year}', {
      params: { path: { year: year.toString() } },
      body: patch,
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as Budget;
  },

  async fetchSummary(year: number): Promise<BudgetSummary> {
    const { data, error } = await client.GET('/api/v1/budgets/{year}/summary', {
      params: { path: { year: year.toString() } },
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as BudgetSummary;
  },

  async createItem(data: {
    budgetId: string;
    name: string;
    type: string;
  }): Promise<Item> {
    const { data: res, error } = await client.POST('/api/v1/items', {
      body: data as components["schemas"]["CreateItemRequest"],
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as Item;
  },

  async updateItem(id: string, patch: { name?: string }): Promise<Item> {
    const { data, error } = await client.PATCH('/api/v1/items/{id}', {
      params: { path: { id } },
      body: patch,
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as Item;
  },

  async deleteItem(id: string): Promise<void> {
    const { error } = await client.DELETE('/api/v1/items/{id}', {
      params: { path: { id } },
    });
    if (error) throw new Error(JSON.stringify(error));
  },

  async updateEntry(
    id: string,
    patch: {
      plannedAmount?: number;
      actualAmount?: number | null;
      dueDate?: string | null;
      paidDate?: string | null;
    }
  ): Promise<Entry> {
    const { data, error } = await client.PATCH('/api/v1/entries/{id}', {
      params: { path: { id } },
      body: patch as any,
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as Entry;
  },

  async confirmEntry(id: string, data: { actualAmount: number; paidDate: string }): Promise<Entry> {
    const { data: res, error } = await client.POST('/api/v1/entries/{id}/confirm', {
      params: { path: { id } },
      body: data as any,
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as Entry;
  },

  async unconfirmEntry(id: string): Promise<Entry> {
    const { data: res, error } = await client.DELETE('/api/v1/entries/{id}/confirm', {
      params: { path: { id } },
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as Entry;
  },

  async createCost(data: {
    budgetId: string;
    name: string;
    defaultMonth?: number | null;
    marginPercent?: number;
    notes?: string;
  }): Promise<Cost> {
    const { data: res, error } = await client.POST('/api/v1/costs', {
      body: {
        budgetId: data.budgetId,
        name: data.name,
        defaultMonth: data.defaultMonth || undefined,
        marginPercent: data.marginPercent || 0,
        notes: data.notes || undefined,
      },
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as Cost;
  },

  async fetchCost(id: string): Promise<Cost> {
    const { data, error } = await client.GET('/api/v1/costs/{id}', {
      params: { path: { id } },
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as Cost;
  },

  async updateCost(
    id: string,
    patch: {
      name?: string;
      defaultMonth?: number | null;
      marginPercent?: number;
      notes?: string;
    }
  ): Promise<Cost> {
    const { data, error } = await client.PATCH('/api/v1/costs/{id}', {
      params: { path: { id } },
      body: {
        name: patch.name,
        defaultMonth: patch.defaultMonth === null ? undefined : patch.defaultMonth,
        marginPercent: patch.marginPercent,
        notes: patch.notes,
      },
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as Cost;
  },

  async deleteCost(id: string): Promise<void> {
    const { error } = await client.DELETE('/api/v1/costs/{id}', {
      params: { path: { id } },
    });
    if (error) throw new Error(JSON.stringify(error));
  },

  async createCostItem(
    costId: string,
    data: {
      name: string;
      plannedAmount: number;
      month?: number | null;
    }
  ): Promise<CostItem> {
    const { data: res, error } = await client.POST('/api/v1/costs/{costId}/items', {
      params: { path: { costId } },
      body: {
        name: data.name,
        plannedAmount: data.plannedAmount,
        month: data.month === null ? undefined : data.month,
      },
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as CostItem;
  },

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
    const { data, error } = await client.PATCH('/api/v1/costs/{costId}/items/{id}', {
      params: { path: { costId, id } },
      body: patch as any,
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as CostItem;
  },

  async confirmCostItem(costId: string, id: string, data: { actualAmount: number; paidDate: string }): Promise<CostItem> {
    const { data: res, error } = await client.POST('/api/v1/costs/{costId}/items/{id}/confirm', {
      params: { path: { costId, id } },
      body: data as any,
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as CostItem;
  },

  async unconfirmCostItem(costId: string, id: string): Promise<CostItem> {
    const { data: res, error } = await client.DELETE('/api/v1/costs/{costId}/items/{id}/confirm', {
      params: { path: { costId, id } },
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as CostItem;
  },

  async deleteCostItem(costId: string, id: string): Promise<void> {
    const { error } = await client.DELETE('/api/v1/costs/{costId}/items/{id}', {
      params: { path: { costId, id } },
    });
    if (error) throw new Error(JSON.stringify(error));
  },

  async fetchGoals(): Promise<FinancialGoal[]> {
    const { data, error } = await client.GET('/api/v1/goals');
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as FinancialGoal[];
  },

  async createGoal(goal: Partial<FinancialGoal>): Promise<FinancialGoal> {
    const { data: res, error } = await client.POST('/api/v1/goals', {
      body: goal as any,
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as FinancialGoal;
  },

  async updateGoal(id: string, patch: Partial<FinancialGoal>): Promise<FinancialGoal> {
    const { data, error } = await client.PATCH('/api/v1/goals/{id}', {
      params: { path: { id } },
      body: patch as any,
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as FinancialGoal;
  },

  async deleteGoal(id: string): Promise<void> {
    const { error } = await client.DELETE('/api/v1/goals/{id}', {
      params: { path: { id } },
    });
    if (error) throw new Error(JSON.stringify(error));
  },

  async addGoalContribution(
    goalId: string,
    contribution: { amount: number; note?: string; date?: string }
  ): Promise<FinancialGoal> {
    const { data: res, error } = await client.POST('/api/v1/goals/{id}/contributions', {
      params: { path: { id: goalId } },
      body: contribution as any,
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as FinancialGoal;
  },

  async deleteGoalContribution(goalId: string, contributionId: string): Promise<FinancialGoal> {
    const { data: res, error } = await client.DELETE('/api/v1/goals/{id}/contributions/{contributionId}', {
      params: { path: { id: goalId, contributionId } },
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as FinancialGoal;
  },

  async createReserveMovement(data: {
    budgetId: string;
    month: number;
    amount: number;
    reason?: string;
  }): Promise<ReserveMovement> {
    const { data: res, error } = await client.POST('/api/v1/reserve-movements', {
      body: data as any,
    });
    if (error) throw new Error(JSON.stringify(error));
    return res as unknown as ReserveMovement;
  },

  async fetchReserveMovements(year: number): Promise<ReserveMovement[]> {
    const { data, error } = await client.GET('/api/v1/budgets/{year}/reserve-movements', {
      params: { path: { year: year.toString() } },
    });
    if (error) throw new Error(JSON.stringify(error));
    return data as unknown as ReserveMovement[];
  },
};
