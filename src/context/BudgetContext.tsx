import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type {
  BudgetState,
  BudgetItem,
  OneTimeCost,
  SimulationSettings,
  MonthSummary,
  OverallMetrics,
  FinancialGoal,
  GoalContribution,
} from '../types/budget';
import {
  BudgetCategory,
  BudgetCategoryKey,
  ExpenseCategoryKey,
  GoalStatus,
} from '../constants/enums';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';
import { useBudgetCalculations } from '../hooks/useBudgetCalculations';
import { getNextMonth, getPrevMonth, generateMonthSequence } from '../utils/formatters';
import { generateId } from '../utils/idGenerator';
import {
  loadBudgetState,
  saveBudgetState,
  loadTheme,
  saveTheme,
} from '../services/storageService';
import { budgetApiService } from '../services/budgetApiService';

function updateCategoryItem(
  prev: BudgetState,
  category: BudgetCategoryKey,
  itemId: string,
  mutator: (item: BudgetItem) => BudgetItem
): BudgetState {
  const updateList = (items: BudgetItem[]) =>
    items.map((i) => (i.id === itemId ? mutator(i) : i));

  if (category === BudgetCategory.Renda) {
    return { ...prev, incomes: updateList(prev.incomes) };
  }

  const catKey = category as ExpenseCategoryKey;
  return {
    ...prev,
    lists: {
      ...prev.lists,
      [catKey]: updateList(prev.lists[catKey] || []),
    },
  };
}

interface BudgetContextType {
  state: BudgetState;
  monthlySummaries: MonthSummary[];
  metrics: OverallMetrics;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  isOnline: boolean;

  isCloudLoading: boolean;
  isCloudSyncing: boolean;
  lastCloudSync: Date | null;
  cloudSyncError: string | null;
  fetchFromCloud: () => Promise<{ success: boolean; message: string }>;
  saveToCloud: () => Promise<{ success: boolean; message: string }>;

  updateSimulation: (patch: Partial<SimulationSettings>) => void;

  addNextMonth: () => void;
  addPrevMonth: () => void;
  removeMonth: (monthId: string) => void;
  setHorizonCount: (count: number) => void;
  setCustomHorizon: (startYear: number, startMonthIndex: number, count: number) => void;

  addItem: (category: BudgetCategoryKey, customName?: string) => void;
  addTransaction: (params: {
    category: BudgetCategoryKey;
    name: string;
    value: number;
    monthId: string;
    repeatForward?: boolean;
  }) => void;
  removeItem: (category: BudgetCategoryKey, itemId: string) => BudgetItem | undefined;
  restoreItem: (category: BudgetCategoryKey, item: BudgetItem) => void;
  updateItemName: (category: BudgetCategoryKey, itemId: string, name: string) => void;
  toggleItemActive: (category: BudgetCategoryKey, itemId: string) => void;
  updateItemValue: (category: BudgetCategoryKey, itemId: string, monthId: string, value: number) => void;
  repeatFirstMonthAcrossAll: (category: BudgetCategoryKey, itemId: string) => void;
  repeatValueForward: (category: BudgetCategoryKey, itemId: string, fromMonthId: string) => void;

  addOneTimeCost: (initial?: Partial<Omit<OneTimeCost, 'id'>>) => void;
  removeOneTimeCost: (id: string) => OneTimeCost | undefined;
  restoreOneTimeCost: (item: OneTimeCost) => void;
  updateOneTimeCost: (id: string, patch: Partial<Omit<OneTimeCost, 'id'>>) => void;
  updateOneTimeValue: (itemId: string, value: number) => void;
  updateOneTimeTargetMonth: (itemId: string, targetMonthId?: string) => void;
  setAllOneTimeTargetMonth: (targetMonthId?: string) => void;

  addGoal: (initial?: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>) => void;
  removeGoal: (goalId: string) => FinancialGoal | undefined;
  restoreGoal: (goal: FinancialGoal) => void;
  updateGoal: (goalId: string, patch: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>) => void;
  addContribution: (goalId: string, amount: number, note?: string) => void;
  removeContribution: (goalId: string, contributionId: string) => void;
  setGoalStatus: (goalId: string, status: GoalStatus) => void;

  resetToDefaults: () => void;
  importState: (data: BudgetState) => void;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [state, setState] = useState<BudgetState>(() => loadBudgetState());

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  const [isCloudLoading, setIsCloudLoading] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [lastCloudSync, setLastCloudSync] = useState<Date | null>(null);
  const [cloudSyncError, setCloudSyncError] = useState<string | null>(null);

