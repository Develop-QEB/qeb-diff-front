import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api, type LogSourceInfo, type ProcStatus } from '../lib/api';
import { PageTitle, Button, UnderlineTabs, StatusPill, cn } from '../ds';
import { Pause, Play, Broom, ArrowClockwise } from '@phosphor-icons/react';

const POLL_MS = 5000;
const MAX_BUFFER = 2000;

// --- Interpretación de logs (sin falsos positivos) ---------------------
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}
// 5xx SOLO cuando va pegado a un "METODO /ruta 5xx" (evita matchear tiempos como 768.509 ms)
const HTTP5XX_RE = /\b(?:GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\s+\/\S*\s+5\d{2}\b/;
const ERROR_RE = /\b(error|errores|exception|unhandled(?:promiserejection)?|fatal|panic|segfault|traceback|ECONNREFUSED|ETIMEDOUT|ECONNRESET|EADDRINUSE|ENOTFOUND|ER_[A-Z_]+|cannot reach|can'?t reach|access denied|permission denied|rejected)\b/i;
const WARN_RE = /\b(warn|warning|advertencia|deprecated|retry|retrying|reintent|slow|lento)\b/i;

type Health = 'ok' | 'warn' | 'error' | 'empty';
interface LogStatus {
  level: Health;
  errors: number;
  warns: number;
  errorLines: string[];
}

function interpretLogs(lines: string[]): LogStatus {
  if (lines.length === 0) return { level: 'empty', errors: 0, warns: 0, errorLines: [] };
  const errorLines: string[] = [];
  let warns = 0;
  for (const raw of lines) {
    const l = stripAnsi(raw);
    if (ERROR_RE.test(l) || HTTP5XX_RE.test(l)) errorLines.push(l);
    else if (WARN_RE.test(l)) warns++;
  }
  const level: Health = errorLines.length ? 'error' : warns ? 'warn' : 'ok';
  return { level, errors: errorLines.length, warns, errorLines: errorLines.slice(-20) };
}

// --- Estado del proceso (pm2) ------------------------------------------
function stateFace(p: ProcStatus | null): { word: string; dot: string; ink: string } {
  const s = p?.state ?? 'unknown';
  if (s === 'online') return { word: 'Sanito', dot: 'bg-positive-ink', ink: 'text-positive-ink' };
  if (s === 'errored') return { word: 'Caído', dot: 'bg-negative-ink', ink: 'text-negative-ink' };
  if (s === 'stopped') return { word: 'Apagado', dot: 'bg-faint', ink: 'text-muted' };
  if (s === 'launching') return { word: 'Arrancando', dot: 'bg-warning-ink', ink: 'text-warning-ink' };
  if (s === 'stopping') return { word: 'Deteniéndose', dot: 'bg-warning-ink', ink: 'text-warning-ink' };
  return { word: '—', dot: 'bg-faint', ink: 'text-faint' };
}

function fmtUptime(ms: number | null): string {
  if (ms == null || ms < 0) return '—';
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

interface EnvState {
  lines: string[];
  cursor: string | null;
  error: string | null;
  source: 'pm2' | 'digitalocean' | null;
  proc: ProcStatus | null;
  lastFetchedAt: string | null;
  loading: boolean;
}

function emptyState(): EnvState {
  return { lines: [], cursor: null, error: null, source: null, proc: null, lastFetchedAt: null, loading: false };
}

export default function LogsTab() {
  const [sources, setSources] = useState<LogSourceInfo[] | null>(null);
  const [sourcesError, setSourcesError] = useState<string | null>(null);
  const [active, setActive] = useState<string>('');
  const [paused, setPaused] = useState(false);
  const [states, setStates] = useState<Record<string, EnvState>>({});
  const [restarting, setRestarting] = useState(false);
  const [restartMsg, setRestartMsg] = useState<string | null>(null);

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
            proc: res.proc ?? null,
            lastFetchedAt: res.fetchedAt,
            loading: false,
          },
        };
      });
    } catch (e: any) {
      setStates((s) => ({ ...s, [key]: { ...(s[key] ?? emptyState()), loading: false, error: e?.message ?? String(e) } }));
    }
  }

  async function restart() {
    if (!active || restarting) return;
    if (!window.confirm(`¿Reiniciar el proceso "${active}"? Habrá un corte de unos segundos.`)) return;
    setRestarting(true);
    setRestartMsg(null);
    try {
      await api.restartLog(active);
      setRestartMsg(`✓ ${active} reiniciado`);
      window.setTimeout(() => void fetchOnce(activeRef.current), 1500);
    } catch (e: any) {
      // si reinicias el propio 'diff', la conexión se corta a media respuesta → igual se reinició
      setRestartMsg(`${active} reiniciando… (${e?.message ?? 'conexión cortada'})`);
      window.setTimeout(() => void fetchOnce(activeRef.current), 2500);
    } finally {
      setRestarting(false);
      window.setTimeout(() => setRestartMsg(null), 6000);
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
  const face = stateFace(current.proc);
  const isPm2 = current.source === 'pm2' || (sources?.find((s) => s.key === active)?.type === 'pm2');

  function clear() {
    if (!active) return;
    setStates((s) => ({ ...s, [active]: { ...(s[active] ?? emptyState()), lines: [], cursor: null } }));
    stickyBottomRef.current = true;
  }

  const statusChip = (() => {
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
            {restartMsg && <span className="text-meta text-muted mono mr-1">{restartMsg}</span>}
            {isPm2 && (
              <Button size="sm" variant="ghost" onClick={restart} disabled={restarting} title="reiniciar el proceso (pm2 restart)">
                <ArrowClockwise size={13} weight="bold" aria-hidden className={restarting ? 'animate-spin' : ''} />
                <span className="ml-1">{restarting ? 'reiniciando…' : 'reiniciar'}</span>
              </Button>
            )}
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
          rightSlot={statusChip}
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

      {/* Dos containers: Estado del proceso + Fallos recientes */}
      {sources && sources.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-card border border-rule bg-surface px-3 py-2.5">
            <div className="text-meta uppercase tracking-wide text-faint">Estado</div>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn('inline-block h-2.5 w-2.5 rounded-full', face.dot)} aria-hidden />
              <span className={cn('text-body font-medium', face.ink)}>{face.word}</span>
            </div>
            <div className="mt-1 text-meta text-muted mono">
              {isPm2
                ? (current.proc ? `${current.proc.state} · ${fmtUptime(current.proc.uptimeMs)} · ↺ ${current.proc.restarts ?? '—'}` : 'leyendo proceso…')
                : 'no es proceso pm2'}
            </div>
          </div>

          <div className="min-w-0 rounded-card border border-rule bg-surface px-3 py-2.5">
            <div className="flex items-center justify-between">
              <span className="text-meta uppercase tracking-wide text-faint">Fallos recientes</span>
              <span className={cn('num mono text-body', status.errors ? 'text-negative-ink' : 'text-muted')}>{status.errors}</span>
            </div>
            {status.errors === 0 ? (
              <div className="mt-1 text-meta text-muted">{status.level === 'warn' ? `${status.warns} advertencia(s), nada roto` : 'sin errores en el buffer'}</div>
            ) : (
              <div className="mt-1.5 max-h-24 space-y-0.5 overflow-auto font-mono text-meta text-negative-ink">
                {status.errorLines.map((l, i) => (
                  <div key={i} className="whitespace-pre-wrap break-all leading-4">{l}</div>
                ))}
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
