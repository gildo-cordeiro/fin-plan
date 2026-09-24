import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../utils/formatters';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { CashFlowChart } from '../dashboard/CashFlowChart';
import { MonthlyBarChart } from '../dashboard/MonthlyBarChart';
import { SimulationPanel } from '../simulation/SimulationPanel';
import { NewTransactionModal } from '../modals/NewTransactionModal';
import type { BudgetItem, ExpenseCategoryKey } from '../../types/budget';

interface MonthBudgetViewProps {
  monthId: string;
  onNavigateToGoals?: () => void;
}

export const MonthBudgetView = ({ monthId, onNavigateToGoals }: MonthBudgetViewProps) => {
  const {
    state,
    monthlySummaries,
    removeItem,
    updateItemName,
    toggleItemActive,
    updateItemValue,
  } = useBudget();

  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<ExpenseCategoryKey | 'renda'>('fixas');

  const [showCharts, setShowCharts] = useState(false);
  const [chartMode, setChartMode] = useState<'bar' | 'line'>('bar');
  const [showSim, setShowSim] = useState(false);

  const summary = monthlySummaries.find((s) => s.month.id === monthId);
  const month = state.months.find((m) => m.id === monthId);
  if (!summary || !month) return null;

  // Totais crus das listas no mês selecionado
  const rawIncome = state.incomes
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values[monthId] ?? 0), 0);
  const rawCards = state.lists.cartoes
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values[monthId] ?? 0), 0);
  const rawFixed = state.lists.fixas
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values[monthId] ?? 0), 0);
  const rawVars = state.lists.vars
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values[monthId] ?? 0), 0);

  // Totais simulados / consolidados
  const { income, oneTime, totalExpenses, monthBalance, accumulatedBalance } = summary;
  const savingsRate = income > 0 ? (monthBalance / income) * 100 : 0;
  const isPositive = monthBalance >= 0;

  const monthMudItems = state.lists.mud.filter(
    (item) => !item.off && item.targetMonthId === monthId
  );

  const handleOpenAddModal = (cat: ExpenseCategoryKey | 'renda' = 'fixas') => {
    setModalDefaultCategory(cat);
    setIsNewTxModalOpen(true);
  };

  const renderItems = (
    items: BudgetItem[],
    category: ExpenseCategoryKey | 'renda',
    showCheckbox: boolean
  ) => {
    const canDeleteEach = category !== 'renda' || items.length > 1;

    return (
      <div className="space-y-1 pt-2">
        {items.map((item) => (
          <div
            key={item.id}
            className={`flex items-center gap-2 py-1.5 px-2 rounded-xl transition-all ${
              item.off
                ? 'opacity-40 bg-slate-50/40 dark:bg-slate-800/20'
                : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            {showCheckbox ? (
              <input
                type="checkbox"
                checked={!item.off}
                onChange={() => toggleItemActive(category, item.id)}
                className="w-4 h-4 rounded accent-[#0e6b7a] cursor-pointer shrink-0"
                title={item.off ? 'Ativar no orçamento' : 'Desativar temporariamente'}
              />
            ) : (
              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            )}

            <input
              type="text"
              value={item.name}
              onChange={(e) => updateItemName(category, item.id, e.target.value)}
              disabled={item.off}
              className="flex-1 min-w-0 text-xs sm:text-sm font-medium text-slate-800 dark:text-slate-200 bg-transparent border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-[#0e6b7a] outline-none py-0.5 px-1 truncate"
            />

            <div className="w-28 sm:w-32 shrink-0">
              <CurrencyInput
                value={item.values[monthId] ?? 0}
                onChange={(v) => updateItemValue(category, item.id, monthId, v)}
                disabled={item.off}
                ariaLabel={`${item.name} em ${month.shortName}`}
              />
            </div>

            {canDeleteEach && (
              <button
                type="button"
                onClick={() => removeItem(category, item.id)}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shrink-0 transition-colors"
                title="Remover conta"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <div className="pt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => handleOpenAddModal(category)}
            className="text-xs font-semibold text-[#0e6b7a] dark:text-[#4ec2d3] hover:underline px-2 py-1 rounded-lg hover:bg-[#0e6b7a]/5 transition-colors"
          >
            + Adicionar em {category === 'renda' ? 'Rendas' : category === 'cartoes' ? 'Cartões' : category === 'fixas' ? 'Fixas' : 'Variáveis'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {/* ── Card Hero Principal do Mês ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        {/* Top: Status & Ação Rápida */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                isPositive
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
              }`}
            >
              <span>{isPositive ? '🟢' : '🔴'}</span>
              <span>{isPositive ? 'Orçamento no azul' : 'Déficit previsto'}</span>
            </span>

            {state.simulation.varsPercent !== 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <span>⚡ Simulação: Vars {state.simulation.varsPercent > 0 ? '+' : ''}{state.simulation.varsPercent}%</span>
              </span>
            )}

            <span className="text-xs text-slate-400">em {month.name}</span>
          </div>

          <button
            type="button"
            onClick={() => handleOpenAddModal('fixas')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white shadow-sm hover:shadow transition-all"
          >
            <span>+</span>
            <span>Novo Lançamento</span>
          </button>
        </div>

        {/* 3 Blocos de Valor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Renda */}
          <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400 block mb-0.5">
              Renda Prevista
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-emerald-800 dark:text-emerald-300 tabular-nums">
              {formatBRL(income)}
            </span>
          </div>

          {/* Despesas */}
          <div className="p-3 rounded-xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400 block mb-0.5">
              Total de Despesas
            </span>
            <span className="text-xl sm:text-2xl font-bold font-mono text-rose-800 dark:text-rose-300 tabular-nums">
              {formatBRL(totalExpenses)}
            </span>
            {oneTime > 0 && (
              <span className="text-[10px] text-purple-700 dark:text-purple-300 font-semibold block mt-0.5">
                📦 Inclui {formatBRL(oneTime)} da mudança
              </span>
            )}
          </div>

          {/* Sobra / Saldo */}
          <div
            className={`p-3 rounded-xl border ${
              isPositive
                ? 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                : 'bg-rose-100/50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900'
            }`}
          >
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {isPositive ? 'Sobra do Mês' : 'Déficit do Mês'}
              </span>
              {income > 0 && isPositive && (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                  {savingsRate.toFixed(0)}% poupado
                </span>
              )}
            </div>
            <span
              className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${
                isPositive
                  ? 'text-slate-900 dark:text-slate-100'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatBRL(monthBalance)}
            </span>
          </div>
        </div>

        {/* Callout inteligente sobre metas e sobra */}
        {isPositive && monthBalance > 0 && (
          <div className="p-2.5 rounded-xl bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 flex items-center justify-between text-xs text-teal-800 dark:text-teal-300">
            <span className="flex items-center gap-1.5">
              <span>💡</span>
              <span>
                Você tem <strong>{formatBRL(monthBalance)}</strong> de sobra neste mês.
              </span>
            </span>
            {onNavigateToGoals && (
              <button
                type="button"
                onClick={onNavigateToGoals}
                className="font-bold underline hover:opacity-80 shrink-0"
              >
                Destinar para Metas / Mudança →
              </button>
            )}
          </div>
        )}

        {/* Rodapé: Saldo Acumulado Projetado */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <span>Saldo acumulado em conta até {month.shortName}:</span>
          <strong className="font-mono text-sm text-slate-800 dark:text-slate-200 tabular-nums">
            {formatBRL(accumulatedBalance)}
          </strong>
        </div>
      </div>

      {/* ── Categorias de Despesas e Entradas (Cards Colapsáveis) ── */}
      <div className="space-y-2">
        <CollapsibleSection
          title="Rendas & Entradas"
          icon="💰"
          total={formatBRL(rawIncome)}
          totalColorClass="text-emerald-600 dark:text-emerald-400"
          defaultOpen
        >
          {renderItems(state.incomes, 'renda', false)}
        </CollapsibleSection>

        <CollapsibleSection
          title="Cartões de Crédito"
          icon="💳"
          total={formatBRL(rawCards)}
          totalColorClass="text-orange-600 dark:text-orange-400"
          defaultOpen
        >
          {renderItems(state.lists.cartoes, 'cartoes', true)}
        </CollapsibleSection>

        <CollapsibleSection
          title="Despesas Fixas (Recorrentes)"
          icon="🏠"
          total={formatBRL(rawFixed)}
          totalColorClass="text-blue-600 dark:text-blue-400"
          defaultOpen
        >
          {renderItems(state.lists.fixas, 'fixas', true)}
        </CollapsibleSection>

        <CollapsibleSection
          title={
            state.simulation.varsPercent !== 0
              ? `Despesas Variáveis (Estimativas) — ${state.simulation.varsPercent > 0 ? '+' : ''}${state.simulation.varsPercent}% simulado`
              : 'Despesas Variáveis (Estimativas)'
          }
          icon="🛒"
          total={
            state.simulation.varsPercent !== 0
              ? formatBRL(summary.variable)
              : formatBRL(rawVars)
          }
          totalColorClass={
            state.simulation.varsPercent !== 0
              ? 'text-amber-600 dark:text-amber-400 font-bold'
              : 'text-amber-600 dark:text-amber-400'
          }
          defaultOpen
        >
          {state.simulation.varsPercent !== 0 && (
            <div className="p-2.5 my-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span>
                ⚡ <strong>Simulação ativa ({state.simulation.varsPercent > 0 ? '+' : ''}{state.simulation.varsPercent}%):</strong> Os lançamentos abaixo somam {formatBRL(rawVars)}, mas o simulador está calculando o impacto como <strong>{formatBRL(summary.variable)}</strong> neste mês.
              </span>
            </div>
          )}
          {renderItems(state.lists.vars, 'vars', true)}
        </CollapsibleSection>

        {/* ── CUSTOS DA MUDANÇA AGENDADOS PARA ESTE MÊS (EX: DEZEMBRO) ── */}
        {oneTime > 0 && (
          <CollapsibleSection
            title={`Custos da Mudança / Evento (Neste Mês)`}
            icon="🚚"
            total={formatBRL(oneTime)}
            totalColorClass="text-purple-600 dark:text-purple-400"
            defaultOpen
          >
            <div className="space-y-2 pt-2">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between">
                <span>
                  ✓ Estes custos foram agendados para cair no orçamento deste mês (<strong>{month.name}</strong>).
                </span>
                {onNavigateToGoals && (
                  <button
                    type="button"
                    onClick={onNavigateToGoals}
                    className="font-bold underline hover:opacity-80 shrink-0 ml-2"
                  >
                    Gerenciar na aba Metas →
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {monthMudItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-2 text-xs">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {item.name}
                    </span>
                    <strong className="font-mono text-purple-700 dark:text-purple-300">
                      {formatBRL(item.oneTimeValue || 0)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}
      </div>

      {/* ── Seção Inferior: Gráficos e Simulações (Expandíveis) ── */}
      <div className="pt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {!showCharts ? (
          <button
            type="button"
            onClick={() => setShowCharts(true)}
            className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[#0e6b7a]/50 dark:hover:border-[#4ec2d3]/40 flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>📈</span>
            <span>Ver Gráficos Multi-Meses</span>
          </button>
        ) : (
          <div className="sm:col-span-2 space-y-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setChartMode('bar')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    chartMode === 'bar'
                      ? 'bg-[#0e6b7a] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Renda × Despesas
                </button>
                <button
                  type="button"
                  onClick={() => setChartMode('line')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors ${
                    chartMode === 'line'
                      ? 'bg-[#0e6b7a] text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Evolução do Saldo
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowCharts(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Ocultar ✕
              </button>
            </div>
            {chartMode === 'bar' ? <MonthlyBarChart /> : <CashFlowChart />}
          </div>
        )}

        {!showSim ? (
          <button
            type="button"
            onClick={() => setShowSim(true)}
            className="py-3 px-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:border-[#0e6b7a]/50 dark:hover:border-[#4ec2d3]/40 flex items-center justify-center gap-2 shadow-xs transition-all"
          >
            <span>🔮</span>
            <span>Simulador de Cenários ("E se...")</span>
          </button>
        ) : (
          <div className="sm:col-span-2 space-y-2 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Simulador de Cenários
              </span>
              <button
                type="button"
                onClick={() => setShowSim(false)}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Ocultar ✕
              </button>
            </div>
            <SimulationPanel />
          </div>
        )}
      </div>

      {/* ── Modal de Novo Lançamento ── */}
      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        defaultMonthId={monthId}
        defaultCategory={modalDefaultCategory}
      />
    </div>
  );
};
