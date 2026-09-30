import { useBudget } from '../../hooks/useBudget';
import { useBudgetStore } from '../../store/useBudgetStore';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../lib/format';
import { useSimulationMetrics } from '../../hooks/useSimulationMetrics';

export const SimulationPanel = () => {
  const { state, metrics, updateBudgetBalances } = useBudget();
  const simulation = useBudgetStore(s => s.simulation);
  const updateSimulation = useBudgetStore(s => s.updateSimulation);

  const simulationMetrics = useSimulationMetrics();
  const {
    isSimActive,
    initialBalance,
    emergencyReserve,
    avgMonthlyRawVars,
    avgMonthlySimVars,
    diffMonthlyVars,
    rawOneTimeTotal,
    simOneTimeTotal,
    diffOneTime,
    currentFinal,
    finalDiff,
    willHaveDeficit,
    willInvadeReserve
  } = simulationMetrics;

  const monthsCount = state.months.length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🔮</span>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100">
              Simulador de Cenários ("E se...")
            </h3>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Mova os controles abaixo para simular imprevistos em tempo real sem alterar suas contas cadastradas.
          </p>
        </div>

        {isSimActive && (
          <button
            type="button"
            onClick={() =>
              updateSimulation({ varsPercent: 0, oneTimeMarginPercent: 0 })
            }
            aria-label="Zerar todas as simulações e voltar aos valores originais"
            className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 font-semibold transition-colors cursor-pointer"
          >
            ✕ Zerar Simulações
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Variação dos Gastos Variáveis:
            </span>
            <strong
              className={`font-mono text-sm ${
                simulation.varsPercent > 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : simulation.varsPercent < 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              {simulation.varsPercent > 0 ? '+' : ''}
              {simulation.varsPercent}%
            </strong>
          </div>

          <input
            type="range"
            min="-50"
            max="100"
            step="5"
            value={simulation.varsPercent}
            onChange={(e) =>
              updateSimulation({ varsPercent: Number(e.target.value) })
            }
            aria-label="Porcentagem de variação dos gastos variáveis"
            className="w-full accent-[#0e6b7a] cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-400">
            <span>-50% (Economia)</span>
            <span>0%</span>
            <span>+100% (Dobro)</span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] space-y-0.5">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Média mensal atual:</span>
              <strong className="font-mono text-slate-700 dark:text-slate-300">
                {formatBRL(avgMonthlyRawVars)}
              </strong>
            </div>
            {simulation.varsPercent !== 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Com simulação:</span>
                <strong
                  className={`font-mono font-bold ${
                    diffMonthlyVars > 0
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  {formatBRL(avgMonthlySimVars)} ({diffMonthlyVars > 0 ? '+' : ''}
                  {formatBRL(diffMonthlyVars)}/mês)
                </strong>
              </div>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Margem nos Custos Pontuais:
            </span>
            <strong
              className={`font-mono text-sm ${
                simulation.oneTimeMarginPercent > 0
                  ? 'text-purple-600 dark:text-purple-400'
                  : 'text-slate-700 dark:text-slate-300'
              }`}
            >
              +{simulation.oneTimeMarginPercent}%
            </strong>
          </div>

          <input
            type="range"
            min="0"
            max="50"
            step="5"
            value={simulation.oneTimeMarginPercent}
            onChange={(e) =>
              updateSimulation({ oneTimeMarginPercent: Number(e.target.value) })
            }
            aria-label="Porcentagem de margem nos custos pontuais"
            className="w-full accent-purple-600 cursor-pointer"
          />

          <div className="flex justify-between text-[11px] text-slate-400">
            <span>0% (Sem margem)</span>
            <span>+25%</span>
            <span>+50% (Margem alta)</span>
          </div>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-[11px] space-y-0.5">
            <div className="flex justify-between text-slate-500 dark:text-slate-400">
              <span>Custos pontuais totais:</span>
              <strong className="font-mono text-slate-700 dark:text-slate-300">
                {formatBRL(rawOneTimeTotal)}
              </strong>
            </div>
            {simulation.oneTimeMarginPercent > 0 && (
              <div className="flex justify-between text-slate-500 dark:text-slate-400">
                <span>Com margem:</span>
                <strong className="font-mono text-purple-600 dark:text-purple-400 font-bold">
                  {formatBRL(simOneTimeTotal)} (+{formatBRL(diffOneTime)})
                </strong>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-700/60">
        <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
          Impacto Geral no Fluxo de Caixa ({monthsCount} Meses)
        </span>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Saldo Inicial em Conta:</span>
            <strong className="font-mono text-slate-800 dark:text-slate-200 text-sm">
              {formatBRL(initialBalance)}
            </strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Reserva de Emergência:</span>
            <strong className="font-mono text-teal-700 dark:text-teal-400 text-sm">
              {formatBRL(emergencyReserve)}
            </strong>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Menor Saldo Previsto:</span>
            <strong
              className={`font-mono text-sm font-bold ${
                metrics.minAccumulatedBalance < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-emerald-600 dark:text-emerald-400'
              }`}
            >
              {formatBRL(metrics.minAccumulatedBalance)}
            </strong>
            <span className="text-[10px] text-slate-400 block">
              em {metrics.minAccumulatedMonth}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Saldo Final do Período:</span>
            <strong
              className={`font-mono text-sm font-bold ${
                currentFinal < 0
                  ? 'text-rose-600 dark:text-rose-400'
                  : 'text-[#0e6b7a] dark:text-[#4ec2d3]'
              }`}
            >
              {formatBRL(currentFinal)}
            </strong>
            {isSimActive && finalDiff !== 0 ? (
              <span
                className={`text-[10px] font-bold block ${
                  finalDiff > 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                }`}
              >
                {finalDiff > 0 ? '+' : ''}
                {formatBRL(finalDiff)} no saldo final
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 block">
                Base original em {monthsCount} meses
              </span>
            )}
          </div>
        </div>

        <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
          {!isSimActive ? (
            metrics.minAccumulatedBalance < 0 ? (
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold">
                <span>🔴</span>
                <span>
                  <strong>Atenção (Orçamento Base):</strong> Suas contas originais ficam negativas em{' '}
                  <strong>{formatBRL(metrics.minAccumulatedBalance)}</strong> em {metrics.minAccumulatedMonth}.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
                <span>🟢</span>
                <span>
                  <strong>Cenário Base Saudável:</strong> Suas contas fecham no positivo em todos os meses (menor saldo: <strong>{formatBRL(metrics.minAccumulatedBalance)}</strong> em {metrics.minAccumulatedMonth}).
                </span>
              </div>
            )
          ) : willHaveDeficit ? (
            <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 font-semibold">
              <span>🔴</span>
              <span>
                <strong>Atenção:</strong> Neste cenário simulado, seu saldo ficará negativo em{' '}
                <strong>{formatBRL(metrics.minAccumulatedBalance)}</strong> em {metrics.minAccumulatedMonth}.
              </span>
            </div>
          ) : willInvadeReserve ? (
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-semibold">
              <span>🟡</span>
              <span>
                <strong>Aviso:</strong> A simulação aumenta seus gastos e exigirá uso de parte da sua Reserva de Emergência (menor saldo previsto: <strong>{formatBRL(metrics.minAccumulatedBalance)}</strong>).
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 font-semibold">
              <span>🟢</span>
              <span>
                <strong>Cenário Saudável:</strong> Suas contas continuam fechando com saldo positivo ao longo de todo o período, mesmo com esta simulação!
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Saldo disponível hoje (R$)
          </label>
          <CurrencyInput
            value={initialBalance}
            onChange={(val) => updateBudgetBalances({ initialBalance: val })}
            ariaLabel="Saldo disponível hoje"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reserva que não quer tocar (R$)
          </label>
          <CurrencyInput
            value={emergencyReserve}
            onChange={(val) => updateBudgetBalances({ emergencyReserveTarget: val })}
            ariaLabel="Reserva de emergência"
          />
        </div>
      </div>
    </div>
  );
};
