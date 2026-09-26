import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { BackupModal } from '../modals/BackupModal';

export const Header = () => {
  const {
    theme,
    toggleTheme,
    isLoading,
    isSaving,
    saveError,
    lastSaved,
    retrySave,
  } = useBudget();

  const [isBackupOpen, setIsBackupOpen] = useState(false);

  return (
    <>
      <header className="flex items-center justify-between gap-4 mb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>FinPlan</span>
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mt-0.5">
            {isLoading ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span>Carregando do banco de dados...</span>
              </>
            ) : isSaving ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>Salvando alterações no banco...</span>
              </>
            ) : saveError ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                <span className="text-rose-600 dark:text-rose-400 font-medium">Erro ao salvar no banco</span>
              </>
            ) : lastSaved ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Salvo no banco às {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>Conectado ao banco de dados</span>
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {saveError && (
            <button
              type="button"
              onClick={() => retrySave()}
              className="text-xs px-2.5 py-1.5 rounded-lg border border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100 font-semibold transition-all flex items-center gap-1 cursor-pointer"
              title="Clique para tentar salvar novamente no banco de dados"
            >
              <span>⚠️</span>
              <span>Tentar Novamente</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsBackupOpen(true)}
            className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
            title="Exportar ou importar backup em arquivo JSON"
          >
            Backup
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 text-sm cursor-pointer"
            title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          >
            {theme === 'dark' ? '☀️' : '🌙'}
          </button>
        </div>
      </header>

      <BackupModal isOpen={isBackupOpen} onClose={() => setIsBackupOpen(false)} />
    </>
  );
};
