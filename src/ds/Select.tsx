import type { SelectHTMLAttributes } from 'react';
import { CaretDown } from '@phosphor-icons/react';
import { cn } from './cn';

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> {
  label?: string;
}

export function Select({ className, label, children, ...props }: SelectProps) {
  return (
    <label className="inline-flex items-center gap-2 text-body text-muted">
      {label && <span>{label}</span>}
      <span className="relative inline-flex items-center">
        <select
          {...props}
          className={cn(
            'appearance-none h-8 rounded-chip border border-border bg-surface pl-3 pr-8 text-body text-ink',
            'focus:border-accent cursor-pointer',
            className,
          )}
        >
          {children}
        </select>
        <CaretDown
          size={12}
          weight="bold"
          aria-hidden
          className="pointer-events-none absolute right-3 text-muted"
        />
      </span>
    </label>
  );
}
