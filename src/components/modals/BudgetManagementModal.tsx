import { useState, useEffect } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { useToast } from '../../context/ToastContext';
import { Modal } from '../ui/Modal';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../utils/formatters';
import { CATEGORY_DEFINITIONS } from '../../constants/categories';
import type { ExpenseCategoryKey } from '../../constants/enums';
import type { BudgetItem } from '../../types/budget';

interface BudgetManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultCategory?: ExpenseCategoryKey | 'renda';
  monthId: string;
}

const TABS: Array<{ key: ExpenseCategoryKey | 'renda'; label: string; icon: string }> = [
  { key: 'renda',   label: 'Renda & Entradas', icon: '💰' },
  { key: 'cartoes', label: 'Cartões',          icon: '💳' },
  { key: 'fixas',   label: 'Despesas Fixas',   icon: '🏠' },
  { key: 'vars',    label: 'Variáveis',        icon: '🛒' },
];

const SUGGESTIONS: Record<string, string[]> = {
  renda: ['Salário', 'Adiantamento', 'Freelance / Extra', 'Rendimentos'],
  cartoes: ['Fatura Nubank', 'Fatura Itaú', 'Fatura Santander', 'Fatura Inter'],
  fixas: ['Aluguel', 'Condomínio', 'Energia Elétrica', 'Internet Fibra', 'Água', 'Academia', 'Plano de Saúde', 'Celular'],
  vars: ['Supermercado', 'Restaurantes & Delivery', 'Farmácia', 'Combustível / Uber', 'Lazer & Passeios'],
};

