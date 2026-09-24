import { HTMLAttributes, forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, glass = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          clsx(
            'rounded-2xl border transition-all duration-200',
            glass
              ? 'glass-panel border-white/60 dark:border-slate-800 shadow-sm'
              : 'bg-white dark:bg-slate-900 border-slate-200/90 dark:border-slate-800 shadow-sm shadow-slate-100 dark:shadow-none',
            className
          )
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
