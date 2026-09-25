import { useState, useEffect } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Modal } from '../ui/Modal';

interface EditBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditBalanceModal = ({ isOpen, onClose }: EditBalanceModalProps) => {
  const { state, updateSimulation } = useBudget();
  const { simulation } = state;

  const [balance, setBalance] = useState(simulation.initialBalance);
  const [reserve, setReserve] = useState(simulation.emergencyReserve);

  useEffect(() => {
    if (isOpen) {
      setBalance(simulation.initialBalance);
      setReserve(simulation.emergencyReserve);
    }
  }, [isOpen, simulation.initialBalance, simulation.emergencyReserve]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateSimulation({
      initialBalance: balance,
      emergencyReserve: reserve,
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Ajustar Saldo em Conta"
      subtitle="Seu ponto de partida financeiro hoje."
      maxWidth="max-w-sm"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Saldo em Conta Hoje (R$)
          </label>
          <CurrencyInput
            value={balance}
            onChange={setBalance}
            placeholder="0,00"
            className="py-1.5 px-3 text-base font-bold"
            ariaLabel="Saldo disponível hoje"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            O total de dinheiro líquido que você tem disponível no banco agora.
          </span>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reserva que não quer mexer (R$)
          </label>
          <CurrencyInput
            value={reserve}
            onChange={setReserve}
            placeholder="0,00"
            className="py-1 px-3 text-sm font-semibold"
            ariaLabel="Reserva de emergência"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Valor protegido. O sistema te avisará se suas despesas invadirem essa reserva.
          </span>
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
            Atualizar Saldo
          </button>
        </div>
      </form>
    </Modal>
  );
};
