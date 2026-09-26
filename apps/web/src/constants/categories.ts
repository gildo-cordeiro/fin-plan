import { ExpenseCategory, BudgetCategory, type BudgetCategoryKey } from './enums';

export interface CategoryMeta {
  key: BudgetCategoryKey;
  label: string;
  shortLabel: string;
  icon: string;
  color: string;
  textColor: string;
  borderColor: string;
  bgLight: string;
  defaultRepeat: boolean;
  hint: string;
}

export const CATEGORY_DEFINITIONS: Record<BudgetCategoryKey, CategoryMeta> = {
  [BudgetCategory.Renda]: {
    key: BudgetCategory.Renda,
    label: 'Rendas & Entradas',
    shortLabel: 'Renda',
    icon: '💰',
    color: '#10b981',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-300 dark:border-emerald-700',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    defaultRepeat: true,
    hint: 'Salários, benefícios, freelances e outras receitas.',
  },
  [ExpenseCategory.Cartoes]: {
    key: ExpenseCategory.Cartoes,
    label: 'Cartões de Crédito',
    shortLabel: 'Cartões',
    icon: '💳',
    color: '#f97316',
    textColor: 'text-orange-700 dark:text-orange-400',
    borderColor: 'border-orange-300 dark:border-orange-700',
    bgLight: 'bg-orange-50 dark:bg-orange-950/40',
    defaultRepeat: false,
    hint: 'Faturas de cartão de crédito de cada mês.',
  },
  [ExpenseCategory.Fixas]: {
    key: ExpenseCategory.Fixas,
    label: 'Despesas Fixas',
    shortLabel: 'Fixas',
    icon: '🏠',
    color: '#3b82f6',
    textColor: 'text-blue-700 dark:text-blue-400',
    borderColor: 'border-blue-300 dark:border-blue-700',
    bgLight: 'bg-blue-50 dark:bg-blue-950/40',
    defaultRepeat: true,
    hint: 'Aluguel, condomínio, internet, água e energia.',
  },
  [ExpenseCategory.Vars]: {
    key: ExpenseCategory.Vars,
    label: 'Despesas Variáveis',
    shortLabel: 'Variáveis',
    icon: '🛒',
    color: '#eab308',
    textColor: 'text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-300 dark:border-amber-700',
    bgLight: 'bg-amber-50 dark:bg-amber-950/40',
    defaultRepeat: false,
    hint: 'Supermercado, farmácia, lazer, delivery e combustível.',
  },
};

export const TRANSACTION_CATEGORIES: CategoryMeta[] = [
  CATEGORY_DEFINITIONS[BudgetCategory.Renda],
  CATEGORY_DEFINITIONS[ExpenseCategory.Cartoes],
  CATEGORY_DEFINITIONS[ExpenseCategory.Fixas],
  CATEGORY_DEFINITIONS[ExpenseCategory.Vars],
];
