import { describe, it, expect } from 'vitest';
import {
  calculateMonthlySummaries,
  calculateOverallMetrics,
  calculateBudget,
} from '../services/budgetCalculator';
import type { BudgetState } from '../types/budget';

function createBaseState(): BudgetState {
  return {
    version: 5,
    months: [
      { id: '2026-10', name: 'Outubro 2026', shortName: 'Out/26', year: 2026, monthIndex: 9 },
      { id: '2026-11', name: 'Novembro 2026', shortName: 'Nov/26', year: 2026, monthIndex: 10 },
      { id: '2026-12', name: 'Dezembro 2026', shortName: 'Dez/26', year: 2026, monthIndex: 11 },
    ],
    simulation: {
      varsPercent: 0,
      rendaPercent: 0,
      oneTimeMarginPercent: 0,
      initialBalance: 10000,
      emergencyReserve: 5000,
    },
    incomes: [
      {
        id: 'inc-1',
        name: 'Salário',
        category: 'renda',
        values: { '2026-10': 8000, '2026-11': 8000, '2026-12': 10000 },
      },
    ],
    lists: {
      cartoes: [
        {
          id: 'card-1',
          name: 'Cartão Inter',
          category: 'cartoes',
          values: { '2026-10': 2000, '2026-11': 2500, '2026-12': 3000 },
        },
      ],
      fixas: [
        {
          id: 'fix-1',
          name: 'Aluguel',
          category: 'fixas',
          values: { '2026-10': 2000, '2026-11': 2000, '2026-12': 2000 },
        },
      ],
      vars: [
        {
          id: 'var-1',
          name: 'Mercado',
          category: 'vars',
          values: { '2026-10': 1000, '2026-11': 1000, '2026-12': 1500 },
        },
      ],
    },
    oneTimeCosts: [
      {
        id: 'ot-1',
        name: 'Frete',
        value: 1200,
        targetMonthId: '2026-11',
      },
    ],
    goals: [],
  };
}

