export const ExpenseCategory = {
  Cartoes: 'cartoes',
  Fixas: 'fixas',
  Vars: 'vars',
} as const;

export type ExpenseCategoryKey = (typeof ExpenseCategory)[keyof typeof ExpenseCategory] | 'cartao' | 'fixa' | 'var';

export const BudgetCategory = {
  ...ExpenseCategory,
  Renda: 'renda',
} as const;

export type BudgetCategoryKey = (typeof BudgetCategory)[keyof typeof BudgetCategory] | 'cartao' | 'fixa' | 'var';

export type BudgetItemType = 'renda' | 'cartao' | 'fixa' | 'var';

export function normalizeBudgetItemType(category: string): BudgetItemType {
  if (category === 'cartoes' || category === 'cartao') return 'cartao';
  if (category === 'fixas' || category === 'fixa') return 'fixa';
  if (category === 'vars' || category === 'var') return 'var';
  return 'renda';
}

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
