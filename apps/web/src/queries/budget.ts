import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApiService } from '../services/budgetApiService';
import type { YearViewModel, Item, Entry, ReserveMovement } from '../types/budget';


export const budgetKeys = {
  all: ['budgets'] as const,
  year: (year: number) => [...budgetKeys.all, year] as const,
  summary: (year: number) => [...budgetKeys.all, 'summary', year] as const,
};

export function useBudgetYearQuery(year: number) {
  return useQuery({
    queryKey: budgetKeys.year(year),
    queryFn: () => budgetApiService.fetchBudgetYear(year),
  });
}

export function useBudgetSummaryQuery(year: number) {
  return useQuery({
    queryKey: budgetKeys.summary(year),
    queryFn: () => budgetApiService.fetchSummary(year),
  });
}

// -----------------------------------------------------------------------------
// Mutations: Budget
// -----------------------------------------------------------------------------

export function useUpdateBudgetMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: { initialBalance?: number; emergencyReserveTarget?: number }) => 
      budgetApiService.updateBudget(year, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(year) });
    },
  });
}

// -----------------------------------------------------------------------------
// Mutations: Items & Entries
// -----------------------------------------------------------------------------

export function useCreateItemMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { budgetId: string; type: string; name: string }) => 
      budgetApiService.createItem(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
    },
  });
}

export function useUpdateItemMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string, patch: Partial<Item> }) => 
      budgetApiService.updateItem(id, patch),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
    },
  });
}

export function useDeleteItemMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => budgetApiService.deleteItem(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(year) });
    },
  });
}

export function useUpdateEntryMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string, patch: Partial<Entry> }) => 
      budgetApiService.updateEntry(id, patch),
    // Optimistic update
    onMutate: async ({ id, patch }: { id: string; patch: Partial<Entry> }) => {
      await queryClient.cancelQueries({ queryKey: budgetKeys.year(year) });
      const previousData = queryClient.getQueryData<YearViewModel>(budgetKeys.year(year));

      if (previousData) {
        queryClient.setQueryData<YearViewModel>(budgetKeys.year(year), {
          ...previousData,
          items: previousData.items.map(item => {
            if (!item.entries?.some(e => e.id === id)) return item;
            return {
              ...item,
              entries: item.entries.map(e => e.id === id ? { ...e, ...patch } : e)
            };
          })
        });
      }
      return { previousData };
    },
    onError: (_err, _newVal, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(budgetKeys.year(year), context.previousData);
      }
    },
    onSettled: () => {
      // Invalidate to ensure summary and everything is accurate
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(year) });
    }
  });
}

// -----------------------------------------------------------------------------
// Mutations: Reserve Movements
// -----------------------------------------------------------------------------

export function useCreateReserveMovementMutation(year: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<ReserveMovement, 'id' | 'createdAt' | 'updatedAt'>) => 
      budgetApiService.createReserveMovement(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: budgetKeys.year(year) });
      queryClient.invalidateQueries({ queryKey: budgetKeys.summary(year) });
    },
  });
}

