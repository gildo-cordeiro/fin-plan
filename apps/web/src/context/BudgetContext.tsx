import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type {
  BudgetState,
  Item,
  Entry,
  Cost,
  CostItem,
  FinancialGoal,
  Budget,
  ReserveMovement,
  MonthSummary,
  OverallMetrics,
  SimulationSettings,
  OneTimeCost,
} from '../types/budget';
import {
  type BudgetCategoryKey,
  GoalStatus,
  normalizeBudgetItemType,
} from '../constants/enums';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';
import { useBudgetCalculations } from '../hooks/useBudgetCalculations';
import { getNextMonth, getPrevMonth, generateMonthSequence } from '../utils/formatters';
import { generateId } from '../utils/idGenerator';
import {
  loadTheme,
  saveTheme,
  loadLocalSettings,
  updateSimulationSettings,
} from '../services/storageService';
import { budgetApiService } from '../services/budgetApiService';
import { useToast } from './ToastContext';

// ---------------------------------------------------------------------------
// Helpers para sincronizar itens com mapa de valores para retrocompatibilidade
// ---------------------------------------------------------------------------

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

function createDefaultEntries(itemId: string): Entry[] {
  return Array.from({ length: 12 }, (_, i) => ({
    id: `temp-${itemId}-${i + 1}`,
    itemId,
    month: i + 1,
    plannedAmount: 0,
    actualAmount: null,
    dueDate: null,
    paidDate: null,
  }));
}

function syncDerivedLists(items: Item[]): {
  items: Item[];
  incomes: Item[];
  lists: {
    cartoes: Item[];
    fixas: Item[];
    vars: Item[];
  };
} {
  return {
    items,
    incomes: items.filter((i) => i.type === 'renda'),
    lists: {
      cartoes: items.filter((i) => i.type === 'cartao'),
      fixas: items.filter((i) => i.type === 'fixa'),
      vars: items.filter((i) => i.type === 'variavel'),
    },
  };
}

// ---------------------------------------------------------------------------
// Interface do Contexto
// ---------------------------------------------------------------------------

export interface BudgetContextType {
  state: BudgetState;
  monthlySummaries: MonthSummary[];
  metrics: OverallMetrics;
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isOnline: boolean;

  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  loadError: string | null;
  saveError: string | null;
  retrySave: () => Promise<{ success: boolean; message: string }>;
  refreshFromDb: () => Promise<{ success: boolean; message: string }>;

  // Gestão de Anos
  availableYears: Budget[];
  selectYear: (year: number) => Promise<void>;
  createYear: (year: number) => Promise<void>;

  // Simulação e parâmetros de Budget
  updateSimulation: (patch: Partial<SimulationSettings>) => void;
  updateBudgetBalances: (patch: { initialBalance?: number; emergencyReserveTarget?: number }) => Promise<void>;

  // Novas Ações Relacionais: Entry
  confirmEntry: (entryId: string, actualAmount?: number) => Promise<void>;
  unconfirmEntry: (entryId: string) => Promise<void>;
  updatePlannedAmount: (entryId: string, value: number) => void;

  // Item Actions
  addItem: (category: BudgetCategoryKey, customName?: string) => Promise<void>;
  addTransaction: (params: {
    category: BudgetCategoryKey;
    name: string;
    value: number;
    monthId: string;
    repeatForward?: boolean;
  }) => Promise<void>;
  removeItem: (category: BudgetCategoryKey, itemId: string) => Item | undefined;
  restoreItem: (category: BudgetCategoryKey, item: Item) => Promise<void>;
  updateItemName: (category: BudgetCategoryKey, itemId: string, name: string) => void;
  toggleItemActive: (category: BudgetCategoryKey, itemId: string) => void;
  updateItemValue: (category: BudgetCategoryKey, itemId: string, monthId: string, value: number) => void;
  repeatFirstMonthAcrossAll: (category: BudgetCategoryKey, itemId: string) => void;
  repeatValueForward: (category: BudgetCategoryKey, itemId: string, fromMonthId: string) => void;

  // Cost Actions (Projetos com CostItem[])
  createCost: (name: string, defaultMonth?: number | null, marginPercent?: number, notes?: string) => Promise<Cost | null>;
  updateCost: (costId: string, patch: { name?: string; defaultMonth?: number | null; marginPercent?: number; notes?: string }) => Promise<void>;
  removeCost: (costId: string) => Promise<void>;
  addCostItem: (costId: string, name: string, plannedAmount: number, month?: number | null) => Promise<void>;
  updateCostItem: (costId: string, itemId: string, patch: { name?: string; plannedAmount?: number; actualAmount?: number | null; month?: number | null; paidDate?: string | null }) => Promise<void>;
  removeCostItem: (costId: string, itemId: string) => Promise<void>;
  confirmCostItem: (costId: string, itemId: string, actualAmount?: number) => Promise<void>;
  unconfirmCostItem: (costId: string, itemId: string) => Promise<void>;

