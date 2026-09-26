import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  loadBudgetState,
  saveBudgetState,
  migrateState,
  loadTheme,
  saveTheme,
  parseImportedJson,
  THEME_KEY,
} from '../services/storageService';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';
import type { BudgetState } from '../types/budget';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});
Object.defineProperty(globalThis, 'window', {
  value: {
    localStorage: localStorageMock,
    matchMedia: () => ({ matches: false }),
  },
  writable: true,
});
Object.defineProperty(globalThis, 'document', {
  value: {
    documentElement: {
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
      },
    },
  },
  writable: true,
});

describe('storageService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  describe('saveBudgetState and loadBudgetState', () => {
    it('salva e recupera o estado do orçamento no localStorage', () => {
      const mockState: BudgetState = {
        ...INITIAL_BUDGET_STATE,
        simulation: {
          ...INITIAL_BUDGET_STATE.simulation,
          initialBalance: 7500,
        },
      };

      const saved = saveBudgetState(mockState);
      expect(saved).toBe(true);

      const loaded = loadBudgetState();
      expect(loaded.simulation.initialBalance).toBe(7500);
    });

    it('retorna INITIAL_BUDGET_STATE quando o localStorage está vazio', () => {
      const loaded = loadBudgetState();
      expect(loaded.version).toBe(5);
      expect(loaded.months.length).toBeGreaterThan(0);
    });
  });

  describe('migrateState', () => {
    it('migra payloads parciais preenchendo campos ausentes com defaults', () => {
      const partialRaw = {
        simulation: { initialBalance: 12000 },
        incomes: [{ id: 'inc-1', name: 'Salário', category: 'renda', values: {} }],
      };

      const state = migrateState(partialRaw);
      expect(state.version).toBe(5);
      expect(state.simulation.initialBalance).toBe(12000);
      expect(state.incomes).toHaveLength(1);
      expect(state.lists.cartoes).toEqual([]);
      expect(state.lists.fixas).toEqual([]);
      expect(state.lists.vars).toEqual([]);
      expect(state.oneTimeCosts).toEqual([]);
      expect(state.goals).toEqual([]);
    });

    it('retorna INITIAL_BUDGET_STATE para valores nulos ou inválidos', () => {
      expect(migrateState(null)).toEqual(INITIAL_BUDGET_STATE);
      expect(migrateState(undefined)).toEqual(INITIAL_BUDGET_STATE);
      expect(migrateState('invalid string')).toEqual(INITIAL_BUDGET_STATE);
    });

    it('normaliza corretamente oneTimeCosts com campos legados ou incompletos', () => {
      const rawWithCosts = {
        oneTimeCosts: [
          { id: 'ot-1', name: 'Mesa Nova', value: 800, targetMonthId: '2026-10' },
          { id: 'ot-2', oneTimeValue: 350 }, // sem name nem value direto
        ],
      };

      const state = migrateState(rawWithCosts);
      expect(state.oneTimeCosts).toHaveLength(2);
      expect(state.oneTimeCosts[0].name).toBe('Mesa Nova');
      expect(state.oneTimeCosts[0].value).toBe(800);
      expect(state.oneTimeCosts[1].name).toBe('Custo Pontual');
      expect(state.oneTimeCosts[1].value).toBe(350);
    });
  });

  describe('Theme persistence', () => {
    it('salva e recupera tema light/dark', () => {
      saveTheme('dark');
      expect(localStorageMock.getItem(THEME_KEY)).toBe('dark');
      expect(loadTheme()).toBe('dark');

      saveTheme('light');
      expect(localStorageMock.getItem(THEME_KEY)).toBe('light');
      expect(loadTheme()).toBe('light');
    });
  });

  describe('parseImportedJson', () => {
    it('faz parse e migra JSON válido com sucesso', () => {
      const json = JSON.stringify({
        simulation: { initialBalance: 5000 },
      });
      const parsed = parseImportedJson(json);
      expect(parsed.simulation.initialBalance).toBe(5000);
    });

    it('dispara erro para JSON inválido', () => {
      expect(() => parseImportedJson('invalid-json{')).toThrow();
    });
  });
});
