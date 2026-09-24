import { useState, useEffect } from 'react';
import { Header } from './components/layout/Header';
import { NavMenu, type TabId } from './components/layout/NavMenu';
import { StatusBar } from './components/layout/StatusBar';
import { MonthSelector } from './components/months/MonthSelector';
import { MonthBudgetView } from './components/budget/MonthBudgetView';
import { HorizonView } from './components/budget/HorizonView';
import { GoalsSection } from './components/goals/GoalsSection';
import { OneTimeCostsSection } from './components/budget/OneTimeCostsSection';
import { SimulationPanel } from './components/simulation/SimulationPanel';
import { BudgetManagementModal } from './components/modals/BudgetManagementModal';
import { useBudget } from './context/BudgetContext';

export const BudgetAppContent = () => {
  const { state, isSheetLoading, fetchFromSheet } = useBudget();

  const [tab, setTab] = useState<TabId>('mes');
  const [activeMonthId, setActiveMonthId] = useState(state.months[0]?.id || '');
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState(false);

  // Manter activeMonthId válido quando a lista de meses é atualizada
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

  // Layout responsivo adaptativo baseado na densidade do conteúdo
  const containerMaxWidth =
    tab === 'horizonte'
      ? 'max-w-[1440px]'
      : tab === 'metas' || tab === 'simulador'
      ? 'max-w-5xl'
      : 'max-w-4xl';

  return (
    <div className="min-h-screen bg-[#f4f6f8] dark:bg-[#0b1116] text-[#14202b] dark:text-[#e7eff5] transition-colors py-4 px-3 sm:px-6">
      <main className={`${containerMaxWidth} mx-auto space-y-3 transition-all duration-200`}>
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
              O aplicativo está conectado à sua planilha Google configurada. Se seus dados já estiverem na planilha, clique no botão abaixo para recarregar ou comece a adicionar novas despesas e receitas.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => fetchFromSheet()}
                className="text-xs px-3.5 py-2 rounded-xl font-bold bg-[#0e6b7a] text-white hover:bg-[#09525e] transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>📥</span>
                <span>Recarregar da Planilha</span>
              </button>
              <button
                type="button"
                onClick={() => setIsInitialSetupOpen(true)}
                className="text-xs px-3.5 py-2 rounded-xl font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>⚙️</span>
                <span>Cadastrar Rendas & Despesas</span>
              </button>
            </div>
          </div>
        )}

        {/* ── ABA 1: MÊS ATUAL (OPERAÇÃO DO MÊS) ── */}
        {tab === 'mes' && (
          <div className="space-y-3">
            <MonthSelector
              activeMonthId={activeMonthId}
              onMonthChange={setActiveMonthId}
              viewMode="month"
              onViewModeChange={(m) => {
                if (m === 'table') setTab('horizonte');
              }}
            />

            <MonthBudgetView
              monthId={activeMonthId}
              onNavigateToGoals={() => setTab('metas')}
              onNavigateToHorizon={() => setTab('horizonte')}
              onNavigateToSimulations={() => setTab('simulador')}
            />
          </div>
        )}

        {/* ── ABA 2: VISÃO 12 MESES & GRÁFICOS (HORIZONTE E PROJEÇÕES) ── */}
        {tab === 'horizonte' && <HorizonView />}

        {/* ── ABA 3: METAS & RESERVA & EVENTOS ── */}
        {tab === 'metas' && (
          <div className="space-y-4">
            <div className="py-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Metas & Eventos Financeiros
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Acompanhe o progresso de cada objetivo financeiro, reserva de emergência e custos pontuais da mudança.
              </p>
            </div>
            <GoalsSection />
            <OneTimeCostsSection />
          </div>
        )}

        {/* ── ABA 4: SIMULAÇÕES ("E SE...") ── */}
        {tab === 'simulador' && (
          <div className="space-y-4">
            <div className="py-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Simulador de Cenários Financeiros
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Projete variações de despesas ou custos imprevistos e teste a resiliência do seu fluxo de caixa em tempo real.
              </p>
            </div>
            <SimulationPanel />
          </div>
        )}

        <footer className="pt-4 pb-6 text-center text-[11px] text-slate-400 dark:text-slate-500">
          FinPlan — Planejador Financeiro Pessoal • Dados sincronizados com Google Sheets
        </footer>

        {/* Modal de Configuração Inicial de Orçamento */}
        <BudgetManagementModal
          isOpen={isInitialSetupOpen}
          onClose={() => setIsInitialSetupOpen(false)}
          monthId={activeMonthId}
          defaultCategory="renda"
        />
      </main>
    </div>
  );
};
