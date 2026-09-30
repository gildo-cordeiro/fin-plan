import type { BudgetState, MonthItem, SimulationSettings } from '../types/budget';
import { generateMonthSequence } from '../lib/format';

const currentYear = new Date().getFullYear();

/** 12 meses do ano corrente, derivados localmente. */
export const INITIAL_MONTHS: MonthItem[] = generateMonthSequence(currentYear, 0, 12);

/** Simulação padrão (percentuais zerados — localStorage only). */
export const DEFAULT_SIMULATION: SimulationSettings = {
  varsPercent: 0,
  rendaPercent: 0,
  oneTimeMarginPercent: 0,
};

/** Estado inicial do BudgetContext antes de carregar do backend. */
export const INITIAL_BUDGET_STATE: BudgetState = {
  version: 5,
  currentYear,

  // Backend data — null/vazio até o primeiro fetch
  budget: null,
  items: [],
  costs: [],
  goals: [],
  reserveMovements: [],
  summary: null,

  // Derivado localmente
  months: INITIAL_MONTHS,

  // Simulação (localStorage only)
  simulation: DEFAULT_SIMULATION,
};
