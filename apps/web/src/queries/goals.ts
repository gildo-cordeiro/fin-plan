import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApiService } from '../services/budgetApiService';
import type { FinancialGoal } from '../types/budget';

export const goalKeys = {
  all: ['goals'] as const,
};

export function useGoalsQuery() {
  return useQuery({
    queryKey: goalKeys.all,
    queryFn: () => budgetApiService.fetchGoals(),
  });
}

export function useCreateGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (goal: Partial<FinancialGoal>) => budgetApiService.createGoal(goal),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useUpdateGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<FinancialGoal> }) =>
      budgetApiService.updateGoal(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useDeleteGoalMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetApiService.deleteGoal(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useAddGoalContributionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      goalId,
      amount,
      note,
      date,
    }: {
      goalId: string;
      amount: number;
      note?: string;
      date?: string;
    }) => budgetApiService.addGoalContribution(goalId, { amount, note, date }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}

export function useDeleteGoalContributionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ goalId, contributionId }: { goalId: string; contributionId: string }) =>
      budgetApiService.deleteGoalContribution(goalId, contributionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: goalKeys.all });
    },
  });
}
