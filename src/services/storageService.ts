import type { BudgetState } from '../types/budget';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';
import { StorageKey } from '../constants/enums';

export const STORAGE_KEY = StorageKey.AppData;
export const LEGACY_STORAGE_KEY = StorageKey.LegacyAppData;
export const THEME_KEY = StorageKey.Theme;

/**
 * Migra estados garantindo integridade de esquema
 */
export function migrateState(raw: unknown): BudgetState {
  if (!raw || typeof raw !== 'object') {
    return INITIAL_BUDGET_STATE;
  }

  const data = raw as Partial<BudgetState> & { version?: number };

  return {
    ...INITIAL_BUDGET_STATE,
    ...data,
    simulation: {
      ...INITIAL_BUDGET_STATE.simulation,
      ...(data.simulation ?? {}),
    },
    goals: Array.isArray(data.goals) ? data.goals : INITIAL_BUDGET_STATE.goals,
    lists: {
      ...INITIAL_BUDGET_STATE.lists,
      ...(data.lists ?? {}),
    },
    incomes: Array.isArray(data.incomes) ? data.incomes : INITIAL_BUDGET_STATE.incomes,
    months: Array.isArray(data.months) && data.months.length > 0 ? data.months : INITIAL_BUDGET_STATE.months,
  };
}

/**
 * Carrega o estado do localStorage com migração automática
 */
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

/**
 * Persiste o estado do orçamento no localStorage de forma segura
 */
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

/**
 * Carrega a preferência de tema salva ou detecta do sistema operacional
 */
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

/**
 * Salva a preferência de tema
 */
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

/**
 * Exporta o estado para download em arquivo .json
 */
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

/**
 * Valida e converte JSON importado em BudgetState íntegro
 */
export function parseImportedJson(jsonString: string): BudgetState {
  const parsed = JSON.parse(jsonString);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Arquivo JSON inválido.');
  }

  return migrateState(parsed);
}

/**
 * Salva patches pendentes de envio à planilha no LocalStorage (resiliência offline)
 */
export function savePendingPatches(patches: Array<[string, Record<string, unknown>]>): void {
  if (typeof window === 'undefined') return;
  try {
    if (patches.length === 0) {
      localStorage.removeItem(StorageKey.PendingPatches);
    } else {
      localStorage.setItem(StorageKey.PendingPatches, JSON.stringify(patches));
    }
  } catch (error) {
    console.error('[StorageService] Falha ao salvar patches pendentes no localStorage:', error);
  }
}

/**
 * Carrega patches pendentes que ainda não foram sincronizados com a planilha
 */
export function loadPendingPatches(): Array<[string, Record<string, unknown>]> {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(StorageKey.PendingPatches);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('[StorageService] Falha ao carregar patches pendentes do localStorage:', error);
  }
  return [];
}

/**
 * Limpa a fila de patches pendentes
 */
export function clearPendingPatches(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(StorageKey.PendingPatches);
  } catch (error) {
    console.error('[StorageService] Falha ao limpar patches pendentes:', error);
  }
}

