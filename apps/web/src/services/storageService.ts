import type { BudgetState } from '../types/budget';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';
import { StorageKey } from '../constants/enums';

export const STORAGE_KEY = StorageKey.AppData;
export const LEGACY_STORAGE_KEY = StorageKey.LegacyAppData;
export const THEME_KEY = StorageKey.Theme;

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

export function loadBudgetState(): BudgetState {
  if (typeof window === 'undefined') {
    return INITIAL_BUDGET_STATE;
  }

  try {
    const stored =
      localStorage.getItem(STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return migrateState(parsed);
    }
  } catch (error) {
    console.error('[StorageService] Falha ao carregar dados do localStorage:', error);
  }

  return INITIAL_BUDGET_STATE;
}

export function saveBudgetState(state: BudgetState): boolean {
  if (typeof window === 'undefined') return false;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    console.error('[StorageService] Falha ao salvar no localStorage:', error);
    return false;
  }
}

export function loadTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';

  try {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function saveTheme(theme: 'light' | 'dark'): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(THEME_KEY, theme);
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  } catch (error) {
    console.error('[StorageService] Falha ao salvar tema:', error);
  }
}

export function exportStateToFile(state: BudgetState): void {
  const json = JSON.stringify(state, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const now = new Date().toISOString().slice(0, 10);

  const a = document.createElement('a');
  a.href = url;
  a.download = `finplan-backup-${now}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function parseImportedJson(jsonString: string): BudgetState {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Arquivo JSON inválido.');
  }

  return migrateState(parsed);
}
