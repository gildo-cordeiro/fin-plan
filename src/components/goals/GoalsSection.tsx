import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatBRL } from '../../utils/formatters';
import { FinancialGoal, GoalContribution } from '../../types/budget';
import { NewGoalModal } from '../modals/NewGoalModal';
import { GoalContributionModal } from '../modals/GoalContributionModal';

// ── Sub-componente: Linha de aporte ──────────────────────────────────────────

const ContributionRow = ({
  contrib,
  onRemove,
}: {
  contrib: GoalContribution;
  onRemove: () => void;
}) => (
  <div className="flex items-center gap-2 py-1.5 text-xs border-b border-slate-100 dark:border-slate-800/80 last:border-0">
    <span className="text-slate-400 w-24 shrink-0 font-mono text-[11px]">{contrib.date}</span>
    <span className="flex-1 text-slate-700 dark:text-slate-300 truncate">{contrib.note || 'Aporte manual'}</span>
    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums whitespace-nowrap">
      +{formatBRL(contrib.amount)}
    </span>
    <button
      type="button"
      onClick={onRemove}
      className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 px-1.5 py-0.5 rounded transition-colors"
      title="Remover este aporte"
    >
      ✕
    </button>
  </div>
);

// ── Sub-componente: Card de Meta ──────────────────────────────────────────────

interface GoalCardProps {
  goal: FinancialGoal;
  onOpenContribution: (goal: FinancialGoal) => void;
}

