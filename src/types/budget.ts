import type { ExpenseCategoryKey, GoalStatus } from '../constants/enums';
export * from '../constants/enums';

export interface MonthItem {
  id: string; // e.g. '2026-10'
  name: string; // 'Outubro 2026'
  shortName: string; // 'Out/26'
  year: number;
  monthIndex: number; // 0 to 11
}

export interface BudgetItem {
  id: string;
  name: string;
  category: ExpenseCategoryKey | 'renda';
  values: Record<string, number>; // monthId -> amount
  off?: boolean;
  notes?: string;
  dueDate?: number; // Dia de vencimento (opcional)
  // Para despesas pontuais / mudança
  isOneTime?: boolean;
  oneTimeValue?: number;
  targetMonthId?: string; // Mês previsto para ocorrer o gasto pontual
}

export interface SimulationSettings {
  varsPercent: number; // Variação despesas variáveis (-50% a +50%)
  rendaPercent: number; // Variação de renda (-30% a +30%)
  oneTimeMarginPercent: number; // Margem para imprevistos (0% a +50%)
  initialBalance: number; // Saldo disponível hoje
  emergencyReserve: number; // Reserva de emergência intocável
}

export interface MonthSummary {
  month: MonthItem;
  income: number;
  cards: number;
  fixed: number;
  variable: number;
  oneTime: number;
  totalExpenses: number;
  monthBalance: number; // Renda - Despesas
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
  averageSavingsRate: number; // % poupada da renda
  totalIncome: number;
  totalRegularExpenses: number;
}

// ── Metas & Eventos ──────────────────────────────────────────────────────────



export interface GoalContribution {
  id: string;
  date: string;       // ISO date 'YYYY-MM-DD'
  amount: number;
  note?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;   // Valor que precisa juntar
  icon?: string;          // emoji
  color?: string;         // tailwind color token ou hex
  status: GoalStatus;
  contributions: GoalContribution[];
}

// ── Estado Global ─────────────────────────────────────────────────────────────

export interface BudgetState {
  version: number;
  months: MonthItem[];
  simulation: SimulationSettings;
  incomes: BudgetItem[];
  lists: {
    cartoes: BudgetItem[];
    fixas: BudgetItem[];
    vars: BudgetItem[];
    mud: BudgetItem[];
  };
  goals: FinancialGoal[];
}
