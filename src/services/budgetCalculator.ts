import type { BudgetState, MonthSummary, OverallMetrics } from '../types/budget';

/**
 * Serviço de Cálculo Orçamentário (Pure Domain Logic)
 * Isola todas as fórmulas financeiras, projeções e métricas do ciclo de vida do React.
 */

export function calculateMonthlySummaries(state: BudgetState): MonthSummary[] {
  const { months, simulation, incomes, lists } = state;
  const {
    varsPercent,
    rendaPercent,
    oneTimeMarginPercent,
    initialBalance,
    emergencyReserve,
  } = simulation;

  const incomeFactor = 1 + rendaPercent / 100;
  const varsFactor = 1 + varsPercent / 100;
  const oneTimeFactor = 1 + oneTimeMarginPercent / 100;

  // Itens ativos
  const activeIncomes = incomes.filter((i) => !i.off);
  const activeCards = lists.cartoes.filter((i) => !i.off);
  const activeFixed = lists.fixas.filter((i) => !i.off);
  const activeVars = lists.vars.filter((i) => !i.off);
  const activeMud = lists.mud.filter((i) => !i.off);

  let runningAccumulated = initialBalance;
  const summaries: MonthSummary[] = [];

  months.forEach((m) => {
    // Renda projetada do mês
    const mIncome = activeIncomes.reduce(
      (acc, item) => acc + (item.values[m.id] ?? 0) * incomeFactor,
      0
    );

    // Despesas regulares do mês
    const mCards = activeCards.reduce((acc, item) => acc + (item.values[m.id] ?? 0), 0);
    const mFixed = activeFixed.reduce((acc, item) => acc + (item.values[m.id] ?? 0), 0);
    const mVars = activeVars.reduce(
      (acc, item) => acc + (item.values[m.id] ?? 0) * varsFactor,
      0
    );

    // Despesas pontuais atribuídas a este mês específico (ex: Mudança em Dezembro)
    const mOneTime = activeMud
      .filter((item) => item.targetMonthId === m.id)
      .reduce((acc, item) => acc + (item.oneTimeValue || 0) * oneTimeFactor, 0);

    const mRegularExpenses = mCards + mFixed + mVars;
    const mTotalExpenses = mRegularExpenses + mOneTime;
    const mBalance = mIncome - mTotalExpenses;

    runningAccumulated += mBalance;
    const mAvailAfterReserve = runningAccumulated - emergencyReserve;

    summaries.push({
      month: m,
      income: mIncome,
      cards: mCards,
      fixed: mFixed,
      variable: mVars,
      oneTime: mOneTime,
      totalExpenses: mTotalExpenses,
      monthBalance: mBalance,
      accumulatedBalance: runningAccumulated,
      availableAfterReserve: mAvailAfterReserve,
    });
  });

  return summaries;
}

export function calculateOverallMetrics(
  state: BudgetState,
  monthlySummaries: MonthSummary[]
): OverallMetrics {
  const { simulation, lists, months } = state;
  const { oneTimeMarginPercent, initialBalance, emergencyReserve } = simulation;
  const oneTimeFactor = 1 + oneTimeMarginPercent / 100;

  const activeMud = lists.mud.filter((i) => !i.off);
  const rawOneTimeTotal = activeMud.reduce((acc, item) => acc + (item.oneTimeValue || 0), 0);
  const totalOneTimeCosts = rawOneTimeTotal * oneTimeFactor;

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

  const lastSummary = monthlySummaries[monthlySummaries.length - 1];
  const finalAccumulated = lastSummary ? lastSummary.accumulatedBalance : initialBalance;
  const totalAvailableAfterReserve = finalAccumulated - emergencyReserve;

  // Se nenhum item pontual tiver targetMonthId, deduz o total de custos pontuais do saldo final disponível
  const hasDistributedOneTime = activeMud.some((i) => i.targetMonthId);
  const netFinalAfterOneTime = hasDistributedOneTime
    ? totalAvailableAfterReserve
    : totalAvailableAfterReserve - totalOneTimeCosts;

  const averageSavingsRate =
    sumTotalIncome > 0
      ? Math.max(0, ((sumTotalIncome - sumTotalRegularExpenses) / sumTotalIncome) * 100)
      : 0;

  return {
    finalAccumulated,
    totalAvailableAfterReserve,
    totalOneTimeCosts,
    netFinalAfterOneTime,
    minAccumulatedBalance:
      minBalance === Number.POSITIVE_INFINITY ? initialBalance : minBalance,
    minAccumulatedMonth: minMonth || (months[0]?.shortName ?? ''),
    averageSavingsRate,
    totalIncome: sumTotalIncome,
    totalRegularExpenses: sumTotalRegularExpenses,
  };
}

export function calculateBudget(state: BudgetState): {
  monthlySummaries: MonthSummary[];
  metrics: OverallMetrics;
} {
  const monthlySummaries = calculateMonthlySummaries(state);
  const metrics = calculateOverallMetrics(state, monthlySummaries);
  return { monthlySummaries, metrics };
}
