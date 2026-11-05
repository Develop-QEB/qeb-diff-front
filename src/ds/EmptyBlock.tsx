import type { ReactNode } from 'react';
import { cn } from './cn';

export interface EmptyBlockProps {
  children: ReactNode;
  tone?: 'default' | 'positive' | 'negative';
  compact?: boolean;
}

export function EmptyBlock({ children, tone = 'default', compact = false }: EmptyBlockProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-chip border border-dashed',
        compact ? 'h-9' : 'h-12',
        tone === 'positive' ? 'border-positive/40 text-positive' : tone === 'negative' ? 'border-negative/40 text-negative' : 'border-border text-muted',
        'text-meta',
      )}
    >
      {children}
    </div>
  );
}