  // Compatibilidade com OneTimeCosts legados
  addOneTimeCost: (initial?: Partial<Omit<OneTimeCost, 'id'>>) => void;
  removeOneTimeCost: (id: string) => OneTimeCost | undefined;
  restoreOneTimeCost: (item: OneTimeCost) => void;
  updateOneTimeCost: (id: string, patch: Partial<Omit<OneTimeCost, 'id'>>) => void;
  updateOneTimeValue: (itemId: string, value: number) => void;
  updateOneTimeTargetMonth: (itemId: string, targetMonthId?: string) => void;
  setAllOneTimeTargetMonth: (targetMonthId?: string) => void;

  // Goals & Contributions
  addGoal: (initial?: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>) => void;
  removeGoal: (goalId: string) => FinancialGoal | undefined;
  restoreGoal: (goal: FinancialGoal) => void;
  updateGoal: (goalId: string, patch: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>) => void;
  addContribution: (goalId: string, amount: number, note?: string) => void;
  removeContribution: (goalId: string, contributionId: string) => void;
  setGoalStatus: (goalId: string, status: GoalStatus) => void;

  // Reserve Movements (imutável)
  createReserveMovement: (month: number, amount: number, reason?: string) => Promise<void>;

  // Compatibilidade Nuvem
  isCloudLoading: boolean;
  isCloudSyncing: boolean;
  lastCloudSync: Date | null;
  cloudSyncError: string | null;
  fetchFromCloud: () => Promise<{ success: boolean; message: string }>;
  saveToCloud: () => Promise<{ success: boolean; message: string }>;

  // Meses locais
  addNextMonth: () => void;
  addPrevMonth: () => void;
  removeMonth: (monthId: string) => void;
  setHorizonCount: (count: number) => void;
  setCustomHorizon: (startYear: number, startMonthIndex: number, count: number) => void;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { showToast } = useToast();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [state, setState] = useState<BudgetState>(() => {
    const local = loadLocalSettings();
    return {
      ...INITIAL_BUDGET_STATE,
      currentYear: local.currentYear,
      simulation: local.simulation,
    };
  });

