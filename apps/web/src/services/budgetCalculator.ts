import type { BudgetState, MonthSummary, OverallMetrics } from '../types/budget';

export function calculateMonthlySummaries(state: BudgetState): MonthSummary[] {
  const { months, simulation, incomes, lists, oneTimeCosts } = state;
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

  const hasItems = Array.isArray(state.items) && state.items.length > 0;
  const rawIncomes = hasItems ? state.items.filter((i) => i.type === 'renda') : (incomes || []);
  const rawCards = hasItems ? state.items.filter((i) => i.type === 'cartao') : (lists?.cartoes || []);
  const rawFixed = hasItems ? state.items.filter((i) => i.type === 'fixa') : (lists?.fixas || []);
  const rawVars = hasItems ? state.items.filter((i) => i.type === 'var') : (lists?.vars || []);

  const activeIncomes = rawIncomes.filter((i) => !i.off);
  const activeCards = rawCards.filter((i) => !i.off);
  const activeFixed = rawFixed.filter((i) => !i.off);
  const activeVars = rawVars.filter((i) => !i.off);
  const activeOneTime = (oneTimeCosts || []).filter((i) => !i.off);

  let runningAccumulated = initialBalance;
  const summaries: MonthSummary[] = [];

  months.forEach((m) => {
    const mIncome = activeIncomes.reduce(
      (acc, item) => acc + (item.values[m.id] ?? 0) * incomeFactor,
      0
    );

    const mCards = activeCards.reduce((acc, item) => acc + (item.values[m.id] ?? 0), 0);
    const mFixed = activeFixed.reduce((acc, item) => acc + (item.values[m.id] ?? 0), 0);
    const mVars = activeVars.reduce(
      (acc, item) => acc + (item.values[m.id] ?? 0) * varsFactor,
      0
    );

    const mOneTime = activeOneTime
      .filter((item) => item.targetMonthId === m.id)
      .reduce((acc, item) => acc + (item.value || 0) * oneTimeFactor, 0);

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
  const { simulation, oneTimeCosts, months } = state;
  const { oneTimeMarginPercent, initialBalance, emergencyReserve } = simulation;
  const oneTimeFactor = 1 + oneTimeMarginPercent / 100;

  const activeOneTime = (oneTimeCosts || []).filter((i) => !i.off);
  const rawOneTimeTotal = activeOneTime.reduce((acc, item) => acc + (item.value || 0), 0);
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

  if (minBalance === Number.POSITIVE_INFINITY) {
    minBalance = initialBalance;
    minMonth = months[0]?.shortName || '-';
  }

  const finalAccumulated =
    monthlySummaries.length > 0
      ? monthlySummaries[monthlySummaries.length - 1].accumulatedBalance
      : initialBalance;

  const totalAvailableAfterReserve = Math.max(0, finalAccumulated - emergencyReserve);

  const unassignedOneTimeCosts = activeOneTime
    .filter((item) => !item.targetMonthId)
    .reduce((acc, item) => acc + (item.value || 0) * oneTimeFactor, 0);

  const netFinalAfterOneTime = finalAccumulated - unassignedOneTimeCosts;

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

export function calculateBudget(state: BudgetState): {
  monthlySummaries: MonthSummary[];
  metrics: OverallMetrics;
} {
  const monthlySummaries = calculateMonthlySummaries(state);
  const metrics = calculateOverallMetrics(state, monthlySummaries);
  return { monthlySummaries, metrics };
}
