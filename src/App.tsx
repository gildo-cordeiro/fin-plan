import { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { NavMenu } from './components/layout/NavMenu';
import type { TabId } from './components/layout/NavMenu';
import { StatusBar } from './components/layout/StatusBar';
import { MonthSelector } from './components/months/MonthSelector';
import type { ViewMode } from './components/months/MonthSelector';
import { MonthBudgetView } from './components/budget/MonthBudgetView';
import { MonthHorizonBar } from './components/months/MonthHorizonBar';
import { IncomeSection } from './components/budget/IncomeSection';
import { CategorySection } from './components/budget/CategorySection';
import { MonthlySummaryTable } from './components/summary/MonthlySummaryTable';
import { GoalsSection } from './components/goals/GoalsSection';
import { OneTimeCostsSection } from './components/budget/OneTimeCostsSection';
import { useBudget } from './context/BudgetContext';

export const BudgetAppContent = () => {
  const { state, isSheetLoading, fetchFromSheet } = useBudget();

  const [tab, setTab] = useState<TabId>('orcamento');
  const [activeMonthId, setActiveMonthId] = useState(state.months[0]?.id || '');
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  // Manter activeMonthId válido quando os meses mudam
  useEffect(() => {
    if (state.months.length > 0 && !state.months.some((m) => m.id === activeMonthId)) {
      setActiveMonthId(state.months[0].id);
    }
  }, [state.months, activeMonthId]);

  const isBudgetEmpty =
    state.incomes.length === 0 &&
    state.lists.cartoes.length === 0 &&
    state.lists.fixas.length === 0 &&
    state.lists.vars.length === 0 &&
    state.lists.mud.length === 0;

  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-[#0b1116] text-[#14202b] dark:text-[#e7eff5] transition-colors py-4 px-3 sm:px-6">
      <main className="max-w-[800px] mx-auto space-y-2">
        <Header />
        <StatusBar />
        <NavMenu active={tab} onSelect={setTab} />

        {/* Indicador de Carregamento da Nuvem */}
        {isSheetLoading && (
          <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 text-teal-900 dark:text-teal-200 flex items-center gap-3 animate-pulse">
            <span className="text-xl">⏳</span>
            <div>
              <p className="font-semibold text-xs">Carregando dados da sua Planilha Google...</p>
              <p className="text-[11px] opacity-80">Conectando ao banco de dados em nuvem.</p>
            </div>
          </div>
        )}

        {/* Banner quando não há dados carregados */}
        {!isSheetLoading && isBudgetEmpty && (
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 space-y-2.5 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="text-xl">☁️</span>
              <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Planilha como Banco de Dados
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              O aplicativo está conectado à sua planilha Google configurada no <code>.env</code>. Se seus dados já estiverem na planilha, clique no botão abaixo para recarregar ou comece a adicionar novas despesas e receitas.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fetchFromSheet()}
                className="text-xs px-3 py-1.5 rounded-xl font-bold bg-[#0e6b7a] text-white hover:bg-[#09525e] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>📥</span>
                <span>Recarregar da Planilha</span>
              </button>
            </div>
          </div>
        )}

        {/* ── ABA ORÇAMENTO ── */}
        {tab === 'orcamento' && (
          <div className="space-y-2">
            <MonthSelector
              activeMonthId={activeMonthId}
              onMonthChange={setActiveMonthId}
              viewMode={viewMode}
              onViewModeChange={setViewMode}
            />

            {viewMode === 'month' ? (
              <MonthBudgetView
                monthId={activeMonthId}
                onNavigateToGoals={() => setTab('metas')}
              />
            ) : (
              <div className="space-y-3">
                <MonthHorizonBar />
                <IncomeSection />
                <CategorySection
                  categoryKey="cartoes"
                  title="Cartões de crédito"
                  hint="Fatura de cada mês."
                />
                <CategorySection
                  categoryKey="fixas"
                  title="Despesas fixas"
                  hint="Contas recorrentes."
                />
                <CategorySection
                  categoryKey="vars"
                  title="Despesas variáveis"
                  hint="Gastos que podem variar."
                />
                <MonthlySummaryTable />
              </div>
            )}
          </div>
        )}

        {/* ── ABA METAS ── */}
        {tab === 'metas' && (
          <div className="space-y-3">
            <div className="py-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Metas & Eventos
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Acompanhe o progresso de cada objetivo. Registre aportes manualmente.
              </p>
            </div>
            <GoalsSection />
            <OneTimeCostsSection />
          </div>
        )}

        <footer className="pt-2 pb-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
          FinPlan — Planejador Financeiro Pessoal
        </footer>
      </main>
    </div>
  );
};
