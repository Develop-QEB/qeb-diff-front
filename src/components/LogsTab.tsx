import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api, type LogSourceInfo, type ProcStatus } from '../lib/api';
import { PageTitle, Button, UnderlineTabs, StatusPill, cn } from '../ds';
import { Pause, Play, Broom, ArrowClockwise, Rocket } from '@phosphor-icons/react';

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
  const seen = new Set<string>();
  const errorLines: string[] = [];
  let warns = 0;
  let dbRetry = 0;
  let lastRetry = '';
  for (const raw of lines) {
    const l = stripAnsi(raw);
    if (ERROR_RE.test(l) || HTTP5XX_RE.test(l)) {
      const key = l.trim();                              // dedup: un crash-loop no inunda con líneas iguales
      if (key && !seen.has(key)) { seen.add(key); errorLines.push(l); }
    } else if (DB_RETRY_RE.test(l)) {
      dbRetry++; lastRetry = l.trim();
    } else if (WARN_RE.test(l)) {
      warns++;
    }
  }
  // Loop de reintentos de conexión a BD = fallo real aunque no diga "error"
  if (dbRetry >= 2) {
    errorLines.push(`BD no responde — ${dbRetry} reintentos de conexión${lastRetry ? ` · ej: ${lastRetry}` : ''}`);
  }
  const level: Health = errorLines.length ? 'error' : warns ? 'warn' : 'ok';
  return { level, errors: errorLines.length, warns, errorLines: errorLines.slice(-20) };
}

// --- Salud real: estado del proceso (pm2) + errores recientes del log --
// Un proceso "online" puede estar roto por dentro (BD caída, etc.), así que
// la salud combina el estado de pm2 con los errores recientes del log.
const DB_DOWN_RE = /can'?t reach database|database server|ECONNREFUSED|PROTOCOL_CONNECTION_LOST|getaddrinfo (ENOTFOUND|EAI_AGAIN)/i;
const DB_LIMIT_RE = /max_connections(_per_hour)?|too many connections|ER_CON_COUNT_ERROR|\b1226\b|\b1040\b|\b1203\b|pool.*(timeout|exhaust)/i;
// Loop de reintentos de conexión a BD: "[DB] Retrying in 2s...", "reconnecting to database",
// "reintentando conexión". Un back sano conecta al primer intento; reintentos recientes = BD caída.
const DB_RETRY_RE = /\[?\b(?:db|prisma|mysql|pool|sequelize)\b\]?[^a-z]{0,20}(?:retry|retrying|reconnect|reconnecting)|(?:retry|retrying|reconnect|reconnecting|reintent\w*)[^a-z]{0,20}(?:database|base de datos|conexi[oó]n a la bd|db connection)/i;
const TS_RE = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)/;
const RECENT_MS = 120_000; // "reciente" = dentro de 2 min de la última línea (relativo, no reloj → TZ-safe)
const HEALTH_TAIL = 40;     // si la línea no trae timestamp, se mira el tail

function parseTs(line: string): number | null {
  const m = line.match(TS_RE);
  if (!m) return null;
  const t = Date.parse(m[1] + 'Z');
  return Number.isNaN(t) ? null : t;
}

type HealthTone = 'positive' | 'negative' | 'warning' | 'muted' | 'faint';
interface HealthInfo { word: string; tone: HealthTone; reason: string }

function toneClasses(t: HealthTone): { dot: string; ink: string } {
  switch (t) {
    case 'positive': return { dot: 'bg-positive-ink', ink: 'text-positive-ink' };
    case 'negative': return { dot: 'bg-negative-ink', ink: 'text-negative-ink' };
    case 'warning': return { dot: 'bg-warning-ink', ink: 'text-warning-ink' };
    case 'muted': return { dot: 'bg-faint', ink: 'text-muted' };
    default: return { dot: 'bg-faint', ink: 'text-faint' };
  }
}

