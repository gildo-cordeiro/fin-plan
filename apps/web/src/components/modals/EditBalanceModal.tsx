import { useState, useEffect } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { CurrencyInput } from '../ui/CurrencyInput';
import { Modal } from '../ui/Modal';
import { getCurrentMonthId } from '../../utils/formatters';

interface EditBalanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EditBalanceModal = ({ isOpen, onClose }: EditBalanceModalProps) => {
  const { state, updateBudgetBalances, monthlySummaries } = useBudget();
  const currentMonthId = getCurrentMonthId();
  const currentMonthNum = new Date().getMonth() + 1;

  const initialAnchorMonth = state.budget?.reconciledMonth ?? currentMonthNum;
  const [selectedMonth, setSelectedMonth] = useState<number>(initialAnchorMonth);

  const initialRes = state.budget?.emergencyReserveTarget ?? 0;
  const [reserve, setReserve] = useState(initialRes);

  const getMonthDefaultBalance = (monthNum: number): number => {
    if (state.budget?.reconciledMonth === monthNum && state.budget?.reconciledBalance !== undefined && state.budget?.reconciledBalance !== null) {
      return state.budget.reconciledBalance;
    }
    const foundSummary = monthlySummaries.find((s) => s.month.monthIndex === monthNum - 1);
    if (foundSummary) {
      return foundSummary.accumulatedBalance;
    }
    return state.budget?.initialBalance ?? 0;
  };

  const [balance, setBalance] = useState<number>(0);

  useEffect(() => {
    if (isOpen) {
      const activeMonth = state.budget?.reconciledMonth ?? currentMonthNum;
      setSelectedMonth(activeMonth);
      setReserve(state.budget?.emergencyReserveTarget ?? 0);
      setBalance(getMonthDefaultBalance(activeMonth));
    }
  }, [isOpen, state.budget?.reconciledMonth, state.budget?.reconciledBalance, state.budget?.initialBalance, state.budget?.emergencyReserveTarget]);

  const handleMonthChange = (newMonth: number) => {
    setSelectedMonth(newMonth);
    setBalance(getMonthDefaultBalance(newMonth));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateBudgetBalances({
      reconciledMonth: selectedMonth,
      reconciledBalance: balance,
      emergencyReserveTarget: reserve,
      ...(selectedMonth === 1 ? { initialBalance: balance } : {}),
    });
    onClose();
  };

  const handleClearAnchor = () => {
    updateBudgetBalances({
      reconciledMonth: null,
      reconciledBalance: null,
      emergencyReserveTarget: reserve,
    });
    onClose();
  };

  const selectedMonthItem = state.months.find((m) => m.monthIndex === selectedMonth - 1);
  const isCurrentMonth = selectedMonthItem?.id === currentMonthId;
  const hasExistingAnchor = state.budget?.reconciledMonth !== null && state.budget?.reconciledMonth !== undefined;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Conciliação de Saldo em Conta"
      subtitle="Defina o saldo real para ancorar previsões precisas."
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Mês de Referência do Saldo
          </label>
          <select
            value={selectedMonth}
            onChange={(e) => handleMonthChange(parseInt(e.target.value, 10))}
            className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-[#0e6b7a]"
          >
            {state.months.map((m) => {
              const mNum = m.monthIndex + 1;
              const isCur = m.id === currentMonthId;
              const isAnchored = state.budget?.reconciledMonth === mNum;
              return (
                <option key={m.id} value={mNum}>
                  {m.name} {isCur ? '⭐ (Mês Atual)' : ''} {isAnchored ? '⚓ (Âncora Ativa)' : ''}
                </option>
              );
            })}
          </select>
          <span className="text-[11px] text-slate-400 mt-1 block">
            {selectedMonth === 1
              ? 'Janeiro é a abertura do ano financeiro.'
              : `O saldo definido em ${selectedMonthItem?.shortName} será a âncora real para os meses seguintes.`}
          </span>
        </div>

        <div>
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            <span>Saldo Real no Banco ({selectedMonthItem?.shortName ?? 'Mês Selecionado'}) (R$)</span>
            {isCurrentMonth && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800">
                Mês Atual
              </span>
            )}
          </label>
          <CurrencyInput
            value={balance}
            onChange={setBalance}
            placeholder="0,00"
            className="py-1.5 px-3 text-base font-bold"
            ariaLabel="Saldo disponível no banco"
          />
          <div className="mt-1.5 p-2 rounded-lg bg-teal-50/70 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 text-[11px] text-teal-800 dark:text-teal-300">
            💡 <strong>Previsão de Alta Precisão:</strong> O FinPlan ancorará este valor exatamente em{' '}
            <strong>{selectedMonthItem?.name}</strong>. Os meses posteriores serão calculados a partir dele, preservando o histórico dos meses anteriores intacto.
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Reserva de Emergência Protegida (R$)
          </label>
          <CurrencyInput
            value={reserve}
            onChange={setReserve}
            placeholder="0,00"
            className="py-1 px-3 text-sm font-semibold"
            ariaLabel="Reserva de emergência"
          />
          <span className="text-[11px] text-slate-400 mt-1 block">
            Valor protegido. O sistema emitirá avisos se suas previsões futuras invadirem essa reserva.
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div>
            {hasExistingAnchor && (
              <button
                type="button"
                onClick={handleClearAnchor}
                className="text-[11px] font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                title="Volta ao cálculo contínuo a partir de janeiro"
              >
                Remover âncora
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-[#0e6b7a] hover:bg-[#09525e] text-white shadow-xs transition-all cursor-pointer"
            >
              Salvar Conciliação
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
