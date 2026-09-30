import type { ItemType, GoalStatus } from '../constants/enums';
export * from '../constants/enums';

// ---------------------------------------------------------------------------
// MonthItem — derivado localmente, NÃO persistido no backend.
// O backend usa `month: INT` (1–12); o frontend gera nome/shortName via
// createMonthItem(year, monthIndex).
// ---------------------------------------------------------------------------
export interface MonthItem {
  id: string;          // ex: '2026-10'
  name: string;        // ex: 'Outubro 2026'
  shortName: string;   // ex: 'Out/26'
  year: number;
  monthIndex: number;  // 0-based (compatível com Date.getMonth)
}

// ---------------------------------------------------------------------------
// Budget (tabela `budget`)
// ---------------------------------------------------------------------------
export interface Budget {
  id: string;                     // ex: '2026'
  year: number;
  initialBalance: number;
  emergencyReserveTarget: number;
  createdAt?: string;
  updatedAt?: string;
}

// ---------------------------------------------------------------------------
// Item (tabela `item`)
// ---------------------------------------------------------------------------
export interface Item {
  id: string;
  budgetId: string;
  name: string;
  type: ItemType;                // 'renda' | 'fixa' | 'variavel' | 'cartao'
  createdAt?: string;
  entries?: Entry[];             // populado no GET /budgets/{year}
  values?: Record<string, number>; // Mapa monthId -> plannedAmount derivado para conveniência
  off?: boolean;
}

// ---------------------------------------------------------------------------
// Entry (tabela `entry`)
// ---------------------------------------------------------------------------
export interface Entry {
  id: string;
  itemId: string;
  month: number;                 // 1–12 (INT, não monthId string)
  plannedAmount: number;
  actualAmount: number | null;   // null = ainda não confirmado
  dueDate: string | null;        // ISO date
  paidDate: string | null;       // preenchido = "confirmado" (sem coluna status)
}

// ---------------------------------------------------------------------------
// Cost (tabela `cost`) — projeto de custo pontual
// ---------------------------------------------------------------------------
export interface Cost {
  id: string;
  budgetId: string;
  name: string;
  defaultMonth: number | null;   // null = "sem mês fixo, deduz no saldo final"
  marginPercent: number;         // "Margem de Imprevistos" vive AQUI
  notes?: string;
  items?: CostItem[];            // populado no GET
  totalPlanned?: number;         // calculado no backend (SUM cost_item.planned_amount)
  totalWithMargin?: number;      // calculado no backend (totalPlanned * (1 + marginPercent/100))
}

// ---------------------------------------------------------------------------
// CostItem (tabela `cost_item`) — item individual dentro do projeto
// ---------------------------------------------------------------------------
export interface CostItem {
  id: string;
  costId: string;
  name: string;
  plannedAmount: number;
  actualAmount: number | null;
  month: number | null;          // null = herda cost.defaultMonth; ambos null = saldo final
  dueDate: string | null;
  paidDate: string | null;
}

// ---------------------------------------------------------------------------
// Goal & GoalContribution (tabelas `goal`, `goal_contribution`)
// ---------------------------------------------------------------------------
export interface GoalContribution {
  id: string;
  goalId?: string;
  date: string;
  amount: number;
  note?: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  description?: string;
  targetAmount: number;
  color?: string;
  status: GoalStatus;
  contributions: GoalContribution[];
}

// ---------------------------------------------------------------------------
// ReserveMovement (tabela `reserve_movement`) — livro-razão imutável
// Só Create + List; corrigir lançamento errado é um novo movement de sinal oposto.
// ---------------------------------------------------------------------------
export interface ReserveMovement {
  id: string;
  budgetId: string;
  month: number;       // 1–12
  amount: number;      // positivo = aporte, negativo = retirada
  reason?: string;
}

// ---------------------------------------------------------------------------
// BudgetSummary — resposta de GET /budgets/{year}/summary
// Fonte de verdade para totais mensais; substitui budgetCalculator.ts
// ---------------------------------------------------------------------------
export interface BudgetSummaryMonth {
  month: number;                 // 1–12
  income: number;
  cards: number;
  fixed: number;
  variable: number;
  oneTimeCosts: number;
  totalExpenses: number;
  monthBalance: number;
  accumulatedBalance: number;
}

export interface BudgetSummaryTotals {
  income: number;
  cards: number;
  fixed: number;
  variable: number;
  oneTimeCosts: number;
  totalExpenses: number;
  netBalance: number;
  finalAccumulated: number;
}

export interface BudgetSummary {
  year: number;
  initialBalance: number;
  emergencyReserveTarget: number;
  months: BudgetSummaryMonth[];
  totals: BudgetSummaryTotals;
}

// ---------------------------------------------------------------------------
// YearViewModel — resposta de GET /budgets/{year} (visão completa do ano)
// ---------------------------------------------------------------------------
export interface YearViewModel {
  budget: Budget;
  items: Item[];                 // com entries[] populadas
  costs: Cost[];                 // com items[] populadas
  goals: FinancialGoal[];
  reserveMovements?: ReserveMovement[];
}

// ---------------------------------------------------------------------------
// SimulationSettings — NÃO existe no PostgreSQL.
// Percentuais ficam APENAS em localStorage; initialBalance e
// emergencyReserveTarget ficam na tabela budget.
// ---------------------------------------------------------------------------
export interface SimulationSettings {
  varsPercent: number;
  rendaPercent: number;
  oneTimeMarginPercent: number;
  initialBalance?: number;
  emergencyReserveTarget?: number;
  emergencyReserve?: number;
}

// ---------------------------------------------------------------------------
// MonthSummary — formato interno usado pelos componentes de UI.
// Mapeado a partir de BudgetSummaryMonth + MonthItem derivado.
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// OverallMetrics — métricas derivadas do BudgetSummary
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// BudgetState — estado central do BudgetContext
// ---------------------------------------------------------------------------
export interface BudgetState {
  version: number;
  currentYear: number;

  // Dados vindos do backend
  budget: Budget | null;
  items: Item[];
  costs: Cost[];
  goals: FinancialGoal[];
  reserveMovements: ReserveMovement[];
  summary: BudgetSummary | null;

  // Derivado localmente (12 meses do ano corrente)
  months: MonthItem[];

  // Simulação (localStorage apenas — NÃO persistido no backend)
  simulation: SimulationSettings;

  // Compatibilidade transitória com componentes existentes
  incomes?: Item[];
  lists?: {
    cartoes: Item[];
    fixas: Item[];
    vars: Item[];
  };
  oneTimeCosts?: OneTimeCost[];
}

// ---------------------------------------------------------------------------
// Tipos legados mantidos para compatibilidade transitória durante migração.
// Remover quando todos os componentes forem atualizados.
// ---------------------------------------------------------------------------

/** @deprecated Usar Item + Entry diretamente. */
export type BudgetItem = Item;

/** @deprecated Usar Cost + CostItem. */
export interface OneTimeCost {
  id: string;
  name: string;
  value: number;
  targetMonthId?: string;
  off?: boolean;
  notes?: string;
}

/** @deprecated Usar Budget diretamente. */
export interface BudgetYear {
  id: string;
  year: number;
  simulation: SimulationSettings & {
    initialBalance: number;
    emergencyReserve: number;
  };
  months?: MonthItem[];
  createdAt?: string;
  updatedAt?: string;
}
