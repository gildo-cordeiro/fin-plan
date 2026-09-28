import { useQuery } from '@tanstack/react-query';
import { budgetApiService } from '../services/budgetApiService';

export const budgetKeys = {
  all: ['budgets'] as const,
  year: (year: number) => [...budgetKeys.all, year] as const,
};

export function useBudgetYearQuery(year: number) {
  return useQuery({
    queryKey: budgetKeys.year(year),
    queryFn: () => budgetApiService.fetchBudgetYear(year),
  });
}