  const isInitialMount = useRef(true);
  const isReadyForAutoSyncRef = useRef(false);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  const saveToCloud = async (): Promise<{ success: boolean; message: string }> => {
    setIsCloudSyncing(true);
    try {
      const res = await budgetApiService.saveBudget(latestStateRef.current);
      setLastCloudSync(res.updatedAt);
      setCloudSyncError(null);
      return { success: true, message: 'Orçamento salvo no MongoDB Atlas com sucesso!' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados';
      setCloudSyncError(msg);
      return { success: false, message: msg };
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const fetchFromCloud = async (): Promise<{ success: boolean; message: string }> => {
    setIsCloudLoading(true);
    try {
      const { state: remoteState, updatedAt } = await budgetApiService.fetchBudget();
      if (remoteState) {
        setState(remoteState);
        saveBudgetState(remoteState);
        setLastCloudSync(updatedAt || new Date());
        setCloudSyncError(null);
        return { success: true, message: 'Dados carregados da nuvem (MongoDB) com sucesso!' };
      }
      return { success: true, message: 'Nenhum orçamento prévio encontrado no MongoDB.' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao buscar dados';
      setCloudSyncError(msg);
      return { success: false, message: msg };
    } finally {
      setIsCloudLoading(false);
    }
  };

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      saveToCloud().catch(() => {});
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const isLocalEmpty =
      state.incomes.length === 0 &&
      state.lists.cartoes.length === 0 &&
      state.lists.fixas.length === 0 &&
      state.lists.vars.length === 0 &&
      (state.oneTimeCosts?.length ?? 0) === 0;

    if (isLocalEmpty) {
      setIsCloudLoading(true);
      budgetApiService
        .fetchBudget()
        .then(({ state: remoteState, updatedAt }) => {
          if (remoteState) {
            setState(remoteState);
            saveBudgetState(remoteState);
            setLastCloudSync(updatedAt || new Date());
            setCloudSyncError(null);
          }
        })
        .catch((err) => {
          console.warn('[BudgetContext] Conexão com MongoDB Atlas na inicialização:', err);
        })
        .finally(() => {
          setIsCloudLoading(false);
          setTimeout(() => {
            isReadyForAutoSyncRef.current = true;
          }, 1000);
        });
    } else {
      isReadyForAutoSyncRef.current = true;
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    saveBudgetState(state);

    if (!isReadyForAutoSyncRef.current || isCloudLoading) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsCloudSyncing(true);
      try {
        const res = await budgetApiService.saveBudget(latestStateRef.current);
        setLastCloudSync(res.updatedAt);
        setCloudSyncError(null);
      } catch (err: unknown) {
        console.warn('[BudgetContext] Falha na auto-sincronização com MongoDB Atlas:', err);
        setCloudSyncError(err instanceof Error ? err.message : 'Falha ao sincronizar com MongoDB Atlas');
      } finally {
        setIsCloudSyncing(false);
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
    };
  }, [state, isCloudLoading]);

  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const updateSimulation = (patch: Partial<SimulationSettings>) => {
    setState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, ...patch },
    }));
  };

  const addNextMonth = () => {
    setState((prev) => {
      const lastMonth = prev.months[prev.months.length - 1];
      const nextM = getNextMonth(lastMonth);
      const newMonths = [...prev.months, nextM];

      const copyValues = (items: BudgetItem[]): BudgetItem[] =>
        items.map((item) => ({
          ...item,
          values: {
            ...item.values,
            [nextM.id]: item.values[lastMonth.id] !== undefined ? item.values[lastMonth.id] : 0,
          },
        }));

      return {
        ...prev,
        months: newMonths,
        incomes: copyValues(prev.incomes),
        lists: {
          cartoes: copyValues(prev.lists.cartoes),
          fixas: copyValues(prev.lists.fixas),
          vars: copyValues(prev.lists.vars),
        },
      };
    });
  };

  const addPrevMonth = () => {
    setState((prev) => {
      const firstMonth = prev.months[0];
      const prevM = getPrevMonth(firstMonth);
      const newMonths = [prevM, ...prev.months];

      const copyValues = (items: BudgetItem[]): BudgetItem[] =>
        items.map((item) => ({
          ...item,
          values: {
            ...item.values,
            [prevM.id]: item.values[firstMonth.id] !== undefined ? item.values[firstMonth.id] : 0,
          },
        }));

      return {
        ...prev,
        months: newMonths,
        incomes: copyValues(prev.incomes),
        lists: {
          cartoes: copyValues(prev.lists.cartoes),
          fixas: copyValues(prev.lists.fixas),
          vars: copyValues(prev.lists.vars),
        },
      };
    });
  };

  const removeMonth = (monthId: string) => {
    setState((prev) => {
      if (prev.months.length <= 1) return prev;
      const newMonths = prev.months.filter((m) => m.id !== monthId);

      const stripValues = (items: BudgetItem[]): BudgetItem[] =>
        items.map((item) => {
          const newVals = { ...item.values };
          delete newVals[monthId];
          return { ...item, values: newVals };
        });

      return {
        ...prev,
        months: newMonths,
        incomes: stripValues(prev.incomes),
        lists: {
          cartoes: stripValues(prev.lists.cartoes),
          fixas: stripValues(prev.lists.fixas),
          vars: stripValues(prev.lists.vars),
        },
      };
    });
  };

  const setHorizonCount = (count: number) => {
    setState((prev) => {
      if (count === prev.months.length || count < 1) return prev;
      const firstMonth = prev.months[0];
      const newMonths = generateMonthSequence(firstMonth.year, firstMonth.monthIndex, count);

      const syncValues = (items: BudgetItem[]): BudgetItem[] =>
        items.map((item) => {
          const newVals: Record<string, number> = {};
          const existingVals = Object.values(item.values);
          const defaultVal = existingVals.length > 0 ? existingVals[existingVals.length - 1] : 0;
          newMonths.forEach((m) => {
            newVals[m.id] = item.values[m.id] !== undefined ? item.values[m.id] : defaultVal;
          });
          return { ...item, values: newVals };
        });

      return {
        ...prev,
        months: newMonths,
        incomes: syncValues(prev.incomes),
        lists: {
          cartoes: syncValues(prev.lists.cartoes),
          fixas: syncValues(prev.lists.fixas),
          vars: syncValues(prev.lists.vars),
        },
      };
    });
  };

  const setCustomHorizon = (startYear: number, startMonthIndex: number, count: number) => {
    setState((prev) => {
      const newMonths = generateMonthSequence(startYear, startMonthIndex, count);

      const syncValues = (items: BudgetItem[]): BudgetItem[] =>
        items.map((item) => {
          const newVals: Record<string, number> = {};
          const existingVals = Object.values(item.values);
          const defaultVal = existingVals.length > 0 ? existingVals[existingVals.length - 1] : 0;
          newMonths.forEach((m) => {
            newVals[m.id] = item.values[m.id] !== undefined ? item.values[m.id] : defaultVal;
          });
          return { ...item, values: newVals };
        });

      return {
        ...prev,
        months: newMonths,
        incomes: syncValues(prev.incomes),
        lists: {
          cartoes: syncValues(prev.lists.cartoes),
          fixas: syncValues(prev.lists.fixas),
          vars: syncValues(prev.lists.vars),
        },
      };
    });
  };

  const addItem = (category: BudgetCategoryKey, customName?: string) => {
    const defaultName =
      customName ||
      (category === BudgetCategory.Renda
        ? 'Nova Fonte de Renda'
        : category === 'cartoes'
        ? 'Novo Cartão'
        : category === 'fixas'
        ? 'Nova Despesa Fixa'
        : 'Nova Despesa Variável');

    const id = generateId();

    const newItem: BudgetItem = {
      id,
      name: defaultName,
      category,
      values: state.months.reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {}),
    };

    setState((prev) => {
      if (category === BudgetCategory.Renda) {
        return { ...prev, incomes: [...prev.incomes, newItem] };
      }
      const catKey = category as ExpenseCategoryKey;
      return {
        ...prev,
        lists: { ...prev.lists, [catKey]: [...(prev.lists[catKey] || []), newItem] },
      };
    });
  };

  const addTransaction = ({
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
    const numVal = isNaN(value) ? 0 : value;
    const cleanName =
      name.trim() ||
      (category === BudgetCategory.Renda
        ? 'Nova Fonte de Renda'
        : category === 'cartoes'
        ? 'Novo Cartão'
        : category === 'fixas'
        ? 'Nova Despesa Fixa'
        : 'Nova Despesa Variável');

    const id = generateId();

    const values: Record<string, number> = {};
    const fromIdx = state.months.findIndex((m) => m.id === monthId);

    state.months.forEach((m, idx) => {
      if (repeatForward) {
        values[m.id] = fromIdx === -1 || idx >= fromIdx ? numVal : 0;
      } else {
        values[m.id] = m.id === monthId ? numVal : 0;
      }
    });

    const newItem: BudgetItem = {
      id,
      name: cleanName,
      category,
      values,
    };

    setState((prev) => {
      if (category === BudgetCategory.Renda) {
        return { ...prev, incomes: [...prev.incomes, newItem] };
      }
      const catKey = category as ExpenseCategoryKey;
      return {
        ...prev,
        lists: { ...prev.lists, [catKey]: [...(prev.lists[catKey] || []), newItem] },
      };
    });
  };

  const removeItem = (category: BudgetCategoryKey, itemId: string): BudgetItem | undefined => {
    const item =
      category === BudgetCategory.Renda
        ? state.incomes.find((i) => i.id === itemId)
        : (state.lists[category as ExpenseCategoryKey] || []).find((i) => i.id === itemId);

    if (!item) return undefined;

    setState((prev) => {
      if (category === BudgetCategory.Renda) {
        return { ...prev, incomes: prev.incomes.filter((i) => i.id !== itemId) };
      }
      const catKey = category as ExpenseCategoryKey;
      return {
        ...prev,
        lists: {
          ...prev.lists,
          [catKey]: (prev.lists[catKey] || []).filter((i) => i.id !== itemId),
        },
      };
    });

    return item;
  };

  const restoreItem = (category: BudgetCategoryKey, item: BudgetItem) => {
    setState((prev) => {
      if (category === BudgetCategory.Renda) {
        return { ...prev, incomes: [...prev.incomes, item] };
      }
      const catKey = category as ExpenseCategoryKey;
      return {
        ...prev,
        lists: {
          ...prev.lists,
          [catKey]: [...(prev.lists[catKey] || []), item],
        },
      };
    });
  };

  const updateItemName = (category: BudgetCategoryKey, itemId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    setState((prev) => updateCategoryItem(prev, category, itemId, (i) => ({ ...i, name: cleanName })));
  };

  const toggleItemActive = (category: BudgetCategoryKey, itemId: string) => {
    setState((prev) => updateCategoryItem(prev, category, itemId, (i) => ({ ...i, off: !i.off })));
  };

  const updateItemValue = (
    category: BudgetCategoryKey,
    itemId: string,
    monthId: string,
    value: number
  ) => {
    const numVal = isNaN(value) ? 0 : value;
    setState((prev) =>
      updateCategoryItem(prev, category, itemId, (i) => ({
        ...i,
        values: { ...i.values, [monthId]: numVal },
      }))
    );
  };

  const repeatFirstMonthAcrossAll = (category: BudgetCategoryKey, itemId: string) => {
    const firstMonthId = state.months[0]?.id;
    if (!firstMonthId) return;

    const findItem = (items: BudgetItem[]) => items.find((i) => i.id === itemId);
    const item =
      category === BudgetCategory.Renda
        ? findItem(state.incomes)
        : findItem(state.lists[category as ExpenseCategoryKey] || []);

    if (!item) return;
    const baseValue = item.values[firstMonthId] ?? 0;

    setState((prev) =>
      updateCategoryItem(prev, category, itemId, (i) => {
        const newVals: Record<string, number> = {};
        prev.months.forEach((m) => {
          newVals[m.id] = baseValue;
        });
        return { ...i, values: newVals };
      })
    );
  };

  const repeatValueForward = (
    category: BudgetCategoryKey,
    itemId: string,
    fromMonthId: string
  ) => {
    const findItem = (items: BudgetItem[]) => items.find((i) => i.id === itemId);
    const item =
      category === BudgetCategory.Renda
        ? findItem(state.incomes)
        : findItem(state.lists[category as ExpenseCategoryKey] || []);

    if (!item) return;

    const fromIdx = state.months.findIndex((m) => m.id === fromMonthId);
    if (fromIdx === -1) return;

    const valToRepeat = item.values[fromMonthId] ?? 0;

    setState((prev) =>
      updateCategoryItem(prev, category, itemId, (i) => {
        const newVals = { ...i.values };
        for (let idx = fromIdx; idx < prev.months.length; idx++) {
          newVals[prev.months[idx].id] = valToRepeat;
        }
        return { ...i, values: newVals };
      })
    );
  };

  const addOneTimeCost = (initial?: Partial<Omit<OneTimeCost, 'id'>>) => {
    const newItem: OneTimeCost = {
      id: generateId(),
      name: initial?.name || 'Novo Custo Pontual',
      value: initial?.value ?? 0,
      targetMonthId: initial?.targetMonthId,
      off: initial?.off ?? false,
      notes: initial?.notes,
    };

    setState((prev) => ({
      ...prev,
      oneTimeCosts: [...(prev.oneTimeCosts || []), newItem],
    }));
  };

  const removeOneTimeCost = (id: string): OneTimeCost | undefined => {
    const item = state.oneTimeCosts.find((i) => i.id === id);
    if (!item) return undefined;

    setState((prev) => ({
      ...prev,
      oneTimeCosts: prev.oneTimeCosts.filter((i) => i.id !== id),
    }));

    return item;
  };

  const restoreOneTimeCost = (item: OneTimeCost) => {
    setState((prev) => ({
      ...prev,
      oneTimeCosts: [...(prev.oneTimeCosts || []), item],
    }));
  };

  const updateOneTimeCost = (id: string, patch: Partial<Omit<OneTimeCost, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      oneTimeCosts: (prev.oneTimeCosts || []).map((i) =>
        i.id === id ? { ...i, ...patch } : i
      ),
    }));
  };

  const updateOneTimeValue = (itemId: string, value: number) => {
    const numVal = isNaN(value) ? 0 : value;
    updateOneTimeCost(itemId, { value: numVal });
  };

  const updateOneTimeTargetMonth = (itemId: string, targetMonthId?: string) => {
    updateOneTimeCost(itemId, { targetMonthId });
  };

  const setAllOneTimeTargetMonth = (targetMonthId?: string) => {
    setState((prev) => ({
      ...prev,
      oneTimeCosts: (prev.oneTimeCosts || []).map((i) => ({ ...i, targetMonthId })),
    }));
  };

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

    setState((prev) => ({
      ...prev,
      goals: [...(prev.goals || []), newGoal],
    }));
  };

  const removeGoal = (goalId: string): FinancialGoal | undefined => {
    const goal = (state.goals || []).find((g) => g.id === goalId);
    if (!goal) return undefined;

    setState((prev) => ({
      ...prev,
      goals: (prev.goals || []).filter((g) => g.id !== goalId),
    }));

    return goal;
  };

  const restoreGoal = (goal: FinancialGoal) => {
    setState((prev) => ({
      ...prev,
      goals: [...(prev.goals || []), goal],
    }));
  };

  const updateGoal = (
    goalId: string,
    patch: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>
  ) => {
    setState((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
    }));
  };

  const addContribution = (goalId: string, amount: number, note?: string) => {
    const numAmount = isNaN(amount) ? 0 : amount;
    if (numAmount <= 0) return;

    const contribution: GoalContribution = {
      id: generateId(),
      date: new Date().toISOString().slice(0, 10),
      amount: numAmount,
      note,
    };

    setState((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) =>
        g.id === goalId
          ? { ...g, contributions: [...(g.contributions || []), contribution] }
          : g
      ),
    }));
  };

  const removeContribution = (goalId: string, contributionId: string) => {
    setState((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) =>
        g.id === goalId
          ? { ...g, contributions: (g.contributions || []).filter((c) => c.id !== contributionId) }
          : g
      ),
    }));
  };

  const setGoalStatus = (goalId: string, status: GoalStatus) => {
    setState((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => (g.id === goalId ? { ...g, status } : g)),
    }));
  };

  const resetToDefaults = () => {
    setState(INITIAL_BUDGET_STATE);
  };

  const importState = (data: BudgetState) => {
    setState(data);
  };

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
        isCloudLoading,
        isCloudSyncing,
        lastCloudSync,
        cloudSyncError,
        fetchFromCloud,
        saveToCloud,
        updateSimulation,
        addNextMonth,
        addPrevMonth,
        removeMonth,
        setHorizonCount,
        setCustomHorizon,
        addItem,
        addTransaction,
        removeItem,
        restoreItem,
        updateItemName,
        toggleItemActive,
        updateItemValue,
        repeatFirstMonthAcrossAll,
        repeatValueForward,
        updateOneTimeValue,
        updateOneTimeTargetMonth,
        setAllOneTimeTargetMonth,
        addOneTimeCost,
        removeOneTimeCost,
        restoreOneTimeCost,
        updateOneTimeCost,
        addGoal,
        removeGoal,
        restoreGoal,
        updateGoal,
        addContribution,
        removeContribution,
        setGoalStatus,
        resetToDefaults,
        importState,
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
