import { useEffect, useMemo, useState } from 'react';
import { api, DbName } from '../lib/api';
import { PageTitle, Button, StatusPill, Table, THead, TBody, TR, TH, TD, QebLoader, cn } from '../ds';
import { ArrowSquareOut } from '@phosphor-icons/react';

const DB: DbName = 'main';

interface Huerfana {
  cara_id: number;
  idquote: string | null;
  articulo: string | null;
  formato: string | null;
  ciudad: string | null;
  caras: number | null;
  tarifa_publica: number | null;
  costo: number | null;
  autorizacion_dg: string | null;
  autorizacion_dcm: string | null;
  created_at: string | null;
  solicitud_id: number | null;
  propuesta_id: number | null;
  lado: 'dg' | 'dcm';
}

interface Report {
  db: DbName;
  dg: Huerfana[];
  dcm: Huerfana[];
  total: number;
  consultedAt: string;
}

export default function HuerfanasTab() {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(await api.huerfanas(DB));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const finding = useMemo((): React.ReactNode => {
    if (!data) return null;
    if (data.total === 0) return <>No hay autorizaciones huérfanas en producción.</>;
    return (
      <>
        <span className="num mono text-negative">{data.total}</span> caras con autorizacion pendiente sin tarea DG/DCM en producción (
        <span className="num mono text-ink">{data.dg.length}</span> DG · <span className="num mono text-ink">{data.dcm.length}</span> DCM).
      </>
    );
  }, [data]);

  const combined = useMemo(() => {
    if (!data) return [];
    return [...data.dg, ...data.dcm].sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''));
  }, [data]);

  return (
    <div className="flex h-full flex-col">
      <PageTitle
        title="Autorizaciones huérfanas"
        finding={finding}
        actions={<Button size="sm" onClick={load} disabled={loading}>{loading ? 'cargando…' : 'refrescar'}</Button>}
      />

      <div className="flex items-start gap-4 pb-4 hairline-b">
        <div className="text-meta text-muted">
          Caras en <span className="mono text-ink">main</span> (producción) con <code className="mono text-ink">autorizacion_dg</code> o <code className="mono text-ink">autorizacion_dcm</code> en{' '}
          <span className="mono text-ink">'pendiente'</span> pero sin tarea DG/DCM asociada. Nadie puede atenderlas porque la tarea no existe.
        </div>
      </div>

      {error && (
        <div className="my-3 rounded-chip border border-negative/30 bg-negative-bg px-3 py-2 text-body text-negative-ink">
          {error}
        </div>
      )}

      {!data && !error && (
        <div className="flex items-center justify-center py-16"><QebLoader size={56} /></div>
      )}

      {data && data.total === 0 && (
        <div className="mt-6 rounded-chip border border-dashed border-positive/30 px-3 py-2 text-meta text-positive">
          Todo limpio: cada autorización pendiente tiene su tarea DG/DCM.
        </div>
      )}

      {data && data.total > 0 && (
        <div className="flex-1 overflow-auto py-5">
          <Table>
            <THead>
              <TR>
                <TH>lado</TH>
                <TH>cara</TH>
                <TH>solicitud / propuesta</TH>
                <TH>articulo</TH>
                <TH>formato</TH>
                <TH>ciudad</TH>
                <TH numeric>caras</TH>
                <TH numeric>tarifa pública</TH>
                <TH>pendiente desde</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {combined.map((h) => (
                <HuerfanaRow key={`${h.lado}-${h.cara_id}`} h={h} />
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function timeAgo(iso: string | null): string {
  if (!iso) return '—';
  const diffMs = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diffMs / (60 * 60 * 1000));
  if (h < 1) return 'hace <1h';
  if (h < 48) return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 30) return `hace ${d}d`;
  const m = Math.floor(d / 30);
  return `hace ${m}m`;
}

function HuerfanaRow({ h }: { h: Huerfana }) {
  const ageMs = h.created_at ? Date.now() - new Date(h.created_at).getTime() : 0;
  const ageH = ageMs / (60 * 60 * 1000);
  const ageTone = ageH > 72 ? 'text-negative' : ageH > 24 ? 'text-orange-ink' : 'text-muted';
  const appUrl = h.propuesta_id
    ? `https://app.qeb.mx/propuestas/${h.propuesta_id}`
    : h.solicitud_id
      ? `https://app.qeb.mx/solicitudes/${h.solicitud_id}`
      : null;

  return (
    <TR>
      <TD>
        <StatusPill tone={h.lado === 'dg' ? 'warning' : 'negative'}>
          <span className="mono uppercase">{h.lado}</span>
        </StatusPill>
      </TD>
      <TD mono numeric>{h.cara_id}</TD>
      <TD>
        <div className="flex flex-col text-meta">
          {h.solicitud_id && <span className="mono text-ink">sol #{h.solicitud_id}</span>}
          {h.propuesta_id && <span className="mono text-muted">prop #{h.propuesta_id}</span>}
        </div>
      </TD>
      <TD mono className="max-w-xs truncate" title={h.articulo ?? ''}>{h.articulo ?? '—'}</TD>
      <TD muted>{h.formato ?? '—'}</TD>
      <TD muted>{h.ciudad ?? '—'}</TD>
      <TD numeric>{h.caras ?? '—'}</TD>
      <TD numeric mono>{h.tarifa_publica == null ? '—' : h.tarifa_publica.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}</TD>
      <TD mono className={cn(ageTone, 'font-medium')} title={h.created_at ?? ''}>{timeAgo(h.created_at)}</TD>
      <TD>
        {appUrl && (
          <a
            href={appUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-meta text-muted hover:text-ink underline"
            title="abrir en app.qeb.mx"
          >
            abrir
            <ArrowSquareOut size={11} weight="bold" aria-hidden />
          </a>
        )}
      </TD>
    </TR>
  );
}