  const [availableYears, setAvailableYears] = useState<Budget[]>([]);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const entryDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ---------------------------------------------------------------------------
  // Helper Otimista Genérico
  // ---------------------------------------------------------------------------
  const optimisticUpdate = async <T,>(
    localUpdate: () => T,
    apiCall: () => Promise<unknown>,
    rollback: (prev: T) => void,
    errorMessage: string
  ): Promise<boolean> => {
    const previous = localUpdate();
    setIsSaving(true);
    try {
      await apiCall();
      setLastSaved(new Date());
      setSaveError(null);
      return true;
    } catch (err) {
      rollback(previous);
      const msg = err instanceof Error ? err.message : errorMessage;
      setSaveError(msg);
      showToast(msg, { type: 'error' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Carregamento de Dados (Ano + Summary)
  // ---------------------------------------------------------------------------

  const loadYearData = async (year: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [yearVm, summary] = await Promise.all([
        budgetApiService.fetchBudgetYear(year).catch((err) => {
          console.warn(`[BudgetContext] Falha ao carregar visão anual de ${year}:`, err);
          return null;
        }),
        budgetApiService.fetchSummary(year).catch((err) => {
          console.warn(`[BudgetContext] Falha ao carregar summary de ${year}:`, err);
          return null;
        }),
      ]);

      if (yearVm && yearVm.budget) {
        const enrichedItems = (yearVm.items || []).map((i) => enrichItemWithValues(i, year));
        const derived = syncDerivedLists(enrichedItems);

        // Gera 12 meses para o ano corrente
        const months = generateMonthSequence(year, 0, 12);

        setState((prev) => ({
          ...prev,
          currentYear: year,
          budget: yearVm.budget,
          costs: yearVm.costs || [],
          goals: yearVm.goals || [],
          reserveMovements: yearVm.reserveMovements || [],
          summary,
          months,
          ...derived,
        }));
        setLastSaved(new Date());
      } else {
        // Se ainda não existe budget para esse ano no backend, cria estado padrão
        const months = generateMonthSequence(year, 0, 12);
        setState((prev) => ({
          ...prev,
          currentYear: year,
          budget: {
            id: String(year),
            year,
            initialBalance: 0,
            emergencyReserveTarget: 0,
          },
          costs: [],
          goals: [],
          reserveMovements: [],
          summary: null,
          months,
          ...syncDerivedLists([]),
        }));
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar dados do orçamento';
      setLoadError(msg);
      showToast(msg, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const reloadSummary = async (year: number) => {
    try {
      const summary = await budgetApiService.fetchSummary(year);
      setState((prev) => ({ ...prev, summary }));
    } catch (err) {
      console.warn('[BudgetContext] Falha silenciosa ao atualizar summary:', err);
    }
  };

  const selectYear = async (year: number) => {
    await loadYearData(year);
  };

  const createYear = async (year: number) => {
    setIsLoading(true);
    try {
      const newBudget = await budgetApiService.createBudget({
        year,
        initialBalance: state.budget?.initialBalance ?? 0,
        emergencyReserveTarget: state.budget?.emergencyReserveTarget ?? 0,
      });
      setAvailableYears((prev) => {
        if (prev.some((b) => b.year === year)) return prev;
        return [...prev, newBudget].sort((a, b) => a.year - b.year);
      });
      await loadYearData(year);
      showToast(`Orçamento de ${year} criado com sucesso!`, { type: 'success' });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar ano';
      showToast(msg, { type: 'error' });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshFromDb = async (): Promise<{ success: boolean; message: string }> => {
    try {
      await loadYearData(state.currentYear);
      return { success: true, message: 'Dados atualizados do banco com sucesso!' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao atualizar dados';
      return { success: false, message: msg };
    }
  };

  const retrySave = async (): Promise<{ success: boolean; message: string }> => {
    if (!state.budget) {
      return { success: false, message: 'Nenhum orçamento carregado.' };
    }
    return refreshFromDb();
  };

  // Inicialização
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        const budgets = await budgetApiService.fetchBudgets().catch(() => []);
        if (isMounted && budgets.length > 0) {
          setAvailableYears(budgets);
        }
      } catch {
        // Ignora falhas se backend não estiver respondendo
      }
      if (isMounted) {
        await loadYearData(state.currentYear);
      }
    };

    init();

    const handleOnline = () => {
      setIsOnline(true);
      refreshFromDb().catch(() => {});
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isMounted = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // ---------------------------------------------------------------------------
  // Simulação e Balances
  // ---------------------------------------------------------------------------

  const updateSimulation = (
    patch: Partial<SimulationSettings>
  ) => {
    const { initialBalance, emergencyReserveTarget, emergencyReserve, ...simPatch } = patch;
    const targetReserve = emergencyReserveTarget !== undefined ? emergencyReserveTarget : emergencyReserve;

    // Atualiza percentuais de simulação no localStorage
    if (Object.keys(simPatch).length > 0) {
      const newSim = updateSimulationSettings(simPatch);
      setState((prev) => ({ ...prev, simulation: newSim }));
    }

    // Se houver alteração de saldos, dispara PATCH para o backend
    if (initialBalance !== undefined || targetReserve !== undefined) {
      const balancePatch = {
        initialBalance: initialBalance !== undefined ? initialBalance : state.budget?.initialBalance,
        emergencyReserveTarget: targetReserve !== undefined ? targetReserve : state.budget?.emergencyReserveTarget,
      };

      optimisticUpdate(
        () => state.budget,
        async () => {
          await budgetApiService.updateBudget(state.currentYear, balancePatch);
          await reloadSummary(state.currentYear);
        },
        (prevBudget) => {
          setState((prev) => ({ ...prev, budget: prevBudget }));
        },
        'Falha ao atualizar saldos do orçamento no servidor'
      );

      setState((prev) => ({
        ...prev,
        budget: prev.budget
          ? {
              ...prev.budget,
              initialBalance: balancePatch.initialBalance ?? prev.budget.initialBalance,
              emergencyReserveTarget: balancePatch.emergencyReserveTarget ?? prev.budget.emergencyReserveTarget,
            }
          : null,
      }));
    }
  };

  const updateBudgetBalances = async (patch: { initialBalance?: number; emergencyReserveTarget?: number }) => {
    updateSimulation(patch);
  };

  // ---------------------------------------------------------------------------
  // Novas Ações Relacionais: Entry (Planned vs Actual / Confirm)
  // ---------------------------------------------------------------------------

  const confirmEntry = async (entryId: string, actualAmount?: number) => {
    const today = new Date().toISOString().slice(0, 10);
    let resolvedAmount: number | null = null;

    await optimisticUpdate(
      () => {
        const prevItems = state.items;
        setState((prev) => {
          const updated = prev.items.map((item) => {
            const entry = item.entries?.find((e) => e.id === entryId);
            if (!entry) return item;
            resolvedAmount = actualAmount !== undefined ? actualAmount : entry.plannedAmount;
            const updatedEntries = (item.entries || []).map((e) =>
              e.id === entryId ? { ...e, actualAmount: resolvedAmount, paidDate: today } : e
            );
            return enrichItemWithValues({ ...item, entries: updatedEntries }, prev.currentYear);
          });
          return { ...prev, ...syncDerivedLists(updated) };
        });
        return prevItems;
      },
      async () => {
        await budgetApiService.updateEntry(entryId, {
          actualAmount: resolvedAmount,
          paidDate: today,
        });
        await reloadSummary(state.currentYear);
      },
      (prevItems) => {
        setState((prev) => ({ ...prev, ...syncDerivedLists(prevItems) }));
      },
      'Falha ao confirmar lançamento'
    );
  };

  const unconfirmEntry = async (entryId: string) => {
    await optimisticUpdate(
      () => {
        const prevItems = state.items;
        setState((prev) => {
          const updated = prev.items.map((item) => {
            if (!item.entries?.some((e) => e.id === entryId)) return item;
            const updatedEntries = (item.entries || []).map((e) =>
              e.id === entryId ? { ...e, actualAmount: null, paidDate: null } : e
            );
            return enrichItemWithValues({ ...item, entries: updatedEntries }, prev.currentYear);
          });
          return { ...prev, ...syncDerivedLists(updated) };
        });
        return prevItems;
      },
      async () => {
        await budgetApiService.updateEntry(entryId, {
          actualAmount: null,
          paidDate: null,
        });
        await reloadSummary(state.currentYear);
      },
      (prevItems) => {
        setState((prev) => ({ ...prev, ...syncDerivedLists(prevItems) }));
      },
      'Falha ao desconfirmar lançamento'
    );
  };

  const updatePlannedAmount = (entryId: string, value: number) => {
    const numVal = isNaN(value) ? 0 : value;

    // Atualização otimista imediata na UI
    setState((prev) => {
      const updated = prev.items.map((item) => {
        if (!item.entries?.some((e) => e.id === entryId)) return item;
        const updatedEntries = (item.entries || []).map((e) =>
          e.id === entryId ? { ...e, plannedAmount: numVal } : e
        );
        return enrichItemWithValues({ ...item, entries: updatedEntries }, prev.currentYear);
      });
      return { ...prev, ...syncDerivedLists(updated) };
    });

    // Debounce de 400ms para envio atômico
    const existing = entryDebounceTimersRef.current.get(entryId);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        await budgetApiService.updateEntry(entryId, { plannedAmount: numVal });
        setLastSaved(new Date());
        await reloadSummary(state.currentYear);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Falha ao salvar valor planejado';
        setSaveError(msg);
        showToast(msg, { type: 'error' });
      } finally {
        setIsSaving(false);
        entryDebounceTimersRef.current.delete(entryId);
      }
    }, 400);

    entryDebounceTimersRef.current.set(entryId, timer);
  };

  // ---------------------------------------------------------------------------
  // Item Actions
  // ---------------------------------------------------------------------------

  const addItem = async (category: BudgetCategoryKey, customName?: string) => {
    const itemType = normalizeBudgetItemType(category);
    const defaultName =
      customName ||
      (itemType === 'renda'
        ? 'Nova Fonte de Renda'
        : itemType === 'cartao'
        ? 'Novo Cartão'
        : itemType === 'fixa'
        ? 'Nova Despesa Fixa'
        : 'Nova Despesa Variável');

    const tempId = generateId();
    const newItem: Item = {
      id: tempId,
      budgetId: String(state.currentYear),
      name: defaultName,
      type: itemType,
      entries: createDefaultEntries(tempId),
    };
    const enriched = enrichItemWithValues(newItem, state.currentYear);

    await optimisticUpdate(
      () => {
        const prevItems = state.items;
        setState((prev) => ({
          ...prev,
          ...syncDerivedLists([...prev.items, enriched]),
        }));
        return prevItems;
      },
      async () => {
        const created = await budgetApiService.createItem({
          budgetId: String(state.currentYear),
          name: defaultName,
          type: itemType,
        });
        const finalEnriched = enrichItemWithValues(created, state.currentYear);
        setState((prev) => ({
          ...prev,
          ...syncDerivedLists(prev.items.map((i) => (i.id === tempId ? finalEnriched : i))),
        }));
        await reloadSummary(state.currentYear);
      },
      (prevItems) => {
        setState((prev) => ({ ...prev, ...syncDerivedLists(prevItems) }));
      },
      'Falha ao criar item no orçamento'
    );
  };

  const addTransaction = async ({
    category,
    name,
    value,
    monthId,
    repeatForward = false,
  }: {
    category: BudgetCategoryKey;
    name: string;
    value: number;
    monthId: string;
    repeatForward?: boolean;
  }) => {
    const itemType = normalizeBudgetItemType(category);
    const numVal = isNaN(value) ? 0 : value;
    const cleanName =
      name.trim() ||
      (itemType === 'renda'
        ? 'Nova Fonte de Renda'
        : itemType === 'cartao'
        ? 'Novo Cartão'
        : itemType === 'fixa'
        ? 'Nova Despesa Fixa'
        : 'Nova Despesa Variável');

    const created = await budgetApiService.createItem({
      budgetId: String(state.currentYear),
      name: cleanName,
      type: itemType,
    });

    // Se o backend retornou as 12 entries, atualiza os meses correspondentes
    const targetMonthNum = parseInt(monthId.split('-')[1], 10) || 1;
    const entries = created.entries || createDefaultEntries(created.id);

    for (const entry of entries) {
      if (repeatForward ? entry.month >= targetMonthNum : entry.month === targetMonthNum) {
        entry.plannedAmount = numVal;
        budgetApiService.updateEntry(entry.id, { plannedAmount: numVal }).catch(() => {});
      }
    }

    const enriched = enrichItemWithValues({ ...created, entries }, state.currentYear);
    setState((prev) => ({
      ...prev,
      ...syncDerivedLists([...prev.items, enriched]),
    }));

    await reloadSummary(state.currentYear);
  };

  const removeItem = (_category: BudgetCategoryKey, itemId: string): Item | undefined => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return undefined;

    optimisticUpdate(
      () => {
        const prevItems = state.items;
        setState((prev) => ({
          ...prev,
          ...syncDerivedLists(prev.items.filter((i) => i.id !== itemId)),
        }));
        return prevItems;
      },
      async () => {
        await budgetApiService.deleteItem(itemId);
        await reloadSummary(state.currentYear);
      },
      (prevItems) => {
        setState((prev) => ({ ...prev, ...syncDerivedLists(prevItems) }));
      },
      'Falha ao excluir item'
    );

    return item;
  };

  const restoreItem = async (_category: BudgetCategoryKey, item: Item) => {
    await optimisticUpdate(
      () => {
        const prevItems = state.items;
        setState((prev) => ({
          ...prev,
          ...syncDerivedLists([...prev.items, item]),
        }));
        return prevItems;
      },
      async () => {
        const created = await budgetApiService.createItem({
          budgetId: String(state.currentYear),
          name: item.name,
          type: item.type,
        });
        // Restaura valores das entries
        if (item.entries) {
          for (const e of item.entries) {
            const matchingCreated = created.entries?.find((ce) => ce.month === e.month);
            if (matchingCreated && e.plannedAmount > 0) {
              budgetApiService.updateEntry(matchingCreated.id, { plannedAmount: e.plannedAmount }).catch(() => {});
            }
          }
        }
        await reloadSummary(state.currentYear);
      },
      (prevItems) => {
        setState((prev) => ({ ...prev, ...syncDerivedLists(prevItems) }));
      },
      'Falha ao restaurar item'
    );
  };

  const updateItemName = (_category: BudgetCategoryKey, itemId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    optimisticUpdate(
      () => {
        const prevItems = state.items;
        setState((prev) => ({
          ...prev,
          ...syncDerivedLists(prev.items.map((i) => (i.id === itemId ? { ...i, name: cleanName } : i))),
        }));
        return prevItems;
      },
      async () => {
        await budgetApiService.updateItem(itemId, { name: cleanName });
      },
      (prevItems) => {
        setState((prev) => ({ ...prev, ...syncDerivedLists(prevItems) }));
      },
      'Falha ao atualizar nome do item'
    );
  };

  const toggleItemActive = (_category: BudgetCategoryKey, itemId: string) => {
    setState((prev) => ({
      ...prev,
      ...syncDerivedLists(
        prev.items.map((i) => (i.id === itemId ? { ...i, off: !i.off } : i))
      ),
    }));
  };

  const updateItemValue = (
    _category: BudgetCategoryKey,
    itemId: string,
    monthId: string,
    value: number
  ) => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return;

    const monthNum = parseInt(monthId.split('-')[1], 10) || 1;
    const entry = item.entries?.find((e) => e.month === monthNum);

    if (entry) {
      updatePlannedAmount(entry.id, value);
    } else {
      // Fallback otimista se entries ainda não existirem
      const numVal = isNaN(value) ? 0 : value;
      setState((prev) => {
        const updated = prev.items.map((i) => {
          if (i.id !== itemId) return i;
          return {
            ...i,
            values: { ...(i.values || {}), [monthId]: numVal },
          };
        });
        return { ...prev, ...syncDerivedLists(updated) };
      });
    }
  };

  const repeatFirstMonthAcrossAll = (_category: BudgetCategoryKey, itemId: string) => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item || !item.entries || item.entries.length === 0) return;

    const baseVal = item.entries[0]?.plannedAmount ?? 0;
    item.entries.forEach((e) => {
      updatePlannedAmount(e.id, baseVal);
    });
  };

  const repeatValueForward = (
    _category: BudgetCategoryKey,
    itemId: string,
    fromMonthId: string
  ) => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item || !item.entries) return;

    const fromMonthNum = parseInt(fromMonthId.split('-')[1], 10) || 1;
    const baseEntry = item.entries.find((e) => e.month === fromMonthNum);
    if (!baseEntry) return;

    const valToRepeat = baseEntry.plannedAmount;
    item.entries.forEach((e) => {
      if (e.month >= fromMonthNum) {
        updatePlannedAmount(e.id, valToRepeat);
      }
    });
  };

