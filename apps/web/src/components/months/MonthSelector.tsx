import { useState } from 'react';
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
  const { state, availableYears, selectYear, createYear } = useBudget();
  const { months, currentYear } = state;

  const [isCreatingYear, setIsCreatingYear] = useState(false);
  const [newYearInput, setNewYearInput] = useState(currentYear + 1);

  const currentIdx = months.findIndex((m) => m.id === activeMonthId);
  const canPrev = currentIdx > 0;
  const canNext = currentIdx < months.length - 1;

  const yearList = availableYears.map((y) => y.year);
  if (!yearList.includes(currentYear)) {
    yearList.push(currentYear);
  }
  yearList.sort((a, b) => a - b);

  const handleYearChange = async (y: number) => {
    if (y === currentYear) return;
    await selectYear(y);
    onMonthChange(`${y}-01`);
  };

  const handleCreateYear = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newYearInput < 2000 || newYearInput > 2100) return;
    await createYear(newYearInput);
    setIsCreatingYear(false);
    onMonthChange(`${newYearInput}-01`);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 shadow-xs">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Seletor de Ano (BudgetYear) */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          <span className="text-[11px] font-semibold text-slate-400">Ano:</span>
          <select
            value={currentYear}
            onChange={(e) => handleYearChange(Number(e.target.value))}
            aria-label="Selecionar ano orçamentário"
            className="text-xs font-bold text-[#0e6b7a] dark:text-[#4ec2d3] bg-transparent outline-none cursor-pointer py-1"
          >
            {yearList.map((y) => (
              <option key={y} value={y} className="text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
                {y}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setIsCreatingYear(true)}
            title="Criar novo ano orçamentário"
            className="text-xs text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-1 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            +
          </button>
        </div>

        {/* Navegação de Mês */}
        <div className="flex items-center gap-1">
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
      </div>

      <div className="flex items-center gap-2 pr-1">
        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
          Mês {currentIdx >= 0 ? currentIdx + 1 : 1} de {months.length} ({currentYear})
        </span>
      </div>

      {isCreatingYear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 max-w-xs w-full shadow-xl space-y-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Novo Ano Orçamentário
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Digite o ano desejado para criar o orçamento:
            </p>
            <form onSubmit={handleCreateYear} className="space-y-3">
              <input
                type="number"
                min="2020"
                max="2050"
                value={newYearInput}
                onChange={(e) => setNewYearInput(Number(e.target.value))}
                className="w-full text-sm font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-slate-800 dark:text-slate-200 outline-none focus:border-[#0e6b7a]"
              />
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingYear(false)}
                  className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold rounded-xl bg-[#0e6b7a] text-white hover:bg-[#09525e]"
                >
                  Criar Ano
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
