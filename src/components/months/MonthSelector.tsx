import { useBudget } from '../../context/BudgetContext';

type ViewMode = 'month' | 'table';

interface MonthSelectorProps {
  activeMonthId: string;
  onMonthChange: (monthId: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export type { ViewMode };

export const MonthSelector = ({
  activeMonthId,
  onMonthChange,
  viewMode,
  onViewModeChange,
}: MonthSelectorProps) => {
  const { state } = useBudget();
  const { months } = state;

  const currentIdx = months.findIndex((m) => m.id === activeMonthId);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < months.length - 1;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => canPrev && onMonthChange(months[currentIdx - 1].id)}
          disabled={!canPrev}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          title="Mês anterior"
        >
          ◀
        </button>

        <select
          value={activeMonthId}
          onChange={(e) => onMonthChange(e.target.value)}
          className="text-sm font-bold text-slate-900 dark:text-slate-100 bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg px-2.5 py-1 cursor-pointer outline-none border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
        >
          {months.map((m, idx) => (
            <option
              key={m.id}
              value={m.id}
              className="text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900"
            >
              {m.name} ({idx + 1} de {months.length})
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => canNext && onMonthChange(months[currentIdx + 1].id)}
          disabled={!canNext}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 disabled:opacity-25 disabled:cursor-not-allowed transition-colors"
          title="Próximo mês"
        >
          ▶
        </button>
      </div>

      <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl p-1 gap-1">
        <button
          type="button"
          onClick={() => onViewModeChange('month')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'month'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>📅</span>
          <span>Visão Mensal</span>
        </button>
        <button
          type="button"
          onClick={() => onViewModeChange('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            viewMode === 'table'
              ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          <span>📊</span>
          <span>Planilha Multi-Meses</span>
        </button>
      </div>
    </div>
  );
};