  // ---------------------------------------------------------------------------
  // Cost Actions (Projetos com CostItem[])
  // ---------------------------------------------------------------------------

  const createCost = async (
    name: string,
    defaultMonth?: number | null,
    marginPercent: number = 0,
    notes?: string
  ): Promise<Cost | null> => {
    try {
      const created = await budgetApiService.createCost({
        budgetId: String(state.currentYear),
        name: name.trim(),
        defaultMonth: defaultMonth ?? null,
        marginPercent,
        notes,
      });

      setState((prev) => ({
        ...prev,
        costs: [...prev.costs, { ...created, items: [] }],
      }));
      await reloadSummary(state.currentYear);
      return created;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao criar projeto de custo pontual';
      showToast(msg, { type: 'error' });
      return null;
    }
  };

  const updateCost = async (
    costId: string,
    patch: { name?: string; defaultMonth?: number | null; marginPercent?: number; notes?: string }
  ) => {
    await optimisticUpdate(
      () => {
        const prevCosts = state.costs;
        setState((prev) => ({
          ...prev,
          costs: prev.costs.map((c) => (c.id === costId ? { ...c, ...patch } : c)),
        }));
        return prevCosts;
      },
      async () => {
        await budgetApiService.updateCost(costId, patch);
        await reloadSummary(state.currentYear);
      },
      (prevCosts) => setState((prev) => ({ ...prev, costs: prevCosts })),
      'Falha ao atualizar custo pontual'
    );
  };

