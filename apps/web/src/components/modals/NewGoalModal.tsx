import { useState } from 'react';
import { useCreateGoalMutation } from '../../queries/goals';
import { MoneyInput } from '../ui/MoneyInput';
import { Modal } from '../ui/Modal';
import { getCleanGoalIcon } from '../goals/GoalsSection';
import { getIcon } from '../../lib/icons';

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PRESETS = [
  { name: 'Mudança de Residência', target: 6000, desc: 'Caminhão, pintura, caução e taxas' },
  { name: 'Reserva de Emergência', target: 15000, desc: '6 meses de despesas fixas' },
  { name: 'Viagem de Férias', target: 5000, desc: 'Passagens, hospedagem e passeios' },
  { name: 'Móveis & Eletros Novos', target: 4000, desc: 'Geladeira, sofá e decoração' },
];

export const NewGoalModal = ({ isOpen, onClose }: NewGoalModalProps) => {
  const createGoalMutation = useCreateGoalMutation();

  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState(0);
  const [description, setDescription] = useState('');

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setName(p.name);
    setTargetAmount(p.target);
    setDescription(p.desc);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    createGoalMutation.mutate({
      name: name.trim(),
      targetAmount,
      description: description.trim(),
      status: 'ativa',
    });

    setName('');
    setTargetAmount(0);
    setDescription('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nova Meta ou Projeto"
      subtitle="Defina um objetivo financeiro para acompanhar os aportes."
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Sugestões Rápidas
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className="flex items-center gap-2 p-2 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-left text-xs transition-colors"
              >
                <span>
                  {(() => {
                    const Icon = getIcon(getCleanGoalIcon(p.name));
                    return <Icon className="w-4 h-4" />;
                  })()}
                </span>
                <span className="truncate font-medium text-slate-700 dark:text-slate-300">
                  {p.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Nome da Meta
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Mudança de Residência..."
                className="flex-1 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e6b7a]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Valor Alvo Total (R$)
            </label>
            <MoneyInput
              value={targetAmount}
              onChange={setTargetAmount}
              placeholder="0,00"
              className="py-1 px-3 text-base"
              ariaLabel="Valor da meta"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Descrição / Detalhes (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ex: Custos de frete, caução do imóvel e taxas de transferência..."
              rows={2}
              className="w-full text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0e6b7a]"
            />
          </div>

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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white shadow-sm transition-all"
            >
              Criar Meta
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};
