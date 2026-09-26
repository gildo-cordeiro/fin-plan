import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatBRL } from '../../utils/formatters';
import { EditBalanceModal } from '../modals/EditBalanceModal';

export const StatusBar = () => {
  const { metrics, state, isOnline } = useBudget();
  const [isEditBalanceOpen, setIsEditBalanceOpen] = useState(false);

  const monthCount = state.months.length;
  const avgMonthlyBalance =
    monthCount > 0
      ? (metrics.totalIncome - metrics.totalRegularExpenses) / monthCount
      : 0;

  const activeGoals = state.goals.filter((g) => g.status === 'ativa');
  const totalGoalTarget = activeGoals.reduce((a, g) => a + g.targetAmount, 0);
  const totalGoalSaved = activeGoals.reduce(
    (a, g) => a + g.contributions.reduce((s, c) => s + c.amount, 0),
    0
  );
  const goalPct =
    totalGoalTarget > 0
      ? Math.min(100, (totalGoalSaved / totalGoalTarget) * 100)
      : 0;

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 text-xs py-2 px-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-xs text-slate-500 dark:text-slate-400">
        <button
          type="button"
          onClick={() => setIsEditBalanceOpen(true)}
          className="flex items-center gap-1.5 hover:text-slate-800 dark:hover:text-slate-200 transition-colors group text-left cursor-pointer py-0.5"
          title="Clique para alterar seu saldo atual em conta"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>Saldo em conta hoje:</span>
          <strong className="font-mono text-slate-800 dark:text-slate-200 group-hover:underline">
            {formatBRL(state.simulation.initialBalance)}
          </strong>
          <span className="text-[11px] opacity-60 group-hover:opacity-100 transition-opacity ml-0.5">
            ✏️
          </span>
        </button>

        {!isOnline && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800 animate-pulse">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            <span>Modo Offline (sincronizará ao reconectar)</span>
          </span>
        )}

        <div className="flex items-center gap-3">
          <div>
            <span>Sobra média mensal: </span>
            <strong
              className={`font-mono font-bold ${
                avgMonthlyBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatBRL(avgMonthlyBalance)}
            </strong>
          </div>

          {activeGoals.length > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800">
              <span>🎯 Metas:</span>
              <strong className="font-mono text-[#0e6b7a] dark:text-[#4ec2d3]">
                {goalPct.toFixed(0)}%
              </strong>
            </div>
          )}
        </div>
      </div>

      <EditBalanceModal
        isOpen={isEditBalanceOpen}
        onClose={() => setIsEditBalanceOpen(false)}
      />
    </>
  );
};