  const removeCost = async (costId: string) => {
    await optimisticUpdate(
      () => {
        const prevCosts = state.costs;
        setState((prev) => ({
          ...prev,
          costs: prev.costs.filter((c) => c.id !== costId),
        }));
        return prevCosts;
      },
      async () => {
        await budgetApiService.deleteCost(costId);
        await reloadSummary(state.currentYear);
      },
      (prevCosts) => setState((prev) => ({ ...prev, costs: prevCosts })),
      'Falha ao remover projeto de custo pontual'
    );
  };

  const addCostItem = async (
    costId: string,
    name: string,
    plannedAmount: number,
    month?: number | null
  ) => {
    const tempId = generateId();
    const tempItem: CostItem = {
      id: tempId,
      costId,
      name,
      plannedAmount,
      actualAmount: null,
      month: month ?? null,
      dueDate: null,
      paidDate: null,
    };

    await optimisticUpdate(
      () => {
        const prevCosts = state.costs;
        setState((prev) => ({
          ...prev,
          costs: prev.costs.map((c) =>
            c.id === costId ? { ...c, items: [...(c.items || []), tempItem] } : c
          ),
        }));
        return prevCosts;
      },
      async () => {
        const created = await budgetApiService.createCostItem(costId, {
          name,
          plannedAmount,
          month,
        });
        setState((prev) => ({
          ...prev,
          costs: prev.costs.map((c) =>
            c.id === costId
              ? {
                  ...c,
                  items: (c.items || []).map((ci) => (ci.id === tempId ? created : ci)),
                }
              : c
          ),
        }));
        await reloadSummary(state.currentYear);
      },
      (prevCosts) => setState((prev) => ({ ...prev, costs: prevCosts })),
      'Falha ao adicionar item ao projeto'
    );
  };

