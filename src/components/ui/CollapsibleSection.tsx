import { useState } from 'react';
import type { ReactNode } from 'react';

interface CollapsibleSectionProps {
  title: string;
  icon?: string;
  total?: string;
  totalColorClass?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export const CollapsibleSection = ({
  title,
  icon,
  total,
  totalColorClass = 'text-slate-800 dark:text-slate-200',
  defaultOpen = false,
  children,
}: CollapsibleSectionProps) => {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-label={`${open ? 'Recolher' : 'Expandir'} seção ${title}`}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span className={`text-[10px] text-slate-400 transition-transform duration-200 ${open ? 'rotate-90' : ''}`}>
            ▶
          </span>
          {icon && <span className="text-sm leading-none">{icon}</span>}
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</span>
        </div>
        {total !== undefined && (
          <span className={`text-sm font-bold font-mono tabular-nums ${totalColorClass}`}>
            {total}
          </span>
        )}
      </button>
      {open && (
        <div className="px-4 pb-3 border-t border-slate-100 dark:border-slate-800">
          {children}
        </div>
      )}
    </div>
  );
};
