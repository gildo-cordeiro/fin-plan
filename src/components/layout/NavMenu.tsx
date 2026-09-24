export type TabId = 'mes' | 'horizonte' | 'metas' | 'simulador';

interface Tab {
  id: TabId;
  icon: string;
  label: string;
  shortLabel: string;
}

const TABS: Tab[] = [
  { id: 'mes',       icon: '📅', label: 'Mês Atual',          shortLabel: 'Mensal' },
  { id: 'horizonte', icon: '📊', label: '12 Meses & Gráficos', shortLabel: 'Anual' },
  { id: 'metas',     icon: '🎯', label: 'Metas & Reserva',    shortLabel: 'Metas' },
  { id: 'simulador', icon: '🔮', label: 'Simulações',         shortLabel: 'Cenários' },
];

interface NavMenuProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export const NavMenu = ({ active, onSelect }: NavMenuProps) => (
  <nav
    aria-label="Navegação Principal"
    className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800 rounded-2xl p-1 shadow-xs"
  >
    {TABS.map((tab) => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          aria-label={tab.label}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3.5 py-2 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer ${
            isActive
              ? 'bg-[#0e6b7a] text-white shadow-xs'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className="text-sm sm:text-base leading-none select-none">{tab.icon}</span>
          <span className="hidden sm:inline truncate">{tab.label}</span>
          <span className="sm:hidden truncate">{tab.shortLabel}</span>
        </button>
      );
    })}
  </nav>
);
