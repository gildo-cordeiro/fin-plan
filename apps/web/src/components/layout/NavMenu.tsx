import { CalendarDays, BarChart3, Target, FlaskConical } from 'lucide-react';
import { cn } from '../../lib/cn';

export type TabId = 'mes' | 'horizonte' | 'metas' | 'simulador';

interface Tab {
  id: TabId;
  icon: React.ElementType;
  label: string;
  shortLabel: string;
}

const TABS: Tab[] = [
  { id: 'mes',       icon: CalendarDays, label: 'Mês Atual',          shortLabel: 'Mensal' },
  { id: 'horizonte', icon: BarChart3,    label: '12 Meses & Gráficos', shortLabel: 'Anual' },
  { id: 'metas',     icon: Target,       label: 'Metas & Reserva',    shortLabel: 'Metas' },
  { id: 'simulador', icon: FlaskConical, label: 'Simulações',         shortLabel: 'Cenários' },
];

interface NavMenuProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export const NavMenu = ({ active, onSelect }: NavMenuProps) => (
  <nav
    aria-label="Navegação Principal"
    role="tablist"
    className="sticky top-0 z-20 flex gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg shadow-sm border-b border-transparent backdrop-blur-md transition-all"
  >
    {TABS.map((tab) => {
      const isActive = tab.id === active;
      const Icon = tab.icon;
      return (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={isActive}
          onClick={() => onSelect(tab.id)}
          aria-label={tab.label}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-all duration-150 cursor-pointer",
            isActive
              ? "bg-white dark:bg-zinc-800 text-foreground shadow-xs ring-1 ring-zinc-200 dark:ring-zinc-700/50"
              : "text-muted-foreground hover:text-foreground hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50"
          )}
        >
          <Icon size={16} strokeWidth={1.75} />
          <span className="hidden sm:inline truncate">{tab.label}</span>
          <span className="sm:hidden truncate">{tab.shortLabel}</span>
        </button>
      );
    })}
  </nav>
);