describe('budgetCalculator', () => {
  describe('calculateMonthlySummaries', () => {
    it('calcula corretamente o fluxo de caixa mensal e saldo acumulado', () => {
      const state = createBaseState();
      const summaries = calculateMonthlySummaries(state);

      expect(summaries).toHaveLength(3);

      // Mês 1: Outubro 2026
      // Renda: 8000
      // Despesas: 2000 (cartão) + 2000 (fixa) + 1000 (var) = 5000
      // Sobra: 8000 - 5000 = 3000
      // Saldo acumulado: 10000 + 3000 = 13000
      // Disponível pós-reserva: 13000 - 5000 = 8000
      const oct = summaries[0];
      expect(oct.income).toBe(8000);
      expect(oct.cards).toBe(2000);
      expect(oct.fixed).toBe(2000);
      expect(oct.variable).toBe(1000);
      expect(oct.oneTime).toBe(0);
      expect(oct.totalExpenses).toBe(5000);
      expect(oct.monthBalance).toBe(3000);
      expect(oct.accumulatedBalance).toBe(13000);
      expect(oct.availableAfterReserve).toBe(8000);

      // Mês 2: Novembro 2026
      // Renda: 8000
      // Despesas regulares: 2500 (cartão) + 2000 (fixa) + 1000 (var) = 5500
      // Custo pontual: 1200 (Frete)
      // Total saídas: 6700
      // Sobra: 8000 - 6700 = 1300
      // Saldo acumulado: 13000 + 1300 = 14300
      const nov = summaries[1];
      expect(nov.income).toBe(8000);
      expect(nov.cards).toBe(2500);
      expect(nov.fixed).toBe(2000);
      expect(nov.variable).toBe(1000);
      expect(nov.oneTime).toBe(1200);
      expect(nov.totalExpenses).toBe(6700);
      expect(nov.monthBalance).toBe(1300);
      expect(nov.accumulatedBalance).toBe(14300);
      expect(nov.availableAfterReserve).toBe(9300);

      // Mês 3: Dezembro 2026
      // Renda: 10000
      // Despesas regulares: 3000 (cartão) + 2000 (fixa) + 1500 (var) = 6500
      // Custo pontual: 0
      // Sobra: 10000 - 6500 = 3500
      // Saldo acumulado: 14300 + 3500 = 17800
      const dec = summaries[2];
      expect(dec.income).toBe(10000);
      expect(dec.monthBalance).toBe(3500);
      expect(dec.accumulatedBalance).toBe(17800);
      expect(dec.availableAfterReserve).toBe(12800);
    });

    it('aplica simulações de percentual de renda, variáveis e margem de custos pontuais', () => {
      const state = createBaseState();
      state.simulation.rendaPercent = 10; // +10% de renda
      state.simulation.varsPercent = 20; // +20% de variáveis
      state.simulation.oneTimeMarginPercent = 15; // +15% no frete

      const summaries = calculateMonthlySummaries(state);

      // Outubro: Renda 8000 * 1.1 = 8800; Variáveis: 1000 * 1.2 = 1200
      const oct = summaries[0];
      expect(oct.income).toBeCloseTo(8800);
      expect(oct.variable).toBeCloseTo(1200);

      // Novembro: Frete 1200 * 1.15 = 1380
      const nov = summaries[1];
      expect(nov.oneTime).toBeCloseTo(1380);
    });

    it('ignora itens desativados (off: true)', () => {
      const state = createBaseState();
      state.incomes[0].off = true;
      state.lists.cartoes[0].off = true;
      state.oneTimeCosts[0].off = true;

      const summaries = calculateMonthlySummaries(state);
      const nov = summaries[1];

      expect(nov.income).toBe(0);
      expect(nov.cards).toBe(0);
      expect(nov.oneTime).toBe(0);
      expect(nov.fixed).toBe(2000); // apenas Aluguel ativo
      expect(nov.monthBalance).toBe(-3000); // -2000 (fixa) - 1000 (var)
    });
  });

  describe('calculateOverallMetrics', () => {
    it('calcula métricas gerais consolidadas com precisão', () => {
      const state = createBaseState();
      const summaries = calculateMonthlySummaries(state);
      const metrics = calculateOverallMetrics(state, summaries);

      expect(metrics.finalAccumulated).toBe(17800);
      expect(metrics.totalAvailableAfterReserve).toBe(12800);
      expect(metrics.totalOneTimeCosts).toBe(1200);
      expect(metrics.netFinalAfterOneTime).toBe(17800); // todos custos pontuais já alocados em meses
      expect(metrics.minAccumulatedBalance).toBe(13000);
      expect(metrics.minAccumulatedMonth).toBe('Out/26');
      expect(metrics.totalIncome).toBe(26000); // 8000 + 8000 + 10000
      expect(metrics.totalRegularExpenses).toBe(17000); // 5000 + 5500 + 6500
    });

    it('calcula netFinalAfterOneTime deduzindo custos pontuais sem mês atribuído', () => {
      const state = createBaseState();
      state.oneTimeCosts.push({
        id: 'ot-unassigned',
        name: 'Reserva imprevisto reforma',
        value: 2000,
        targetMonthId: undefined, // sem mês atribuído
      });

      const summaries = calculateMonthlySummaries(state);
      const metrics = calculateOverallMetrics(state, summaries);

      expect(metrics.totalOneTimeCosts).toBe(3200); // 1200 + 2000
      expect(metrics.finalAccumulated).toBe(17800);
      expect(metrics.netFinalAfterOneTime).toBe(15800); // 17800 - 2000
    });
  });

  describe('calculateBudget', () => {
    it('retorna simultaneamente summaries e metrics', () => {
      const state = createBaseState();
      const result = calculateBudget(state);

      expect(result.monthlySummaries).toHaveLength(3);
      expect(result.metrics.finalAccumulated).toBe(17800);
    });
  });
});
