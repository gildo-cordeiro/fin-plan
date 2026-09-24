import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { BackupModal } from '../modals/BackupModal';

export const Header = () => {
  const {
    theme,
    toggleTheme,
    isSheetLoading,
    isSheetSyncing,
    sheetSyncError,
    lastSheetSync,
    saveToSheet,
  } = useBudget();

  const [isBackupOpen, setIsBackupOpen] = useState(false);
  const [manualSyncFeedback, setManualSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (isSheetSyncing || isSheetLoading) return;
    const res = await saveToSheet();
    if (res.success) {
      setManualSyncFeedback('Salvo!');
      setTimeout(() => setManualSyncFeedback(null), 2500);
    }
  };

  return (
    <>
      <header className="flex items-center justify-between gap-4 mb-1">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>FinPlan</span>
            <span
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 hidden sm:inline-flex items-center gap-1"
              title="Sincronização em nuvem ativa com Google Sheets"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Salvamento Automático</span>
            </span>
          </h1>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            {isSheetLoading
              ? 'Carregando dados da sua planilha Google...'
              : isSheetSyncing
              ? 'Salvando alterações automaticamente na nuvem...'
              : sheetSyncError
              ? 'Aviso: Falha na conexão com a planilha. Seus dados estão seguros localmente.'
              : lastSheetSync
              ? `Planilha sincronizada às ${lastSheetSync.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Conectado à sua planilha Google'}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Botão de Ação Direta para Sincronização */}
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSheetSyncing || isSheetLoading}
            className={`text-xs px-2.5 py-1.5 rounded-lg border font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
              sheetSyncError
                ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 hover:bg-rose-100'
                : isSheetSyncing || isSheetLoading
                ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 opacity-80 cursor-wait'
                : manualSyncFeedback
                ? 'border-emerald-400 dark:border-emerald-700 bg-emerald-100 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200'
                : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100'
            }`}
            title={
              lastSheetSync
                ? `Último salvamento: ${lastSheetSync.toLocaleTimeString()}. Clique para salvar agora manualmente.`
                : 'Clique para sincronizar com a planilha Google'
            }
          >
            {isSheetLoading || isSheetSyncing ? (
              <span className="inline-block animate-spin text-sm">⏳</span>
            ) : sheetSyncError ? (
              <span className="text-sm">⚠️</span>
            ) : manualSyncFeedback ? (
              <span className="text-sm">✓</span>
            ) : (
              <span className="text-sm">☁️</span>
            )}
            <span>
              {isSheetLoading
                ? 'Carregando...'
                : isSheetSyncing
                ? 'Salvando...'
                : manualSyncFeedback
                ? 'Salvo!'
                : sheetSyncError
                ? 'Reconectar'
                : 'Salvar na Planilha'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsBackupOpen(true)}
            className="text-xs px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 font-medium cursor-pointer"
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
