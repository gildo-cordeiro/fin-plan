import { useMemo, useCallback } from 'react';
import { useBudgetStore } from '../store/useBudgetStore';
import { useBudgetYearQuery, useBudgetSummaryQuery, useUpdateBudgetMutation, useCreateItemMutation, useUpdateItemMutation, useDeleteItemMutation, useUpdateEntryMutation, useCreateReserveMovementMutation, useBudgetListQuery } from '../queries/budget';
import { calculateBudget } from '../services/budgetCalculator';
import { type BudgetCategoryKey, normalizeBudgetItemType } from '../constants/enums';
import { generateMonthSequence } from '../lib/format';
import type { BudgetState, Item, MonthSummary } from '../types/budget';
import { budgetApiService } from '../services/budgetApiService';
import { useQueryClient, useMutation } from '@tanstack/react-query';

// Sincroniza e enriquece items vindo do backend
function enrichItemWithValues(item: Item, year: number): Item {
  const values: Record<string, number> = {};
  if (item.entries && item.entries.length > 0) {
    for (const entry of item.entries) {
      const monthPad = String(entry.month).padStart(2, '0');
      values[`${year}-${monthPad}`] = entry.plannedAmount;
    }
  }
  return {
    ...item,
    values: { ...(item.values || {}), ...values },
  };
}

