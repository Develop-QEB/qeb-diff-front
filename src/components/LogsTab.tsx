import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api, type LogSourceInfo } from '../lib/api';
import { PageTitle, Button, UnderlineTabs, StatusPill, cn } from '../ds';
import { Pause, Play, Broom } from '@phosphor-icons/react';

const POLL_MS = 5000;
const MAX_BUFFER = 2000;

// --- Traducción de logs a lenguaje plano -------------------------------
const ERROR_RE = /\b(error|errores|exception|unhandled|fatal|panic|segfault|traceback|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EADDRINUSE|ENOTFOUND|can'?t reach|cannot reach|denied|rejected|\b50[0-9]\b)/i;
const WARN_RE = /\b(warn|warning|advertencia|deprecated|retry|retrying|reintent|timeout|slow|lento)/i;

type Health = 'ok' | 'warn' | 'error' | 'empty';
interface LogStatus {
  level: Health;
  errors: number;
  warns: number;
  lastProblem: string | null;
  total: number;
}

function interpretLogs(lines: string[]): LogStatus {
  if (lines.length === 0) return { level: 'empty', errors: 0, warns: 0, lastProblem: null, total: 0 };
  let errors = 0;
  let warns = 0;
  let lastError: string | null = null;
  let lastWarn: string | null = null;
  for (const l of lines) {
    if (ERROR_RE.test(l)) { errors++; lastError = l; }
    else if (WARN_RE.test(l)) { warns++; lastWarn = l; }
  }
  const level: Health = errors > 0 ? 'error' : warns > 0 ? 'warn' : 'ok';
  const lastProblem = (lastError ?? lastWarn ?? '').trim().slice(0, 180) || null;
  return { level, errors, warns, lastProblem, total: lines.length };
}

function statusText(s: LogStatus): string {
  if (s.level === 'empty') return 'Esperando líneas…';
  if (s.level === 'error') {
    return `Algo falló — ${s.errors} ${s.errors === 1 ? 'error' : 'errores'} en las últimas ${s.total} líneas.`;
  }
  if (s.level === 'warn') {
    return `${s.warns} ${s.warns === 1 ? 'advertencia' : 'advertencias'} — nada roto, pero échale un ojo.`;
  }
  return `Todo bien — sin errores en las últimas ${s.total} líneas.`;
}

const STATUS_FACE: Record<Health, { emoji: string; box: string }> = {
  ok:    { emoji: '✅', box: 'border-positive/30 bg-positive-bg text-positive-ink' },
  warn:  { emoji: '⚠️', box: 'border-warning/30 bg-warning-bg text-warning-ink' },
  error: { emoji: '❌', box: 'border-negative/30 bg-negative-bg text-negative-ink' },
  empty: { emoji: '·',  box: 'border-rule bg-raised text-muted' },
};

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
  const [sources, setSources] = useState<LogSourceInfo[] | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [active, setActive] = useState<string>('');
  const [paused, setPaused] = useState(false);
  const [states, setStates] = useState<Record<string, EnvState>>({});

  const activeRef = useRef(active);
  const pausedRef = useRef(paused);
  const statesRef = useRef(states);
  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { pausedRef.current = paused; }, [paused]);
  useEffect(() => { statesRef.current = states; }, [states]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const stickyBottomRef = useRef(true);

  useEffect(() => {
    api.logSources()
      .then((list) => {
        setSources(list);
        setStates(Object.fromEntries(list.map((s) => [s.key, emptyState()])));
        if (list.length > 0) setActive((a) => a || list[0].key);
      })
      .catch((e) => setSourcesError(e?.message ?? String(e)));
  }, []);

  async function fetchOnce(key: string) {
    const cur = statesRef.current[key] ?? emptyState();
    setStates((s) => ({ ...s, [key]: { ...(s[key] ?? emptyState()), loading: true } }));
    try {
      const res = await api.logs(key, cur.cursor, 200);
      setStates((s) => {
        const prev = s[key] ?? emptyState();
        const merged = [...prev.lines, ...res.lines];
        const trimmed = merged.length > MAX_BUFFER ? merged.slice(merged.length - MAX_BUFFER) : merged;
        return {
          ...s,
          [key]: {
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
      setStates((s) => ({ ...s, [key]: { ...(s[key] ?? emptyState()), loading: false, error: e?.message ?? String(e) } }));
    }
  }

  useEffect(() => {
    stickyBottomRef.current = true; // al cambiar de pestaña, pegarse al fondo (último)
    if (active) void fetchOnce(active);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current) return;
      const key = activeRef.current;
      if (!key) return;
      const st = statesRef.current[key];
      if (!st || st.loading) return;
      if (st.error && /sin configurar/.test(st.error)) return;
      void fetchOnce(key);
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

  const current = (active && states[active]) || emptyState();
  const status = useMemo(() => interpretLogs(current.lines), [current.lines]);

  function clear() {
    if (!active) return;
    setStates((s) => ({ ...s, [active]: { ...(s[active] ?? emptyState()), lines: [], cursor: null } }));
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
        finding={<>Últimas líneas del back por proceso. Polling cada <span className="num mono text-ink">{POLL_MS / 1000}</span>s, bajo demanda; no mantiene conexiones abiertas.</>}
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

      {sourcesError && (
        <div className="my-3 rounded-chip border border-negative/30 bg-negative-bg px-3 py-2 text-body text-negative-ink">
          {sourcesError}
        </div>
      )}

      {sources && sources.length === 0 && !sourcesError && (
        <div className="my-3 rounded-chip border border-warning/30 bg-warning-bg px-3 py-2 text-body text-warning-ink">
          sin fuentes configuradas · define <span className="mono">LOGS_SOURCES</span> en el .env del back
        </div>
      )}

      {sources && sources.length > 0 && (
        <UnderlineTabs
          tabs={sources.map((s) => ({ id: s.key, label: s.label, count: states[s.key]?.lines.length ?? 0 }))}
          active={active}
          onChange={(id) => setActive(id)}
          rightSlot={
            <>
              {statusChip}
              {current.source && <span className="text-meta text-muted mono">{current.source}</span>}
            </>
          }
        />
      )}

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

      {sources && sources.length > 0 && current.lines.length > 0 && (
        <div className={cn('mt-4 flex items-start gap-2 rounded-chip border px-3 py-2 text-body', STATUS_FACE[status.level].box)}>
          <span aria-hidden className="leading-5">{STATUS_FACE[status.level].emoji}</span>
          <div className="min-w-0">
            <div className="font-medium">{statusText(status)}</div>
            {status.lastProblem && (
              <div className="mt-0.5 truncate font-mono text-meta opacity-80" title={status.lastProblem}>
                {status.lastProblem}
              </div>
            )}
          </div>
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="mt-3 flex-1 overflow-auto rounded-card border border-rule bg-surface p-3 font-mono text-meta text-ink"
        style={{ minHeight: 0 }}
      >
        {!sources && !sourcesError && <div className="text-muted">cargando fuentes…</div>}
        {sources && current.lines.length === 0 && !current.error && (
          <div className="text-muted">sin líneas aún…</div>
        )}
        {current.lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-all leading-5">{l}</div>
        ))}
        {sources && current.lines.length > 0 && (
          <div className="leading-5" aria-hidden><span className="text-accent">▋</span></div>
        )}
      </div>
    </div>
  );
}