  const updateCostItem = async (
    costId: string,
    itemId: string,
    patch: {
      name?: string;
      plannedAmount?: number;
      actualAmount?: number | null;
      month?: number | null;
      dueDate?: string | null;
      paidDate?: string | null;
    }
  ) => {
    await optimisticUpdate(
      () => {
        const prevCosts = state.costs;
        setState((prev) => ({
          ...prev,
          costs: prev.costs.map((c) =>
            c.id === costId
              ? {
                  ...c,
                  items: (c.items || []).map((ci) => (ci.id === itemId ? { ...ci, ...patch } : ci)),
                }
              : c
          ),
        }));
        return prevCosts;
      },
      async () => {
        await budgetApiService.updateCostItem(costId, itemId, patch);
        await reloadSummary(state.currentYear);
      },
      (prevCosts) => setState((prev) => ({ ...prev, costs: prevCosts })),
      'Falha ao atualizar item de custo'
    );
  };

  const removeCostItem = async (costId: string, itemId: string) => {
    await optimisticUpdate(
      () => {
        const prevCosts = state.costs;
        setState((prev) => ({
          ...prev,
          costs: prev.costs.map((c) =>
            c.id === costId
              ? { ...c, items: (c.items || []).filter((ci) => ci.id !== itemId) }
              : c
          ),
        }));
        return prevCosts;
      },
      async () => {
        await budgetApiService.deleteCostItem(costId, itemId);
        await reloadSummary(state.currentYear);
      },
      (prevCosts) => setState((prev) => ({ ...prev, costs: prevCosts })),
      'Falha ao remover item de custo'
    );
  };

  const confirmCostItem = async (costId: string, itemId: string, actualAmount?: number) => {
    const today = new Date().toISOString().slice(0, 10);
    const cost = state.costs.find((c) => c.id === costId);
    const item = cost?.items?.find((i) => i.id === itemId);
    const amount = actualAmount !== undefined ? actualAmount : (item?.plannedAmount ?? 0);
    await updateCostItem(costId, itemId, { actualAmount: amount, paidDate: today });
  };

  const unconfirmCostItem = async (costId: string, itemId: string) => {
    await updateCostItem(costId, itemId, { actualAmount: null, paidDate: null });
  };

  // ---------------------------------------------------------------------------
  // Ações de Custos Pontuais Legados (adaptador para compatibilidade)
  // ---------------------------------------------------------------------------

  const addOneTimeCost = (initial?: Partial<Omit<OneTimeCost, 'id'>>) => {
    const targetMonthNum = initial?.targetMonthId ? parseInt(initial.targetMonthId.split('-')[1], 10) : null;
    createCost(initial?.name || 'Novo Custo Pontual', targetMonthNum, 0, initial?.notes).then((c) => {
      if (c && initial?.value) {
        addCostItem(c.id, initial.name || 'Item 1', initial.value, targetMonthNum);
      }
    });
  };

  const removeOneTimeCost = (id: string): OneTimeCost | undefined => {
    const cost = state.costs.find((c) => c.id === id);
    if (!cost) return undefined;
    removeCost(id);
    return {
      id: cost.id,
      name: cost.name,
      value: cost.totalPlanned ?? 0,
      targetMonthId: cost.defaultMonth ? `${state.currentYear}-${String(cost.defaultMonth).padStart(2, '0')}` : undefined,
    };
  };

