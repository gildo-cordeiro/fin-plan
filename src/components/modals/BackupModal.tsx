import { useState } from 'react';
import { useBudget } from '../../context/BudgetContext';
import { Modal } from '../ui/Modal';
import { exportStateToFile, parseImportedJson } from '../../services/storageService';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const BackupModal = ({ isOpen, onClose }: BackupModalProps) => {
  const { state, importState, resetToDefaults } = useBudget();
  const [jsonText, setJsonText] = useState(() => JSON.stringify(state, null, 2));
  const [msg, setMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const handleDownloadFile = () => {
    exportStateToFile(state);
    setMsg({ text: 'Arquivo de backup baixado com sucesso!', type: 'success' });
  };

  const handleImportText = () => {
    try {
      const parsed = parseImportedJson(jsonText);
      importState(parsed);
      setMsg({ text: 'Dados importados e salvos com sucesso!', type: 'success' });
      setTimeout(() => {
        setMsg(null);
        onClose();
      }, 1200);
    } catch {
      setMsg({ text: 'Conteúdo JSON inválido. Verifique o formato do texto e tente novamente.', type: 'error' });
    }
  };

  const handleReset = () => {
    if (window.confirm('Tem certeza de que deseja voltar aos dados iniciais? Todas as alterações manuais serão resetadas.')) {
      resetToDefaults();
      setMsg({ text: 'Dados restaurados para o padrão inicial.', type: 'info' });
      setTimeout(() => {
        setMsg(null);
        onClose();
      }, 1000);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Backup e Restauração de Dados"
      subtitle="Exporte seus dados em arquivo ou cole um backup para restaurar."
      maxWidth="max-w-lg"
    >
      <div className="space-y-3">
        {msg && (
          <div
            className={`p-2.5 rounded-xl text-xs font-semibold ${
              msg.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                : msg.type === 'error'
                ? 'bg-rose-50 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200 border border-slate-200'
            }`}
          >
            {msg.text}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadFile}
            className="px-3 py-1.5 text-xs font-bold rounded-xl bg-[#0e6b7a] hover:bg-[#09525e] text-white shadow-xs transition-colors flex items-center gap-1.5"
          >
            <span>⬇️</span>
            <span>Baixar Arquivo (.json)</span>
          </button>

          <button
            type="button"
            onClick={handleImportText}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 transition-colors"
          >
            Restaurar do Texto Abaixo
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 ml-auto transition-colors"
          >
            Resetar Padrões
          </button>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-400 mb-1">
            Conteúdo JSON (para cópia ou colagem manual):
          </label>
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
            rows={8}
            className="w-full p-2.5 font-mono text-[11px] leading-relaxed bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#0e6b7a]"
          />
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
