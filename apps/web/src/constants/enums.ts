export const ExpenseCategory = {
  Cartoes: 'cartoes',
  Fixas: 'fixas',
  Vars: 'vars',
} as const;

export type ExpenseCategoryKey = (typeof ExpenseCategory)[keyof typeof ExpenseCategory];

export const BudgetCategory = {
  ...ExpenseCategory,
  Renda: 'renda',
} as const;

export type BudgetCategoryKey = (typeof BudgetCategory)[keyof typeof BudgetCategory];

export const ItemStatus = {
  Ativo: 'ativo',
  Inativo: 'inativo',
} as const;

export type ItemStatus = (typeof ItemStatus)[keyof typeof ItemStatus];

export const GoalStatus = {
  Ativa: 'ativa',
  Concluida: 'concluida',
  Pausada: 'pausada',
} as const;

export type GoalStatus = (typeof GoalStatus)[keyof typeof GoalStatus];
