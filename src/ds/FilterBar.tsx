import type { ReactNode } from 'react';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { cn } from './cn';

export interface FilterBarProps {
  search?: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
  };
  count?: ReactNode;
  children?: ReactNode;
}

export function FilterBar({ search, count, children }: FilterBarProps) {
  return (
    <div className="flex items-center gap-4 py-3">
      {search && (
        <div className="relative flex-1 max-w-md">
          <MagnifyingGlass
            size={14}
            weight="regular"
            aria-hidden
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
          />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder ?? 'Buscar...'}
            className={cn(
              'h-8 w-full rounded-chip border border-border bg-surface pl-8 pr-3 text-body text-ink',
              'placeholder:text-muted focus:border-accent caret-accent',
            )}
          />
        </div>
      )}
      {children}
      {count != null && (
        <div className="ml-auto text-meta text-muted num mono">{count}</div>
      )}
    </div>
  );
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: T; label: string }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" className="inline-flex items-center gap-4">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.id)}
            className={cn(
              'relative py-1 text-body transition-colors',
              active ? 'text-ink select-line' : 'text-muted hover:text-ink',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex items-center gap-2 py-1.5 text-body text-muted hover:text-ink cursor-pointer select-none">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="h-4 w-4 rounded-[2px] border-border bg-surface accent-accent"
        />
      </span>
      {label}
    </label>
  );
}
