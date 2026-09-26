import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  migrateState,
  loadTheme,
  saveTheme,
} from '../services/storageService';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';

const mockMatchMedia = vi.fn().mockImplementation((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}));

const classListAdd = vi.fn();
const classListRemove = vi.fn();

Object.defineProperty(globalThis, 'window', {
  value: {
    matchMedia: mockMatchMedia,
  },
  writable: true,
});

Object.defineProperty(globalThis, 'document', {
  value: {
    documentElement: {
      classList: {
        add: classListAdd,
        remove: classListRemove,
      },
    },
  },
  writable: true,
});

describe('storageService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

  describe('Theme handling', () => {
    it('aplica tema dark adicionando classe dark', () => {
      saveTheme('dark');
      expect(classListAdd).toHaveBeenCalledWith('dark');
      expect(classListRemove).not.toHaveBeenCalled();
    });

    it('aplica tema light removendo classe dark', () => {
      saveTheme('light');
      expect(classListRemove).toHaveBeenCalledWith('dark');
      expect(classListAdd).not.toHaveBeenCalled();
    });

    it('loadTheme detecta preferência do sistema via matchMedia', () => {
      mockMatchMedia.mockReturnValueOnce({ matches: true });
      expect(loadTheme()).toBe('dark');

      mockMatchMedia.mockReturnValueOnce({ matches: false });
      expect(loadTheme()).toBe('light');
    });
  });
});
