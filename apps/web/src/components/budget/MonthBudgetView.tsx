import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Settings, Plus, Wallet, CreditCard, Home, ShoppingCart, Package, X, Check, Zap } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/Popover';
import { Button } from '../ui/Button';

import { useBudget } from '../../hooks/useBudget';
import { useToast } from '../../context/ToastContext';
import { useBudgetStore } from '../../store/useBudgetStore';
import { MoneyInput } from '../ui/MoneyInput';
import { formatBRL } from '../../lib/format';
import { CollapsibleSection } from '../ui/CollapsibleSection';
import { NewTransactionModal } from '../modals/NewTransactionModal';
import { BudgetManagementModal } from '../modals/BudgetManagementModal';
import type { Item, ExpenseCategoryKey } from '../../types/budget';
import { useCostsQuery } from '../../queries/costs';

interface MonthBudgetViewProps {
  monthId: string;
  onNavigateToGoals?: () => void;
  onNavigateToHorizon?: () => void;
  onNavigateToSimulations?: () => void;

  onMonthChange: (monthId: string) => void;
}

export const MonthBudgetView = ({
  monthId,
  onNavigateToGoals,
  onMonthChange,
}: MonthBudgetViewProps) => {
  const { showToast } = useToast();
  const {
    state,
    monthlySummaries,
    removeItem,
    updateItemName,
    toggleItemActive,
    updateItemValue,
    repeatValueForward,
    confirmEntry,
    unconfirmEntry,
    availableYears,
    selectYear,
  } = useBudget();
  const { months, currentYear } = state;

  const currentIdx = months.findIndex((m) => m.id === monthId);
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
    const targetMonthIndex = currentIdx >= 0 ? months[currentIdx].monthIndex : new Date().getMonth();
    const targetMonthPad = String(targetMonthIndex + 1).padStart(2, '0');
    onMonthChange(`${y}-${targetMonthPad}`);
  };
  const simulation = useBudgetStore((s) => s.simulation);
  const { data: costs = [] } = useCostsQuery(state.currentYear);

  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState(false);
  const [budgetModalCategory, setBudgetModalCategory] = useState<ExpenseCategoryKey | 'renda'>('renda');
  const [isNewTxModalOpen, setIsNewTxModalOpen] = useState(false);
  const [modalDefaultCategory, setModalDefaultCategory] = useState<ExpenseCategoryKey | 'renda'>('fixas');

  const [sessionActiveItemIds, setSessionActiveItemIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    setSessionActiveItemIds(new Set());
  }, [monthId]);

  const summary = monthlySummaries.find((s) => s.month.id === monthId);
  const month = state.months.find((m) => m.id === monthId);
  if (!summary || !month) return null;

  const monthNum = parseInt(monthId.split('-')[1], 10) || (month.monthIndex + 1);

  const isItemActiveInMonth = (item: Item): boolean => {
    const entry = item.entries?.find((e) => e.month === monthNum);
    const plannedVal = entry ? entry.plannedAmount : (item.values?.[monthId] ?? 0);
    const isConfirmed = Boolean(entry?.paidDate);
    const hasActual =
      entry?.actualAmount !== null &&
      entry?.actualAmount !== undefined &&
      entry?.actualAmount > 0;
    return (
      plannedVal > 0 ||
      isConfirmed ||
      hasActual ||
      sessionActiveItemIds.has(item.id)
    );
  };

  const incomeItems = state.items.filter((i) => i.type === 'renda');
  const cardItems = state.items.filter((i) => i.type === 'cartao');
  const fixedItems = state.items.filter((i) => i.type === 'fixa');
  const varItems = state.items.filter((i) => i.type === 'variavel' || (i.type as string) === 'var');

  const activeIncomeItems = incomeItems.filter(isItemActiveInMonth);
  const activeCardItems = cardItems.filter(isItemActiveInMonth);
  const activeFixedItems = fixedItems.filter(isItemActiveInMonth);
  const activeVarItems = varItems.filter(isItemActiveInMonth);

  const rawIncome = incomeItems
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values?.[monthId] ?? 0), 0);
  const rawCards = cardItems
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values?.[monthId] ?? 0), 0);
  const rawFixed = fixedItems
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values?.[monthId] ?? 0), 0);
  const rawVars = varItems
    .filter((i) => !i.off)
    .reduce((acc, i) => acc + (i.values?.[monthId] ?? 0), 0);

  const { income, oneTime, totalExpenses, monthBalance, accumulatedBalance } = summary;
  const savingsRate = income > 0 ? (monthBalance / income) * 100 : 0;
  const isPositive = monthBalance >= 0;

  // Itens de custos pontuais associados a este mês
  const projectCostItems = costs.flatMap((c) =>
    (c.items || [])
      .filter((ci) => (ci.month !== null && ci.month !== undefined ? ci.month === monthNum : c.defaultMonth === monthNum))
      .map((ci) => ({
        id: ci.id,
        name: c.name ? `${c.name} — ${ci.name}` : ci.name,
        value: ci.plannedAmount,
      }))
  );

  const legacyCostItems: any[] = [];

  const monthOneTimeItems = projectCostItems.length > 0 ? projectCostItems : legacyCostItems;

  const handleOpenAddModal = (cat: ExpenseCategoryKey | 'renda' = 'fixas') => {
    setModalDefaultCategory(cat);
    setIsNewTxModalOpen(true);
  };

  const handleOpenBudgetModal = (cat: ExpenseCategoryKey | 'renda' = 'renda') => {
    setBudgetModalCategory(cat);
    setIsBudgetModalOpen(true);
  };

  const renderItems = (
    items: Item[],
    category: ExpenseCategoryKey | 'renda',
    showCheckbox: boolean
  ) => {
    const canDeleteEach = category !== 'renda' || incomeItems.length > 1;

    if (items.length === 0) {
      return (
        <div className="space-y-1 pt-2">
          <p className="text-xs text-slate-400 dark:text-slate-500 py-3 text-center">
            Nenhum lançamento nesta categoria para {month.shortName}.
          </p>
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={() => handleOpenAddModal(category)}
              className="text-xs font-semibold text-[#0e6b7a] dark:text-[#4ec2d3] hover:underline px-2 py-1 rounded-lg hover:bg-[#0e6b7a]/5 transition-colors cursor-pointer"
            >
              + Adicionar em {category === 'renda' ? 'Rendas' : category === 'cartoes' ? 'Cartões' : category === 'fixas' ? 'Fixas' : 'Variáveis'}
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-1 pt-2">
        {items.map((item) => {
          const entry = item.entries?.find((e) => e.month === monthNum);
          const plannedVal = entry ? entry.plannedAmount : (item.values?.[monthId] ?? 0);
          const isConfirmed = Boolean(entry?.paidDate);

          return (
            <div
              key={item.id}
              className={`flex items-center gap-2 py-1.5 px-2 rounded-xl transition-all ${
                item.off
                  ? 'opacity-40 bg-slate-50/40 dark:bg-slate-800/20'
                  : isConfirmed
                  ? 'bg-emerald-50/30 dark:bg-emerald-950/10 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20'
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
                <MoneyInput
                  value={plannedVal}
                  onChange={(v) => {
                    setSessionActiveItemIds((prev) => new Set(prev).add(item.id));
                    updateItemValue(category, item.id, monthId, v);
                  }}
                  disabled={item.off}
                  ariaLabel={`${item.name} em ${month.shortName}`}
                />
              </div>

              {/* Botão de repetir valor para os meses seguintes */}
              <button
                type="button"
                onClick={() => {
                  repeatValueForward(category, item.id, monthId);
                  showToast(`Valor de "${item.name}" repetido para os meses seguintes.`);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-[#0e6b7a] dark:text-slate-600 dark:hover:text-[#4ec2d3] hover:bg-[#0e6b7a]/10 text-xs shrink-0 transition-colors cursor-pointer"
                title="Repetir este valor para os meses seguintes"
                aria-label={`Repetir ${item.name} para a frente`}
              >
                ⇥
              </button>

              {/* Botão de confirmação de pagamento/recebimento */}
              {entry && (
                <button
                  type="button"
                  onClick={() => {
                    setSessionActiveItemIds((prev) => new Set(prev).add(item.id));
                    if (isConfirmed) {
                      unconfirmEntry(entry.id);
                    } else {
                      confirmEntry(entry.id, plannedVal);
                    }
                  }}
                  className={`w-7 h-7 flex items-center justify-center rounded-lg text-xs shrink-0 transition-all cursor-pointer ${
                    isConfirmed
                      ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-300 dark:border-emerald-700 shadow-2xs'
                      : 'text-slate-300 hover:text-emerald-600 dark:text-slate-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                  }`}
                  title={
                    isConfirmed
                      ? `Confirmado em ${entry.paidDate}. Clique para desfazer.`
                      : 'Confirmar pagamento / recebimento (Realizado)'
                  }
                  aria-label={isConfirmed ? 'Desmarcar pagamento' : 'Confirmar pagamento'}
                ><Check className="w-4 h-4 inline-block" /></button>
              )}

              {canDeleteEach && (
                <button
                  type="button"
                  onClick={() => {
                    const removed = removeItem(category, item.id);
                    if (removed) {
                      setSessionActiveItemIds((prev) => {
                        const next = new Set(prev);
                        next.delete(item.id);
                        return next;
                      });
                      showToast(`Item "${removed.name}" removido`, {
                        
                      });
                    }
                  }}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs shrink-0 transition-colors cursor-pointer"
                  title="Remover conta"
                  aria-label={`Remover ${item.name}`}
                ><X className="w-4 h-4 inline-block" /></button>
              )}
            </div>
          );
        })}

        <div className="pt-1.5 flex justify-end">
          <button
            type="button"
            onClick={() => handleOpenAddModal(category)}
            className="text-xs font-semibold text-[#0e6b7a] dark:text-[#4ec2d3] hover:underline px-2 py-1 rounded-lg hover:bg-[#0e6b7a]/5 transition-colors cursor-pointer"
          >
            + Adicionar em {category === 'renda' ? 'Rendas' : category === 'cartoes' ? 'Cartões' : category === 'fixas' ? 'Fixas' : 'Variáveis'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* HEADER ROW */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl px-4 py-3 shadow-sm flex flex-col sm:flex-row flex-wrap sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => canPrev && onMonthChange(months[currentIdx - 1].id)} disabled={!canPrev} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" className="font-bold text-base sm:text-lg px-2 text-slate-800 dark:text-slate-200 cursor-pointer">
                {month.name} {currentYear} <ChevronDown className="w-4 h-4 ml-1.5 opacity-50"/>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3 rounded-2xl" align="center">
              <div className="flex items-center justify-between mb-3 px-1">
                <span className="text-xs font-semibold text-slate-500">Ano do Orçamento</span>
                <select
                  value={currentYear}
                  onChange={(e) => handleYearChange(Number(e.target.value))}
                  className="text-sm font-bold text-[#0e6b7a] dark:text-[#4ec2d3] bg-transparent outline-none cursor-pointer"
                >
                  {yearList.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {months.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onMonthChange(m.id)}
                    className={`text-xs py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${m.id === monthId ? 'bg-[#0e6b7a] text-white shadow-sm' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                  >
                    {m.shortName}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="ghost" size="icon" onClick={() => canNext && onMonthChange(months[currentIdx + 1].id)} disabled={!canNext} className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 cursor-pointer">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => handleOpenBudgetModal('renda')} className="text-slate-600 dark:text-slate-300 bg-transparent border-slate-200 dark:border-slate-700 cursor-pointer">
            <Settings className="w-4 h-4 mr-1.5"/> Editar Orçamento
          </Button>
          <Button variant="primary" size="sm" onClick={() => handleOpenAddModal('fixas')} className="bg-[#0e6b7a] hover:bg-[#09525e] text-white cursor-pointer">
            <Plus className="w-4 h-4 mr-1.5"/> Novo Item
          </Button>
        </div>
      </div>

      {/* SUMMARY CARD */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
          <div className="flex-1 p-3 pt-0 sm:p-3 sm:py-0 text-center sm:text-left">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Renda Prevista</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">{formatBRL(income)}</div>
          </div>
          <div className="flex-1 p-3 sm:p-3 sm:py-0 text-center sm:text-left">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">Total de Despesas</div>
            <div className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-slate-100 tabular-nums">{formatBRL(totalExpenses)}</div>
            {oneTime > 0 && <div className="text-[10px] text-purple-600 dark:text-purple-400 font-medium mt-0.5">📦 Inclui {formatBRL(oneTime)} pontuais</div>}
          </div>
          <div className="flex-1 p-3 pb-0 sm:p-3 sm:py-0 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{isPositive ? 'Sobra do Mês' : 'Déficit'}</span>
              {income > 0 && isPositive && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">{savingsRate.toFixed(0)}% poupado</span>}
            </div>
            <div className={`text-xl sm:text-2xl font-bold font-mono tabular-nums ${isPositive ? 'text-emerald-600 dark:text-emerald-500' : 'text-rose-600 dark:text-rose-500'}`}>
              {formatBRL(monthBalance)}
            </div>
          </div>
        </div>

        <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div className={`h-full transition-all ${totalExpenses > income ? 'bg-rose-500' : (totalExpenses / income > 0.8 ? 'bg-amber-500' : 'bg-emerald-500')}`} style={{ width: `${Math.min(income > 0 ? (totalExpenses / income) * 100 : (totalExpenses > 0 ? 100 : 0), 100)}%` }} />
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Saldo acumulado (caixa) previsto para o fim de {month.shortName}:</span>
          <strong className="font-mono text-sm text-slate-800 dark:text-slate-200 tabular-nums">
            {formatBRL(accumulatedBalance)}
          </strong>
        </div>
      </div>

      {/* ACCORDION ACCOUNTS */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        <CollapsibleSection title="Rendas & Entradas" icon={<Wallet className="w-4 h-4 text-emerald-600" />} total={formatBRL(rawIncome)} defaultOpen={true}>
          {renderItems(activeIncomeItems, 'renda', false)}
        </CollapsibleSection>
        
        <CollapsibleSection title="Cartões de Crédito" icon={<CreditCard className="w-4 h-4 text-amber-600" />} total={formatBRL(rawCards)} defaultOpen={false}>
          {renderItems(activeCardItems, 'cartoes', true)}
        </CollapsibleSection>
        
        <CollapsibleSection title="Despesas Fixas" icon={<Home className="w-4 h-4 text-blue-600" />} total={formatBRL(rawFixed)} defaultOpen={false}>
          {renderItems(activeFixedItems, 'fixas', true)}
        </CollapsibleSection>
        
        <CollapsibleSection title="Despesas Variáveis" icon={<ShoppingCart className="w-4 h-4 text-orange-600" />} total={simulation.varsPercent !== 0 ? formatBRL(summary.variable) : formatBRL(rawVars)} defaultOpen={false}>
          {simulation.varsPercent !== 0 && (
            <div className="p-2.5 mx-4 my-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between">
              <span><Zap className="w-4 h-4 inline-block" /><strong>Simulação ativa ({simulation.varsPercent > 0 ? '+' : ''}{simulation.varsPercent}%):</strong> Os lançamentos abaixo somam {formatBRL(rawVars)}, mas o simulador está calculando o impacto como <strong>{formatBRL(summary.variable)}</strong> neste mês.
              </span>
            </div>
          )}
          {renderItems(activeVarItems, 'vars', true)}
        </CollapsibleSection>
        
        {oneTime > 0 && (
          <CollapsibleSection title="Custos Pontuais / Projetos" icon={<Package className="w-4 h-4 text-purple-600" />} total={formatBRL(oneTime)} totalColorClass="text-purple-600 dark:text-purple-400" defaultOpen={false}>
            <div className="space-y-2 pt-2 pb-2 mx-4">
              <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200/80 dark:border-purple-900/50 text-xs text-purple-900 dark:text-purple-200 flex items-center justify-between">
                <span>
                  ✓ Estes custos foram agendados para cair no orçamento deste mês.
                </span>
                {onNavigateToGoals && (
                  <button
                    type="button"
                    onClick={onNavigateToGoals}
                    className="font-bold underline hover:opacity-80 shrink-0 ml-2 cursor-pointer"
                  >
                    Ver Metas →
                  </button>
                )}
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {monthOneTimeItems.map((item: any) => (
                  <div key={item.id} className="flex items-center justify-between py-2 px-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/40 rounded-lg">
                    <span className="text-slate-800 dark:text-slate-200 font-medium">
                      {item.name}
                    </span>
                    <strong className="font-mono text-purple-700 dark:text-purple-300">
                      {formatBRL(item.value || 0)}
                    </strong>
                  </div>
                ))}
              </div>
            </div>
          </CollapsibleSection>
        )}
      </div>

      <NewTransactionModal
        isOpen={isNewTxModalOpen}
        onClose={() => setIsNewTxModalOpen(false)}
        defaultMonthId={monthId}
        defaultCategory={modalDefaultCategory}
      />

      <BudgetManagementModal
        isOpen={isBudgetModalOpen}
        onClose={() => setIsBudgetModalOpen(false)}
        defaultCategory={budgetModalCategory}
        monthId={monthId}
      />
    </div>
  );
};

