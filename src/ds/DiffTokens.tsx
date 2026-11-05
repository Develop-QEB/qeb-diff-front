import { cn } from './cn';

function tokenize(s: string): string[] {
  return s.split(/(\s+|,|\(|\)|=|->|<->)/).filter((t) => t !== '');
}

function markDifferent(tokens: string[], others: string[][]) {
  const count = new Map<string, number>();
  for (const o of others) for (const t of o) count.set(t, (count.get(t) ?? 0) + 1);
  return tokens.map((t) => ({
    text: t,
    different: (count.get(t) ?? 0) === 0,
  }));
}

export interface DiffTokensProps {
  value: string | null;
  others: Array<string | null>;
  muted?: boolean;
}

export function DiffTokens({ value, others, muted = false }: DiffTokensProps) {
  if (value == null) return <span className="text-faint italic">no existe</span>;
  const otherTokens = others.filter((o): o is string => o != null).map(tokenize);
  const parts = markDifferent(tokenize(value), otherTokens);
  return (
    <span className={cn('mono text-body', muted && 'text-muted')}>
      {parts.map((p, i) => (
        <span key={i} className={cn(p.different && 'diff-hl')}>
          {p.text}
        </span>
      ))}
    </span>
  );
}
