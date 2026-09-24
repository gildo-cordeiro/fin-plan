import { useMemo } from 'react';
import type { BudgetState } from '../types/budget';
import { calculateBudget } from '../services/budgetCalculator';

/**
 * Hook adaptador que memoriza os cálculos orçamentários usando o serviço de domínio puro.
 */
export function useBudgetCalculations(state: BudgetState) {
  return useMemo(() => calculateBudget(state), [state]);
}
