import type {
  BudgetSummary,
  MonthSummary,
  OverallMetrics,
  SimulationSettings,
  Item,
  Cost,
} from '../types/budget';
import { createMonthItem } from '../utils/formatters';

// ---------------------------------------------------------------------------
// Conversão: BudgetSummary (backend) → MonthSummary[] + OverallMetrics
// Os componentes de UI usam MonthSummary (com MonthItem derivado); o backend
// retorna BudgetSummaryMonth (com month: INT 1–12). Esta camada faz a ponte.
// ---------------------------------------------------------------------------

/**
 * Converte o BudgetSummary vindo do backend em MonthSummary[] usáveis
 * pelos componentes de UI, aplicando os modificadores de simulação
 * client-side (varsPercent, rendaPercent, oneTimeMarginPercent).
 */
export function buildMonthlySummaries(
  summary: BudgetSummary,
  simulation: SimulationSettings,
): MonthSummary[] {
  const { varsPercent, rendaPercent, oneTimeMarginPercent } = simulation;
  const incomeFactor = 1 + rendaPercent / 100;
  const varsFactor = 1 + varsPercent / 100;
  const oneTimeFactor = 1 + oneTimeMarginPercent / 100;

  let runningAccumulated = summary.initialBalance;

  return summary.months.map((m) => {
    const month = createMonthItem(summary.year, m.month - 1); // month INT 1-based → monthIndex 0-based

    const income = m.income * incomeFactor;
    const cards = m.cards;
    const fixed = m.fixed;
    const variable = m.variable * varsFactor;
    const oneTime = m.oneTimeCosts * oneTimeFactor;

    const totalExpenses = cards + fixed + variable + oneTime;
    const monthBalance = income - totalExpenses;

    runningAccumulated += monthBalance;
    const availableAfterReserve = runningAccumulated - summary.emergencyReserveTarget;

    return {
      month,
      income,
      cards,
      fixed,
      variable,
      oneTime,
      totalExpenses,
      monthBalance,
      accumulatedBalance: runningAccumulated,
      availableAfterReserve,
    };
  });
}

/**
 * Calcula métricas consolidadas a partir dos MonthSummary já ajustados
 * pela simulação.
 */
export function buildOverallMetrics(
  monthlySummaries: MonthSummary[],
  summary: BudgetSummary,
  simulation: SimulationSettings,
): OverallMetrics {
  const oneTimeFactor = 1 + simulation.oneTimeMarginPercent / 100;

  let minBalance = Number.POSITIVE_INFINITY;
  let minMonth = '';
  let sumTotalIncome = 0;
  let sumTotalRegularExpenses = 0;

  monthlySummaries.forEach((s) => {
    sumTotalIncome += s.income;
    sumTotalRegularExpenses += s.cards + s.fixed + s.variable;

    if (s.accumulatedBalance < minBalance) {
      minBalance = s.accumulatedBalance;
      minMonth = s.month.shortName;
    }
  });

  if (minBalance === Number.POSITIVE_INFINITY) {
    minBalance = summary.initialBalance;
    minMonth = '-';
  }

  const finalAccumulated =
    monthlySummaries.length > 0
      ? monthlySummaries[monthlySummaries.length - 1].accumulatedBalance
      : summary.initialBalance;

  const totalAvailableAfterReserve = Math.max(
    0,
    finalAccumulated - summary.emergencyReserveTarget,
  );

  const totalOneTimeCosts = summary.totals.oneTimeCosts * oneTimeFactor;
  const netFinalAfterOneTime = finalAccumulated; // one-time costs já estão nos meses ou no total

  const averageSavingsRate =
    sumTotalIncome > 0
      ? Math.max(0, ((sumTotalIncome - sumTotalRegularExpenses) / sumTotalIncome) * 100)
      : 0;

  return {
    finalAccumulated,
    totalAvailableAfterReserve,
    totalOneTimeCosts,
    netFinalAfterOneTime,
    minAccumulatedBalance: minBalance,
    minAccumulatedMonth: minMonth,
    averageSavingsRate,
    totalIncome: sumTotalIncome,
    totalRegularExpenses: sumTotalRegularExpenses,
  };
}

/**
 * Ponto de entrada: recebe BudgetSummary do backend + SimulationSettings
 * do localStorage e retorna os dados prontos para UI.
 */
export function calculateBudget(
  summary: BudgetSummary | null,
  simulation: SimulationSettings,
): {
  monthlySummaries: MonthSummary[];
  metrics: OverallMetrics;
} {
  if (!summary) {
    return {
      monthlySummaries: [],
      metrics: {
        finalAccumulated: 0,
        totalAvailableAfterReserve: 0,
        totalOneTimeCosts: 0,
        netFinalAfterOneTime: 0,
        minAccumulatedBalance: 0,
        minAccumulatedMonth: '-',
        averageSavingsRate: 0,
        totalIncome: 0,
        totalRegularExpenses: 0,
      },
    };
  }

  const monthlySummaries = buildMonthlySummaries(summary, simulation);
  const metrics = buildOverallMetrics(monthlySummaries, summary, simulation);
  return { monthlySummaries, metrics };
}

// ---------------------------------------------------------------------------
// Funções utilitárias para extrair valores base dos dados carregados
// (usadas pelo SimulationPanel para mostrar "Despesas Variáveis (Média/mês)")
// ---------------------------------------------------------------------------

/**
 * Calcula a média mensal de despesas variáveis a partir das entries
 * de items do tipo 'variavel'.
 */
export function getAverageMonthlyVars(items: Item[]): number {
  const varItems = items.filter((i) => i.type === 'variavel');
  let totalPlanned = 0;
  let entryCount = 0;

  varItems.forEach((item) => {
    (item.entries || []).forEach((entry) => {
      totalPlanned += entry.plannedAmount;
      entryCount++;
    });
  });

  return entryCount > 0 ? totalPlanned / Math.max(1, varItems.length > 0 ? 12 : 1) : 0;
}

/**
 * Calcula o total de custos pontuais a partir dos cost_items.
 */
export function getTotalOneTimeCosts(costs: Cost[]): number {
  return costs.reduce((acc, cost) => {
    const itemsTotal = (cost.items || []).reduce(
      (sum, ci) => sum + ci.plannedAmount,
      0,
    );
    return acc + itemsTotal;
  }, 0);
}

/**
 * Calcula o total de custos pontuais com margem a partir dos costs.
 */
export function getTotalOneTimeCostsWithMargin(costs: Cost[]): number {
  return costs.reduce((acc, cost) => {
    const itemsTotal = (cost.items || []).reduce(
      (sum, ci) => sum + ci.plannedAmount,
      0,
    );
    return acc + itemsTotal * (1 + cost.marginPercent / 100);
  }, 0);
}
