import { useEffect, useState } from 'react';
import { ArrowSquareOut } from '@phosphor-icons/react';
import { api, AsanaTask } from '../lib/api';
import { cn } from './cn';

const cache = new Map<string, AsanaTask | null | 'loading'>();
const subscribers = new Map<string, Set<() => void>>();

function emit(gid: string) {
  const set = subscribers.get(gid);
  if (!set) return;
  for (const fn of set) try { fn(); } catch { void 0; }
}

async function ensureLoaded(gid: string) {
  const cur = cache.get(gid);
  if (cur !== undefined) return;
  cache.set(gid, 'loading');
  emit(gid);
  try {
    const t = await api.asanaTask(gid);
    cache.set(gid, t);
  } catch {
    cache.set(gid, null);
  }
  emit(gid);
}

function useAsanaTask(gid: string): AsanaTask | null | 'loading' | undefined {
  const [, force] = useState(0);
  useEffect(() => {
    const set = subscribers.get(gid) ?? new Set();
    const bump = () => force((n) => n + 1);
    set.add(bump);
    subscribers.set(gid, set);
    ensureLoaded(gid);
    return () => {
      set.delete(bump);
      if (set.size === 0) subscribers.delete(gid);
    };
  }, [gid]);
  return cache.get(gid);
}

export interface AsanaChipProps {
  gid: string;
}

export function AsanaChip({ gid }: AsanaChipProps) {
  const t = useAsanaTask(gid);
  const task = typeof t === 'object' ? t : null;
  const loading = t === 'loading';
  const url = task?.permalinkUrl ?? `https://app.asana.com/0/0/${gid}`;
  const title = task?.name;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      title={`${title ?? (loading ? 'cargando tarea...' : `Asana #${gid}`)} — abre en Asana (nueva ventana)`}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        'inline-flex items-center gap-1 rounded-chip border border-orange/40 bg-orange-bg px-1.5 py-0.5 text-meta mono',
        'text-orange-ink hover:border-orange hover:text-orange transition-colors max-w-[280px]',
        task?.completed && 'line-through opacity-70',
      )}
    >
      <span className="text-[10px] uppercase tracking-wider opacity-80">asana</span>
      <span className="truncate">{title ?? `#${gid}`}</span>
      <ArrowSquareOut size={11} weight="bold" aria-hidden className="shrink-0 opacity-80" />
    </a>
  );
}
