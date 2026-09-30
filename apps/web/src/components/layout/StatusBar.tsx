import { useState } from 'react';
import { Pencil } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget';
import { formatBRL } from '../../lib/format';
import { EditBalanceModal } from '../modals/EditBalanceModal';
import { cn } from '../../lib/cn';

export const StatusBar = () => {
  const { metrics, state } = useBudget();
  const [isEditBalanceOpen, setIsEditBalanceOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 text-sm text-muted-foreground mb-4">
        <button
          type="button"
          onClick={() => setIsEditBalanceOpen(true)}
          className="flex items-center gap-1.5 hover:text-foreground transition-colors group cursor-pointer text-left w-fit"
          title="Clique para alterar seu saldo atual em conta"
        >
          <span>Saldo em conta hoje:</span>
          <strong className="tabular-nums font-semibold text-foreground group-hover:underline">
            {formatBRL(state.budget?.initialBalance ?? 0)}
          </strong>
          <Pencil size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>

        <div className="hidden sm:block w-px h-4 bg-border" />

        <div className="flex items-center gap-1.5">
          <span>Sobra média mensal:</span>
          <strong
            className={cn(
              "tabular-nums font-semibold",
              metrics.averageMonthlyBalance >= 0 ? "text-success" : "text-destructive"
            )}
          >
            {formatBRL(metrics.averageMonthlyBalance)}
          </strong>
        </div>
      </div>

      <EditBalanceModal
        isOpen={isEditBalanceOpen}
        onClose={() => setIsEditBalanceOpen(false)}
      />
    </>
  );
};
