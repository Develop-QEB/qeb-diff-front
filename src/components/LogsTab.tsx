import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { api, DbName } from '../lib/api';
import { PageTitle, Button, UnderlineTabs, StatusPill, cn } from '../ds';
import { Pause, Play, Broom } from '@phosphor-icons/react';

type LogEnv = DbName;
const ENVS: Array<{ id: LogEnv; label: string }> = [
  { id: 'stage', label: 'stage' },
  { id: 'dev', label: 'dev' },
  { id: 'release', label: 'release' },
  { id: 'main', label: 'main' },
];

const POLL_MS = 5000;
const MAX_BUFFER = 2000;

interface EnvState {
  lines: string[];
  cursor: string | null;
  error: string | null;
  source: 'pm2' | 'digitalocean' | null;
  lastFetchedAt: string | null;
  loading: boolean;
}

function emptyState(): EnvState {
  return { lines: [], cursor: null, error: null, source: null, lastFetchedAt: null, loading: false };
}

export default function LogsTab() {
  const [active, setActive] = useState<LogEnv>('stage');
  const [paused, setPaused] = useState(false);
  const [states, setStates] = useState<Record<LogEnv, EnvState>>({
    stage: emptyState(), dev: emptyState(), release: emptyState(), main: emptyState(),
  });

  const activeRef = useRef(active);
  const pausedRef = useRef(paused);
  const statesRef = useRef(states);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { statesRef.current = states; }, [states]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyBottomRef = useRef(true);

  async function fetchOnce(env: LogEnv) {
    const cur = statesRef.current[env];
    setStates((s) => ({ ...s, [env]: { ...s[env], loading: true } }));
    try {
      const res = await api.logs(env, cur.cursor, 200);
      setStates((s) => {
        const prev = s[env];
        const merged = [...prev.lines, ...res.lines];
        const trimmed = merged.length > MAX_BUFFER ? merged.slice(merged.length - MAX_BUFFER) : merged;
        return {
          ...s,
          [env]: {
            lines: trimmed,
            cursor: res.cursor ?? prev.cursor,
            error: null,
            source: res.source,
            lastFetchedAt: res.fetchedAt,
            loading: false,
          },
        };
      });
    } catch (e: any) {
      setStates((s) => ({ ...s, [env]: { ...s[env], loading: false, error: e?.message ?? String(e) } }));
    }
  }

  useEffect(() => {
    void fetchOnce(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const env = activeRef.current;
      const st = statesRef.current[env];
      if (st.loading) return;
      if (st.error && /sin configurar/.test(st.error)) return;
      void fetchOnce(env);
    }, POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (stickyBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [states]);

  function onScroll() {
    const el = scrollRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    stickyBottomRef.current = distanceFromBottom < 40;
  }

  const current = states[active];

  function clear() {
    setStates((s) => ({ ...s, [active]: { ...s[active], lines: [], cursor: null } }));
    stickyBottomRef.current = true;
  }

  const statusChip = (() => {
    if (current.error) return <StatusPill tone="negative">error</StatusPill>;
    if (paused) return <StatusPill tone="warning">pausado</StatusPill>;
    if (current.loading) return <StatusPill tone="neutral">consultando…</StatusPill>;
    return <StatusPill tone="positive">en vivo · {POLL_MS / 1000}s</StatusPill>;
  })();

  return (
    <div className="flex h-full flex-col">
      <PageTitle
        title="Logs"
        finding={<>Últimas líneas del back por ambiente. Polling cada <span className="num mono text-ink">{POLL_MS / 1000}</span>s, bajo demanda; no mantiene conexiones abiertas.</>}
        actions={
          <>
            <Button size="sm" variant="ghost" onClick={clear} title="limpiar buffer">
              <Broom size={13} weight="bold" aria-hidden />
              <span className="ml-1">limpiar</span>
            </Button>
            <Button size="sm" onClick={() => setPaused((p) => !p)}>
              {paused ? <><Play size={13} weight="bold" aria-hidden /><span className="ml-1">reanudar</span></>
                     : <><Pause size={13} weight="bold" aria-hidden /><span className="ml-1">pausar</span></>}
            </Button>
          </>
        }
      />

      <UnderlineTabs
        tabs={ENVS.map((e) => ({ id: e.id, label: e.label, count: states[e.id].lines.length }))}
        active={active}
        onChange={(id) => setActive(id as LogEnv)}
        rightSlot={
          <>
            {statusChip}
            {current.source && <span className="text-meta text-muted mono">{current.source}</span>}
          </>
        }
      />

      {current.error && (
        <div className={cn(
          'my-3 rounded-chip border px-3 py-2 text-body',
          /sin configurar/.test(current.error)
            ? 'border-warning/30 bg-warning-bg text-warning-ink'
            : 'border-negative/30 bg-negative-bg text-negative-ink',
        )}>
          {current.error}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="mt-4 flex-1 overflow-auto rounded-card border border-rule bg-surface p-3 font-mono text-meta text-ink"
        style={{ minHeight: 0 }}
      >
        {current.lines.length === 0 && !current.error && (
          <div className="text-muted">sin líneas aún…</div>
        )}
        {current.lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-5">{l}</div>
        ))}
      </div>
    </div>
  );
}
