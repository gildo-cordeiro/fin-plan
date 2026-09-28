import { useMemo } from 'react';
import type { BudgetState } from '../types/budget';
import { calculateBudget } from '../services/budgetCalculator';
import { useUIStore } from '../store/uiStore';

export function useBudgetCalculations(state: BudgetState) {
  const simulation = useUIStore((s) => s.simulation);
  
  return useMemo(
    () => calculateBudget(state.summary, simulation),
    [state.summary, simulation]
  );
}
