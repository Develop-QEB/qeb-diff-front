import { cn } from './cn';

export type LadderPresence = 'present' | 'equivalent' | 'absent';

export interface FlowLadderProps {
  slots: LadderPresence[];
  labels?: string[];
  annotations?: Array<{ at: number; text: string; tone?: 'muted' | 'negative' | 'positive' }>;
  compact?: boolean;
}

const DEFAULT_LABELS = ['stage', 'dev', 'release', 'main'];

export function FlowLadder({ slots, labels = DEFAULT_LABELS, annotations, compact = false }: FlowLadderProps) {
  return (
    <div className={cn('w-full', compact ? 'py-2' : 'py-3')}>
      <div className="relative">
        <div
          className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-border"
          aria-hidden
        />
        <ol className="relative grid grid-cols-4 gap-0">
          {slots.map((s, i) => (
            <li key={i} className="flex flex-col items-center">
              <span
                className={cn(
                  'relative z-10 flex items-center justify-center rounded-full border',
                  compact ? 'h-3 w-3' : 'h-3.5 w-3.5',
                  s === 'present' && 'bg-ink border-ink',
                  s === 'equivalent' && 'bg-ground border-muted',
                  s === 'absent' && 'bg-ground border-border',
                )}
                aria-label={`${labels[i]}: ${s}`}
              >
                {s === 'equivalent' && <span className="h-1 w-1 rounded-full bg-muted" aria-hidden />}
              </span>
              <span
                className={cn(
                  'mt-2 mono text-meta tracking-wide',
                  s === 'absent' ? 'text-faint' : s === 'equivalent' ? 'text-muted' : 'text-ink',
                )}
              >
                {labels[i]}
              </span>
            </li>
          ))}
        </ol>
      </div>
      {annotations && annotations.length > 0 && (
        <div className="mt-3 grid grid-cols-4 gap-0 text-meta">
          {Array.from({ length: slots.length }, (_, i) => {
            const a = annotations.find((an) => an.at === i);
            if (!a) return <div key={i} />;
            return (
              <div key={i} className={cn(
                'flex justify-center',
                a.tone === 'negative' ? 'text-negative' : a.tone === 'positive' ? 'text-positive' : 'text-muted',
              )}>
                {a.text}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
