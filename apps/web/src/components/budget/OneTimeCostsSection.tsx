import { useBudget } from '../../context/BudgetContext';
import { useToast } from '../../context/ToastContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../utils/formatters';

export const OneTimeCostsSection = () => {
  const { showToast } = useToast();
  const {
    state,
    addOneTimeCost,
    removeOneTimeCost,
    restoreOneTimeCost,
    updateOneTimeCost,
    updateOneTimeValue,
    updateOneTimeTargetMonth,
    setAllOneTimeTargetMonth,
    updateGoal,
  } = useBudget();

  const { simulation, goals, months } = state;
  const items = state.oneTimeCosts || [];

  const rawTotal = items
    .filter((i) => !i.off)
    .reduce((acc, item) => acc + (item.value || 0), 0);

  const marginFactor = 1 + simulation.oneTimeMarginPercent / 100;
  const totalWithMargin = rawTotal * marginFactor;

  const assignedMonths = items.map((i) => i.targetMonthId).filter(Boolean);
  const commonMonthId =
    assignedMonths.length > 0 && assignedMonths.every((m) => m === assignedMonths[0])
      ? assignedMonths[0]
      : '';

  const mudGoal = goals.find(
    (g) =>
      g.name.toLowerCase().includes('mudan') ||
      g.icon === '🏠' ||
      g.icon === '🚚'
  );

  const mudSaved = mudGoal
    ? mudGoal.contributions.reduce((acc, c) => acc + c.amount, 0)
    : 0;

  const handleSyncWithGoal = () => {
    if (mudGoal) {
      updateGoal(mudGoal.id, { targetAmount: Math.round(totalWithMargin) });
    }
  };

  const handleGlobalMonthChange = (monthId: string) => {
    setAllOneTimeTargetMonth(monthId || undefined);
  };

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚚</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Custos Pontuais e Projetos Especiais
            </h2>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Ao contrário das contas mensais recorrentes, estes são gastos únicos (ex: mudança, caução, reforma, viagem).
          </p>
        </div>

        <button
          type="button"
          onClick={() => addOneTimeCost({ name: 'Novo Custo Pontual', value: 0 })}
          className="text-xs px-3 py-1.5 rounded-xl border border-[#0e6b7a]/40 bg-[#0e6b7a]/5 text-[#0e6b7a] dark:text-[#4ec2d3] hover:bg-[#0e6b7a]/15 font-semibold transition-colors cursor-pointer"
        >
          + Adicionar Custo
        </button>
      </div>

      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent dark:from-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📅</span>
            <div>
              <strong className="text-slate-900 dark:text-slate-100 text-sm font-bold block">
                Agendamento Global do Evento
              </strong>
              <span className="text-slate-500 dark:text-slate-400">
                Vincule os custos pontuais a um mês específico (ex: <strong>Dezembro</strong>) para debitar no orçamento e refletir nos gráficos.
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={commonMonthId}
              onChange={(e) => handleGlobalMonthChange(e.target.value)}
              aria-label="Mês previsto para o evento"
              className="text-xs font-bold bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 text-purple-900 dark:text-purple-200 outline-none cursor-pointer shadow-xs focus:ring-2 focus:ring-purple-500 transition-all"
            >
              <option value="">Sem mês fixo (deduzir no saldo final)</option>
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  Agendar para {m.name}
                </option>
              ))}
            </select>

            {commonMonthId && (
              <button
                type="button"
                onClick={() => {
                  handleGlobalMonthChange(commonMonthId);
                  showToast(`Mês ${months.find((m) => m.id === commonMonthId)?.name} aplicado a todos os custos!`);
                }}
                className="px-2.5 py-2 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                title="Garante que todos os itens da lista abaixo fiquem agendados para este mês"
              >
                Aplicar a todos os itens
              </button>
            )}
          </div>
        </div>

        {commonMonthId ? (
          <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium pl-8 flex items-center gap-1.5">
            <span>✓</span>
            <span>
              Todos os custos pontuais estão interligados com <strong>{months.find(m => m.id === commonMonthId)?.name}</strong>. Eles aparecem debitados na aba do mês correspondente e no gráfico anual!
            </span>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 dark:text-slate-400 font-medium pl-8">
            ℹ️ Você também pode definir o mês de pagamento individualmente em cada item da tabela abaixo.
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/70 dark:border-slate-700/60 text-xs">
        <div>
          <span className="text-slate-400 block mb-0.5">Custo Total dos Itens:</span>
          <strong className="font-mono text-slate-800 dark:text-slate-100 text-sm">
            {formatBRL(rawTotal)}
          </strong>
        </div>

        <div>
          <span className="text-slate-400 block mb-0.5">
            Com Margem de Imprevistos (+{simulation.oneTimeMarginPercent}%):
          </span>
          <strong className="font-mono text-purple-700 dark:text-purple-300 text-sm">
            {formatBRL(totalWithMargin)}
          </strong>
        </div>

        {mudGoal ? (
          <div>
            <span className="text-slate-400 block mb-0.5">Já guardado na Meta:</span>
            <div className="flex items-center gap-2">
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                {formatBRL(mudSaved)}
              </strong>
              {mudGoal.targetAmount !== Math.round(totalWithMargin) && (
                <button
                  type="button"
                  onClick={handleSyncWithGoal}
                  className="text-[10px] font-bold text-[#0e6b7a] dark:text-[#4ec2d3] underline cursor-pointer"
                  title="Atualiza o valor alvo da meta com o total calculado aqui"
                >
                  Sincronizar meta
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <span className="text-slate-400 block mb-0.5">Status de Poupança:</span>
            <span className="text-slate-500">Crie uma meta acima para acompanhar.</span>
          </div>
        )}
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 pt-1">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex flex-wrap sm:flex-nowrap items-center gap-2 py-2 px-1 rounded-xl transition-colors ${
              item.off ? 'opacity-40' : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/30'
            }`}
          >
            <input
              type="checkbox"
              checked={!item.off}
              onChange={() => updateOneTimeCost(item.id, { off: !item.off })}
              className="w-4 h-4 rounded accent-[#0e6b7a] cursor-pointer shrink-0"
              title={item.off ? 'Incluir no orçamento' : 'Desconsiderar'}
            />

            <input
              type="text"
              value={item.name}
              onChange={(e) => updateOneTimeCost(item.id, { name: e.target.value })}
              disabled={item.off}
              placeholder="Nome do custo (ex: Caminhão de mudança, Caução, Pintura)"
              className="flex-1 min-w-[160px] text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#0e6b7a] outline-none py-0.5 px-1 truncate"
            />

            <div className="shrink-0">
              <select
                value={item.targetMonthId || ''}
                onChange={(e) => updateOneTimeTargetMonth(item.id, e.target.value || undefined)}
                disabled={item.off}
                className="text-[11px] font-medium bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-slate-700 dark:text-slate-300 cursor-pointer outline-none"
                title="Mês em que este gasto será pago"
              >
                <option value="">Sem mês fixo</option>
                {months.map((m) => (
                  <option key={m.id} value={m.id}>
                    Pagar em {m.shortName}
                  </option>
                ))}
              </select>
            </div>

            <div className="w-28 sm:w-32 shrink-0">
              <CurrencyInput
                value={item.value || 0}
                onChange={(val) => updateOneTimeValue(item.id, val)}
                disabled={item.off}
                ariaLabel={`Valor de ${item.name}`}
              />
            </div>

            <button
              type="button"
              onClick={() => {
                const removed = removeOneTimeCost(item.id);
                if (removed) {
                  showToast(`Custo "${removed.name}" removido`, {
                    action: {
                      label: 'Desfazer',
                      onClick: () => restoreOneTimeCost(removed),
                    },
                  });
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shrink-0 transition-colors cursor-pointer"
              title="Remover custo"
              aria-label={`Remover ${item.name}`}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
