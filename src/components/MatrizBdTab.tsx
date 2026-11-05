import { useEffect, useMemo, useState } from 'react';
import { api, DbName } from '../lib/api';
import { PageTitle, Button, Checkbox, LadderBadge, DiffTokens, cn, type LadderSlot } from '../ds';
import { MagnifyingGlass } from '@phosphor-icons/react';

interface Variant { db: DbName; valor: string | null }
interface Item { tipo: string; tabla?: string; nombre: string; variantes: Variant[] }
interface Report {
  dbs: DbName[];
  tablas: Record<string, { estaEn: DbName[]; columnas: Item[]; indices: Item[]; fks: Item[] }>;
  vistas: Item[];
  routines: Item[];
}

const DB_ORDER: DbName[] = ['stage', 'dev', 'release', 'main'];

export default function MatrizBdTab() {
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [show, setShow] = useState({ columnas: true, indices: true, fks: true, vistas: true, routines: true });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setData(await api.schemaMatrix());
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!data) return null;
    const q = filter.trim().toLowerCase();
    const match = (s: string) => !q || s.toLowerCase().includes(q);
    const out: Report = { dbs: data.dbs, tablas: {}, vistas: [], routines: [] };
    for (const [name, t] of Object.entries(data.tablas)) {
      const columnas = show.columnas ? t.columnas.filter((c) => match(name) || match(c.nombre)) : [];
      const indices = show.indices ? t.indices.filter((i) => match(name) || match(i.nombre)) : [];
      const fks = show.fks ? t.fks.filter((f) => match(name) || match(f.nombre)) : [];
      if (columnas.length || indices.length || fks.length) out.tablas[name] = { estaEn: t.estaEn, columnas, indices, fks };
    }
    out.vistas = show.vistas ? data.vistas.filter((v) => match(v.nombre)) : [];
    out.routines = show.routines ? data.routines.filter((r) => match(r.nombre)) : [];
    return out;
  }, [data, filter, show]);

  const totales = useMemo(() => {
    if (!data) return null;
    const t = { columnas: 0, indices: 0, fks: 0, vistas: data.vistas.length, routines: data.routines.length };
    for (const x of Object.values(data.tablas)) {
      t.columnas += x.columnas.length;
      t.indices += x.indices.length;
      t.fks += x.fks.length;
    }
    return t;
  }, [data]);

  const finding = useMemo(() => {
    if (!totales) return 'cargando…';
    const n = totales.columnas + totales.indices + totales.fks + totales.vistas + totales.routines;
    if (n === 0) return 'Las 4 BDs coinciden estructuralmente.';
    return <><span className="mono text-ink">{n}</span> elementos difieren entre las 4 BDs.</>;
  }, [totales]);

  return (
    <div className="flex h-full flex-col">
      <PageTitle title="Matriz BD" finding={finding} actions={<Button size="sm" onClick={load} disabled={loading}>{loading ? 'cargando…' : 'refrescar'}</Button>} />

      <div className="flex flex-wrap items-center gap-4 pb-4 hairline-b">
        <label className="relative">
          <MagnifyingGlass size={14} weight="regular" aria-hidden className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="search"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="filtrar por tabla / columna / índice"
            className="h-8 w-72 rounded-chip border border-border bg-surface pl-8 pr-3 text-body text-ink placeholder:text-muted focus:border-accent caret-accent"
          />
        </label>
        <div className="flex gap-4">
          {(['columnas', 'indices', 'fks', 'vistas', 'routines'] as const).map((k) => (
            <Checkbox key={k} checked={show[k]} onChange={(v) => setShow({ ...show, [k]: v })} label={k} />
          ))}
        </div>
      </div>

      {error && (
        <div className="my-3 rounded-chip border border-negative/30 bg-negative-bg px-3 py-2 text-body text-negative-ink">{error}</div>
      )}

      {totales && (
        <div className="mt-3 flex flex-wrap gap-6 text-meta text-muted">
          {Object.entries({ columnas: totales.columnas, indices: totales.indices, fks: totales.fks, vistas: totales.vistas, routines: totales.routines }).map(([k, v]) => (
            <span key={k}>
              {k} <span className="ml-1 num mono text-ink">{v}</span>
            </span>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto py-5 space-y-6">
        {filtered && Object.entries(filtered.tablas).map(([name, t]) => (
          <section key={name} className="hairline-t pt-4">
            <div className="flex flex-wrap items-baseline gap-3 mb-3">
              <h3 className="mono text-section text-ink">{name}</h3>
              <span className="text-meta text-muted">presente en</span>
              <LadderBadge
                slots={DB_ORDER.map((d) => (t.estaEn.includes(d) ? 'present' : 'absent')) as [LadderSlot, LadderSlot, LadderSlot, LadderSlot]}
                labels={[...DB_ORDER] as [string, string, string, string]}
                showText
              />
            </div>
            <div className="space-y-4">
              {t.columnas.length > 0 && <ElementBlock label="columnas" items={t.columnas} />}
              {t.indices.length > 0 && <ElementBlock label="índices" items={t.indices} />}
              {t.fks.length > 0 && <ElementBlock label="foreign keys" items={t.fks} />}
            </div>
          </section>
        ))}

        {filtered && filtered.vistas.length > 0 && (
          <section className="hairline-t pt-4">
            <h3 className="text-section text-ink mb-3">vistas con diferencias</h3>
            <ElementBlock label="vistas" items={filtered.vistas} />
          </section>
        )}

        {filtered && filtered.routines.length > 0 && (
          <section className="hairline-t pt-4">
            <h3 className="text-section text-ink mb-3">stored procedures / funciones</h3>
            <ElementBlock label="routines" items={filtered.routines} />
          </section>
        )}

        {filtered && Object.keys(filtered.tablas).length === 0 && filtered.vistas.length === 0 && filtered.routines.length === 0 && (
          <div className="rounded-chip border border-dashed border-positive/30 px-3 py-2 text-meta text-positive">
            Sin diferencias estructurales entre las 4 BDs para los filtros actuales.
          </div>
        )}
      </div>
    </div>
  );
}

function ElementBlock({ label, items }: { label: string; items: Item[] }) {
  return (
    <div className="space-y-3">
      <div className="text-meta uppercase tracking-wider text-muted">{label}</div>
      {items.map((it) => (
        <ItemRow key={`${it.tabla ?? ''}:${it.nombre}`} item={it} />
      ))}
    </div>
  );
}

function ItemRow({ item }: { item: Item }) {
  const otherValues = (i: number) => item.variantes.filter((_, j) => j !== i).map((v) => v.valor);
  return (
    <div className="rounded-chip border border-border bg-surface">
      <div className="hairline-b px-3 py-2">
        <code className="mono text-body text-ink">{item.nombre}</code>
      </div>
      <div>
        {item.variantes.map((v, i) => (
          <div key={v.db} className={cn('grid grid-cols-[88px_1fr] items-start px-3 py-1.5', i < item.variantes.length - 1 && 'border-b border-rule')}>
            <div className="mono text-meta text-muted pt-0.5">{v.db}</div>
            <div className="min-w-0 break-all">
              {v.valor == null ? <span className="text-faint italic text-meta">no existe</span> : <DiffTokens value={v.valor} others={otherValues(i)} />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
