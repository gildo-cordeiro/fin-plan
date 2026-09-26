import type { ExpenseCategoryKey, GoalStatus } from '../constants/enums';
export * from '../constants/enums';

export interface MonthItem {
  id: string;
  name: string;
  shortName: string;
  year: number;
  monthIndex: number;
}

export interface BudgetItem {
  id: string;
  name: string;
  category: ExpenseCategoryKey | 'renda';
  values: Record<string, number>;
  off?: boolean;
  notes?: string;
  dueDate?: number;
}

export interface OneTimeCost {
  id: string;
  name: string;
  value: number;
  targetMonthId?: string;
  off?: boolean;
  notes?: string;
}

export interface SimulationSettings {
  varsPercent: number;
  rendaPercent: number;
  oneTimeMarginPercent: number;
  initialBalance: number;
  emergencyReserve: number;
}

export interface MonthSummary {
  month: MonthItem;
  income: number;
  cards: number;
  fixed: number;
  variable: number;
  oneTime: number;
  totalExpenses: number;
  monthBalance: number;
  accumulatedBalance: number;
  availableAfterReserve: number;
}

export interface OverallMetrics {
  finalAccumulated: number;
  totalAvailableAfterReserve: number;
  totalOneTimeCosts: number;
  netFinalAfterOneTime: number;
  minAccumulatedBalance: number;
  minAccumulatedMonth: string;
  averageSavingsRate: number;
  totalIncome: number;
  totalRegularExpenses: number;
}

export interface GoalContribution {
  id: string;
  date: string;
  amount: number;
  note?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  icon?: string;
  color?: string;
  status: GoalStatus;
  contributions: GoalContribution[];
}

export interface BudgetState {
  version: number;
  months: MonthItem[];
  simulation: SimulationSettings;
  incomes: BudgetItem[];
  lists: {
    cartoes: BudgetItem[];
    fixas: BudgetItem[];
    vars: BudgetItem[];
  };
  oneTimeCosts: OneTimeCost[];
  goals: FinancialGoal[];
}
