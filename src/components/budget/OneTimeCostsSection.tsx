import { useBudget } from '../../context/BudgetContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../utils/formatters';

export const OneTimeCostsSection = () => {
  const {
    state,
    addItem,
    removeItem,
    updateItemName,
    toggleItemActive,
    updateOneTimeValue,
    updateOneTimeTargetMonth,
    setAllOneTimeTargetMonth,
    updateGoal,
  } = useBudget();

  const { lists, simulation, goals, months } = state;
  const items = lists.mud;

  const rawTotal = items
    .filter((i) => !i.off)
    .reduce((acc, item) => acc + (item.oneTimeValue || 0), 0);

  const marginFactor = 1 + simulation.oneTimeMarginPercent / 100;
  const totalWithMargin = rawTotal * marginFactor;

  // Encontrar se a maioria dos itens já tem um mês comum atribuído (ex: Dezembro)
  const assignedMonths = items.map((i) => i.targetMonthId).filter(Boolean);
  const commonMonthId =
    assignedMonths.length > 0 && assignedMonths.every((m) => m === assignedMonths[0])
      ? assignedMonths[0]
      : '';

  // Encontrar meta de mudança se existir
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
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🚚</span>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Orçamento Detalhado da Mudança (Custos Pontuais)
            </h2>
          </div>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
            Ao contrário das contas mensais, estes são os custos específicos para realizar o evento da mudança.
          </p>
        </div>

        <button
          type="button"
          onClick={() => addItem('mud', 'Novo custo da mudança')}
          className="text-xs px-3 py-1.5 rounded-xl border border-[#0e6b7a]/40 bg-[#0e6b7a]/5 text-[#0e6b7a] dark:text-[#4ec2d3] hover:bg-[#0e6b7a]/15 font-semibold transition-colors"
        >
          + Adicionar Custo
        </button>
      </div>

      {/* ── SELETOR CENTRAL: INTERLIGAÇÃO COM O MÊS DA MUDANÇA (EX: DEZEMBRO) ── */}
      <div className="p-3.5 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent dark:from-purple-950/30 border border-purple-200/80 dark:border-purple-900/40 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">📅</span>
            <div>
              <strong className="text-slate-900 dark:text-slate-100 text-sm font-bold block">
                Quando a Mudança vai acontecer?
              </strong>
              <span className="text-slate-500 dark:text-slate-400">
                Selecione o mês da mudança (ex: <strong>Dezembro</strong>) para debitar estes custos no orçamento daquele mês.
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={commonMonthId}
              onChange={(e) => handleGlobalMonthChange(e.target.value)}
              className="text-xs font-bold bg-white dark:bg-slate-800 border-2 border-purple-300 dark:border-purple-700 rounded-xl px-3 py-2 text-purple-900 dark:text-purple-200 outline-none cursor-pointer shadow-xs focus:ring-2 focus:ring-purple-500 transition-all"
            >
              <option value="">Não agendado (deduzir no saldo final)</option>
              {months.map((m) => (
                <option key={m.id} value={m.id}>
                  Agendar para {m.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {commonMonthId && (
          <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium pl-8">
            ✓ Todos os custos da mudança estão interligados com <strong>{months.find(m => m.id === commonMonthId)?.name}</strong>. Quando você abrir o orçamento de {months.find(m => m.id === commonMonthId)?.shortName}, eles aparecerão contabilizados lá!
          </div>
        )}
      </div>

      {/* Card de Resumo do Projeto da Mudança */}
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
            <span className="text-slate-400 block mb-0.5">Já guardado na Meta da Mudança:</span>
            <div className="flex items-center gap-2">
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
                {formatBRL(mudSaved)}
              </strong>
              {mudGoal.targetAmount !== Math.round(totalWithMargin) && (
                <button
                  type="button"
                  onClick={handleSyncWithGoal}
                  className="text-[10px] font-bold text-[#0e6b7a] dark:text-[#4ec2d3] underline"
                  title="Atualiza o valor alvo da meta de mudança com o total calculado aqui"
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

      {/* Lista de Itens com Seletor Individual de Mês */}
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
              onChange={() => toggleItemActive('mud', item.id)}
              className="w-4 h-4 rounded accent-[#0e6b7a] cursor-pointer shrink-0"
              title={item.off ? 'Incluir no orçamento' : 'Desconsiderar'}
            />

            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItemName('mud', item.id, e.target.value)}
              disabled={item.off}
              placeholder="Nome do custo (ex: Caminhão de mudança)"
              className="flex-1 min-w-[160px] text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#0e6b7a] outline-none py-0.5 px-1 truncate"
            />

            {/* Mês previsto para este item */}
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
                value={item.oneTimeValue || 0}
                onChange={(val) => updateOneTimeValue(item.id, val)}
                disabled={item.off}
                ariaLabel={`Valor de ${item.name}`}
              />
            </div>

            <button
              type="button"
              onClick={() => removeItem('mud', item.id)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shrink-0 transition-colors"
              title="Remover custo"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </section>
  );
};