export const useBudget = () => {
  const queryClient = useQueryClient();
  const currentYear = useBudgetStore(s => s.currentYear);
  const simulation = useBudgetStore(s => s.simulation);
  const setCurrentYear = useBudgetStore(s => s.setCurrentYear);

  const { data: yearVm, isLoading: isYearLoading, error: yearError } = useBudgetYearQuery(currentYear);
  const { data: summaryData, isLoading: isSummaryLoading, error: summaryError } = useBudgetSummaryQuery(currentYear);
  const { data: budgetList } = useBudgetListQuery();

  // Mutações
  const updateBudgetMut = useUpdateBudgetMutation(currentYear);
  const createItemMut = useCreateItemMutation(currentYear);
  const updateItemMut = useUpdateItemMutation(currentYear);
  const deleteItemMut = useDeleteItemMutation(currentYear);
  const updateEntryMut = useUpdateEntryMutation(currentYear);
  const createReserveMut = useCreateReserveMovementMutation(currentYear);

  const createYearMut = useMutation({
    mutationFn: (year: number) => budgetApiService.createBudget({ year, initialBalance: 0, emergencyReserveTarget: 0 }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
    }
  });

  // Deriva o estado de items
  const items = useMemo(() => {
    const vmItems = yearVm?.items;
    if (!vmItems) return [];
    return vmItems.map(i => enrichItemWithValues(i, currentYear));
  }, [yearVm?.items, currentYear]);

  // Gera a lista de meses padrão (pode ser adaptada para ler do local state se quisermos um horizon view customizado)
  // Para manter compatível, retornamos os 12 meses do ano
  const months = useMemo(() => generateMonthSequence(currentYear, 0, 12), [currentYear]);

  const state = useMemo<BudgetState>(() => ({
    currentYear,
    budget: yearVm?.budget || null,
    items,
    months,
    reserveMovements: yearVm?.reserveMovements || [],
    costs: yearVm?.costs || [],
    goals: yearVm?.goals || [],
    summary: summaryData || null, version: 6, simulation,
  }), [currentYear, yearVm, items, months, summaryData, simulation]);

  // Cálculos do orçamento (monthlySummaries e metrics)
  const calculations = useMemo(() => {
    if (!state.summary) {
      return { monthlySummaries: [] as MonthSummary[], metrics: { finalAccumulated: 0, totalAvailableAfterReserve: 0, totalOneTimeCosts: 0, netFinalAfterOneTime: 0, minAccumulatedBalance: 0, minAccumulatedMonth: '-', averageSavingsRate: 0, totalIncome: 0, totalRegularExpenses: 0, averageMonthlyBalance: 0 } };
    }
    return calculateBudget(state.summary, simulation);
  }, [state.summary, simulation]);

  const updatePlannedAmount = useCallback((entryId: string, value: number) => {
    updateEntryMut.mutate({ id: entryId, patch: { plannedAmount: value } });
  }, [updateEntryMut]);

  return {
    state,
    monthlySummaries: calculations.monthlySummaries,
    metrics: calculations.metrics,

    isLoading: isYearLoading || isSummaryLoading,
    isSaving: updateEntryMut.isPending || updateItemMut.isPending || updateBudgetMut.isPending,
    lastSaved: new Date(),
    loadError: yearError?.message || summaryError?.message || null,
    saveError: null,
    
    // Stubs para funções não mais aplicáveis no novo modelo
    refreshFromDb: async () => { queryClient.invalidateQueries({ queryKey: ['budgets'] }); },

    availableYears: (budgetList || []).map(b => ({ year: b.year, id: b.id })),
    selectYear: async (year: number) => setCurrentYear(year),
    createYear: async (year: number) => { await createYearMut.mutateAsync(year); setCurrentYear(year); },

    updateBudgetBalances: async (patch: any) => { await updateBudgetMut.mutateAsync(patch); },

    confirmEntry: async (entryId: string, actualAmount?: number) => { updateEntryMut.mutate({ id: entryId, patch: { actualAmount } }); },
    unconfirmEntry: async (entryId: string) => { updateEntryMut.mutate({ id: entryId, patch: { actualAmount: null } }); },
    updatePlannedAmount,

    addItem: async (category: BudgetCategoryKey, customName?: string) => { 
      await createItemMut.mutateAsync({ budgetId: String(currentYear), type: normalizeBudgetItemType(category), name: customName || 'Novo Item' }); 
    },
    addTransaction: async ({ category, name, value, monthId }: { category: BudgetCategoryKey, name: string, value: number, monthId: string, repeatForward?: boolean }) => { console.log(value, monthId, category);
      // Simplificado: API deveria tratar, mas se não, precisa refatorar.
      await createItemMut.mutateAsync({ budgetId: String(currentYear), type: normalizeBudgetItemType(category), name });
    },
    removeItem: (_category: BudgetCategoryKey, itemId: string) => { const item = items.find(i => i.id === itemId); deleteItemMut.mutate(itemId); return item; },
    updateItemName: (_category: BudgetCategoryKey, itemId: string, name: string) => { updateItemMut.mutate({ id: itemId, patch: { name } }); },
    toggleItemActive: (_category: BudgetCategoryKey, itemId: string) => { 
      const item = items.find(i => i.id === itemId);
      if (item) updateItemMut.mutate({ id: itemId, patch: { off: !item.off } });
    },
    updateItemValue: (_category: BudgetCategoryKey, itemId: string, monthId: string, value: number) => {
      const item = items.find(i => i.id === itemId);
      const monthNum = parseInt(monthId.split('-')[1], 10) || 1;
      const entry = item?.entries?.find(e => e.month === monthNum);
      if (entry) updatePlannedAmount(entry.id, value);
    },
    repeatFirstMonthAcrossAll: (_category: BudgetCategoryKey, itemId: string) => {
      const item = items.find(i => i.id === itemId);
      const firstEntry = item?.entries?.find(e => e.month === 1);
      if (item && firstEntry) {
        item.entries?.forEach(e => updatePlannedAmount(e.id, firstEntry.plannedAmount));
      }
    },
    repeatValueForward: (_category: BudgetCategoryKey, itemId: string, fromMonthId: string) => {
      const item = items.find(i => i.id === itemId);
      const fromMonthNum = parseInt(fromMonthId.split('-')[1], 10) || 1;
      const baseEntry = item?.entries?.find(e => e.month === fromMonthNum);
      if (item && baseEntry) {
        item.entries?.forEach(e => {
          if (e.month >= fromMonthNum) updatePlannedAmount(e.id, baseEntry.plannedAmount);
        });
      }
    },

    createReserveMovement: async (month: number, amount: number, reason?: string) => {
      await createReserveMut.mutateAsync({ budgetId: String(currentYear), month, amount, reason });
    },
  };
};