  const restoreOneTimeCost = (item: OneTimeCost) => {
    addOneTimeCost(item);
  };

  const updateOneTimeCost = (id: string, patch: Partial<Omit<OneTimeCost, 'id'>>) => {
    const targetMonthNum = patch.targetMonthId ? parseInt(patch.targetMonthId.split('-')[1], 10) : undefined;
    updateCost(id, {
      name: patch.name,
      defaultMonth: targetMonthNum,
      notes: patch.notes,
    });
  };

  const updateOneTimeValue = (itemId: string, value: number) => {
    const cost = state.costs.find((c) => c.id === itemId);
    if (cost && cost.items && cost.items.length > 0) {
      updateCostItem(cost.id, cost.items[0].id, { plannedAmount: value });
    } else if (cost) {
      addCostItem(cost.id, 'Principal', value, cost.defaultMonth);
    }
  };

  const updateOneTimeTargetMonth = (itemId: string, targetMonthId?: string) => {
    const monthNum = targetMonthId ? parseInt(targetMonthId.split('-')[1], 10) : null;
    updateCost(itemId, { defaultMonth: monthNum });
  };

  const setAllOneTimeTargetMonth = (targetMonthId?: string) => {
    const monthNum = targetMonthId ? parseInt(targetMonthId.split('-')[1], 10) : null;
    state.costs.forEach((c) => {
      updateCost(c.id, { defaultMonth: monthNum });
    });
  };

  // ---------------------------------------------------------------------------
  // Goals & Contributions
  // ---------------------------------------------------------------------------

  const addGoal = (initial?: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>) => {
    const newGoal: FinancialGoal = {
      id: generateId(),
      name: initial?.name || 'Novo Objetivo',
      description: initial?.description,
      targetAmount: initial?.targetAmount ?? 0,
      icon: initial?.icon || '🎯',
      color: initial?.color || '#0e6b7a',
      status: initial?.status || GoalStatus.Ativa,
      contributions: [],
    };

    optimisticUpdate(
      () => {
        const prevGoals = state.goals;
        setState((prev) => ({ ...prev, goals: [...prev.goals, newGoal] }));
        return prevGoals;
      },
      async () => {
        await budgetApiService.createGoal(newGoal);
      },
      (prevGoals) => setState((prev) => ({ ...prev, goals: prevGoals })),
      'Falha ao criar meta'
    );
  };

