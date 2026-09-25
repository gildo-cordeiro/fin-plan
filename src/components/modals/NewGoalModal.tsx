import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Modal } from '../ui/Modal';

interface NewGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const EMOJI_OPTIONS = ['🏠', '🚚', '🛡️', '✈️', '🚗', '🛋️', '💻', '💍', '🎓', '🎯', '🏖️', '🚀'];

const PRESETS = [
  { name: 'Mudança de Residência', icon: '🏠', target: 6000, desc: 'Caminhão, pintura, caução e taxas' },
  { name: 'Reserva de Emergência', icon: '🛡️', target: 15000, desc: '6 meses de despesas fixas' },
  { name: 'Viagem de Férias', icon: '✈️', target: 5000, desc: 'Passagens, hospedagem e passeios' },
  { name: 'Móveis & Eletros Novos', icon: '🛋️', target: 4000, desc: 'Geladeira, sofá e decoração' },
];

export const NewGoalModal = ({ isOpen, onClose }: NewGoalModalProps) => {
  const { addGoal } = useBudget();

  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏠');
  const [targetAmount, setTargetAmount] = useState(0);
  const [description, setDescription] = useState('');

  const handleSelectPreset = (p: typeof PRESETS[0]) => {
    setName(p.name);
    setIcon(p.icon);
    setTargetAmount(p.target);
    setDescription(p.desc);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addGoal({
      name: name.trim(),
      icon,
      targetAmount,
      description: description.trim(),
      status: 'ativa',
    });

    setName('');
    setIcon('🏠');
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
                <span className="text-base">{p.icon}</span>
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
              Ícone e Nome da Meta
            </label>
            <div className="flex gap-2">
              <div className="relative group">
                <button
                  type="button"
                  className="w-11 h-11 flex items-center justify-center text-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 transition-colors"
                >
                  {icon}
                </button>
                <div className="absolute left-0 top-12 z-10 hidden group-hover:grid group-focus-within:grid grid-cols-4 gap-1 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl w-40">
                  {EMOJI_OPTIONS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setIcon(e)}
                      className="h-8 flex items-center justify-center text-lg hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

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
            <CurrencyInput
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
