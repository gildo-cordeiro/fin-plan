import { useMemo } from 'react';
import type { BudgetState } from '../types/budget';
import { calculateBudget } from '../services/budgetCalculator';
import { useBudgetStore } from '../store/useBudgetStore';

export function useBudgetCalculations(state: BudgetState) {
  const simulation = useBudgetStore((s) => s.simulation);
  
  return useMemo(
    () => calculateBudget(state.summary, simulation),
    [state.summary, simulation]
  );
}
