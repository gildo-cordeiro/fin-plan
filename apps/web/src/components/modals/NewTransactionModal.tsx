import { useState, useEffect } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Modal } from '../ui/Modal';
import { TRANSACTION_CATEGORIES } from '../../constants/categories';
import type { ExpenseCategoryKey } from '../../types/budget';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMonthId: string;
  defaultCategory?: ExpenseCategoryKey | 'renda';
}

const SUGGESTIONS: Record<string, string[]> = {
  renda: ['Salário Mensal', 'Adiantamento', 'Freelance / Extra', 'Rendimentos'],
  cartoes: ['Fatura Nubank', 'Fatura Itaú', 'Fatura Santander', 'Fatura Inter'],
  fixas: [
    'Aluguel',
    'Condomínio',
    'Energia Elétrica',
    'Internet Fibra',
    'Água / Saneamento',
    'Academia',
    'Plano de Saúde',
    'Celular',
    'Streaming',
  ],
  vars: [
    'Supermercado',
    'Restaurantes & Delivery',
    'Farmácia',
    'Combustível / Uber',
    'Lazer & Passeios',
    'Padaria & Cafés',
  ],
};

export const NewTransactionModal = ({
  isOpen,
  onClose,
  defaultMonthId,
  defaultCategory = 'fixas',
}: NewTransactionModalProps) => {
  const { addTransaction, state } = useBudget();

  const [category, setCategory] = useState<ExpenseCategoryKey | 'renda'>(defaultCategory);
  const [name, setName] = useState('');
  const [value, setValue] = useState(0);
  const [monthId, setMonthId] = useState(defaultMonthId);
  const [repeatForward, setRepeatForward] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setCategory(defaultCategory);
      setMonthId(defaultMonthId);
      setName('');
      setValue(0);
      const catConfig = TRANSACTION_CATEGORIES.find((c) => c.key === defaultCategory);
      setRepeatForward(catConfig ? catConfig.defaultRepeat : true);
    }
  }, [isOpen, defaultCategory, defaultMonthId]);

  const handleCategorySelect = (key: ExpenseCategoryKey | 'renda') => {
    setCategory(key);
    const catConfig = TRANSACTION_CATEGORIES.find((c) => c.key === key);
    if (catConfig) {
      setRepeatForward(catConfig.defaultRepeat);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() && value <= 0) return;

    addTransaction({
      category,
      name: name.trim() || 'Nova Conta',
      value,
      monthId,
      repeatForward,
    });

    onClose();
  };

  const currentMonth = state.months.find((m) => m.id === monthId);
  const suggestions = SUGGESTIONS[category] || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Lançamento"
      subtitle="Adicione uma receita, cartão ou despesa ao seu orçamento."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
            Tipo de Lançamento
          </label>
          <div className="grid grid-cols-2 gap-2">
            {TRANSACTION_CATEGORIES.map((cat) => {
              const isSelected = category === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => handleCategorySelect(cat.key)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left text-xs font-medium transition-all ${
                    isSelected
                      ? `${cat.bgLight} border-2 shadow-xs font-semibold`
                      : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/80 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="text-base">{cat.icon}</span>
                  <span className={isSelected ? cat.textColor : ''}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Descrição / Nome da Conta
          </label>
          <input
            type="text"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Aluguel, Supermercado, Salário..."
            className="w-full text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e6b7a] dark:focus:ring-[#4ec2d3]"
          />
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {suggestions.map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => setName(sug)}
                  className="text-[11px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-[#0e6b7a]/10 hover:text-[#0e6b7a] dark:hover:text-[#4ec2d3] text-slate-600 dark:text-slate-400 transition-colors"
                >
                  + {sug}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Valor (R$)
          </label>
          <div className="text-base font-semibold">
            <CurrencyInput
              value={value}
              onChange={setValue}
              placeholder="0,00"
              className="py-1 px-3 text-base"
              ariaLabel="Valor do lançamento"
            />
          </div>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400 font-medium">Mês de Lançamento:</span>
            <select
              value={monthId}
              onChange={(e) => setMonthId(e.target.value)}
              className="text-xs font-semibold bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg px-2.5 py-1 text-slate-800 dark:text-slate-200"
            >
              {state.months.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={repeatForward}
              onChange={(e) => setRepeatForward(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-[#0e6b7a] shrink-0 cursor-pointer"
            />
            <span className="text-slate-600 dark:text-slate-300">
              <strong>Repetir automaticamente</strong> para os meses seguintes a partir de{' '}
              {currentMonth?.shortName}.
              <span className="block text-[10px] text-slate-400 mt-0.5">
                Ideal para contas fixas ou estimativas que se mantêm todo mês.
              </span>
            </span>
          </label>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white shadow-sm transition-all"
          >
            Salvar Lançamento
          </button>
        </div>
      </form>
    </Modal>
  );
};
