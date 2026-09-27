import { describe, it, expect } from 'vitest';
import {
  buildMonthlySummaries,
  calculateBudget,
  getAverageMonthlyVars,
} from '../services/budgetCalculator';
import type { BudgetSummary, SimulationSettings, Item } from '../types/budget';

function createMockSummary(): BudgetSummary {
  return {
    year: 2026,
    initialBalance: 10000,
    emergencyReserveTarget: 5000,
    months: [
      {
        month: 10,
        income: 8000,
        cards: 2000,
        fixed: 2000,
        variable: 1000,
        oneTimeCosts: 0,
        totalExpenses: 5000,
        monthBalance: 3000,
        accumulatedBalance: 13000,
      },
      {
        month: 11,
        income: 8000,
        cards: 2500,
        fixed: 2000,
        variable: 1000,
        oneTimeCosts: 1200,
        totalExpenses: 6700,
        monthBalance: 1300,
        accumulatedBalance: 14300,
      },
      {
        month: 12,
        income: 10000,
        cards: 3000,
        fixed: 2000,
        variable: 1500,
        oneTimeCosts: 0,
        totalExpenses: 6500,
        monthBalance: 3500,
        accumulatedBalance: 17800,
      },
    ],
    totals: {
      income: 26000,
      cards: 7500,
      fixed: 6000,
      variable: 3500,
      oneTimeCosts: 1200,
      totalExpenses: 18200,
      netBalance: 7800,
      finalAccumulated: 17800,
    },
  };
}

describe('budgetCalculator (client-side simulation on BudgetSummary)', () => {
  const defaultSim: SimulationSettings = {
    varsPercent: 0,
    rendaPercent: 0,
    oneTimeMarginPercent: 0,
  };

  it('buildMonthlySummaries converte BudgetSummary sem simulação', () => {
    const summary = createMockSummary();
    const months = buildMonthlySummaries(summary, defaultSim);

    expect(months).toHaveLength(3);

    // Mês 10
    expect(months[0].income).toBe(8000);
    expect(months[0].cards).toBe(2000);
    expect(months[0].fixed).toBe(2000);
    expect(months[0].variable).toBe(1000);
    expect(months[0].oneTime).toBe(0);
    expect(months[0].totalExpenses).toBe(5000);
    expect(months[0].monthBalance).toBe(3000);
    expect(months[0].accumulatedBalance).toBe(13000);
    expect(months[0].availableAfterReserve).toBe(8000); // 13000 - 5000
  });

  it('aplica simulação client-side de despesas variáveis (+50%)', () => {
    const summary = createMockSummary();
    const sim: SimulationSettings = {
      varsPercent: 50,
      rendaPercent: 0,
      oneTimeMarginPercent: 0,
    };

    const months = buildMonthlySummaries(summary, sim);

    // Mês 10: variável original 1000 -> com +50% vira 1500
    expect(months[0].variable).toBe(1500);
    expect(months[0].totalExpenses).toBe(5500); // 2000 + 2000 + 1500
    expect(months[0].monthBalance).toBe(2500); // 8000 - 5500
    expect(months[0].accumulatedBalance).toBe(12500); // 10000 + 2500
  });

  it('aplica margem de custos pontuais (+20%)', () => {
    const summary = createMockSummary();
    const sim: SimulationSettings = {
      varsPercent: 0,
      rendaPercent: 0,
      oneTimeMarginPercent: 20,
    };

    const months = buildMonthlySummaries(summary, sim);

    // Mês 11: oneTime original 1200 -> com +20% vira 1440
    expect(months[1].oneTime).toBe(1440);
  });

  it('calculateBudget retorna summaries e metrics calculados', () => {
    const summary = createMockSummary();
    const { monthlySummaries, metrics } = calculateBudget(summary, defaultSim);

    expect(monthlySummaries).toHaveLength(3);
    expect(metrics.finalAccumulated).toBe(17800);
    expect(metrics.totalAvailableAfterReserve).toBe(12800); // 17800 - 5000
    expect(metrics.totalIncome).toBe(26000);
  });

  it('getAverageMonthlyVars calcula média a partir das entries dos items', () => {
    const items: Item[] = [
      {
        id: 'var-1',
        budgetId: '2026',
        name: 'Supermercado',
        type: 'variavel',
        entries: [
          { id: 'e1', itemId: 'var-1', month: 1, plannedAmount: 1200, actualAmount: null, dueDate: null, paidDate: null },
          { id: 'e2', itemId: 'var-1', month: 2, plannedAmount: 1200, actualAmount: null, dueDate: null, paidDate: null },
        ],
      },
    ];

    const avg = getAverageMonthlyVars(items);
    expect(avg).toBe(200); // 2400 / 12 meses
  });

  it('aplica âncora de conciliação de saldo preservando meses anteriores e projetando futuros', () => {
    const summary = createMockSummary();
    summary.reconciledMonth = 11;
    summary.reconciledBalance = 20000;

    const months = buildMonthlySummaries(summary, defaultSim);

    // Mês 10 (anterior à âncora): preserva histórico original (10000 + 3000 = 13000)
    expect(months[0].accumulatedBalance).toBe(13000);

    // Mês 11 (mês da âncora): assume exatamente o saldo real conciliado (20000)
    expect(months[1].accumulatedBalance).toBe(20000);

    // Mês 12 (posterior à âncora): projeta a partir de 20000 + sobra de dez (3500) = 23500
    expect(months[2].accumulatedBalance).toBe(23500);
  });
});
