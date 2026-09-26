import { useBudget } from '../../context/BudgetContext';

type ViewMode = 'month' | 'table';

interface MonthSelectorProps {
  activeMonthId: string;
  onMonthChange: (monthId: string) => void;
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
}

export type { ViewMode };

export const MonthSelector = ({
  activeMonthId,
  onMonthChange,
}: MonthSelectorProps) => {
  const { state } = useBudget();
  const { months } = state;

  const currentIdx = months.findIndex((m) => m.id === activeMonthId);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < months.length - 1;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => canPrev && onMonthChange(months[currentIdx - 1].id)}
          disabled={!canPrev}
          aria-label="Mês anterior"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Mês anterior"
        >
          ◀
        </button>

        <select
          value={activeMonthId}
          onChange={(e) => onMonthChange(e.target.value)}
          aria-label="Selecionar mês ativo"
          className="text-sm font-bold text-slate-900 dark:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-2.5 py-1 cursor-pointer outline-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
        >
          {months.map((m) => (
            <option
              key={m.id}
              value={m.id}
              className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
            >
              {m.name}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => canNext && onMonthChange(months[currentIdx + 1].id)}
          disabled={!canNext}
          aria-label="Próximo mês"
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer"
          title="Próximo mês"
        >
          ▶
        </button>
      </div>

      <div className="flex items-center gap-2 pr-1">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
          Mês {currentIdx >= 0 ? currentIdx + 1 : 1} de {months.length}
        </span>
      </div>
    </div>
  );
};
