import { useBudget } from '../../context/BudgetContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../utils/formatters';

export const SimulationPanel = () => {
  const { state, metrics, updateSimulation } = useBudget();
  const { simulation, lists, incomes, months } = state;

  const isSimActive =
    simulation.varsPercent !== 0 || simulation.oneTimeMarginPercent !== 0;

  const activeVars = lists.vars.filter((i) => !i.off);
  const activeOneTime = (state.oneTimeCosts || []).filter((i) => !i.off);
  const activeIncomes = incomes.filter((i) => !i.off);
  const activeCards = lists.cartoes.filter((i) => !i.off);
  const activeFixed = lists.fixas.filter((i) => !i.off);

  const totalRawVarsAllMonths = months.reduce((acc, m) => {
    return acc + activeVars.reduce((sum, i) => sum + (i.values[m.id] ?? 0), 0);
  }, 0);
  const avgMonthlyRawVars = months.length > 0 ? totalRawVarsAllMonths / months.length : 0;
  const avgMonthlySimVars = avgMonthlyRawVars * (1 + simulation.varsPercent / 100);
  const diffMonthlyVars = avgMonthlySimVars - avgMonthlyRawVars;

  const rawOneTimeTotal = activeOneTime.reduce((acc, i) => acc + (i.value || 0), 0);
  const simOneTimeTotal = rawOneTimeTotal * (1 + simulation.oneTimeMarginPercent / 100);
  const diffOneTime = simOneTimeTotal - rawOneTimeTotal;

  let baseRunning = simulation.initialBalance;
  months.forEach((m) => {
    const inc = activeIncomes.reduce((sum, i) => sum + (i.values[m.id] ?? 0), 0);
    const crd = activeCards.reduce((sum, i) => sum + (i.values[m.id] ?? 0), 0);
    const fix = activeFixed.reduce((sum, i) => sum + (i.values[m.id] ?? 0), 0);
    const vr = activeVars.reduce((sum, i) => sum + (i.values[m.id] ?? 0), 0);
    const oneTimeThisMonth = activeOneTime
      .filter((i) => i.targetMonthId === m.id)
      .reduce((sum, i) => sum + (i.value || 0), 0);

    baseRunning += inc - (crd + fix + vr + oneTimeThisMonth);
  });
  const hasDistributed = activeOneTime.some((i) => i.targetMonthId);
  const baseFinal = hasDistributed ? baseRunning : baseRunning - rawOneTimeTotal;

  const currentFinal = metrics.finalAccumulated;
  const finalDiff = currentFinal - baseFinal;

  const willHaveDeficit = metrics.minAccumulatedBalance < 0;

  // A invasão de reserva só é alertada se houver simulação ativa aumentando gastos
  // e reduzindo o saldo abaixo da reserva pretendida
  const willInvadeReserve =
    isSimActive &&
    !willHaveDeficit &&
    simulation.emergencyReserve > 0 &&
    finalDiff < 0 &&
    (simulation.initialBalance >= simulation.emergencyReserve ||
      metrics.minAccumulatedBalance < simulation.emergencyReserve);

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
            className="text-xs px-2.5 py-1 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 hover:bg-amber-200 font-semibold transition-colors"
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
            min="-40"
            max="50"
            step="5"
            value={simulation.varsPercent}
            onChange={(e) =>
              updateSimulation({ varsPercent: Number(e.target.value) })
            }
            className="w-full accent-[#0e6b7a] h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>-40% (Economizar)</span>
            <span>0% (Original)</span>
            <span>+50% (Gastar mais)</span>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/60 space-y-1.5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-700 dark:text-slate-300 font-medium">
              Margem de Imprevistos em Custos Pontuais:
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
              updateSimulation({
                oneTimeMarginPercent: Number(e.target.value),
              })
            }
            className="w-full accent-[#0e6b7a] h-2 bg-slate-200 dark:bg-slate-700 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>0% (Sem folga)</span>
            <span>+25% (Recomendado)</span>
            <span>+50% (Pior caso)</span>
          </div>
        </div>
      </div>

      <div
        className={`p-4 rounded-2xl border transition-all ${
          isSimActive
            ? 'bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-amber-300 dark:border-amber-800/70'
            : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/60'
        }`}
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200/60 dark:border-slate-700/60">
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
            <span>⚡</span>
            <span>Impacto em Tempo Real no seu Dinheiro</span>
          </span>
          {isSimActive ? (
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60">
              Simulação Aplicada
            </span>
          ) : (
            <span className="text-[11px] text-slate-400">
              Nenhuma simulação ativa (valores originais)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="space-y-0.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              Despesas Variáveis (Média/mês):
            </span>
            <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatBRL(avgMonthlySimVars)}
            </div>
            {simulation.varsPercent !== 0 ? (
              <span
                className={`text-[10px] font-bold block ${
                  diffMonthlyVars > 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {diffMonthlyVars > 0 ? '+' : ''}
                {formatBRL(diffMonthlyVars)} / mês vs original
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 block">
                Valor original cadastrado
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              Custos Pontuais Totais:
            </span>
            <div className="font-mono text-sm font-bold text-slate-800 dark:text-slate-200">
              {formatBRL(simOneTimeTotal)}
            </div>
            {simulation.oneTimeMarginPercent > 0 ? (
              <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 block">
                +{formatBRL(diffOneTime)} de margem de segurança
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 block">
                Sem margem adicional
              </span>
            )}
          </div>

          <div className="space-y-0.5">
            <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
              Saldo Acumulado no Final:
            </span>
            <div
              className={`font-mono text-sm font-bold ${
                currentFinal >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatBRL(currentFinal)}
            </div>
            {isSimActive ? (
              <span
                className={`text-[10px] font-bold block ${
                  finalDiff < 0
                    ? 'text-rose-600 dark:text-rose-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}
              >
                {finalDiff > 0 ? '+' : ''}
                {formatBRL(finalDiff)} no saldo final
              </span>
            ) : (
              <span className="text-[10px] text-slate-400 block">
                Base original em {months.length} meses
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
            value={simulation.initialBalance}
            onChange={(val) => updateSimulation({ initialBalance: val })}
            ariaLabel="Saldo disponível hoje"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reserva que não quer tocar (R$)
          </label>
          <CurrencyInput
            value={simulation.emergencyReserve}
            onChange={(val) => updateSimulation({ emergencyReserve: val })}
            ariaLabel="Reserva de emergência"
          />
        </div>
      </div>
    </div>
  );
};
