import type { components } from './api';
import type { ItemType, GoalStatus } from '../constants/enums';
export * from '../constants/enums';

// API Types
export type Budget = Omit<components["schemas"]["Budget"], "createdAt" | "updatedAt"> & {
  createdAt?: string;
  updatedAt?: string;
};

// Frontend only MonthItem
export interface MonthItem {
  id: string;
  name: string;
  shortName: string;
  year: number;
  monthIndex: number;
}

export type Item = Omit<components["schemas"]["Item"], "type" | "entries"> & {
  type: ItemType;
  entries?: Entry[];
  values?: Record<string, number>;
  off?: boolean;
};

export type Entry = Omit<components["schemas"]["Entry"], "actualAmount" | "dueDate" | "paidDate"> & {
  actualAmount: number | null;
  dueDate: string | null;
  paidDate: string | null;
};

export type Cost = Omit<components["schemas"]["Cost"], "defaultMonth" | "items"> & {
  defaultMonth: number | null;
  items?: CostItem[];
  totalPlanned?: number;
  totalWithMargin?: number;
};

export type CostItem = Omit<components["schemas"]["CostItem"], "actualAmount" | "month" | "dueDate" | "paidDate"> & {
  actualAmount: number | null;
  month: number | null;
  dueDate: string | null;
  paidDate: string | null;
};

export type GoalContribution = Omit<components["schemas"]["GoalContribution"], "note" | "goalId"> & {
  note?: string;
  goalId?: string;
};

export type FinancialGoal = Omit<components["schemas"]["Goal"], "description" | "icon" | "color" | "status" | "contributions"> & {
  description?: string;
  icon?: string;
  color?: string;
  status: GoalStatus;
  contributions: GoalContribution[];
};

export type ReserveMovement = Omit<components["schemas"]["ReserveMovement"], "reason"> & {
  reason?: string;
};

export type BudgetSummaryMonth = components["schemas"]["MonthSummary"];
export type BudgetSummaryTotals = components["schemas"]["YearTotals"];
export type BudgetSummary = components["schemas"]["BudgetSummary"];

export type YearViewModel = Omit<components["schemas"]["BudgetView"], "budget" | "items" | "costs" | "goals" | "reserveMovements"> & {
  budget: Budget;
  items: Item[];
  costs: Cost[];
  goals: FinancialGoal[];
  reserveMovements?: ReserveMovement[];
};

// Simulation settings
export interface SimulationSettings {
  varsPercent: number;
  rendaPercent: number;
  oneTimeMarginPercent: number;
  initialBalance?: number;
  emergencyReserveTarget?: number;
  emergencyReserve?: number;
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
  averageMonthlyBalance: number;
}

export interface BudgetState {
  version: number;
  currentYear: number;
  budget: Budget | null;
  items: Item[];
  costs: Cost[];
  goals: FinancialGoal[];
  reserveMovements: ReserveMovement[];
  summary: BudgetSummary | null;
  months: MonthItem[];
  simulation: SimulationSettings;
}