function overallHealth(proc: ProcStatus | null, lines: string[]): HealthInfo {
  const s = proc?.state;
  if (s === 'stopped') return { word: 'Apagado', tone: 'muted', reason: 'proceso detenido' };
  if (s === 'errored') return { word: 'Caído', tone: 'negative', reason: 'proceso con error' };
  if (s === 'launching') return { word: 'Arrancando', tone: 'warning', reason: 'iniciando…' };
  if (s === 'stopping') return { word: 'Deteniéndose', tone: 'warning', reason: 'deteniéndose…' };

  // online o desconocido: la salud real la dicen los logs recientes
  const n = lines.length;
  let newestTs: number | null = null;
  for (let i = n - 1; i >= 0 && i >= n - 120; i--) { const t = parseTs(lines[i]); if (t != null) { newestTs = t; break; } }

  let recent = 0;
  let dbDown = false;
  let dbLimit = false;
  let dbRetry = 0;
  for (let i = 0; i < n; i++) {
    const l = stripAnsi(lines[i]);
    const isErr = ERROR_RE.test(l) || HTTP5XX_RE.test(l);
    const isRetry = DB_RETRY_RE.test(l);
    if (!isErr && !isRetry) continue;
    const ts = parseTs(l);
    const isRecent = (ts != null && newestTs != null) ? (newestTs - ts <= RECENT_MS) : (i >= n - HEALTH_TAIL);
    if (!isRecent) continue;
    if (isRetry) { dbRetry++; continue; } // el reintento marca la BD, no cuenta como "error" suelto
    recent++;
    if (DB_DOWN_RE.test(l)) dbDown = true;
    else if (DB_LIMIT_RE.test(l)) dbLimit = true;
  }

  if (dbDown) return { word: 'BD inalcanzable', tone: 'negative', reason: 'no alcanza la base de datos' };
  if (dbLimit) return { word: 'BD saturada', tone: 'negative', reason: 'excedió el límite de conexiones' };
  // Un back sano conecta al primer intento; reintentos recientes = la BD no responde.
  if (dbRetry >= 2) return { word: 'BD inalcanzable', tone: 'negative', reason: 'la BD no responde — reintentando conexión' };
  if (recent > 0) return { word: 'Con errores', tone: 'warning', reason: `${recent} error${recent === 1 ? '' : 'es'} reciente${recent === 1 ? '' : 's'}` };
  if (!s || s === 'unknown') return { word: '—', tone: 'faint', reason: 'sin datos de proceso' };
  return { word: 'Sanito', tone: 'positive', reason: 'online' };
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
  const [redeploying, setRedeploying] = useState(false);
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

  async function redeploy() {
    if (!active || redeploying) return;
    if (!window.confirm(`¿Redeploy de "${active}"? Baja el código más reciente, reconstruye (limpia dist/cache) y reinicia. Puede tardar ~1 min.`)) return;
    setRedeploying(true);
    setRestartMsg(null);
    try {
      await api.redeployLog(active);
      setRestartMsg(`⏳ ${active}: redeploy lanzado — reconstruyendo…`);
      window.setTimeout(() => void fetchOnce(activeRef.current), 4000);
    } catch (e: any) {
      setRestartMsg(`${active}: ${e?.message ?? 'no se pudo lanzar el redeploy'}`);
    } finally {
      setRedeploying(false);
      window.setTimeout(() => setRestartMsg(null), 9000);
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
  const health = useMemo(() => overallHealth(current.proc, current.lines), [current.proc, current.lines]);
  const face = toneClasses(health.tone);
  const isPm2 = current.source === 'pm2' || (sources?.find((s) => s.key === active)?.type === 'pm2');

  function clear() {
    if (!active) return;
    setStates((s) => ({ ...s, [active]: { ...(s[active] ?? emptyState()), lines: [], cursor: null } }));
    stickyBottomRef.current = true;
  }

  const statusChip = (() => {
    if (paused) return <StatusPill tone="warning">pausado</StatusPill>;
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
            <div className="flex items-center justify-between gap-2">
              <span className="text-meta uppercase tracking-wide text-faint">Estado</span>
              {isPm2 && (
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={restart} disabled={restarting || redeploying} title="reiniciar el proceso (pm2 restart)">
                    <ArrowClockwise size={12} weight="bold" aria-hidden className={restarting ? 'animate-spin' : ''} />
                    <span className="ml-1">{restarting ? 'reiniciando…' : 'reiniciar'}</span>
                  </Button>
                  <Button size="sm" variant="ghost" onClick={redeploy} disabled={restarting || redeploying} title="redeploy: baja código, reconstruye (limpia cache) y reinicia">
                    <Rocket size={12} weight="bold" aria-hidden className={redeploying ? 'animate-spin' : ''} />
                    <span className="ml-1">{redeploying ? 'desplegando…' : 'redeploy'}</span>
                  </Button>
                </div>
              )}
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className={cn('inline-block h-2.5 w-2.5 rounded-full', face.dot)} aria-hidden />
              <span className={cn('text-body font-medium', face.ink)}>{health.word}</span>
            </div>
            <div className="mt-1 text-meta text-muted mono">
              {isPm2
                ? `${health.reason}${current.proc ? ` · ${fmtUptime(current.proc.uptimeMs)} · ↺ ${current.proc.restarts ?? '—'}` : ''}`
                : 'no es proceso pm2'}
            </div>
            {restartMsg && <div className="mt-1.5 text-meta text-ink">{restartMsg}</div>}
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
