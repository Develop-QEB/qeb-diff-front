import { useEffect, useMemo, useState } from 'react';
import { api, RepoName } from '../lib/api';
import { PageTitle, Select, Button, Checkbox, Table, THead, TBody, TR, TH, TD, StatusPill, QebLoader, cn } from '../ds';
import { Check, Copy } from '@phosphor-icons/react';

const BRANCH_ORDER = ['stage', 'dev', 'release', 'main'] as const;

export default function DiagnosticoTab() {
  const [repo, setRepo] = useState<RepoName>('back');
  const [deps, setDeps] = useState<any>(null);
  const [env, setEnv] = useState<any>(null);
  const [onlyDiverg, setOnlyDiverg] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [d, e] = await Promise.all([api.diagDeps(repo), api.diagEnv(repo)]);
      setDeps(d);
      setEnv(e);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [repo]);

  const depRows = useMemo(() => (deps ? (onlyDiverg ? deps.rows.filter((r: any) => r.divergente) : deps.rows) : []), [deps, onlyDiverg]);
  const envRows = useMemo(() => (env ? (onlyDiverg ? env.keys.filter((k: any) => k.divergente) : env.keys) : []), [env, onlyDiverg]);

  async function copy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied((c) => (c === label ? null : c)), 1500);
    } catch {
      setError('no se pudo copiar al clipboard');
    }
  }

  const finding = useMemo((): React.ReactNode => {
    if (!deps || !env) return null;
    return (
      <>
        <span className="num mono text-ink">{deps.rows.filter((r: any) => r.divergente).length}</span> paquetes y{' '}
        <span className="num mono text-ink">{env.keys.filter((k: any) => k.divergente).length}</span> variables difieren entre ramas.
      </>
    );
  }, [deps, env]);

  return (
    <div className="flex h-full flex-col">
      <PageTitle title="Diagnóstico" finding={finding} actions={<Button size="sm" onClick={load} disabled={loading}>{loading ? 'cargando…' : 'refrescar'}</Button>} />

      <div className="flex items-center gap-4 pb-4 hairline-b">
        <Select label="repo" value={repo} onChange={(e) => setRepo(e.target.value as RepoName)}>
          <option value="back">back-qeb</option>
          <option value="front">front-qeb</option>
        </Select>
        <Checkbox checked={onlyDiverg} onChange={setOnlyDiverg} label="mostrar solo divergentes" />
      </div>

      {error && (
        <div className="my-3 rounded-chip border border-negative/30 bg-negative-bg px-3 py-2 text-body text-negative-ink">{error}</div>
      )}

      <div className="flex-1 space-y-8 overflow-auto py-5">
        <section>
          <div className="flex items-baseline gap-2 mb-2 hairline-b pb-2">
            <h2>paquetes</h2>
            <span className="mono text-meta text-muted">— {repo}-qeb</span>
            {deps && (
              <span className="num mono text-meta text-muted">
                ({depRows.length} {onlyDiverg ? 'con diferencias' : 'en total'} de {deps.rows.length})
              </span>
            )}
          </div>

          {deps && (
            <div className="mb-3 flex flex-wrap items-center gap-2 text-meta text-muted">
              <span>versión de node requerida por rama:</span>
              {BRANCH_ORDER.map((b) => (
                <span key={b} className="inline-flex items-center gap-1">
                  <span className="mono text-ink">{b}</span>
                  <span className="mono text-muted">=</span>
                  <span className="mono text-ink">{deps.nodeEngine[b] ?? 'no declarada'}</span>
                </span>
              ))}
            </div>
          )}

          <div className="mb-3 text-meta text-muted">
            Las celdas en{' '}
            <span className="mono text-negative-ink diff-hl">rojo</span>{' '}
            son las que no coinciden con lo que tienen las otras ramas. <span className="italic">faltante</span> = la rama no declara ese paquete.
          </div>

          {!deps && (
            <div className="flex items-center justify-center py-8"><QebLoader size={40} /></div>
          )}
          {deps && depRows.length === 0 && (
            <div className="rounded-chip border border-dashed border-positive/30 px-3 py-2 text-meta text-positive">
              Todos los paquetes coinciden entre las 4 ramas.
            </div>
          )}
          {deps && depRows.length > 0 && (
            <Table>
              <THead>
                <TR>
                  <TH>tipo</TH>
                  <TH>paquete</TH>
                  {BRANCH_ORDER.map((b) => <TH key={b}>rama {b}</TH>)}
                </TR>
              </THead>
              <TBody>
                {depRows.map((r: any) => {
                  const vals = BRANCH_ORDER.map((b) => r.byBranch[b]);
                  const counts = new Map<string, number>();
                  for (const v of vals) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
                  const maxCount = Math.max(0, ...counts.values());
                  const dominantes = [...counts.entries()].filter(([, c]) => c === maxCount).map(([v]) => v);
                  return (
                    <TR key={r.kind + r.name}>
                      <TD>
                        <StatusPill tone="neutral"><span className="mono">{r.kind === 'devDep' ? 'desarrollo' : 'producción'}</span></StatusPill>
                      </TD>
                      <TD mono>{r.name}</TD>
                      {BRANCH_ORDER.map((b) => {
                        const v = r.byBranch[b];
                        if (v == null) return <TD key={b} mono muted className="italic">faltante</TD>;
                        const isDiverg = !dominantes.includes(v);
                        return (
                          <TD key={b} mono>
                            <span className={cn(isDiverg && 'diff-hl')}>{v}</span>
                          </TD>
                        );
                      })}
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </section>

        <section>
          <div className="flex items-baseline gap-2 mb-2 hairline-b pb-2">
            <h2>schema .env</h2>
            <span className="mono text-meta text-muted">— {repo}-qeb</span>
            {env && (
              <span className="num mono text-meta text-muted">
                ({envRows.length} {onlyDiverg ? 'divergentes' : 'total'} de {env.keys.length})
              </span>
            )}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {env && BRANCH_ORDER.map((b) => {
              const label = `copy-${repo}-${b}`;
              const txt = env.contenido?.[b];
              const done = copied === label;
              return (
                <button
                  key={b}
                  disabled={!txt}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-meta transition-colors',
                    !txt && 'cursor-not-allowed opacity-40',
                    done ? 'border-positive/40 text-positive' : 'border-border text-muted hover:text-ink',
                  )}
                  onClick={() => txt && copy(txt, label)}
                  title={txt ? `copiar .env.example completo de ${b}` : 'sin archivo'}
                >
                  {done ? <Check size={12} weight="bold" aria-hidden /> : <Copy size={12} weight="regular" aria-hidden />}
                  <span className="mono">{done ? `copiado · ${b}` : `copiar ${b} completo`}</span>
                </button>
              );
            })}
          </div>

          {!env && (
            <div className="flex items-center justify-center py-8"><QebLoader size={40} /></div>
          )}
          {env && envRows.length === 0 && (
            <div className="rounded-chip border border-dashed border-positive/30 px-3 py-2 text-meta text-positive">
              Todas las variables coinciden entre las 4 ramas.
            </div>
          )}
          {env && envRows.length > 0 && (
            <Table>
              <THead>
                <TR>
                  <TH>key</TH>
                  {BRANCH_ORDER.map((b) => <TH key={b}>{b}</TH>)}
                </TR>
              </THead>
              <TBody>
                {envRows.map((r: any) => (
                  <TR key={r.key}>
                    <TD mono>{r.key}</TD>
                    {BRANCH_ORDER.map((b) => {
                      const v = r.byBranch[b];
                      if (v.present) return <TD key={b} mono className="text-positive">presente</TD>;
                      return <TD key={b} mono><span className="diff-hl">faltante</span></TD>;
                    })}
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </section>
      </div>
    </div>
  );
}
