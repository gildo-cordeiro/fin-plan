import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type {
  BudgetState,
  BudgetItem,
  OneTimeCost,
  SimulationSettings,
  MonthSummary,
  OverallMetrics,
  FinancialGoal,
  BudgetYear,
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
} from '../services/storageService';
import { budgetApiService } from '../services/budgetApiService';

function syncDerivedLists(items: BudgetItem[]): {
  items: BudgetItem[];
  incomes: BudgetItem[];
  lists: {
    cartoes: BudgetItem[];
    fixas: BudgetItem[];
    vars: BudgetItem[];
  };
} {
  return {
    items,
    incomes: items.filter((i) => i.type === 'renda'),
    lists: {
      cartoes: items.filter((i) => i.type === 'cartao'),
      fixas: items.filter((i) => i.type === 'fixa'),
      vars: items.filter((i) => i.type === 'var'),
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

  // Persistência direta no banco de dados (MongoDB Atlas)
  isLoading: boolean;
  isSaving: boolean;
  lastSaved: Date | null;
  loadError: string | null;
  saveError: string | null;
  retrySave: () => Promise<{ success: boolean; message: string }>;
  refreshFromDb: () => Promise<{ success: boolean; message: string }>;

  // Gestão de Anos
  availableYears: BudgetYear[];
  selectYear: (year: number) => Promise<void>;
  createYear: (year: number) => Promise<void>;

  // Compatibilidade com chamadas legadas
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
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [state, setState] = useState<BudgetState>(INITIAL_BUDGET_STATE);
  const [availableYears, setAvailableYears] = useState<BudgetYear[]>([]);

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const isLoadedRef = useRef(false);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  // Timers de debounce por item para digitação de valores
  const itemValueDebounceTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  // Timer de debounce para simulação
  const simulationDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectYear = async (year: number) => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const yearVm = await budgetApiService.fetchBudgetYear(year);
      if (yearVm && yearVm.year) {
        const derived = syncDerivedLists(yearVm.items || []);
        setState((prev) => ({
          ...prev,
          currentYear: yearVm.year.year,
          months: yearVm.months || [],
          simulation: yearVm.year.simulation,
          ...derived,
          oneTimeCosts: yearVm.oneTimeCosts || [],
          goals: yearVm.goals || [],
        }));
        setLastSaved(new Date());
      }
    } catch (err) {
      console.error(`[BudgetContext] Falha ao carregar ano ${year}:`, err);
      setLoadError(err instanceof Error ? err.message : 'Falha ao carregar ano');
    } finally {
      setIsLoading(false);
    }
  };

  const createYear = async (year: number) => {
    setIsLoading(true);
    try {
      const newYear = await budgetApiService.createBudgetYear(year, state.simulation);
      setAvailableYears((prev) => {
        if (prev.some((y) => y.year === year)) return prev;
        return [...prev, newYear].sort((a, b) => a.year - b.year);
      });
      await selectYear(year);
    } catch (err) {
      console.error(`[BudgetContext] Falha ao criar ano ${year}:`, err);
    } finally {
      setIsLoading(false);
    }
  };

  const retrySave = async (): Promise<{ success: boolean; message: string }> => {
    if (!isLoadedRef.current) {
      return {
        success: false,
        message: 'Não é possível salvar: os dados do banco ainda não foram carregados.',
      };
    }

    setIsSaving(true);
    try {
      const yr = state.currentYear || new Date().getFullYear();
      await budgetApiService.updateYearSimulation(yr, latestStateRef.current.simulation);
      setLastSaved(new Date());
      setSaveError(null);
      return { success: true, message: 'Dados salvos com sucesso!' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar no banco de dados';
      setSaveError(msg);
      return { success: false, message: msg };
    } finally {
      setIsSaving(false);
    }
  };

  const refreshFromDb = async (): Promise<{ success: boolean; message: string }> => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const currentYear = state.currentYear || new Date().getFullYear();
      const yearVm = await budgetApiService.fetchBudgetYear(currentYear);
      if (yearVm && yearVm.year) {
        const derived = syncDerivedLists(yearVm.items || []);
        setState((prev) => ({
          ...prev,
          currentYear: yearVm.year.year,
          months: yearVm.months || [],
          simulation: yearVm.year.simulation,
          ...derived,
          oneTimeCosts: yearVm.oneTimeCosts || [],
          goals: yearVm.goals || [],
        }));
        setLastSaved(new Date());
        isLoadedRef.current = true;
        setLoadError(null);
        return { success: true, message: 'Dados carregados com sucesso!' };
      }
      throw new Error(`Ano ${currentYear} não encontrado.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao buscar dados no banco';
      setLoadError(msg);
      return { success: false, message: msg };
    } finally {
      setIsLoading(false);
    }
  };

  // Carrega dados na inicialização
  useEffect(() => {
    let isMounted = true;

    const loadInitialFromDb = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const targetYear = new Date().getFullYear();

        // Carrega lista de anos disponíveis em background
        try {
          const years = await budgetApiService.fetchBudgetYears();
          if (isMounted && years.length > 0) {
            setAvailableYears(years);
          }
        } catch {
          // Ignora se servidor estiver offline
        }

        const yearVm = await budgetApiService.fetchBudgetYear(targetYear);
        if (!isMounted) return;
        if (yearVm && yearVm.year) {
          const derived = syncDerivedLists(yearVm.items || []);
          setState((prev) => ({
            ...prev,
            currentYear: yearVm.year.year,
            months: yearVm.months || [],
            simulation: yearVm.year.simulation,
            ...derived,
            oneTimeCosts: yearVm.oneTimeCosts || [],
            goals: yearVm.goals || [],
          }));
          setLastSaved(new Date());
          isLoadedRef.current = true;
          return;
        }
        isLoadedRef.current = true;
      } catch (err) {
        console.warn('[BudgetContext] Falha ao carregar do banco de dados:', err);
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : 'Falha ao conectar com o banco de dados';
        setLoadError(msg);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitialFromDb();

    const handleOnline = () => {
      setIsOnline(true);
      refreshFromDb().catch(() => {});
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

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

  const updateSimulation = (patch: Partial<SimulationSettings>) => {
    setState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, ...patch },
    }));

    if (simulationDebounceTimerRef.current) {
      clearTimeout(simulationDebounceTimerRef.current);
    }
    simulationDebounceTimerRef.current = setTimeout(async () => {
      try {
        await budgetApiService.updateYearSimulation(latestStateRef.current.currentYear, patch);
        setLastSaved(new Date());
        setSaveError(null);
      } catch (err) {
        console.error('[BudgetContext] Falha ao salvar simulação no banco:', err);
      }
    }, 400);
  };

  const addNextMonth = () => {
    setState((prev) => {
      const lastMonth = prev.months[prev.months.length - 1];
      const nextM = getNextMonth(lastMonth);
      const newMonths = [...prev.months, nextM];

      const newItems = prev.items.map((item) => ({
        ...item,
        values: {
          ...item.values,
          [nextM.id]: item.values[lastMonth.id] !== undefined ? item.values[lastMonth.id] : 0,
        },
      }));

      const derived = syncDerivedLists(newItems);

      // Persiste mês na API
      budgetApiService.addMonthToYear(nextM.year, nextM).catch(() => {});

      return {
        ...prev,
        months: newMonths,
        ...derived,
      };
    });
  };

  const addPrevMonth = () => {
    setState((prev) => {
      const firstMonth = prev.months[0];
      const prevM = getPrevMonth(firstMonth);
      const newMonths = [prevM, ...prev.months];

      const newItems = prev.items.map((item) => ({
        ...item,
        values: {
          ...item.values,
          [prevM.id]: item.values[firstMonth.id] !== undefined ? item.values[firstMonth.id] : 0,
        },
      }));

      const derived = syncDerivedLists(newItems);

      budgetApiService.addMonthToYear(prevM.year, prevM).catch(() => {});

      return {
        ...prev,
        months: newMonths,
        ...derived,
      };
    });
  };

  const removeMonth = (monthId: string) => {
    setState((prev) => {
      if (prev.months.length <= 1) return prev;
      const newMonths = prev.months.filter((m) => m.id !== monthId);

      const newItems = prev.items.map((item) => {
        const newVals = { ...item.values };
        delete newVals[monthId];
        return { ...item, values: newVals };
      });

      const derived = syncDerivedLists(newItems);

      return {
        ...prev,
        months: newMonths,
        ...derived,
      };
    });
  };

  const setHorizonCount = (count: number) => {
    setState((prev) => {
      if (count === prev.months.length || count < 1) return prev;
      const firstMonth = prev.months[0];
      const newMonths = generateMonthSequence(firstMonth.year, firstMonth.monthIndex, count);

      const newItems = prev.items.map((item) => {
        const newVals: Record<string, number> = {};
        const existingVals = Object.values(item.values);
        const defaultVal = existingVals.length > 0 ? existingVals[existingVals.length - 1] : 0;
        newMonths.forEach((m) => {
          newVals[m.id] = item.values[m.id] !== undefined ? item.values[m.id] : defaultVal;
        });
        return { ...item, values: newVals };
      });

      const derived = syncDerivedLists(newItems);

      return {
        ...prev,
        months: newMonths,
        ...derived,
      };
    });
  };

  const setCustomHorizon = (startYear: number, startMonthIndex: number, count: number) => {
    setState((prev) => {
      const newMonths = generateMonthSequence(startYear, startMonthIndex, count);

      const newItems = prev.items.map((item) => {
        const newVals: Record<string, number> = {};
        const existingVals = Object.values(item.values);
        const defaultVal = existingVals.length > 0 ? existingVals[existingVals.length - 1] : 0;
        newMonths.forEach((m) => {
          newVals[m.id] = item.values[m.id] !== undefined ? item.values[m.id] : defaultVal;
        });
        return { ...item, values: newVals };
      });

      const derived = syncDerivedLists(newItems);

      return {
        ...prev,
        months: newMonths,
        ...derived,
      };
    });
  };

  const addItem = (category: BudgetCategoryKey, customName?: string) => {
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

    const id = generateId();

    const newItem: BudgetItem = {
      id,
      type: itemType,
      category,
      name: defaultName,
      values: state.months.reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {}),
    };

    setState((prev) => {
      const updatedItems = [...prev.items, newItem];
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    // Persistência atômica imediata
    budgetApiService.createBudgetItem(newItem).catch((err) => {
      console.error('[BudgetContext] Falha ao criar item atômico:', err);
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
      type: itemType,
      category,
      name: cleanName,
      values,
    };

    setState((prev) => {
      const updatedItems = [...prev.items, newItem];
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    budgetApiService.createBudgetItem(newItem).catch((err) => {
      console.error('[BudgetContext] Falha ao criar item atômico:', err);
    });
  };

  const removeItem = (_category: BudgetCategoryKey, itemId: string): BudgetItem | undefined => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return undefined;

    setState((prev) => {
      const updatedItems = prev.items.filter((i) => i.id !== itemId);
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    budgetApiService.deleteBudgetItem(itemId).catch((err) => {
      console.error('[BudgetContext] Falha ao remover item atômico:', err);
    });

    return item;
  };

  const restoreItem = (_category: BudgetCategoryKey, item: BudgetItem) => {
    setState((prev) => {
      const updatedItems = [...prev.items, item];
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    budgetApiService.createBudgetItem(item).catch((err) => {
      console.error('[BudgetContext] Falha ao restaurar item atômico:', err);
    });
  };

  const updateItemName = (_category: BudgetCategoryKey, itemId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    setState((prev) => {
      const updatedItems = prev.items.map((i) =>
        i.id === itemId ? { ...i, name: cleanName } : i
      );
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    budgetApiService.updateBudgetItem(itemId, { name: cleanName }).catch((err) => {
      console.error('[BudgetContext] Falha ao atualizar nome do item:', err);
    });
  };

  const toggleItemActive = (_category: BudgetCategoryKey, itemId: string) => {
    let nextOff = false;
    setState((prev) => {
      const updatedItems = prev.items.map((i) => {
        if (i.id === itemId) {
          nextOff = !i.off;
          return { ...i, off: nextOff };
        }
        return i;
      });
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    budgetApiService.updateBudgetItem(itemId, { off: nextOff }).catch((err) => {
      console.error('[BudgetContext] Falha ao alternar estado do item:', err);
    });
  };

  const updateItemValue = (
    _category: BudgetCategoryKey,
    itemId: string,
    monthId: string,
    value: number
  ) => {
    const numVal = isNaN(value) ? 0 : value;

    setState((prev) => {
      const updatedItems = prev.items.map((i) =>
        i.id === itemId
          ? { ...i, values: { ...i.values, [monthId]: numVal } }
          : i
      );
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    // Debounce de 400ms por item durante a digitação de valores
    const existingTimer = itemValueDebounceTimersRef.current.get(itemId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      try {
        setIsSaving(true);
        await budgetApiService.updateBudgetItem(itemId, {
          values: { [monthId]: numVal },
        });
        setLastSaved(new Date());
        setSaveError(null);
      } catch (err) {
        console.error('[BudgetContext] Falha ao atualizar valor do item:', err);
        setSaveError(err instanceof Error ? err.message : 'Falha ao salvar valor');
      } finally {
        setIsSaving(false);
        itemValueDebounceTimersRef.current.delete(itemId);
      }
    }, 400);

    itemValueDebounceTimersRef.current.set(itemId, timer);
  };

  const repeatFirstMonthAcrossAll = (_category: BudgetCategoryKey, itemId: string) => {
    const firstMonthId = state.months[0]?.id;
    if (!firstMonthId) return;

    const item = state.items.find((i) => i.id === itemId);
    if (!item) return;
    const baseValue = item.values[firstMonthId] ?? 0;

    const newVals: Record<string, number> = {};
    state.months.forEach((m) => {
      newVals[m.id] = baseValue;
    });

    setState((prev) => {
      const updatedItems = prev.items.map((i) =>
        i.id === itemId ? { ...i, values: newVals } : i
      );
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    budgetApiService.updateBudgetItem(itemId, { values: newVals }).catch((err) => {
      console.error('[BudgetContext] Falha ao repetir valor de item:', err);
    });
  };

  const repeatValueForward = (
    _category: BudgetCategoryKey,
    itemId: string,
    fromMonthId: string
  ) => {
    const item = state.items.find((i) => i.id === itemId);
    if (!item) return;

    const fromIdx = state.months.findIndex((m) => m.id === fromMonthId);
    if (fromIdx === -1) return;

    const valToRepeat = item.values[fromMonthId] ?? 0;
    const newVals = { ...item.values };
    for (let idx = fromIdx; idx < state.months.length; idx++) {
      newVals[state.months[idx].id] = valToRepeat;
    }

    setState((prev) => {
      const updatedItems = prev.items.map((i) =>
        i.id === itemId ? { ...i, values: newVals } : i
      );
      return {
        ...prev,
        ...syncDerivedLists(updatedItems),
      };
    });

    budgetApiService.updateBudgetItem(itemId, { values: newVals }).catch((err) => {
      console.error('[BudgetContext] Falha ao repetir valor para frente:', err);
    });
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

    budgetApiService.createOneTimeCost(newItem).catch((err) => {
      console.error('[BudgetContext] Falha ao criar custo pontual:', err);
    });
  };

  const removeOneTimeCost = (id: string): OneTimeCost | undefined => {
    const item = state.oneTimeCosts.find((i) => i.id === id);
    if (!item) return undefined;

    setState((prev) => ({
      ...prev,
      oneTimeCosts: prev.oneTimeCosts.filter((i) => i.id !== id),
    }));

    budgetApiService.deleteOneTimeCost(id).catch((err) => {
      console.error('[BudgetContext] Falha ao remover custo pontual:', err);
    });

    return item;
  };

  const restoreOneTimeCost = (item: OneTimeCost) => {
    setState((prev) => ({
      ...prev,
      oneTimeCosts: [...(prev.oneTimeCosts || []), item],
    }));

    budgetApiService.createOneTimeCost(item).catch((err) => {
      console.error('[BudgetContext] Falha ao restaurar custo pontual:', err);
    });
  };

  const updateOneTimeCost = (id: string, patch: Partial<Omit<OneTimeCost, 'id'>>) => {
    setState((prev) => ({
      ...prev,
      oneTimeCosts: (prev.oneTimeCosts || []).map((i) =>
        i.id === id ? { ...i, ...patch } : i
      ),
    }));

    budgetApiService.updateOneTimeCost(id, patch).catch((err) => {
      console.error('[BudgetContext] Falha ao atualizar custo pontual:', err);
    });
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

    (state.oneTimeCosts || []).forEach((item) => {
      budgetApiService.updateOneTimeCost(item.id, { targetMonthId }).catch(() => {});
    });
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

    budgetApiService.createGoal(newGoal).catch((err) => {
      console.error('[BudgetContext] Falha ao criar meta:', err);
    });
  };

  const removeGoal = (goalId: string): FinancialGoal | undefined => {
    const goal = (state.goals || []).find((g) => g.id === goalId);
    if (!goal) return undefined;

    setState((prev) => ({
      ...prev,
      goals: (prev.goals || []).filter((g) => g.id !== goalId),
    }));

    budgetApiService.deleteGoal(goalId).catch((err) => {
      console.error('[BudgetContext] Falha ao remover meta:', err);
    });

    return goal;
  };

  const restoreGoal = (goal: FinancialGoal) => {
    setState((prev) => ({
      ...prev,
      goals: [...(prev.goals || []), goal],
    }));

    budgetApiService.createGoal(goal).catch((err) => {
      console.error('[BudgetContext] Falha ao restaurar meta:', err);
    });
  };

  const updateGoal = (
    goalId: string,
    patch: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>
  ) => {
    setState((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
    }));

    budgetApiService.updateGoal(goalId, patch).catch((err) => {
      console.error('[BudgetContext] Falha ao atualizar meta:', err);
    });
  };

  const addContribution = (goalId: string, amount: number, note?: string) => {
    const numAmount = isNaN(amount) ? 0 : amount;
    if (numAmount <= 0) return;

    const date = new Date().toISOString().slice(0, 10);
    const contribution = {
      id: generateId(),
      date,
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

    budgetApiService.addGoalContribution(goalId, { amount: numAmount, note, date }).catch((err) => {
      console.error('[BudgetContext] Falha ao adicionar contribuição à meta:', err);
    });
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

    budgetApiService.deleteGoalContribution(goalId, contributionId).catch((err) => {
      console.error('[BudgetContext] Falha ao remover contribuição da meta:', err);
    });
  };

  const setGoalStatus = (goalId: string, status: GoalStatus) => {
    setState((prev) => ({
      ...prev,
      goals: (prev.goals || []).map((g) => (g.id === goalId ? { ...g, status } : g)),
    }));

    budgetApiService.updateGoal(goalId, { status }).catch((err) => {
      console.error('[BudgetContext] Falha ao atualizar status da meta:', err);
    });
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
        isLoading,
        isSaving,
        lastSaved,
        loadError,
        saveError,
        retrySave,
        refreshFromDb,

        // Gestão de anos
        availableYears,
        selectYear,
        createYear,

        // Compatibilidade legada
        isCloudLoading: isLoading,
        isCloudSyncing: isSaving,
        lastCloudSync: lastSaved,
        cloudSyncError: saveError || loadError,
        fetchFromCloud: refreshFromDb,
        saveToCloud: retrySave,

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
