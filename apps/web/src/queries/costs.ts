import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApiService } from '../services/budgetApiService';
import { budgetKeys } from './budget';


export function useCostsQuery(year: number) {
  return useQuery({
    queryKey: [...budgetKeys.year(year), 'costs'],
    queryFn: async () => {
      const data = await budgetApiService.fetchBudgetYear(year);
      return data.costs || [];
    },
  });
}

export function useCreateCostMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      budgetId: string;
      name: string;
      defaultMonth?: number | null;
      marginPercent?: number;
      notes?: string;
    }) => budgetApiService.createCost(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
    },
  });
}

export function useUpdateCostMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      patch,
    }: {
      id: string;
      patch: {
        name?: string;
        defaultMonth?: number | null;
        marginPercent?: number;
        notes?: string;
      };
    }) => budgetApiService.updateCost(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
    },
  });
}

export function useDeleteCostMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetApiService.deleteCost(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
    },
  });
}

export function useCreateCostItemMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      costId,
      data,
    }: {
      costId: string;
      data: { name: string; plannedAmount: number; month?: number | null; notes?: string };
    }) => budgetApiService.createCostItem(costId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
    },
  });
}

export function useUpdateCostItemMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      costId,
      id,
      patch,
    }: {
      costId: string;
      id: string;
      patch: { name?: string; plannedAmount?: number; actualAmount?: number | null; notes?: string; month?: number | null; dueDate?: string | null; paidDate?: string | null };
    }) => budgetApiService.updateCostItem(costId, id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
    },
  });
}

export function useDeleteCostItemMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ costId, id }: { costId: string; id: string }) =>
      budgetApiService.deleteCostItem(costId, id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
    },
  });
}
