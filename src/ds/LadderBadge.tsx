import { cn } from './cn';

export type LadderSlot = 'present' | 'equivalent' | 'absent';

export interface LadderBadgeProps {
  slots: [LadderSlot, LadderSlot, LadderSlot, LadderSlot];
  labels?: [string, string, string, string];
  showText?: boolean;
  size?: 'sm' | 'md';
}

const ORDER_LABELS: [string, string, string, string] = ['stage', 'dev', 'release', 'main'];

export function LadderBadge({ slots, labels = ORDER_LABELS, showText = false, size = 'md' }: LadderBadgeProps) {
  const cellSize = size === 'sm' ? 'h-2 w-2' : 'h-2.5 w-2.5';
  const letter = labels.map((l) => l[0]).join('').toLowerCase();
  return (
    <span className="inline-flex items-center gap-2" aria-label={labels.map((l, i) => `${l}:${slots[i]}`).join(' ')}>
      <span className="inline-flex items-center gap-0.5">
        {slots.map((s, i) => (
          <span
            key={i}
            title={`${labels[i]}: ${s}`}
            aria-hidden
            className={cn(
              cellSize,
              'rounded-[1px]',
              s === 'present' && 'bg-ink',
              s === 'equivalent' && 'bg-muted',
              s === 'absent' && 'bg-raised border border-border',
            )}
          />
        ))}
      </span>
      {showText && (
        <span className="mono text-meta text-muted tracking-wider">
          {slots.map((s, i) => (s === 'absent' ? '_' : letter[i])).join('')}
        </span>
      )}
    </span>
  );
}
