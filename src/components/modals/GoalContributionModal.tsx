import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { formatBRL } from '../../utils/formatters';
import { Modal } from '../ui/Modal';
import type { FinancialGoal } from '../../types/budget';

interface GoalContributionModalProps {
  goal: FinancialGoal | null;
  isOpen: boolean;
  onClose: () => void;
}

export const GoalContributionModal = ({
  goal,
  isOpen,
  onClose,
}: GoalContributionModalProps) => {
  const { addContribution } = useBudget();

  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState('');

  if (!isOpen || !goal) return null;

  const totalSaved = goal.contributions.reduce((acc, c) => acc + c.amount, 0);
  const remaining = Math.max(0, goal.targetAmount - totalSaved);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    addContribution(goal.id, amount, note.trim() || undefined);
    setAmount(0);
    setNote('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span>{goal.icon || '🎯'}</span>
          <span>Registrar Aporte</span>
        </div>
      }
      subtitle={`Meta: ${goal.name}`}
      maxWidth="max-w-sm"
    >
      <div className="space-y-4">
        {/* Resumo Atual */}
        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between text-xs">
          <div>
            <span className="text-slate-400 block">Já guardado:</span>
            <strong className="font-mono text-emerald-600 dark:text-emerald-400 text-sm">
              {formatBRL(totalSaved)}
            </strong>
          </div>
          <div className="text-right">
            <span className="text-slate-400 block">Faltam:</span>
            <strong className="font-mono text-slate-700 dark:text-slate-300 text-sm">
              {formatBRL(remaining)}
            </strong>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          {/* Valor */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Valor a Guardar (R$)
            </label>
            <CurrencyInput
              value={amount}
              onChange={setAmount}
              placeholder="0,00"
              className="py-1 px-3 text-base font-bold"
              ariaLabel="Valor do aporte"
            />
          </div>

          {/* Observação */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Observação / Origem (Opcional)
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Sobra do mês, 13º salário..."
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e6b7a]"
            />
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={amount <= 0}
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Confirmar Aporte
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
