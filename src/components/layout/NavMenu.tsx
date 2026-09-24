type TabId = 'orcamento' | 'metas';

interface Tab {
  id: TabId;
  icon: string;
  label: string;
}

const TABS: Tab[] = [
  { id: 'orcamento', icon: '💰', label: 'Orçamento' },
  { id: 'metas',     icon: '🎯', label: 'Metas & Eventos' },
];

interface NavMenuProps {
  active: TabId;
  onSelect: (tab: TabId) => void;
}

export type { TabId };

export const NavMenu = ({ active, onSelect }: NavMenuProps) => (
  <nav className="flex gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
    {TABS.map(tab => {
      const isActive = tab.id === active;
      return (
        <button
          key={tab.id}
          type="button"
          onClick={() => onSelect(tab.id)}
          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-150 ${
            isActive
              ? 'bg-[#0e6b7a] text-white shadow-sm'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
          aria-current={isActive ? 'page' : undefined}
        >
          <span className="text-base leading-none">{tab.icon}</span>
          <span>{tab.label}</span>
        </button>
      );
    })}
  </nav>
);
