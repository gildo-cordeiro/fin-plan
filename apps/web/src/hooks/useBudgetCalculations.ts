import { useMemo } from 'react';
import type { BudgetState } from '../types/budget';
import { calculateBudget } from '../services/budgetCalculator';

export function useBudgetCalculations(state: BudgetState) {
  return useMemo(() => calculateBudget(state), [state]);
}