  const removeGoal = (goalId: string): FinancialGoal | undefined => {
    const goal = state.goals.find((g) => g.id === goalId);
    if (!goal) return undefined;

    optimisticUpdate(
      () => {
        const prevGoals = state.goals;
        setState((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== goalId) }));
        return prevGoals;
      },
      async () => {
        await budgetApiService.deleteGoal(goalId);
      },
      (prevGoals) => setState((prev) => ({ ...prev, goals: prevGoals })),
      'Falha ao excluir meta'
    );

    return goal;
  };

  const restoreGoal = (goal: FinancialGoal) => {
    optimisticUpdate(
      () => {
        const prevGoals = state.goals;
        setState((prev) => ({ ...prev, goals: [...prev.goals, goal] }));
        return prevGoals;
      },
      async () => {
        await budgetApiService.createGoal(goal);
      },
      (prevGoals) => setState((prev) => ({ ...prev, goals: prevGoals })),
      'Falha ao restaurar meta'
    );
  };

  const updateGoal = (
    goalId: string,
    patch: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>
  ) => {
    optimisticUpdate(
      () => {
        const prevGoals = state.goals;
        setState((prev) => ({
          ...prev,
          goals: prev.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
        }));
        return prevGoals;
      },
      async () => {
        await budgetApiService.updateGoal(goalId, patch);
      },
      (prevGoals) => setState((prev) => ({ ...prev, goals: prevGoals })),
      'Falha ao atualizar meta'
    );
  };

  const addContribution = (goalId: string, amount: number, note?: string) => {
    const numAmount = isNaN(amount) ? 0 : amount;
    if (numAmount <= 0) return;

    const date = new Date().toISOString().slice(0, 10);
    const contribution = {
      id: generateId(),
      goalId,
      date,
      amount: numAmount,
      note,
    };

    optimisticUpdate(
      () => {
        const prevGoals = state.goals;
        setState((prev) => ({
          ...prev,
          goals: prev.goals.map((g) =>
            g.id === goalId
              ? { ...g, contributions: [...(g.contributions || []), contribution] }
              : g
          ),
        }));
        return prevGoals;
      },
      async () => {
        await budgetApiService.addGoalContribution(goalId, { amount: numAmount, note, date });
      },
      (prevGoals) => setState((prev) => ({ ...prev, goals: prevGoals })),
      'Falha ao registrar aporte'
    );
  };

  const removeContribution = (goalId: string, contributionId: string) => {
    optimisticUpdate(
      () => {
        const prevGoals = state.goals;
        setState((prev) => ({
          ...prev,
          goals: prev.goals.map((g) =>
            g.id === goalId
              ? { ...g, contributions: (g.contributions || []).filter((c) => c.id !== contributionId) }
              : g
          ),
        }));
        return prevGoals;
      },
      async () => {
        await budgetApiService.deleteGoalContribution(goalId, contributionId);
      },
      (prevGoals) => setState((prev) => ({ ...prev, goals: prevGoals })),
      'Falha ao remover aporte'
    );
  };

  const setGoalStatus = (goalId: string, status: GoalStatus) => {
    updateGoal(goalId, { status });
  };

  // ---------------------------------------------------------------------------
  // Reserve Movements (Imutável por design: só POST e GET)
  // ---------------------------------------------------------------------------

  const createReserveMovement = async (month: number, amount: number, reason?: string) => {
    const tempMovement: ReserveMovement = {
      id: generateId(),
      budgetId: String(state.currentYear),
      month,
      amount,
      reason,
    };

    await optimisticUpdate(
      () => {
        const prevMovements = state.reserveMovements;
        setState((prev) => ({
          ...prev,
          reserveMovements: [...prev.reserveMovements, tempMovement],
        }));
        return prevMovements;
      },
      async () => {
        const created = await budgetApiService.createReserveMovement({
          budgetId: String(state.currentYear),
          month,
          amount,
          reason,
        });
        setState((prev) => ({
          ...prev,
          reserveMovements: prev.reserveMovements.map((m) =>
            m.id === tempMovement.id ? created : m
          ),
        }));
        await reloadSummary(state.currentYear);
      },
      (prevMovements) => setState((prev) => ({ ...prev, reserveMovements: prevMovements })),
      'Falha ao registrar movimentação na reserva'
    );
  };

  // ---------------------------------------------------------------------------
  // Meses locais
  // ---------------------------------------------------------------------------

  const addNextMonth = () => {
    setState((prev) => {
      const lastMonth = prev.months[prev.months.length - 1];
      const nextM = getNextMonth(lastMonth);
      return { ...prev, months: [...prev.months, nextM] };
    });
  };

  const addPrevMonth = () => {
    setState((prev) => {
      const firstMonth = prev.months[0];
      const prevM = getPrevMonth(firstMonth);
      return { ...prev, months: [prevM, ...prev.months] };
    });
  };

  const removeMonth = (monthId: string) => {
    setState((prev) => {
      if (prev.months.length <= 1) return prev;
      return { ...prev, months: prev.months.filter((m) => m.id !== monthId) };
    });
  };

  const setHorizonCount = (count: number) => {
    setState((prev) => {
      if (count === prev.months.length || count < 1) return prev;
      const firstMonth = prev.months[0];
      return {
        ...prev,
        months: generateMonthSequence(firstMonth.year, firstMonth.monthIndex, count),
      };
    });
  };

  const setCustomHorizon = (startYear: number, startMonthIndex: number, count: number) => {
    setState((prev) => ({
      ...prev,
      months: generateMonthSequence(startYear, startMonthIndex, count),
    }));
  };

  // ---------------------------------------------------------------------------
  // Cálculos de Resumo (Backend Summary + Modificadores Client-side de Simulação)
  // ---------------------------------------------------------------------------
  const { monthlySummaries, metrics } = useBudgetCalculations(state);

  return (
    <BudgetContext.Provider
      value={{
        state,
        monthlySummaries,
        metrics,
        theme,
        toggleTheme,
        isOnline,
        isLoading,
        isSaving,
        lastSaved,
        loadError,
        saveError,
        retrySave,
        refreshFromDb,

        availableYears,
        selectYear,
        createYear,

        updateSimulation,
        updateBudgetBalances,

        confirmEntry,
        unconfirmEntry,
        updatePlannedAmount,

        addItem,
        addTransaction,
        removeItem,
        restoreItem,
        updateItemName,
        toggleItemActive,
        updateItemValue,
        repeatFirstMonthAcrossAll,
        repeatValueForward,

        createCost,
        updateCost,
        removeCost,
        addCostItem,
        updateCostItem,
        removeCostItem,
        confirmCostItem,
        unconfirmCostItem,

        addOneTimeCost,
        removeOneTimeCost,
        restoreOneTimeCost,
        updateOneTimeCost,
        updateOneTimeValue,
        updateOneTimeTargetMonth,
        setAllOneTimeTargetMonth,

        addGoal,
        removeGoal,
        restoreGoal,
        updateGoal,
        addContribution,
        removeContribution,
        setGoalStatus,

        createReserveMovement,

        isCloudLoading: isLoading,
        isCloudSyncing: isSaving,
        lastCloudSync: lastSaved,
        cloudSyncError: saveError || loadError,
        fetchFromCloud: refreshFromDb,
        saveToCloud: retrySave,

        addNextMonth,
        addPrevMonth,
        removeMonth,
        setHorizonCount,
        setCustomHorizon,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export const useBudget = (): BudgetContextType => {
  const context = useContext(BudgetContext);
  if (!context) throw new Error('useBudget deve ser usado dentro de um BudgetProvider');
  return context;
};
