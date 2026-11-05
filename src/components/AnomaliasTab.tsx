import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import { PageTitle, Button, Table, TBody, THead, TR, TH, TD, LadderBadge, StatusPill, AsanaChip, QebLoader, type LadderSlot } from '../ds';

const BRANCHES = ['stage', 'dev', 'release', 'main'] as const;
const DBS = ['stage', 'dev', 'release', 'main'] as const;

type Presence = 'exact' | 'equivalent' | 'absent';

export default function AnomaliasTab() {
  const [backA, setBackA] = useState<any[] | null>(null);
  const [frontA, setFrontA] = useState<any[] | null>(null);
  const [schemaA, setSchemaA] = useState<any[] | null>(null);
  const [backErr, setBackErr] = useState<string | null>(null);
  const [frontErr, setFrontErr] = useState<string | null>(null);
  const [schemaErr, setSchemaErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    setBackA(null); setFrontA(null); setSchemaA(null);
    setBackErr(null); setFrontErr(null); setSchemaErr(null);
    await Promise.all([
      api.branchAnomalies('front' as any).then(setFrontA).catch((e) => setFrontErr(e?.message ?? String(e))),
      api.branchAnomalies('back' as any).then(setBackA).catch((e) => setBackErr(e?.message ?? String(e))),
      api.schemaAnomalies().then(setSchemaA).catch((e) => setSchemaErr(e?.message ?? String(e))),
    ]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const finding = useMemo(() => {
    const parts: string[] = [];
    if (frontA) parts.push(`${frontA.length} en front`);
    if (backA) parts.push(`${backA.length} en back`);
    if (schemaA) parts.push(`${schemaA.length} en BD`);
    if (parts.length === 0) return null;
    return <>Flujo esperado: <span className="mono text-ink">stage → dev → release → main</span>. Actual: {parts.join(', ')}.</>;
  }, [frontA, backA, schemaA]);

  return (
    <div className="flex h-full flex-col">
      <PageTitle
        title="Anomalías de flujo"
        finding={finding}
        actions={
          <Button size="sm" onClick={load} disabled={loading}>
            {loading ? 'cargando…' : 'refrescar'}
          </Button>
        }
      />

      <div className="flex-1 space-y-8 overflow-auto pb-6">
        <AnomaliesBranchSection
          title="front-qeb"
          anomalies={frontA}
          error={frontErr}
          repo="front"
          onIgnore={async (r, h, s) => { await api.addIgnored(r as any, h, s); load(); }}
        />
        <AnomaliesBranchSection
          title="back-qeb"
          anomalies={backA}
          error={backErr}
          repo="back"
          onIgnore={async (r, h, s) => { await api.addIgnored(r as any, h, s); load(); }}
        />
        <AnomaliesSchemaSection anomalies={schemaA} error={schemaErr} />
      </div>
    </div>
  );
}

function presenceToSlot(v: Presence | boolean): LadderSlot {
  if (typeof v === 'boolean') return v ? 'present' : 'absent';
  if (v === 'exact') return 'present';
  if (v === 'equivalent') return 'equivalent';
  return 'absent';
}

function ladderSlots(a: any, order: readonly string[]): [LadderSlot, LadderSlot, LadderSlot, LadderSlot] {
  return order.map((k) => presenceToSlot(a.presence?.[k] ?? 'absent')) as [LadderSlot, LadderSlot, LadderSlot, LadderSlot];
}

function AnomaliesBranchSection({ title, anomalies, error, repo, onIgnore }: {
  title: string;
  anomalies: any[] | null;
  error?: string | null;
  repo: 'front' | 'back';
  onIgnore?: (repo: 'front' | 'back', hash: string, subject: string) => void;
}) {
  return (
    <section>
      <header className="flex items-baseline gap-2 mb-3 hairline-b pb-2">
        <h2>commits anómalos</h2>
        <span className="mono text-meta text-muted">— {title}</span>
        {anomalies && <span className="num mono text-meta text-muted">({anomalies.length})</span>}
      </header>
      {error && (
        <div className="rounded-chip border border-negative/30 bg-negative-bg px-3 py-2 text-body text-negative-ink">
          no se pudo cargar: {error}
        </div>
      )}
      {!error && !anomalies && (
        <div className="flex items-center justify-center py-10"><QebLoader size={40} /></div>
      )}
      {anomalies && anomalies.length === 0 && (
        <div className="rounded-chip border border-dashed border-positive/30 px-3 py-2 text-meta text-positive">
          Todo limpio: ningún commit viola el flujo.
        </div>
      )}
      {anomalies && anomalies.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>commit</TH>
              <TH>autor</TH>
              <TH>fecha</TH>
              <TH>mensaje</TH>
              <TH>presencia</TH>
              <TH>tipo</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {anomalies.map((a) => (
              <TR key={a.hash}>
                <TD mono>{a.shortHash}</TD>
                <TD muted>{a.author}</TD>
                <TD muted><span className="num mono">{new Date(a.date).toLocaleString()}</span></TD>
                <TD className="max-w-md">
                  <div className="truncate" title={a.subject}>{a.subject}</div>
                  {a.asanaId && <div className="mt-1"><AsanaChip gid={a.asanaId} /></div>}
                </TD>
                <TD>
                  <LadderBadge slots={ladderSlots(a, BRANCHES)} labels={[...BRANCHES] as [string, string, string, string]} />
                </TD>
                <TD><StatusPill tone="negative">{a.tipo}</StatusPill></TD>
                <TD>
                  {onIgnore && (
                    <button
                      className="text-meta text-muted underline hover:text-ink"
                      onClick={() => onIgnore(repo, a.hash, a.subject)}
                    >
                      ignorar
                    </button>
                  )}
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}

function AnomaliesSchemaSection({ anomalies, error }: { anomalies: any[] | null; error?: string | null }) {
  return (
    <section>
      <header className="flex items-baseline gap-2 mb-3 hairline-b pb-2">
        <h2>elementos de BD anómalos</h2>
        {anomalies && <span className="num mono text-meta text-muted">({anomalies.length})</span>}
      </header>
      {error && (
        <div className="rounded-chip border border-negative/30 bg-negative-bg px-3 py-2 text-body text-negative-ink">
          no se pudo cargar: {error}
          <div className="mt-1 text-muted text-meta">
            Si es <code className="mono text-ink">ETIMEDOUT</code>, probablemente tu IP cambió y no está en Trusted Sources de DigitalOcean (main y dev).
          </div>
        </div>
      )}
      {!error && !anomalies && (
        <div className="flex items-center justify-center py-10"><QebLoader size={40} /></div>
      )}
      {anomalies && anomalies.length === 0 && (
        <div className="rounded-chip border border-dashed border-positive/30 px-3 py-2 text-meta text-positive">
          Todo limpio: ningún elemento de BD viola el flujo.
        </div>
      )}
      {anomalies && anomalies.length > 0 && (
        <Table>
          <THead>
            <TR>
              <TH>tipo</TH>
              <TH>tabla</TH>
              <TH>nombre</TH>
              <TH>presencia</TH>
              <TH>anomalía</TH>
            </TR>
          </THead>
          <TBody>
            {anomalies.map((a, i) => (
              <TR key={i}>
                <TD muted>{a.tipo}</TD>
                <TD mono>{a.tabla ?? '—'}</TD>
                <TD mono>{a.nombre}</TD>
                <TD>
                  <LadderBadge slots={ladderSlots(a, DBS)} labels={[...DBS] as [string, string, string, string]} />
                </TD>
                <TD><StatusPill tone="negative">{a.anomalia}</StatusPill></TD>
              </TR>
            ))}
          </TBody>
        </Table>
      )}
    </section>
  );
}
