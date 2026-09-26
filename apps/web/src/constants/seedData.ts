import { BudgetState, MonthItem } from '../types/budget';
import { generateMonthSequence } from '../utils/formatters';

const currentYear = new Date().getFullYear();
export const INITIAL_MONTHS: MonthItem[] = generateMonthSequence(currentYear, 9, 6);

export const INITIAL_BUDGET_STATE: BudgetState = {
  version: 5,
  currentYear,
  years: [
    {
      id: String(currentYear),
      year: currentYear,
      simulation: {
        varsPercent: 0,
        rendaPercent: 0,
        oneTimeMarginPercent: 0,
        initialBalance: 0,
        emergencyReserve: 0,
      },
    },
  ],
  months: INITIAL_MONTHS,
  simulation: {
    varsPercent: 0,
    rendaPercent: 0,
    oneTimeMarginPercent: 0,
    initialBalance: 0,
    emergencyReserve: 0,
  },
  items: [],
  incomes: [],
  lists: {
    cartoes: [],
    fixas: [],
    vars: [],
  },
  oneTimeCosts: [],
  goals: [],
};
