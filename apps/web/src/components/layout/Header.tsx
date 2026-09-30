import { Moon, Sun } from 'lucide-react';
import { useBudget } from '../../hooks/useBudget';
import { useBudgetStore } from '../../store/useBudgetStore';


export const Header = () => {
  const { theme, toggleTheme, isOnline } = useBudgetStore();
  const {
    isLoading,
    isSaving,
    loadError,
    saveError,
    lastSaved,
  } = useBudget();

  return (
    <header className="flex items-center justify-between gap-4 mb-2">
      <div className="flex items-center gap-3">
        <h1 className="text-base font-semibold text-foreground tracking-tight">FinPlan</h1>
        
        <div className="flex items-center gap-1.5">
          {!isOnline ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-xs text-muted-foreground">Offline</span>
            </>
          ) : isLoading || isSaving ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs text-muted-foreground">Sincronizando...</span>
            </>
          ) : loadError || saveError ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
              <span className="text-xs text-muted-foreground">Erro de sincronização</span>
            </>
          ) : lastSaved ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">
                Salvo às {lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">Sincronizado</span>
            </>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={toggleTheme}
        aria-label={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
        className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        title={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
      >
        {theme === 'dark' ? <Sun size={16} strokeWidth={1.75} /> : <Moon size={16} strokeWidth={1.75} />}
      </button>
    </header>
  );
};
