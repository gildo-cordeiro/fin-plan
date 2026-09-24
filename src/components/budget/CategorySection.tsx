import { useBudget } from '../../context/BudgetContext';
import { useToast } from '../../context/ToastContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../utils/formatters';

interface CategorySectionProps {
  categoryKey: 'cartoes' | 'fixas' | 'vars';
  title: string;
  hint: string;
}

export const CategorySection = ({
  categoryKey,
  title,
  hint,
}: CategorySectionProps) => {
  const { showToast } = useToast();
  const {
    state,
    addItem,
    removeItem,
    restoreItem,
    updateItemName,
    toggleItemActive,
    updateItemValue,
    repeatFirstMonthAcrossAll,
    repeatValueForward,
  } = useBudget();

  const { months, lists, simulation } = state;
  const items = lists[categoryKey];

  const simFactor = categoryKey === 'vars' ? 1 + simulation.varsPercent / 100 : 1;

  // Totais mensais (apenas itens ativos)
  const monthTotals = months.map((m) =>
    items
      .filter((i) => !i.off)
      .reduce((acc, item) => acc + (item.values[m.id] ?? 0) * simFactor, 0)
  );
  const grandTotal = monthTotals.reduce((a, b) => a + b, 0);

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {title}
        </h2>
        <button
          type="button"
          onClick={() => addItem(categoryKey)}
          className="text-xs px-2.5 py-1 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium"
        >
          + Adicionar item
        </button>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
        {hint} Passe o mouse sobre uma célula para repetir daquele mês em diante.
      </p>

      <div className="overflow-x-auto pb-1">
        <table className="text-xs border-collapse" style={{ minWidth: 200 + months.length * 96 }}>
          {/* Header */}
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-medium">
              <th className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-1.5 w-7 text-center"></th>
              <th className="sticky left-7 z-10 bg-white dark:bg-slate-900 py-1.5 pr-2 text-left w-44 min-w-[11rem]">Item</th>
              {months.map((m) => (
                <th key={m.id} className="py-1.5 px-1 text-right w-24 min-w-[6rem]">
                  {m.shortName}
                </th>
              ))}
              <th className="py-1.5 px-2 text-right w-24 font-medium">Total</th>
              <th className="py-1.5 w-7"></th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {items.map((item) => {
              const rowTotal = months.reduce((acc, m) => acc + (item.values[m.id] ?? 0), 0);
              return (
                <tr
                  key={item.id}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-opacity ${item.off ? 'opacity-40' : ''}`}
                >
                  {/* Checkbox — sticky */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-1.5">
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        checked={!item.off}
                        onChange={() => toggleItemActive(categoryKey, item.id)}
                        className="w-3.5 h-3.5 rounded accent-[#0e6b7a] cursor-pointer"
                        title={item.off ? 'Ativar no cálculo' : 'Desativar do cálculo'}
                      />
                    </div>
                  </td>

                  {/* Nome — sticky */}
                  <td className="sticky left-7 z-10 bg-white dark:bg-slate-900 py-1.5 pr-2">
                    <input
                      type="text"
                      value={item.name}
                      onChange={(e) => updateItemName(categoryKey, item.id, e.target.value)}
                      className="w-full text-xs font-medium text-slate-800 dark:text-slate-200 bg-transparent border border-transparent hover:border-slate-200 dark:hover:border-slate-700 rounded px-1.5 py-1 focus:outline-none focus:bg-white dark:focus:bg-slate-800 disabled:cursor-not-allowed"
                      disabled={item.off}
                    />
                  </td>

                  {/* Meses */}
                  {months.map((m, mIdx) => (
                    <td key={m.id} className="py-1.5 px-1">
                      <div className="relative group">
                        <CurrencyInput
                          value={item.values[m.id] ?? 0}
                          onChange={(val) => updateItemValue(categoryKey, item.id, m.id, val)}
                          disabled={item.off}
                          ariaLabel={`${item.name} em ${m.shortName}`}
                        />
                        {/* Botão "repetir a partir daqui" — hover, apenas se não for o último mês */}
                        {!item.off && mIdx < months.length - 1 && (
                          <button
                            type="button"
                            onClick={() => repeatValueForward(categoryKey, item.id, m.id)}
                            title={`Repetir ${m.shortName} em diante`}
                            className="absolute -right-0.5 -top-0.5 hidden group-hover:flex items-center justify-center w-4 h-4 rounded-full bg-[#0e6b7a] text-white text-[9px] leading-none shadow z-10"
                          >
                            →
                          </button>
                        )}
                      </div>
                    </td>
                  ))}

                  {/* Total da linha */}
                  <td className="py-1.5 px-2 text-right font-mono font-semibold text-slate-700 dark:text-slate-300 tabular-nums whitespace-nowrap">
                    {formatBRL(rowTotal)}
                  </td>

                  {/* Ações */}
                  <td className="py-1.5">
                    <div className="flex items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => repeatFirstMonthAcrossAll(categoryKey, item.id)}
                        title="Repetir o 1º mês em todos"
                        aria-label={`Repetir valor do 1º mês de ${item.name} em todos os meses`}
                        className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        ⇥
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const removed = removeItem(categoryKey, item.id);
                          if (removed) {
                            showToast(`Item "${removed.name}" removido`, {
                              action: {
                                label: 'Desfazer',
                                onClick: () => restoreItem(categoryKey, removed),
                              },
                            });
                          }
                        }}
                        title="Remover conta"
                        aria-label={`Remover ${item.name}`}
                        className="px-1.5 py-0.5 text-xs text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>

          {/* Subtotal */}
          <tfoot>
            <tr className="border-t border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200">
              <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 py-2"></td>
              <td className="sticky left-7 z-10 bg-white dark:bg-slate-900 py-2 pr-2">Total {title}</td>
              {monthTotals.map((tot, idx) => (
                <td key={idx} className="py-2 px-1 text-right font-mono tabular-nums">
                  {formatBRL(tot)}
                </td>
              ))}
              <td className="py-2 px-2 text-right font-mono tabular-nums">{formatBRL(grandTotal)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </section>
  );
};
