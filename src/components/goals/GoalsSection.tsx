import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { formatBRL } from '../../utils/formatters';
import { FinancialGoal, GoalContribution } from '../../types/budget';
import { NewGoalModal } from '../modals/NewGoalModal';
import { GoalContributionModal } from '../modals/GoalContributionModal';

/**
 * Sanitiza o ícone da meta garantindo que palavras normais (ex: 'Meta' ou 'Reserva')
 * nunca sejam exibidas como ícones gigantes.
 */
function getCleanGoalIcon(icon?: string, name?: string): string {
  if (icon && !/[a-zA-Z0-9]/.test(icon) && icon.length <= 4) {
    return icon;
  }
  const lower = (name || '').toLowerCase();
  if (lower.includes('reserva') || lower.includes('emergencia')) return '🛡️';
  if (lower.includes('mudanca') || lower.includes('casa') || lower.includes('ap')) return '📦';
  if (lower.includes('viagem') || lower.includes('ferias')) return '✈️';
  if (lower.includes('carro') || lower.includes('veiculo') || lower.includes('moto')) return '🚗';
  if (lower.includes('estudo') || lower.includes('curso')) return '📚';
  return '🎯';
}

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
      className="text-slate-300 hover:text-rose-500 dark:text-slate-600 dark:hover:text-rose-400 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
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
  const [editingName, setEditingName] = useState(false);
  const [editingTarget, setEditingTarget] = useState(false);

  const totalSaved = goal.contributions.reduce((acc, c) => acc + c.amount, 0);
  const remaining = Math.max(0, goal.targetAmount - totalSaved);
  const progressPct = goal.targetAmount > 0 ? Math.min(100, (totalSaved / goal.targetAmount) * 100) : 0;
  const isDone = goal.status === 'concluida';
  const isPaused = goal.status === 'pausada';

  const cleanIcon = getCleanGoalIcon(goal.icon, goal.name);

  return (
    <div
      className={`rounded-2xl border transition-all shadow-xs ${
        isDone
          ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/80'
          : isPaused
          ? 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 opacity-80'
          : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800'
      }`}
    >
      <div className="p-4 space-y-3">
        {/* Header do card: Ícone limpo, Nome, Descrição e Menu */}
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-800/40 text-lg flex items-center justify-center shrink-0 select-none shadow-xs">
            {cleanIcon}
          </div>

          <div className="flex-1 min-w-0">
            {editingName ? (
              <input
                autoFocus
                type="text"
                value={goal.name}
                onChange={(e) => updateGoal(goal.id, { name: e.target.value })}
                onBlur={() => setEditingName(false)}
                className="w-full text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 bg-transparent border-b border-[#0e6b7a] outline-none mb-0.5"
              />
            ) : (
              <button
                type="button"
                onClick={() => setEditingName(true)}
                className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 hover:text-[#0e6b7a] dark:hover:text-[#4ec2d3] text-left block w-full truncate cursor-pointer"
                title="Clique para editar o nome"
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
              <span className="text-[11px] bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full font-bold">
                ✓ Concluída
              </span>
            )}
            {isPaused && (
              <span className="text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full font-medium">
                ⏸ Pausada
              </span>
            )}

            <div className="relative group">
              <button
                type="button"
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                title="Opções da meta"
              >
                •••
              </button>
              <div className="absolute right-0 top-8 hidden group-focus-within:flex group-hover:flex flex-col bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-20 min-w-[140px] py-1">
                {!isDone && (
                  <button
                    type="button"
                    onClick={() => setGoalStatus(goal.id, 'concluida')}
                    className="text-left px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    ✓ Marcar concluída
                  </button>
                )}
                {isDone && (
                  <button
                    type="button"
                    onClick={() => setGoalStatus(goal.id, 'ativa')}
                    className="text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    ↺ Reativar meta
                  </button>
                )}
                {!isPaused && !isDone && (
                  <button
                    type="button"
                    onClick={() => setGoalStatus(goal.id, 'pausada')}
                    className="text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    ⏸ Pausar meta
                  </button>
                )}
                {isPaused && (
                  <button
                    type="button"
                    onClick={() => setGoalStatus(goal.id, 'ativa')}
                    className="text-left px-3 py-1.5 text-xs text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    ▶ Retomar meta
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => removeGoal(goal.id)}
                  className="text-left px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                >
                  ✕ Excluir meta
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card de Métricas de Valores */}
        <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Já Guardado
            </span>
            <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
              {formatBRL(totalSaved)}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
              Meta Alvo
            </span>
            <div className="flex items-center justify-end font-mono font-bold text-slate-800 dark:text-slate-200 text-sm">
              {editingTarget ? (
                <input
                  autoFocus
                  type="number"
                  value={goal.targetAmount || ''}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    updateGoal(goal.id, { targetAmount: isNaN(v) ? 0 : v });
                  }}
                  onBlur={() => setEditingTarget(false)}
                  className="w-24 text-right bg-white dark:bg-slate-900 border border-teal-500 rounded px-1 text-xs outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setEditingTarget(true)}
                  className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer group flex items-center gap-1"
                  title="Clique para editar o valor da meta"
                >
                  <span>{formatBRL(goal.targetAmount)}</span>
                  <span className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity">✏️</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Barra de Progresso Suave */}
        <div className="space-y-1">
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
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

          <div className="flex items-center justify-between text-[11px] text-slate-400">
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
        <div className="flex items-center gap-2 pt-1">
          {!isDone && (
            <button
              type="button"
              onClick={() => onOpenContribution(goal)}
              className="flex-1 h-9 rounded-xl bg-[#0e6b7a] hover:bg-[#09525e] text-white text-xs font-semibold shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="text-sm font-bold">+</span>
              <span>Registrar Aporte</span>
            </button>
          )}

          {goal.contributions.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors cursor-pointer"
            >
              {expanded ? 'Ocultar' : `${goal.contributions.length} aporte${goal.contributions.length > 1 ? 's' : ''}`}
            </button>
          )}
        </div>

        {/* Histórico de Aportes Expandido */}
        {expanded && goal.contributions.length > 0 && (
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
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
  const [isExplanationOpen, setIsExplanationOpen] = useState(false);

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
    <div className="space-y-3">
      {/* ── Banner de Explicação Didática da Separação (Colapsável) ── */}
      <div className="rounded-2xl bg-teal-50/70 dark:bg-teal-950/30 border border-teal-200/70 dark:border-teal-900/40 text-xs overflow-hidden">
        <button
          type="button"
          onClick={() => setIsExplanationOpen((v) => !v)}
          className="w-full p-3 flex items-center justify-between text-left hover:bg-teal-100/40 dark:hover:bg-teal-900/20 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <span className="text-sm">🎯</span>
            <strong className="text-teal-950 dark:text-teal-200 font-semibold text-xs">
              Como funciona a divisão entre Orçamento e Metas?
            </strong>
          </div>
          <span className="text-teal-700 dark:text-teal-400 text-xs font-medium">
            {isExplanationOpen ? 'Ocultar' : 'Entenda'}
          </span>
        </button>

        {isExplanationOpen && (
          <div className="px-3 pb-3 pt-0.5 text-slate-600 dark:text-slate-300 leading-relaxed border-t border-teal-200/40 dark:border-teal-900/30 text-[11px]">
            No <strong>Orçamento Mensal</strong>, você controla suas despesas recorrentes (aluguel, contas, cartões e alimentação). A sobra gerada a cada mês pode ser aportada aqui em <strong>Metas & Eventos</strong> para cobrir projetos pontuais (como os custos da Mudança ou a Reserva de Emergência) sem comprometer seu fluxo de caixa diário.
          </div>
        )}
      </div>

      {/* ── Resumo Geral de Metas em 3 Widgets Elegantes ── */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-teal-50 dark:bg-teal-950/50 text-[#0e6b7a] dark:text-[#4ec2d3] flex items-center justify-center text-sm shrink-0">
              🎯
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Total das Metas</span>
              <strong className="font-mono text-slate-800 dark:text-slate-100 text-sm">{formatBRL(totalTarget)}</strong>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-sm shrink-0">
              💰
            </div>
            <div>
              <span className="text-[11px] text-slate-400 block font-medium">Total Guardado</span>
              <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">{formatBRL(totalSaved)}</strong>
            </div>
          </div>

          <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200/90 dark:border-slate-800 shadow-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center text-sm shrink-0">
                ⏳
              </div>
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 block font-medium">Falta Economizar</span>
                <strong className="font-mono text-amber-600 dark:text-amber-400 text-sm truncate block">{formatBRL(totalMissing)}</strong>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsNewGoalOpen(true)}
              className="h-8 px-2.5 rounded-lg bg-[#0e6b7a] hover:bg-[#09525e] text-white text-xs font-bold transition-colors shadow-xs shrink-0 flex items-center gap-1 cursor-pointer"
            >
              <span>+</span>
              <span className="hidden sm:inline">Nova Meta</span>
            </button>
          </div>
        </div>
      )}

      {/* Grid de Metas Ativas */}
      {activeGoals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
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
          <span className="text-3xl mb-2">🎯</span>
          <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
            Nenhuma meta cadastrada ainda
          </p>
          <p className="text-xs mt-1 max-w-sm">
            Crie sua primeira meta (ex: Mudança de Apartamento, Reserva de Emergência ou Viagem) para acompanhar seus aportes.
          </p>
          <button
            type="button"
            onClick={() => setIsNewGoalOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl bg-[#0e6b7a] hover:bg-[#09525e] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
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
