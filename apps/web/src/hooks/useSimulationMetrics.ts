import { useMemo } from 'react';
import { useBudget } from './useBudget';
import { useBudgetStore } from '../store/useBudgetStore';

export function useSimulationMetrics() {
  const { state, metrics } = useBudget();
  const simulation = useBudgetStore(s => s.simulation);
  const { items, costs, months, budget } = state;

  return useMemo(() => {
    const isSimActive = simulation.varsPercent !== 0 || simulation.oneTimeMarginPercent !== 0;

    const initialBalance = budget?.initialBalance ?? 0;
    const emergencyReserve = budget?.emergencyReserveTarget ?? 0;

    const activeVars = items.filter((i) => (i.type === 'variavel' || (i.type as string) === 'var') && !i.off);
    const activeIncomes = items.filter((i) => i.type === 'renda' && !i.off);
    const activeCards = items.filter((i) => i.type === 'cartao' && !i.off);
    const activeFixed = items.filter((i) => i.type === 'fixa' && !i.off);

    const activeProjectCostItems = costs.flatMap((c) =>
      (c.items || []).map((ci) => ({
        value: ci.plannedAmount,
        month: ci.month ?? c.defaultMonth,
        targetMonthId: ci.month
          ? `${state.currentYear}-${String(ci.month).padStart(2, '0')}`
          : c.defaultMonth
          ? `${state.currentYear}-${String(c.defaultMonth).padStart(2, '0')}`
          : undefined,
      }))
    );

    const activeOneTime = activeProjectCostItems;

    const totalRawVarsAllMonths = months.reduce((acc, m) => {
      return acc + activeVars.reduce((sum, i) => sum + (i.values?.[m.id] ?? 0), 0);
    }, 0);
    const avgMonthlyRawVars = months.length > 0 ? totalRawVarsAllMonths / months.length : 0;
    const avgMonthlySimVars = avgMonthlyRawVars * (1 + simulation.varsPercent / 100);
    const diffMonthlyVars = avgMonthlySimVars - avgMonthlyRawVars;

    const rawOneTimeTotal = activeOneTime.reduce((acc, i) => acc + (i.value || 0), 0);
    const simOneTimeTotal = rawOneTimeTotal * (1 + simulation.oneTimeMarginPercent / 100);
    const diffOneTime = simOneTimeTotal - rawOneTimeTotal;

    let baseRunning = initialBalance;
    months.forEach((m) => {
      const inc = activeIncomes.reduce((sum, i) => sum + (i.values?.[m.id] ?? 0), 0);
      const crd = activeCards.reduce((sum, i) => sum + (i.values?.[m.id] ?? 0), 0);
      const fix = activeFixed.reduce((sum, i) => sum + (i.values?.[m.id] ?? 0), 0);
      const vr = activeVars.reduce((sum, i) => sum + (i.values?.[m.id] ?? 0), 0);
      const oneTimeThisMonth = activeOneTime
        .filter((i) => i.targetMonthId === m.id)
        .reduce((sum, i) => sum + (i.value || 0), 0);

      baseRunning += inc - (crd + fix + vr + oneTimeThisMonth);
    });
    
    const hasDistributed = activeOneTime.some((i) => i.targetMonthId);
    const baseFinal = hasDistributed ? baseRunning : baseRunning - rawOneTimeTotal;

    const currentFinal = metrics.finalAccumulated;
    const finalDiff = currentFinal - baseFinal;

    const willHaveDeficit = metrics.minAccumulatedBalance < 0;

    const willInvadeReserve =
      isSimActive &&
      !willHaveDeficit &&
      emergencyReserve > 0 &&
      finalDiff < 0 &&
      (initialBalance >= emergencyReserve || metrics.minAccumulatedBalance < emergencyReserve);

    return {
      isSimActive,
      initialBalance,
      emergencyReserve,
      avgMonthlyRawVars,
      avgMonthlySimVars,
      diffMonthlyVars,
      rawOneTimeTotal,
      simOneTimeTotal,
      diffOneTime,
      currentFinal,
      finalDiff,
      willHaveDeficit,
      willInvadeReserve
    };
  }, [state, metrics, simulation]);
}