const GoalCard = ({ goal, onOpenContribution }: GoalCardProps) => {
  const { updateGoal, removeGoal, removeContribution, setGoalStatus } = useBudget();

  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);

  const totalSaved = goal.contributions.reduce((acc, c) => acc + c.amount, 0);
  const remaining = Math.max(0, goal.targetAmount - totalSaved);
  const progressPct = goal.targetAmount > 0 ? Math.min(100, (totalSaved / goal.targetAmount) * 100) : 0;
  const isDone = goal.status === 'concluida';
  const isPaused = goal.status === 'pausada';

  return (
    <div
      className={`rounded-2xl border transition-all shadow-xs ${
        isDone
          ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
          : isPaused
          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-75'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
      }`}
    >
      <div className="p-4 sm:p-5 space-y-3">
        {/* Header do card: Ícone, Nome e Menu */}
        <div className="flex items-start gap-3">
          <div className="text-3xl leading-none select-none shrink-0 p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            {goal.icon || '🎯'}
          </div>

          <div className="flex-1 min-w-0">
            {editing ? (
              <input
                autoFocus
                type="text"
                value={goal.name}
                onChange={(e) => updateGoal(goal.id, { name: e.target.value })}
                onBlur={() => setEditing(false)}
                className="w-full text-base font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-[#0e6b7a] outline-none mb-0.5"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-[#0e6b7a] dark:hover:text-[#4ec2d3] text-left block w-full truncate"
              >
                {goal.name}
              </button>
            )}

            <input
              type="text"
              value={goal.description || ''}
              onChange={(e) => updateGoal(goal.id, { description: e.target.value })}
              placeholder="Adicionar descrição ou prazo..."
              className="w-full text-xs text-slate-400 dark:text-slate-500 bg-transparent border-none outline-none mt-0.5 placeholder:text-slate-400/60"
            />
          </div>

          {/* Status & Menu de Opções */}
          <div className="flex items-center gap-1.5 shrink-0">
            {isDone && (
              <span className="text-xs bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                ✓ Concluída
              </span>
            )}
            {isPaused && (
              <span className="text-xs bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                ⏸ Pausada
              </span>
            )}

            <div className="relative group">
              <button
                type="button"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm"
                title="Opções da meta"
              >
                •••
              </button>
              <div className="absolute right-0 top-9 hidden group-focus-within:flex group-hover:flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 min-w-[140px] py-1">
                {!isDone && (
                  <button
                    type="button"
                    onClick={() => setGoalStatus(goal.id, 'concluida')}
                    className="text-left px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    ✓ Marcar concluída
                  </button>
                )}
                {isDone && (
                  <button
                    type="button"
                    onClick={() => setGoalStatus(goal.id, 'ativa')}
                    className="text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    ↺ Reativar meta
                  </button>
                )}
                {!isPaused && !isDone && (
                  <button
                    type="button"
                    onClick={() => setGoalStatus(goal.id, 'pausada')}
                    className="text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    ⏸ Pausar meta
                  </button>
                )}
                {isPaused && (
                  <button
                    type="button"
                    onClick={() => setGoalStatus(goal.id, 'ativa')}
                    className="text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    ▶ Retomar meta
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeGoal(goal.id)}
                  className="text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                >
                  ✕ Excluir meta
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Valores e Barra de Progresso */}
        <div>
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-500 dark:text-slate-400">
              Guardado: <strong className="text-slate-800 dark:text-slate-100 font-mono">{formatBRL(totalSaved)}</strong>
            </span>
            <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
              <span>Alvo:</span>
              <input
                type="text"
                inputMode="decimal"
                value={goal.targetAmount === 0 ? '' : goal.targetAmount.toString().replace('.', ',')}
                onChange={(e) => {
                  const v = parseFloat(e.target.value.replace(',', '.'));
                  updateGoal(goal.id, { targetAmount: isNaN(v) ? 0 : v });
                }}
                placeholder="0,00"
                className="w-24 text-right font-mono font-bold text-slate-800 dark:text-slate-200 bg-transparent border-b border-slate-200 dark:border-slate-700 outline-none text-xs px-1"
              />
            </div>
          </div>

          {/* Barra de Progresso */}
          <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone
                  ? 'bg-emerald-500'
                  : progressPct >= 100
                  ? 'bg-emerald-400'
                  : progressPct >= 60
                  ? 'bg-[#0e6b7a]'
                  : progressPct >= 30
                  ? 'bg-amber-400'
                  : 'bg-rose-400'
              }`}
              style={{ width: `${progressPct}%` }}
            />
          </div>

          <div className="flex items-center justify-between mt-1 text-[11px] text-slate-400">
            <span>{progressPct.toFixed(0)}% concluído</span>
            {remaining > 0 && !isDone && (
              <span>
                Faltam <strong className="text-slate-700 dark:text-slate-300 font-mono">{formatBRL(remaining)}</strong>
              </span>
            )}
            {(isDone || remaining === 0) && (
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">🎉 Meta atingida!</span>
            )}
          </div>
        </div>

        {/* Botões de Ação do Card */}
        <div className="flex items-center gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/80">
          {!isDone && (
            <button
              type="button"
              onClick={() => onOpenContribution(goal)}
              className="flex-1 py-2 px-3 rounded-xl bg-[#0e6b7a] hover:bg-[#09525e] text-white text-xs font-bold shadow-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>+</span>
              <span>Registrar Aporte</span>
            </button>
          )}

          {goal.contributions.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
            >
              {expanded ? 'Ocultar Histórico' : `${goal.contributions.length} aporte${goal.contributions.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {/* Histórico de Aportes Expandido */}
        {expanded && goal.contributions.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Histórico de Aportes
            </span>
            <div className="space-y-0.5">
              {[...goal.contributions].reverse().map((c) => (
                <ContributionRow
                  key={c.id}
                  contrib={c}
                  onRemove={() => removeContribution(goal.id, c.id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Componente Principal ──────────────────────────────────────────────────────

export const GoalsSection = () => {
  const { state } = useBudget();
  const { goals } = state;

  const [isNewGoalOpen, setIsNewGoalOpen] = useState(false);
  const [selectedGoalForContrib, setSelectedGoalForContrib] = useState<FinancialGoal | null>(null);

  const activeGoals = goals.filter((g) => g.status !== 'concluida');
  const doneGoals = goals.filter((g) => g.status === 'concluida');

  const totalTarget = goals
    .filter((g) => g.status === 'ativa')
    .reduce((a, g) => a + g.targetAmount, 0);
  const totalSaved = goals
    .filter((g) => g.status === 'ativa')
    .reduce((a, g) => a + g.contributions.reduce((s, c) => s + c.amount, 0), 0);
  const totalMissing = Math.max(0, totalTarget - totalSaved);

  return (
    <div className="space-y-4">
      {/* ── Banner de Explicação Didática da Separação ── */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-teal-900/10 via-teal-800/5 to-transparent border border-teal-200/80 dark:border-teal-900/50 text-xs space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-base">🎯</span>
          <strong className="text-teal-950 dark:text-teal-200 font-bold text-sm">
            Como funciona a divisão entre Orçamento e Metas?
          </strong>
        </div>
        <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
          No <strong>Orçamento Mensal</strong>, você controla suas despesas recorrentes (aluguel, contas, cartões e alimentação). A sobra gerada a cada mês pode ser aportada aqui em <strong>Metas & Eventos</strong> para cobrir projetos pontuais (como os custos da Mudança ou a Reserva de Emergência) sem comprometer seu fluxo de caixa diário.
        </p>
      </div>

      {/* ── Resumo Geral de Metas ── */}
      {goals.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs text-xs">
          <div>
            <span className="text-slate-400">Total das Metas Ativas: </span>
            <strong className="font-mono text-slate-800 dark:text-slate-100">{formatBRL(totalTarget)}</strong>
          </div>
          <div>
            <span className="text-slate-400">Total Já Guardado: </span>
            <strong className="font-mono text-emerald-600 dark:text-emerald-400">{formatBRL(totalSaved)}</strong>
          </div>
          {totalMissing > 0 && (
            <div>
              <span className="text-slate-400">Faltam Economizar: </span>
              <strong className="font-mono text-amber-600 dark:text-amber-400">{formatBRL(totalMissing)}</strong>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsNewGoalOpen(true)}
            className="ml-auto px-3.5 py-1.5 rounded-xl bg-[#0e6b7a] hover:bg-[#09525e] text-white font-bold transition-colors shadow-xs"
          >
            + Nova Meta
          </button>
        </div>
      )}

      {/* Grid de Metas Ativas */}
      {activeGoals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {activeGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onOpenContribution={(g) => setSelectedGoalForContrib(g)}
            />
          ))}
        </div>
      )}

      {/* Metas Concluídas */}
      {doneGoals.length > 0 && (
        <details className="group">
          <summary className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer select-none list-none flex items-center gap-1.5 py-1">
            <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
            <span>
              {doneGoals.length} meta{doneGoals.length > 1 ? 's' : ''} concluída{doneGoals.length > 1 ? 's' : ''}
            </span>
          </summary>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 mt-2">
            {doneGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onOpenContribution={(g) => setSelectedGoalForContrib(g)}
              />
            ))}
          </div>
        </details>
      )}

      {/* Estado Vazio */}
      {goals.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6">
          <span className="text-4xl mb-3">🎯</span>
          <p className="text-base font-bold text-slate-700 dark:text-slate-200">
            Nenhuma meta cadastrada ainda
          </p>
          <p className="text-xs mt-1 max-w-sm">
            Crie sua primeira meta (ex: Mudança de Apartamento, Reserva de Emergência ou Viagem) para acompanhar seus aportes.
          </p>
          <button
            type="button"
            onClick={() => setIsNewGoalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0e6b7a] hover:bg-[#09525e] text-white text-xs font-bold shadow-xs transition-colors"
          >
            + Criar Primeira Meta
          </button>
        </div>
      )}

      {/* Modais */}
      <NewGoalModal
        isOpen={isNewGoalOpen}
        onClose={() => setIsNewGoalOpen(false)}
      />

      <GoalContributionModal
        goal={selectedGoalForContrib}
        isOpen={selectedGoalForContrib !== null}
        onClose={() => setSelectedGoalForContrib(null)}
      />
    </div>
  );
};
