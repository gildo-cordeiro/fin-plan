export const ExpenseCategory = {
  Cartoes: 'cartoes',
  Fixas: 'fixas',
  Vars: 'vars',
} as const;

export type ExpenseCategoryKey = (typeof ExpenseCategory)[keyof typeof ExpenseCategory] | 'cartao' | 'fixa' | 'variavel' | 'var';

export const BudgetCategory = {
  ...ExpenseCategory,
  Renda: 'renda',
} as const;

export type BudgetCategoryKey = (typeof BudgetCategory)[keyof typeof BudgetCategory] | 'cartao' | 'fixa' | 'variavel' | 'var';

/** Tipos canônicos do schema PostgreSQL — 'variavel' (não 'var'). */
export type ItemType = 'renda' | 'fixa' | 'variavel' | 'cartao';

/**
 * @deprecated Usar `ItemType` — mantida para compatibilidade de migração.
 * Mapeia valores legados ('var', 'cartoes', etc.) para o formato canônico.
 */
export type BudgetItemType = ItemType;

/**
 * Normaliza qualquer variante legada de categoria para o formato canônico do PostgreSQL.
 * Aceita: 'cartoes'|'cartao' → 'cartao', 'fixas'|'fixa' → 'fixa',
 *         'vars'|'var'|'variavel' → 'variavel', default → 'renda'
 */
export function normalizeBudgetItemType(category: string): ItemType {
  if (category === 'cartoes' || category === 'cartao') return 'cartao';
  if (category === 'fixas' || category === 'fixa') return 'fixa';
  if (category === 'vars' || category === 'var' || category === 'variavel') return 'variavel';
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
