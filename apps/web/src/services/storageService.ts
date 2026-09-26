import type { BudgetState } from '../types/budget';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';
export function migrateState(raw: unknown): BudgetState {
  if (!raw || typeof raw !== 'object') {
    return INITIAL_BUDGET_STATE;
  }

  const data = raw as any;

  let oneTimeCosts = INITIAL_BUDGET_STATE.oneTimeCosts;
  if (Array.isArray(data.oneTimeCosts)) {
    oneTimeCosts = data.oneTimeCosts.map((item: any) => ({
      id: item.id,
      name: item.name || 'Custo Pontual',
      value: typeof item.value === 'number' ? item.value : (item.oneTimeValue ?? 0),
      targetMonthId: item.targetMonthId,
      off: Boolean(item.off),
      notes: item.notes,
    }));
  }

  return {
    ...INITIAL_BUDGET_STATE,
    version: 5,
    months: Array.isArray(data.months) && data.months.length > 0 ? data.months : INITIAL_BUDGET_STATE.months,
    simulation: {
      ...INITIAL_BUDGET_STATE.simulation,
      ...(data.simulation ?? {}),
    },
    incomes: Array.isArray(data.incomes) ? data.incomes : INITIAL_BUDGET_STATE.incomes,
    lists: {
      cartoes: Array.isArray(data.lists?.cartoes) ? data.lists.cartoes : [],
      fixas: Array.isArray(data.lists?.fixas) ? data.lists.fixas : [],
      vars: Array.isArray(data.lists?.vars) ? data.lists.vars : [],
    },
    oneTimeCosts,
    goals: Array.isArray(data.goals) ? data.goals : INITIAL_BUDGET_STATE.goals,
  };
}

export function loadTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;

  try {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } catch (error) {
    console.error('[StorageService] Falha ao aplicar tema:', error);
  }
}