export const BudgetManagementModal = ({
  isOpen,
  onClose,
  defaultCategory = 'renda',
  monthId,
}: BudgetManagementModalProps) => {
  const { showToast } = useToast();
  const {
    state,
    monthlySummaries,
    addTransaction,
    removeItem,
    restoreItem,
    updateItemName,
    toggleItemActive,
    updateItemValue,
    repeatValueForward,
  } = useBudget();

  const [activeTab, setActiveTab] = useState<ExpenseCategoryKey | 'renda'>(defaultCategory);
  const [selectedMonthId, setSelectedMonthId] = useState(monthId);
  const [newItemName, setNewItemName] = useState('');
  const [newItemValue, setNewItemValue] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultCategory);
      setSelectedMonthId(monthId);
      setNewItemName('');
      setNewItemValue(0);
    }
  }, [isOpen, defaultCategory, monthId]);

  const currentMonth = state.months.find((m) => m.id === selectedMonthId) || state.months[0];
  const summary = monthlySummaries.find((s) => s.month.id === selectedMonthId);

  if (!currentMonth) return null;

  const currentItems: BudgetItem[] =
    activeTab === 'renda'
      ? state.incomes
      : state.lists[activeTab as ExpenseCategoryKey] || [];

  const categoryTotal = currentItems
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values[selectedMonthId] ?? 0), 0);

  const handleAddNewItem = (nameToAdd?: string) => {
    const finalName = (nameToAdd || newItemName).trim();
    if (!finalName) return;

    const shouldRepeat = activeTab === 'fixas' || activeTab === 'renda';

    addTransaction({
      category: activeTab,
      name: finalName,
      value: newItemValue,
      monthId: selectedMonthId,
      repeatForward: shouldRepeat,
    });

    setNewItemName('');
    setNewItemValue(0);
    showToast(`"${finalName}" adicionado em ${CATEGORY_DEFINITIONS[activeTab].label}`);
  };

  const handleRemove = (item: BudgetItem) => {
    const removed = removeItem(activeTab, item.id);
    if (removed) {
      showToast(`"${removed.name}" removido`, {
        action: {
          label: 'Desfazer',
          onClick: () => restoreItem(activeTab, removed),
        },
      });
    }
  };

  const handleRepeatForward = (item: BudgetItem) => {
    repeatValueForward(activeTab, item.id, selectedMonthId);
    showToast(`Valor de "${item.name}" repetido para os meses seguintes.`);
  };

  const activeDef = CATEGORY_DEFINITIONS[activeTab];
  const suggestions = SUGGESTIONS[activeTab] || [];
  const existingNames = new Set(currentItems.map((i) => i.name.toLowerCase()));
  const filteredSuggestions = suggestions.filter((s) => !existingNames.has(s.toLowerCase()));

  const monthBalance = summary?.monthBalance ?? 0;
  const isBlue = monthBalance >= 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex flex-wrap items-center justify-between gap-2 pr-6">
          <div className="flex items-center gap-2">
            <span>⚙️</span>
            <span>Central de Orçamento: Renda & Despesas</span>
          </div>
          <select
            value={selectedMonthId}
            onChange={(e) => setSelectedMonthId(e.target.value)}
            className="text-xs font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 outline-none cursor-pointer"
            aria-label="Mês de edição"
          >
            {state.months.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        </div>
      }
      subtitle={`Configure as receitas e gastos que alimentam os cálculos e projeções de ${currentMonth.name}.`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
          {TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-[#0e6b7a] dark:text-[#4ec2d3] shadow-xs'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <span>{tab.icon}</span>
                <span className="truncate">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between px-1 text-xs">
          <span className="text-slate-500 dark:text-slate-400">
            {activeDef.hint}
          </span>
          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
            Subtotal: <strong className={activeDef.textColor}>{formatBRL(categoryTotal)}</strong>
          </span>
        </div>

        <div className="border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 bg-slate-50/40 dark:bg-slate-950/40 divide-y divide-slate-100 dark:divide-slate-800/80 max-h-[38vh] overflow-y-auto">
          {currentItems.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              Nenhuma conta cadastrada em {activeDef.label} para este mês.
            </div>
          ) : (
            currentItems.map((item) => {
              const val = item.values[selectedMonthId] ?? 0;
              return (
                <div
                  key={item.id}
                  className={`flex items-center gap-2 py-2 px-2 rounded-xl transition-all ${
                    item.off
                      ? 'opacity-40 bg-slate-100/30 dark:bg-slate-900/20'
                      : 'hover:bg-white dark:hover:bg-slate-900/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={!item.off}
                    onChange={() => toggleItemActive(activeTab, item.id)}
                    title={item.off ? 'Ativar no cálculo' : 'Desativar temporariamente'}
                    className="w-4 h-4 rounded accent-[#0e6b7a] cursor-pointer shrink-0"
                  />

                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => updateItemName(activeTab, item.id, e.target.value)}
                    disabled={item.off}
                    placeholder="Nome da conta..."
                    className="flex-1 min-w-0 text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#0e6b7a] outline-none py-1 px-1 truncate"
                  />

                  <div className="w-28 sm:w-32 shrink-0">
                    <CurrencyInput
                      value={val}
                      onChange={(v) => updateItemValue(activeTab, item.id, selectedMonthId, v)}
                      disabled={item.off}
                      ariaLabel={`Valor de ${item.name}`}
                    />
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleRepeatForward(item)}
                      title="Repetir este valor deste mês em diante"
                      aria-label={`Repetir valor de ${item.name} para a frente`}
                      className="px-2 py-1 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                    >
                      ⇥ Repetir
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemove(item)}
                      title="Excluir conta"
                      aria-label={`Excluir ${item.name}`}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-600 dark:text-slate-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs transition-colors"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAddNewItem();
          }}
          className="p-3 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl space-y-2.5"
        >
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
            <span>+ Adicionar Novo em {activeDef.label}</span>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap gap-2">
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              placeholder={`Ex: ${suggestions[0] || 'Nova conta'}`}
              className="flex-1 min-w-[140px] px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0e6b7a]"
            />
            <div className="w-28 shrink-0">
              <CurrencyInput
                value={newItemValue}
                onChange={setNewItemValue}
                debounceMs={0}
                placeholder="R$ 0,00"
                ariaLabel="Valor do novo item"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddNewItem();
                  }
                }}
              />
            </div>
            <button
              type="submit"
              className="px-3.5 py-1.5 text-xs font-bold rounded-xl bg-[#0e6b7a] hover:bg-[#09525e] text-white transition-colors cursor-pointer shrink-0 shadow-xs"
            >
              Adicionar
            </button>
          </div>

          {filteredSuggestions.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-medium">Sugestões rápidas:</span>
              {filteredSuggestions.slice(0, 4).map((sug) => (
                <button
                  key={sug}
                  type="button"
                  onClick={() => handleAddNewItem(sug)}
                  className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-[#0e6b7a]/10 hover:text-[#0e6b7a] dark:hover:text-[#4ec2d3] transition-colors cursor-pointer"
                >
                  + {sug}
                </button>
              ))}
            </div>
          )}
        </form>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Renda Total</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                {formatBRL(summary?.income ?? 0)}
              </strong>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Despesas</span>
              <strong className="font-mono text-rose-600 dark:text-rose-400 text-sm">
                {formatBRL(summary?.totalExpenses ?? 0)}
              </strong>
            </div>
            <div className="pl-2 border-l border-slate-200 dark:border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                {isBlue ? 'Sobra' : 'Déficit'}
              </span>
              <strong
                className={`font-mono text-sm ${
                  isBlue ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {formatBRL(monthBalance)}
              </strong>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-[#0e6b7a] hover:bg-[#09525e] text-white shadow-xs transition-colors cursor-pointer"
          >
            Concluir Edição
          </button>
        </div>
      </div>
    </Modal>
  );
};
