/**
 * Categorias de despesas recorrentes e pontuais
 */
export const ExpenseCategory = {
  Cartoes: 'cartoes',
  Fixas: 'fixas',
  Vars: 'vars',
  Mud: 'mud',
} as const;

export type ExpenseCategoryKey = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

/**
 * Categorias orçamentárias completas (inclui renda)
 */
export const BudgetCategory = {
  ...ExpenseCategory,
  Renda: 'renda',
} as const;

export type BudgetCategoryKey = (typeof BudgetCategory)[keyof typeof BudgetCategory];

/**
 * Tipos de entidades persistidas na Planilha Google
 */
export const SheetRowType = {
  Config: 'config',
  Renda: 'renda',
  Despesa: 'despesa',
  Mudanca: 'mudanca',
  Meta: 'meta',
} as const;

export type SheetRowType = (typeof SheetRowType)[keyof typeof SheetRowType];

/**
 * Status de ativação de itens do orçamento
 */
export const ItemStatus = {
  Ativo: 'ativo',
  Inativo: 'inativo',
} as const;

export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];

/**
 * Status das metas financeiras
 */
export const GoalStatus = {
  Ativa: 'ativa',
  Concluida: 'concluida',
  Pausada: 'pausada',
} as const;

export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];

/**
 * Chaves centrais do LocalStorage
 */
export const StorageKey = {
  AppData: 'finplan-app-data-v4',
  LegacyAppData: 'finplan-app-data-v3',
  Theme: 'finplan-theme',
  SheetUrl: 'finplan-sheetdb-url',
} as const;

export type StorageKey = (typeof StorageKey)[keyof typeof StorageKey];

/**
 * Identificadores semânticos fixos de configuração na planilha
 */
export const SheetConfigId = {
  InitialBalance: 'cfg:saldo_inicial',
  EmergencyReserve: 'cfg:reserva_emergencia',
} as const;

export type SheetConfigId = (typeof SheetConfigId)[keyof typeof SheetConfigId];
