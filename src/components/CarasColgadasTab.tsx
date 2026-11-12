import { useEffect, useMemo, useState } from 'react';
import { api, DbName } from '../lib/api';
import { PageTitle, Button, StatusPill, Table, THead, TBody, TR, TH, TD, QebLoader, cn } from '../ds';
import { ArrowSquareOut } from '@phosphor-icons/react';

const DB: DbName = 'main';

interface CampanaColgada {
  campania_id: number;
  nombre: string | null;
  status: string | null;
  fecha_aprobacion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  reservadas_colgadas: number;
  propuesta_id: number | null;
}

interface Report {
  db: DbName;
  campanas: CampanaColgada[];
  total_campanas: number;
  total_caras: number;
  consultedAt: string;
}

export default function CarasColgadasTab() {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      setData(await api.carasColgadas(DB));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const finding = useMemo((): React.ReactNode => {
    if (!data) return null;
    if (data.total_campanas === 0) return <>No hay caras colgadas en producción. Meta mantenida.</>;
    return (
      <>
        <span className="num mono text-negative">{data.total_caras}</span> caras en{' '}
        <span className="mono text-ink">Reservado</span> colgadas dentro de{' '}
        <span className="num mono text-negative">{data.total_campanas}</span> campaña(s) ya vendida(s).
      </>
    );
  }, [data]);

  return (
    <div className="flex h-full flex-col">
      <PageTitle
        title="Caras colgadas"
        finding={finding}
        actions={<Button size="sm" onClick={load} disabled={loading}>{loading ? 'cargando…' : 'refrescar'}</Button>}
      />

      <div className="flex items-start gap-4 pb-4 hairline-b">
        <div className="text-meta text-muted">
          Reservas en <span className="mono text-ink">'Reservado'</span> activas dentro de campañas ya vendidas
          (con <code className="mono text-ink">fecha_aprobacion</code> y no canceladas). Patrón del caso Oral B
          30-oct-2026: caras agregadas post-pase-a-ventas nacen tentativas y nadie las promueve a Vendido,
          quedando invisibles para los candados anti-choque. Meta: <span className="mono text-ink">0</span>.
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

      {data && data.total_campanas === 0 && (
        <div className="mt-6 rounded-chip border border-dashed border-positive/30 px-3 py-2 text-meta text-positive">
          Todo limpio: no hay reservas en Reservado colgadas en campañas vendidas.
        </div>
      )}

      {data && data.total_campanas > 0 && (
        <div className="flex-1 overflow-auto py-5">
          <Table>
            <THead>
              <TR>
                <TH>campaña</TH>
                <TH>status</TH>
                <TH numeric>caras colgadas</TH>
                <TH>vigencia</TH>
                <TH>aprobada</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {data.campanas.map((c) => (
                <CampanaRow key={c.campania_id} c={c} />
              ))}
            </TBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function formatDateShort(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' });
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

function CampanaRow({ c }: { c: CampanaColgada }) {
  const appUrl = `https://app.qeb.mx/campanas/detail/${c.campania_id}`;
  const statusTone = c.reservadas_colgadas >= 50 ? 'negative' : c.reservadas_colgadas >= 10 ? 'warning' : 'neutral';

  return (
    <TR>
      <TD>
        <div className="flex flex-col text-meta">
          <span className="font-medium text-ink">{c.nombre ?? '(sin nombre)'}</span>
          <span className="mono text-muted">#{c.campania_id}</span>
        </div>
      </TD>
      <TD>
        <StatusPill tone="neutral">
          <span className="mono">{c.status ?? '—'}</span>
        </StatusPill>
      </TD>
      <TD numeric>
        <StatusPill tone={statusTone}>
          <span className="num mono">{c.reservadas_colgadas}</span>
        </StatusPill>
      </TD>
      <TD mono muted className="text-meta">
        {formatDateShort(c.fecha_inicio)} → {formatDateShort(c.fecha_fin)}
      </TD>
      <TD mono muted className={cn('text-meta')} title={c.fecha_aprobacion ?? ''}>
        {timeAgo(c.fecha_aprobacion)}
      </TD>
      <TD>
        <a
          href={appUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-meta text-muted hover:text-ink underline"
          title="abrir campaña en app.qeb.mx"
        >
          abrir
          <ArrowSquareOut size={11} weight="bold" aria-hidden />
        </a>
      </TD>
    </TR>
  );
}
