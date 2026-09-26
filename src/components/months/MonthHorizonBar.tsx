import { useState, FormEvent } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { MONTH_NAMES } from '../../utils/formatters';

export const MonthHorizonBar = () => {
  const {
    state,
    addNextMonth,
    removeMonth,
    setHorizonCount,
    setCustomHorizon,
  } = useBudget();

  const [isCustomOpen, setIsCustomOpen] = useState(false);
  const firstMonth = state.months[0];
  const lastMonth = state.months[state.months.length - 1];

  const [customStartYear, setCustomStartYear] = useState<number>(firstMonth?.year || new Date().getFullYear());
  const [customStartMonth, setCustomStartMonth] = useState<number>(firstMonth?.monthIndex || 0);
  const [customCount, setCustomCount] = useState<number>(state.months.length);

  const presets = [
    { label: '3M', count: 3, fullLabel: '3 Meses' },
    { label: '6M', count: 6, fullLabel: '6 Meses' },
    { label: '12M', count: 12, fullLabel: '12 Meses (1 ano)' },
    { label: '24M', count: 24, fullLabel: '24 Meses (2 anos)' },
  ];

  const handleApplyCustom = (e: FormEvent) => {
    e.preventDefault();
    setCustomHorizon(customStartYear, customStartMonth, Math.max(1, Math.min(60, customCount)));
    setIsCustomOpen(false);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
      <div className="flex items-center gap-2">
        <span className="text-slate-400 font-medium">Horizonte:</span>
        <strong className="text-slate-800 dark:text-slate-100">
          {firstMonth?.shortName} → {lastMonth?.shortName}
        </strong>
        <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold text-[11px]">
          {state.months.length} {state.months.length === 1 ? 'mês' : 'meses'}
        </span>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
          {presets.map((p) => {
            const isActive = state.months.length === p.count;
            return (
              <button
                key={p.count}
                type="button"
                onClick={() => setHorizonCount(p.count)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0e6b7a] text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
                title={p.fullLabel}
                aria-label={`Visualizar horizonte de ${p.fullLabel}`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={addNextMonth}
            className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
            title="Adicionar próximo mês mantendo os valores repetidos"
            aria-label="Adicionar próximo mês ao horizonte"
          >
            + Mês
          </button>

          {state.months.length > 2 && (
            <button
              type="button"
              onClick={() => removeMonth(lastMonth.id)}
              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              title="Remover último mês do horizonte"
              aria-label="Remover último mês do horizonte"
            >
              - Mês
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setCustomStartYear(firstMonth.year);
              setCustomStartMonth(firstMonth.monthIndex);
              setCustomCount(state.months.length);
              setIsCustomOpen(true);
            }}
            className="px-2.5 py-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
            title="Definir mês inicial e quantidade personalizada"
            aria-label="Personalizar período de meses"
          >
            <span>⚙️</span>
            <span>Personalizar</span>
          </button>
        </div>
      </div>

      {isCustomOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 mb-1">
              Personalizar Período
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
              Defina o mês de início e quantos meses deseja planejar.
            </p>

            <form onSubmit={handleApplyCustom} className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Mês Inicial
                  </label>
                  <select
                    value={customStartMonth}
                    onChange={(e) => setCustomStartMonth(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-slate-800 dark:text-slate-200"
                  >
                    {MONTH_NAMES.map((name, idx) => (
                      <option key={idx} value={idx}>{name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                    Ano Inicial
                  </label>
                  <input
                    type="number"
                    min="2020"
                    max="2050"
                    value={customStartYear}
                    onChange={(e) => setCustomStartYear(Number(e.target.value))}
                    className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded p-1.5 text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Quantidade de Meses: <strong>{customCount}</strong>
                </label>
                <input
                  type="range"
                  min="1"
                  max="36"
                  value={customCount}
                  onChange={(e) => setCustomCount(Number(e.target.value))}
                  className="w-full accent-[#0e6b7a] h-1.5 bg-slate-200 dark:bg-slate-700 rounded cursor-pointer"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCustomOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 dark:text-slate-400"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 text-xs font-semibold bg-[#0e6b7a] text-white rounded hover:opacity-90"
                >
                  Aplicar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
