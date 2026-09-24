import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type {
  BudgetState,
  BudgetItem,
  SimulationSettings,
  MonthSummary,
  OverallMetrics,
  FinancialGoal,
  GoalContribution,
} from '../types/budget';
import {
  BudgetCategory,
  BudgetCategoryKey,
  ExpenseCategory,
  ExpenseCategoryKey,
  GoalStatus,
  ItemStatus,
  SheetConfigId,
} from '../constants/enums';
import { SheetIdGenerator, toSemanticSlug } from '../utils/idGenerator';
import { INITIAL_BUDGET_STATE } from '../constants/seedData';
import { useBudgetCalculations } from '../hooks/useBudgetCalculations';
import { getNextMonth, getPrevMonth, generateMonthSequence } from '../utils/formatters';
import {
  loadBudgetState,
  saveBudgetState,
  loadTheme,
  saveTheme,
} from '../services/storageService';
import { sheetService, type SheetRowRecord } from '../services/sheetService';

/**
 * Função utilitária pura para atualizar um item imutavelmente dentro da categoria correspondente
 */
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

  return {
    ...prev,
    lists: {
      ...prev.lists,
      [category]: updateList(prev.lists[category]),
    },
  };
}

interface BudgetContextType {
  state: BudgetState;
  monthlySummaries: MonthSummary[];
  metrics: OverallMetrics;
  theme: 'light' | 'dark';
  toggleTheme: () => void;

  // Status & Integração com Google Sheets (Nuvem como Banco de Dados)
  isSheetLoading: boolean;
  isSheetSyncing: boolean;
  lastSheetSync: Date | null;
  sheetSyncError: string | null;
  isSheetConfigured: boolean;
  fetchFromSheet: () => Promise<{ success: boolean; message: string }>;
  saveToSheet: () => Promise<{ success: boolean; message: string }>;

  // Ações de Simulação
  updateSimulation: (patch: Partial<SimulationSettings>) => void;

  // Ações de Meses / Horizonte
  addNextMonth: () => void;
  addPrevMonth: () => void;
  removeMonth: (monthId: string) => void;
  setHorizonCount: (count: number) => void;
  setCustomHorizon: (startYear: number, startMonthIndex: number, count: number) => void;

  // Ações de Itens do Orçamento
  addItem: (category: BudgetCategoryKey, customName?: string) => void;
  addTransaction: (params: {
    category: BudgetCategoryKey;
    name: string;
    value: number;
    monthId: string;
    repeatForward?: boolean;
  }) => void;
  removeItem: (category: BudgetCategoryKey, itemId: string) => void;
  updateItemName: (category: BudgetCategoryKey, itemId: string, name: string) => void;
  toggleItemActive: (category: BudgetCategoryKey, itemId: string) => void;
  updateItemValue: (category: BudgetCategoryKey, itemId: string, monthId: string, value: number) => void;
  repeatFirstMonthAcrossAll: (category: BudgetCategoryKey, itemId: string) => void;
  repeatValueForward: (category: BudgetCategoryKey, itemId: string, fromMonthId: string) => void;

  // Ações de Itens Pontuais / Mudança
  updateOneTimeValue: (itemId: string, value: number) => void;
  updateOneTimeTargetMonth: (itemId: string, targetMonthId?: string) => void;
  setAllOneTimeTargetMonth: (targetMonthId?: string) => void;

  // Ações de Metas & Eventos
  addGoal: (initial?: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>) => void;
  removeGoal: (goalId: string) => void;
  updateGoal: (goalId: string, patch: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>) => void;
  addContribution: (goalId: string, amount: number, note?: string) => void;
  removeContribution: (goalId: string, contributionId: string) => void;
  setGoalStatus: (goalId: string, status: GoalStatus) => void;

