import { BudgetState, MonthItem } from '../types/budget';
import { generateMonthSequence } from '../utils/formatters';

// Gera horizonte padrão dinâmico de 6 meses
const currentYear = new Date().getFullYear();
export const INITIAL_MONTHS: MonthItem[] = generateMonthSequence(currentYear, 9, 6);

// Estado inicial limpo - dados reais residem exclusivamente no Google Sheets / nuvem
export const INITIAL_BUDGET_STATE: BudgetState = {
  version: 4,
  months: INITIAL_MONTHS,
  simulation: {
    varsPercent: 0,
    rendaPercent: 0,
    oneTimeMarginPercent: 0,
    initialBalance: 0,
    emergencyReserve: 0,
  },
  incomes: [],
  lists: {
    cartoes: [],
    fixas: [],
    vars: [],
    mud: [],
  },
  goals: [],
};
