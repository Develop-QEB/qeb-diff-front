import type { ReactNode } from 'react';
import { cn } from './cn';

export interface KpiItem {
  label: string;
  value: ReactNode;
  unit?: string;
  change?: { value: string; tone?: 'positive' | 'negative' | 'neutral' };
  mono?: boolean;
}

export interface KpiStripProps {
  items: KpiItem[];
}

export function KpiStrip({ items }: KpiStripProps) {
  return (
    <div
      className="grid gap-x-6 border-y border-rule py-5"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          className={cn(
            'min-w-0 px-0',
            i > 0 && 'border-l border-rule pl-6',
          )}
        >
          <div className="text-meta text-muted">{it.label}</div>
          <div className={cn('mt-2 text-kpi num', it.mono && 'mono')}>
            {it.value}
            {it.unit && <span className="ml-1 text-body text-muted">{it.unit}</span>}
          </div>
          {it.change && (
            <div
              className={cn(
                'mt-1 text-meta num',
                it.change.tone === 'positive' && 'text-positive',
                it.change.tone === 'negative' && 'text-negative',
                (!it.change.tone || it.change.tone === 'neutral') && 'text-muted',
              )}
            >
              {it.change.value}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
