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
  const { state, isLoading, loadError, refreshFromDb } = useBudget();

  const [tab, setTab] = useState<TabId>('mes');
  const [activeMonthId, setActiveMonthId] = useState(state.months[0]?.id || '');
  const [isInitialSetupOpen, setIsInitialSetupOpen] = useState(false);

  useEffect(() => {
    if (state.months.length > 0 && !state.months.some((m) => m.id === activeMonthId)) {
      setActiveMonthId(state.months[0].id);
    }
  }, [state.months, activeMonthId]);

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

        {isLoading && (
          <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 flex items-center gap-3 animate-pulse shadow-xs">
            <span className="text-xl">⏳</span>
            <div>
              <p className="font-semibold text-xs text-slate-900 dark:text-slate-100">Carregando dados do banco...</p>
              <p className="text-[11px] text-slate-400">
                Buscando orçamento no MongoDB Atlas. Se o servidor estiver hibernando (plano gratuito), aguarde alguns instantes enquanto ele inicia.
              </p>
            </div>
          </div>
        )}

        {loadError && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-800 dark:text-rose-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-xs text-rose-900 dark:text-rose-100">Não foi possível carregar os dados do servidor</p>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">
                  O backend demorou a responder (comum no plano gratuito ao iniciar a máquina). <strong>Seus dados no MongoDB estão intactos</strong> e o salvamento automático está desativado para proteger suas informações.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => refreshFromDb()}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              🔄 Reconectar e Carregar
            </button>
          </div>
        )}

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

        {tab === 'horizonte' && <HorizonView />}

        {tab === 'metas' && (
          <div className="space-y-4">
            <div className="py-1">
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Metas & Eventos Financeiros
              </h2>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                Acompanhe o progresso de cada objetivo financeiro, reserva de emergência e custos pontuais de projetos.
              </p>
            </div>
            <GoalsSection />
            <OneTimeCostsSection />
          </div>
        )}

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
          FinPlan — Planejador Financeiro Pessoal • Conectado ao MongoDB Atlas
        </footer>

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
