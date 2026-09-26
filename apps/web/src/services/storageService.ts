import type { BudgetState, BudgetItem } from '../types/budget';
import { normalizeBudgetItemType } from '../constants/enums';
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

  const items: BudgetItem[] = Array.isArray(data.items)
    ? data.items.map((i: any) => ({
        ...i,
        type: i.type || normalizeBudgetItemType(i.category || 'renda'),
      }))
    : [
        ...(Array.isArray(data.incomes)
          ? data.incomes.map((i: any) => ({ ...i, type: 'renda' as const }))
          : []),
        ...(Array.isArray(data.lists?.cartoes)
          ? data.lists.cartoes.map((i: any) => ({ ...i, type: 'cartao' as const }))
          : []),
        ...(Array.isArray(data.lists?.fixas)
          ? data.lists.fixas.map((i: any) => ({ ...i, type: 'fixa' as const }))
          : []),
        ...(Array.isArray(data.lists?.vars)
          ? data.lists.vars.map((i: any) => ({ ...i, type: 'var' as const }))
          : []),
      ];

  const incomes = items.filter((i) => i.type === 'renda');
  const cartoes = items.filter((i) => i.type === 'cartao');
  const fixas = items.filter((i) => i.type === 'fixa');
  const vars = items.filter((i) => i.type === 'var');

  const currentYear =
    typeof data.currentYear === 'number'
      ? data.currentYear
      : data.months?.[0]?.year || INITIAL_BUDGET_STATE.currentYear;

  const simulation = {
    ...INITIAL_BUDGET_STATE.simulation,
    ...(data.simulation ?? {}),
  };

  const years =
    Array.isArray(data.years) && data.years.length > 0
      ? data.years
      : [
          {
            id: String(currentYear),
            year: currentYear,
            simulation,
          },
        ];

  return {
    ...INITIAL_BUDGET_STATE,
    version: 5,
    currentYear,
    years,
    months: Array.isArray(data.months) && data.months.length > 0 ? data.months : INITIAL_BUDGET_STATE.months,
    simulation,
    items,
    incomes,
    lists: {
      cartoes,
      fixas,
      vars,
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