  // Backup & Restauração
  resetToDefaults: () => void;
  importState: (data: BudgetState) => void;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => loadTheme());
  const [state, setState] = useState<BudgetState>(() => loadBudgetState());

  // Estados da integração em nuvem com o Google Sheets
  const [isSheetLoading, setIsSheetLoading] = useState(false);
  const [isSheetSyncing, setIsSheetSyncing] = useState(false);
  const [lastSheetSync, setLastSheetSync] = useState<Date | null>(null);
  const [sheetSyncError, setSheetSyncError] = useState<string | null>(null);
  const [isSheetConfigured, setIsSheetConfigured] = useState(() => Boolean(sheetService.getApiUrl()));

  const isInitialMount = useRef(true);
  const isReadyForAutoSyncRef = useRef(false);
  const latestStateRef = useRef(state);
  latestStateRef.current = state;

  // Fila de alterações pendentes para sincronização granular em nuvem (PATCH in-place)
  const pendingPatchesRef = useRef<Map<string, Partial<SheetRowRecord>>>(new Map());
  const needsFullSyncRef = useRef<boolean>(false);

  const recordPendingPatch = (id: string, patch: Partial<SheetRowRecord>) => {
    const existing = pendingPatchesRef.current.get(id) || {};
    pendingPatchesRef.current.set(id, { ...existing, ...patch });
  };

  const flagNeedsFullSync = () => {
    needsFullSyncRef.current = true;
  };

  // Inicialização: verifica conexão com o Google Sheets
  useEffect(() => {
    const url = sheetService.getApiUrl();
    if (url) {
      setIsSheetConfigured(true);

      // Proteção: só puxa da planilha se o app local estiver completamente vazio.
      // Se você já tem dados no app, preservamos os dados locais para evitar sobrescrita por planilha desatualizada.
      const isLocalEmpty =
        state.incomes.length === 0 &&
        state.lists.cartoes.length === 0 &&
        state.lists.fixas.length === 0 &&
        state.lists.vars.length === 0 &&
        state.lists.mud.length === 0;

      if (isLocalEmpty) {
        setIsSheetLoading(true);
        sheetService
          .fetchFromSheet(url)
          .then(({ state: remoteState }) => {
            setState(remoteState);
            setLastSheetSync(new Date());
            setSheetSyncError(null);
          })
          .catch((err) => {
            console.warn('[BudgetContext] Aviso ao conectar com Google Sheets na inicialização:', err);
          })
          .finally(() => {
            setIsSheetLoading(false);
            setTimeout(() => {
              isReadyForAutoSyncRef.current = true;
            }, 1000);
          });
      } else {
        isReadyForAutoSyncRef.current = true;
      }
    } else {
      isReadyForAutoSyncRef.current = true;
    }
  }, []);

  // Persistência local contínua e auto-sincronização granular (PATCH) com o Google Sheets (debounced 2.5s)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    saveBudgetState(state);

    // Se ainda está carregando ou não está pronto para auto-sync, não envia
    if (!isReadyForAutoSyncRef.current || isSheetLoading) {
      return;
    }

    const url = sheetService.getApiUrl();
    if (!url) return;

    // Agenda o salvamento após 2.5 segundos de inatividade
    const timer = setTimeout(async () => {
      const hasPatches = pendingPatchesRef.current.size > 0;
      const requiresFullSync = needsFullSyncRef.current;

      // Se nenhuma alteração precisa ir para a planilha, não consome chamadas
      if (!hasPatches && !requiresFullSync) {
        return;
      }

      setIsSheetSyncing(true);
      try {
        if (!requiresFullSync && hasPatches && pendingPatchesRef.current.size <= 10) {
          // Sincronização granular (PATCH): atualiza diretamente nas linhas existentes no Google Sheets sem duplicar
          const patches = Array.from(pendingPatchesRef.current.entries());
          pendingPatchesRef.current.clear();

          await Promise.all(
            patches.map(([id, patch]) => sheetService.updateRow(id, patch))
          );
        } else {
          // Sincronização estrutural completa: sobrescrita limpa sem duplicatas
          needsFullSyncRef.current = false;
          pendingPatchesRef.current.clear();
          await sheetService.uploadToSheet(latestStateRef.current);
        }

        setLastSheetSync(new Date());
        setSheetSyncError(null);
      } catch (err) {
        console.warn('[BudgetContext] Falha na auto-sincronização com a planilha:', err);
        setSheetSyncError(err instanceof Error ? err.message : 'Erro ao salvar na planilha');
      } finally {
        setIsSheetSyncing(false);
      }
    }, 2500);

    return () => {
      clearTimeout(timer);
      setIsSheetSyncing(false);
    };
  }, [state, isSheetLoading]);

  // Sincronização do tema no DOM e no localStorage
  useEffect(() => {
    saveTheme(theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const fetchFromSheet = async (): Promise<{ success: boolean; message: string }> => {
    const url = sheetService.getApiUrl();
    if (!url) {
      return { success: false, message: 'URL da planilha não configurada.' };
    }
    setIsSheetLoading(true);
    try {
      const { state: remoteState, count } = await sheetService.fetchFromSheet(url);
      setState(remoteState);
      setLastSheetSync(new Date());
      setSheetSyncError(null);
      setIsSheetConfigured(true);
      return { success: true, message: `${count} registros carregados da planilha com sucesso!` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao buscar dados';
      setSheetSyncError(msg);
      return { success: false, message: msg };
    } finally {
      setIsSheetLoading(false);
    }
  };

  const saveToSheet = async (): Promise<{ success: boolean; message: string }> => {
    const url = sheetService.getApiUrl();
    if (!url) {
      return { success: false, message: 'URL da planilha não configurada.' };
    }
    setIsSheetSyncing(true);
    try {
      needsFullSyncRef.current = false;
      pendingPatchesRef.current.clear();
      const { count } = await sheetService.uploadToSheet(state);
      setLastSheetSync(new Date());
      setSheetSyncError(null);
      setIsSheetConfigured(true);
      return { success: true, message: `${count} registros sincronizados na planilha com sucesso!` };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Falha ao salvar dados';
      setSheetSyncError(msg);
      return { success: false, message: msg };
    } finally {
      setIsSheetSyncing(false);
    }
  };

  const { monthlySummaries, metrics } = useBudgetCalculations(state);

  // ── Simulação ──────────────────────────────────────────────────────────────

  const updateSimulation = (patch: Partial<SimulationSettings>) => {
    setState((prev) => ({
      ...prev,
      simulation: { ...prev.simulation, ...patch },
    }));

    if (patch.initialBalance !== undefined) {
      recordPendingPatch(SheetConfigId.InitialBalance, { valor: patch.initialBalance });
    }
    if (patch.emergencyReserve !== undefined) {
      recordPendingPatch(SheetConfigId.EmergencyReserve, { valor: patch.emergencyReserve });
    }
  };

  // ── Meses / Horizonte ──────────────────────────────────────────────────────

  const addNextMonth = () => {
    flagNeedsFullSync();
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
          mud: prev.lists.mud,
        },
      };
    });
  };

  const addPrevMonth = () => {
    flagNeedsFullSync();
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
          mud: prev.lists.mud,
        },
      };
    });
  };

  const removeMonth = (monthId: string) => {
    flagNeedsFullSync();
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
          mud: prev.lists.mud,
        },
      };
    });
  };

  const setHorizonCount = (count: number) => {
    flagNeedsFullSync();
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
          mud: prev.lists.mud,
        },
      };
    });
  };

  const setCustomHorizon = (startYear: number, startMonthIndex: number, count: number) => {
    flagNeedsFullSync();
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
          mud: prev.lists.mud,
        },
      };
    });
  };

  // ── Itens do Orçamento ────────────────────────────────────────────────────

  const addItem = (category: BudgetCategoryKey, customName?: string) => {
    flagNeedsFullSync();
    const isOneTime = category === ExpenseCategory.Mud;
    const defaultName =
      customName ||
      (category === BudgetCategory.Renda
        ? 'Nova Fonte de Renda'
        : category === ExpenseCategory.Cartoes
        ? 'Novo Cartão'
        : category === ExpenseCategory.Fixas
        ? 'Nova Despesa Fixa'
        : category === ExpenseCategory.Vars
        ? 'Nova Despesa Variável'
        : 'Novo Custo Pontual');

    const id = `${category}:${toSemanticSlug(defaultName)}_${Date.now().toString(36)}`;

    const newItem: BudgetItem = {
      id,
      name: defaultName,
      category,
      values: isOneTime ? {} : state.months.reduce((acc, m) => ({ ...acc, [m.id]: 0 }), {}),
      isOneTime,
      oneTimeValue: isOneTime ? 0 : undefined,
    };

    setState((prev) => {
      if (category === BudgetCategory.Renda) {
        return { ...prev, incomes: [...prev.incomes, newItem] };
      }
      return {
        ...prev,
        lists: { ...prev.lists, [category]: [...prev.lists[category], newItem] },
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
    flagNeedsFullSync();
    const isOneTime = category === ExpenseCategory.Mud;
    const numVal = isNaN(value) ? 0 : value;
    const cleanName =
      name.trim() ||
      (category === BudgetCategory.Renda
        ? 'Nova Fonte de Renda'
        : category === ExpenseCategory.Cartoes
        ? 'Novo Cartão'
        : category === ExpenseCategory.Fixas
        ? 'Nova Despesa Fixa'
        : category === ExpenseCategory.Vars
        ? 'Nova Despesa Variável'
        : 'Novo Custo Pontual');

    const id = `${category}:${toSemanticSlug(cleanName)}_${Date.now().toString(36)}`;

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
      values: isOneTime ? {} : values,
      isOneTime,
      oneTimeValue: isOneTime ? numVal : undefined,
      targetMonthId: isOneTime ? monthId : undefined,
    };

    setState((prev) => {
      if (category === BudgetCategory.Renda) {
        return { ...prev, incomes: [...prev.incomes, newItem] };
      }
      return {
        ...prev,
        lists: { ...prev.lists, [category]: [...prev.lists[category], newItem] },
      };
    });
  };

  const removeItem = (category: BudgetCategoryKey, itemId: string) => {
    const item =
      category === BudgetCategory.Renda
        ? state.incomes.find((i) => i.id === itemId)
        : category === ExpenseCategory.Mud
        ? state.lists.mud.find((i) => i.id === itemId)
        : (state.lists[category as ExpenseCategoryKey] || []).find((i) => i.id === itemId);

    // Deleta os IDs específicos da planilha diretamente
    if (item) {
      if (category === ExpenseCategory.Mud) {
        const rowId = SheetIdGenerator.oneTime(item.name);
        sheetService.deleteRow(rowId).catch((err) =>
          console.warn('[BudgetContext] Falha ao deletar linha da planilha:', err)
        );
      } else {
        state.months.forEach((m) => {
          const rowId =
            category === BudgetCategory.Renda
              ? SheetIdGenerator.income(item.name, m.id)
              : SheetIdGenerator.expense(category as ExpenseCategoryKey, item.name, m.id);
          sheetService.deleteRow(rowId).catch((err) =>
            console.warn('[BudgetContext] Falha ao deletar linha da planilha:', err)
          );
        });
      }
    }

    setState((prev) => {
      if (category === BudgetCategory.Renda) {
        return { ...prev, incomes: prev.incomes.filter((i) => i.id !== itemId) };
      }
      return {
        ...prev,
        lists: { ...prev.lists, [category]: prev.lists[category].filter((i) => i.id !== itemId) },
      };
    });
  };

  const updateItemName = (category: BudgetCategoryKey, itemId: string, name: string) => {
    const cleanName = name.trim();
    if (!cleanName) return;

    const item =
      category === BudgetCategory.Renda
        ? state.incomes.find((i) => i.id === itemId)
        : category === ExpenseCategory.Mud
        ? state.lists.mud.find((i) => i.id === itemId)
        : (state.lists[category as ExpenseCategoryKey] || []).find((i) => i.id === itemId);

    if (item && item.name !== cleanName) {
      const oldName = item.name;
      // Atualiza in-place na planilha: PATCH no oldId alterando id e nome
      if (category === ExpenseCategory.Mud) {
        const oldId = SheetIdGenerator.oneTime(oldName);
        const newId = SheetIdGenerator.oneTime(cleanName);
        recordPendingPatch(oldId, { id: newId, nome: cleanName });
      } else {
        state.months.forEach((m) => {
          const oldId =
            category === BudgetCategory.Renda
              ? SheetIdGenerator.income(oldName, m.id)
              : SheetIdGenerator.expense(category as ExpenseCategoryKey, oldName, m.id);
          const newId =
            category === BudgetCategory.Renda
              ? SheetIdGenerator.income(cleanName, m.id)
              : SheetIdGenerator.expense(category as ExpenseCategoryKey, cleanName, m.id);
          recordPendingPatch(oldId, { id: newId, nome: cleanName });
        });
      }
    }

    setState((prev) => updateCategoryItem(prev, category, itemId, (i) => ({ ...i, name: cleanName })));
  };

  const toggleItemActive = (category: BudgetCategoryKey, itemId: string) => {
    setState((prev) => updateCategoryItem(prev, category, itemId, (i) => ({ ...i, off: !i.off })));

    const item =
      category === BudgetCategory.Renda
        ? state.incomes.find((i) => i.id === itemId)
        : category === ExpenseCategory.Mud
        ? state.lists.mud.find((i) => i.id === itemId)
        : (state.lists[category as ExpenseCategoryKey] || []).find((i) => i.id === itemId);

    if (item) {
      const nextStatus = !item.off ? ItemStatus.Inativo : ItemStatus.Ativo;
      if (category === ExpenseCategory.Mud) {
        recordPendingPatch(SheetIdGenerator.oneTime(item.name), { status: nextStatus });
      } else {
        state.months.forEach((m) => {
          const rowId =
            category === BudgetCategory.Renda
              ? SheetIdGenerator.income(item.name, m.id)
              : SheetIdGenerator.expense(category as ExpenseCategoryKey, item.name, m.id);
          recordPendingPatch(rowId, { status: nextStatus });
        });
      }
    }
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

    const item =
      category === BudgetCategory.Renda
        ? state.incomes.find((i) => i.id === itemId)
        : (state.lists[category as ExpenseCategoryKey] || []).find((i) => i.id === itemId);

    if (item) {
      const rowId =
        category === BudgetCategory.Renda
          ? SheetIdGenerator.income(item.name, monthId)
          : SheetIdGenerator.expense(category as ExpenseCategoryKey, item.name, monthId);
      recordPendingPatch(rowId, { valor: numVal });
    }
  };

  const repeatFirstMonthAcrossAll = (category: BudgetCategoryKey, itemId: string) => {
    const item =
      category === BudgetCategory.Renda
        ? state.incomes.find((i) => i.id === itemId)
        : (state.lists[category as ExpenseCategoryKey] || []).find((i) => i.id === itemId);

    if (!item) return;
    const firstMonthId = state.months[0]?.id;
    if (!firstMonthId) return;
    const val = item.values[firstMonthId] ?? 0;

    // Atualiza in-place cada mês do ID
    state.months.forEach((m) => {
      const rowId =
        category === BudgetCategory.Renda
          ? SheetIdGenerator.income(item.name, m.id)
          : SheetIdGenerator.expense(category as ExpenseCategoryKey, item.name, m.id);
      recordPendingPatch(rowId, { valor: val });
    });

    setState((prev) =>
      updateCategoryItem(prev, category, itemId, (it) => {
        const newVals = prev.months.reduce((acc, m) => ({ ...acc, [m.id]: val }), {});
        return { ...it, values: newVals };
      })
    );
  };

  const repeatValueForward = (
    category: BudgetCategoryKey,
    itemId: string,
    fromMonthId: string
  ) => {
    const item =
      category === BudgetCategory.Renda
        ? state.incomes.find((i) => i.id === itemId)
        : (state.lists[category as ExpenseCategoryKey] || []).find((i) => i.id === itemId);

    if (!item) return;
    const fromIndex = state.months.findIndex((m) => m.id === fromMonthId);
    if (fromIndex === -1) return;
    const sourceVal = item.values[fromMonthId] ?? 0;

    for (let idx = fromIndex; idx < state.months.length; idx++) {
      const mId = state.months[idx].id;
      const rowId =
        category === BudgetCategory.Renda
          ? SheetIdGenerator.income(item.name, mId)
          : SheetIdGenerator.expense(category as ExpenseCategoryKey, item.name, mId);
      recordPendingPatch(rowId, { valor: sourceVal });
    }

    setState((prev) =>
      updateCategoryItem(prev, category, itemId, (it) => {
        const newVals = { ...it.values };
        for (let idx = fromIndex; idx < prev.months.length; idx++) {
          newVals[prev.months[idx].id] = sourceVal;
        }
        return { ...it, values: newVals };
      })
    );
  };

  const updateOneTimeValue = (itemId: string, value: number) => {
    const numVal = isNaN(value) ? 0 : value;
    setState((prev) => ({
      ...prev,
      lists: {
        ...prev.lists,
        mud: prev.lists.mud.map((i) =>
          i.id === itemId ? { ...i, oneTimeValue: numVal } : i
        ),
      },
    }));

    const item = state.lists.mud.find((i) => i.id === itemId);
    if (item) {
      recordPendingPatch(SheetIdGenerator.oneTime(item.name), { valor: numVal });
    }
  };

  const updateOneTimeTargetMonth = (itemId: string, targetMonthId?: string) => {
    setState((prev) => ({
      ...prev,
      lists: {
        ...prev.lists,
        mud: prev.lists.mud.map((i) => (i.id === itemId ? { ...i, targetMonthId } : i)),
      },
    }));

    const item = state.lists.mud.find((i) => i.id === itemId);
    if (item) {
      recordPendingPatch(SheetIdGenerator.oneTime(item.name), {
        mes_referencia: targetMonthId || 'geral',
      });
    }
  };

  const setAllOneTimeTargetMonth = (targetMonthId?: string) => {
    state.lists.mud.forEach((item) => {
      recordPendingPatch(SheetIdGenerator.oneTime(item.name), {
        mes_referencia: targetMonthId || 'geral',
      });
    });

    setState((prev) => ({
      ...prev,
      lists: {
        ...prev.lists,
        mud: prev.lists.mud.map((i) => ({ ...i, targetMonthId })),
      },
    }));
  };

  // ── Metas & Eventos ────────────────────────────────────────────────────────

  const addGoal = (initial?: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>) => {
    flagNeedsFullSync();
    const goalName = initial?.name?.trim() || 'Nova Meta';
    const newGoal: FinancialGoal = {
      id: SheetIdGenerator.goal(goalName),
      name: goalName,
      description: initial?.description || '',
      icon: initial?.icon || '🎯',
      color: initial?.color || '#0e6b7a',
      targetAmount: initial?.targetAmount || 0,
      status: initial?.status || GoalStatus.Ativa,
      contributions: [],
    };
    setState((prev) => ({ ...prev, goals: [...prev.goals, newGoal] }));
  };

  const removeGoal = (goalId: string) => {
    const goal = state.goals.find((g) => g.id === goalId);
    if (goal) {
      const rowId = SheetIdGenerator.goal(goal.name);
      sheetService.deleteRow(rowId).catch((err) =>
        console.warn('[BudgetContext] Falha ao deletar meta da planilha:', err)
      );
    }
    setState((prev) => ({ ...prev, goals: prev.goals.filter((g) => g.id !== goalId) }));
  };

  const updateGoal = (
    goalId: string,
    patch: Partial<Omit<FinancialGoal, 'id' | 'contributions'>>
  ) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalId ? { ...g, ...patch } : g)),
    }));

    const goal = state.goals.find((g) => g.id === goalId);
    if (goal) {
      const rowId = SheetIdGenerator.goal(goal.name);
      const rowPatch: Partial<SheetRowRecord> = {};
      if (patch.targetAmount !== undefined) rowPatch.valor = patch.targetAmount;
      if (patch.status !== undefined) rowPatch.status = patch.status;
      if (patch.description !== undefined || patch.icon !== undefined) {
        rowPatch.observacao = `${patch.icon || goal.icon || '🎯'} ${patch.description ?? goal.description ?? ''}`;
      }
      recordPendingPatch(rowId, rowPatch);
    }
  };

  const addContribution = (goalId: string, amount: number, note?: string) => {
    const contribution: GoalContribution = {
      id: `contrib-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      amount: isNaN(amount) ? 0 : amount,
      note,
    };
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId
          ? { ...g, contributions: [...g.contributions, contribution] }
          : g
      ),
    }));
  };

  const removeContribution = (goalId: string, contributionId: string) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) =>
        g.id === goalId
          ? { ...g, contributions: g.contributions.filter((c) => c.id !== contributionId) }
          : g
      ),
    }));
  };

  const setGoalStatus = (goalId: string, status: GoalStatus) => {
    setState((prev) => ({
      ...prev,
      goals: prev.goals.map((g) => (g.id === goalId ? { ...g, status } : g)),
    }));

    const goal = state.goals.find((g) => g.id === goalId);
    if (goal) {
      recordPendingPatch(SheetIdGenerator.goal(goal.name), { status });
    }
  };

  // ── Backup & Restauração ───────────────────────────────────────────────────

  const resetToDefaults = () => {
    flagNeedsFullSync();
    setState(INITIAL_BUDGET_STATE);
  };

  const importState = (data: BudgetState) => {
    flagNeedsFullSync();
    setState(data);
  };

  return (
    <BudgetContext.Provider
      value={{
        state,
        monthlySummaries,
        metrics,
        theme,
        toggleTheme,
        isSheetLoading,
        isSheetSyncing,
        lastSheetSync,
        sheetSyncError,
        isSheetConfigured,
        fetchFromSheet,
        saveToSheet,
        updateSimulation,
        addNextMonth,
        addPrevMonth,
        removeMonth,
        setHorizonCount,
        setCustomHorizon,
        addItem,
        addTransaction,
        removeItem,
        updateItemName,
        toggleItemActive,
        updateItemValue,
        repeatFirstMonthAcrossAll,
        repeatValueForward,
        updateOneTimeValue,
        updateOneTimeTargetMonth,
        setAllOneTimeTargetMonth,
        addGoal,
        removeGoal,
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
