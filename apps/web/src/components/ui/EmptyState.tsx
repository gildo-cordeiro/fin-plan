import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-slate-50 dark:bg-slate-800/80 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
        {title}
      </p>
      {description && (
        <p className="text-xs mt-1 max-w-sm text-slate-500 dark:text-slate-400">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </div>
  );
}
