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
  const { state, isLoading } = useBudget();

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
              <p className="text-[11px] text-slate-400">Buscando orçamento no MongoDB Atlas.</p>
            </div>
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
