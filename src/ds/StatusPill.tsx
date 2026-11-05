import type { ReactNode } from 'react';
import { cn } from './cn';

export type PillTone = 'positive' | 'negative' | 'warning' | 'neutral';

export interface StatusPillProps {
  tone?: PillTone;
  children: ReactNode;
  mono?: boolean;
}

export function StatusPill({ tone = 'neutral', children, mono = false }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip px-1.5 py-0.5 text-meta leading-none whitespace-nowrap',
        tone === 'positive' && 'bg-positive-bg text-positive-ink',
        tone === 'negative' && 'bg-negative-bg text-negative-ink',
        tone === 'warning' && 'bg-warning-bg text-warning-ink',
        tone === 'neutral' && 'bg-pill-bg text-pill-ink',
        mono && 'mono',
      )}
    >
      {children}
    </span>
  );
}
