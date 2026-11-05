import { cn } from './cn';

export interface UnderlineTabsProps<T extends string> {
  tabs: Array<{ id: T; label: string; count?: number }>;
  active: T;
  onChange: (id: T) => void;
  rightSlot?: React.ReactNode;
}

export function UnderlineTabs<T extends string>({ tabs, active, onChange, rightSlot }: UnderlineTabsProps<T>) {
  return (
    <div className="flex items-center justify-between border-b border-rule">
      <nav className="flex gap-6" role="tablist">
        {tabs.map((t) => {
          const isActive = t.id === active;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              className={cn(
                'relative py-3 text-body transition-colors',
                isActive ? 'text-ink select-line' : 'text-muted hover:text-ink',
              )}
            >
              <span>{t.label}</span>
              {typeof t.count === 'number' && (
                <span className={cn('ml-1.5 num mono text-meta', isActive ? 'text-ink' : 'text-muted')}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      {rightSlot && <div className="flex items-center gap-2">{rightSlot}</div>}
    </div>
  );
}
