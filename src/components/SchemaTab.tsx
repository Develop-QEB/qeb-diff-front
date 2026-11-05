import { useEffect, useMemo, useState } from 'react';
import { api, DbName } from '../lib/api';
import { PageTitle, Select, Button, StatusPill, DiffTokens, cn } from '../ds';

const DBS: DbName[] = ['main', 'dev', 'release', 'stage'];

export default function SchemaTab() {
  const [a, setA] = useState<DbName>('main');
  const [b, setB] = useState<DbName>('dev');
  const [ping, setPing] = useState<any>(null);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { api.schemaPing().then(setPing).catch((e) => setError(String(e))); }, []);

  async function run(refresh = false) {
    setLoading(true);
    setError(null);
    try {
      setData(await api.schemaCompare(a, b, refresh));
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { run(false); /* eslint-disable-next-line */ }, [a, b]);

  const diff = data?.diff;

  const finding = useMemo(() => {
    if (!diff) return null;
    const n = (diff.tables.onlyInA?.length ?? 0) + (diff.tables.onlyInB?.length ?? 0) + (diff.tables.inBoth?.length ?? 0);
    if (n === 0) return <>Schema de <span className="mono text-ink">{a}</span> y <span className="mono text-ink">{b}</span> coincide.</>;
    return <><span className="mono text-ink">{diff.tables.inBoth.length}</span> tablas con diferencias reales entre <span className="mono text-ink">{a}</span> y <span className="mono text-ink">{b}</span>.</>;
  }, [diff, a, b]);

  return (
    <div className="flex h-full flex-col">
      <PageTitle title="Bases de datos" finding={finding} />

      <div className="flex items-center gap-4 pb-4 hairline-b">
        <Select label="A" value={a} onChange={(e) => setA(e.target.value as DbName)}>
          {DBS.map((d) => <option key={d} value={d}>{d}{ping?.[d]?.version ? ` · ${ping[d].version}` : ''}</option>)}
        </Select>
        <Select label="B" value={b} onChange={(e) => setB(e.target.value as DbName)}>
          {DBS.map((d) => <option key={d} value={d}>{d}{ping?.[d]?.version ? ` · ${ping[d].version}` : ''}</option>)}
        </Select>
        <Button size="sm" onClick={() => run(true)} disabled={loading}>
          {loading ? 'cargando…' : 'refrescar desde BD'}
        </Button>

        {ping && (
          <div className="ml-auto flex flex-wrap gap-1.5">
            {DBS.map((d) => {
              const p = ping[d];
              if (!p?.ok) {
                return (
                  <StatusPill key={d} tone="negative">
                    <span className="mono">{d}</span>: {p?.error ?? 'err'}
                  </StatusPill>
                );
              }
              const anyP = p as any;
              return (
                <span
                  key={d}
                  title={`${p.tablesBase} tablas base + ${p.views} vistas + ${p.routines} routines · ${anyP.columnsBase} cols base + ${anyP.columnsViews} cols vistas`}
                  className="inline-flex items-center gap-1 rounded-chip border border-border bg-surface px-2 py-0.5 text-meta"
                >
                  <span className="mono text-ink">{d}</span>
                  <span className="text-muted">·</span>
                  <span className="num mono text-muted">{p.tables} tablas · {p.columns} cols</span>
                </span>
              );
            })}
          </div>
        )}
      </div>

      {error && (
        <div className="my-3 rounded-chip border border-negative/30 bg-negative-bg px-3 py-2 text-body text-negative-ink">{error}</div>
      )}

      {diff && (
        <div className="flex-1 space-y-8 overflow-auto py-5">
          <Section title={`tablas solo en ${a}`} items={diff.tables.onlyInA} />
          <Section title={`tablas solo en ${b}`} items={diff.tables.onlyInB} />

          <div>
            <div className="flex items-baseline gap-2 mb-3">
              <h2>Tablas con diferencias</h2>
              <span className="num mono text-meta text-muted">({diff.tables.inBoth.length})</span>
            </div>
            {diff.tables.inBoth.length === 0 && (
              <div className="rounded-chip border border-dashed border-positive/30 px-3 py-2 text-meta text-positive">
                Todas las tablas comunes coinciden en columnas, índices y FKs.
              </div>
            )}
            <div className="space-y-6">
              {diff.tables.inBoth.map((t: any) => (
                <TableDiff key={t.name} t={t} a={a} b={b} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <ListDiff title="vistas" diff={diff.views} a={a} b={b} />
            <ListDiff title="stored procedures / funciones" diff={diff.routines} a={a} b={b} itemLabel={(x: any) => `${x.name ?? x} (${x.type ?? ''})`} />
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h2 className="mb-2">{title} <span className="num mono text-meta text-muted">({items.length})</span></h2>
      <div className="flex flex-wrap gap-1.5">
        {items.map((n) => (
          <code key={n} className="mono text-meta rounded-chip border border-border bg-surface px-2 py-0.5 text-ink">{n}</code>
        ))}
      </div>
    </div>
  );
}

function TableDiff({ t, a, b }: { t: any; a: string; b: string }) {
  return (
    <div className="hairline-t pt-4">
      <h3 className="mono text-section mb-3 text-ink">{t.name}</h3>
      <div className="space-y-4 text-body">
        <DiffBlock label="columnas" data={t.columns} a={a} b={b} renderChange={(c) => <ColumnDiffRow c={c} />} />
        <DiffBlock label="índices" data={t.indexes} a={a} b={b} renderChange={(c) => <IndexDiffRow c={c} />} />
        <DiffBlock label="foreign keys" data={t.foreignKeys} a={a} b={b} renderChange={(c) => <FkDiffRow c={c} />} />
      </div>
    </div>
  );
}

function DiffBlock({ label, data, a, b, renderChange }: {
  label: string;
  data: any;
  a: string;
  b: string;
  renderChange: (c: any) => React.ReactNode;
}) {
  const n = (data.onlyInA?.length ?? 0) + (data.onlyInB?.length ?? 0) + (data.changed?.length ?? 0);
  if (n === 0) return null;
  return (
    <div>
      <div className="text-meta uppercase tracking-wider text-muted mb-1.5">{label}</div>
      {data.onlyInA?.length > 0 && (
        <div className="text-body text-muted mb-1">
          solo en <span className="mono text-ink">{a}</span>:{' '}
          {data.onlyInA.map((x: any) => (
            <code key={typeof x === 'string' ? x : x.name} className="mono text-ink ml-1">
              {typeof x === 'string' ? x : x.name}
            </code>
          ))}
        </div>
      )}
      {data.onlyInB?.length > 0 && (
        <div className="text-body text-muted mb-1">
          solo en <span className="mono text-ink">{b}</span>:{' '}
          {data.onlyInB.map((x: any) => (
            <code key={typeof x === 'string' ? x : x.name} className="mono text-ink ml-1">
              {typeof x === 'string' ? x : x.name}
            </code>
          ))}
        </div>
      )}
      {data.changed?.length > 0 && (
        <ul className="space-y-2.5">
          {data.changed.map((c: any) => (
            <li key={c.name}>{renderChange(c)}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function colToStr(c: any): string {
  return `${c.type} ${c.nullable ? 'NULL' : 'NOT NULL'}${c.default != null ? ` default ${c.default}` : ''}${c.extra ? ` ${c.extra}` : ''}`;
}
function idxToStr(i: any): string {
  return `(${i.columns.join(',')})${i.unique ? ' UNIQUE' : ''} ${i.type ?? ''}`.trim();
}
function fkToStr(f: any): string {
  return `(${f.columns.join(',')}) -> ${f.refTable}(${f.refColumns.join(',')}) ON UPDATE ${f.onUpdate} ON DELETE ${f.onDelete}`;
}

function DiffRowShell({ name, fields, a, b }: { name: string; fields: string[]; a: string; b: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-2 text-body">
        <code className="mono text-ink">{name}</code>
        <span className="text-muted">cambia en</span>
        <span className="mono text-meta text-muted">{fields.join(', ')}</span>
      </div>
      <div className="mt-1 ml-0 grid gap-y-0.5">
        <div className="text-meta"><span className="text-muted mono">A=</span><DiffTokens value={a} others={[b]} /></div>
        <div className="text-meta"><span className="text-muted mono">B=</span><DiffTokens value={b} others={[a]} /></div>
      </div>
    </div>
  );
}

function ColumnDiffRow({ c }: { c: any }) { return <DiffRowShell name={c.name} fields={c.fields} a={colToStr(c.a)} b={colToStr(c.b)} />; }
function IndexDiffRow({ c }: { c: any }) { return <DiffRowShell name={c.name} fields={c.fields} a={idxToStr(c.a)} b={idxToStr(c.b)} />; }
function FkDiffRow({ c }: { c: any }) { return <DiffRowShell name={c.name} fields={c.fields} a={fkToStr(c.a)} b={fkToStr(c.b)} />; }

function ListDiff({ title, diff, a, b, itemLabel }: {
  title: string;
  diff: any;
  a: string;
  b: string;
  itemLabel?: (x: any) => string;
}) {
  const label = itemLabel ?? ((x: any) => typeof x === 'string' ? x : x.name);
  return (
    <div>
      <h2 className="mb-2">{title}</h2>
      <div className={cn('space-y-1 text-body')}>
        {diff.onlyInA?.length > 0 && (
          <div className="text-muted">solo en <span className="mono text-ink">{a}</span>:{' '}
            {diff.onlyInA.map((x: any) => <code key={label(x)} className="mono text-ink ml-1">{label(x)}</code>)}
          </div>
        )}
        {diff.onlyInB?.length > 0 && (
          <div className="text-muted">solo en <span className="mono text-ink">{b}</span>:{' '}
            {diff.onlyInB.map((x: any) => <code key={label(x)} className="mono text-ink ml-1">{label(x)}</code>)}
          </div>
        )}
        {diff.changed?.length > 0 && (
          <div className="text-muted">cambiados:{' '}
            {diff.changed.map((c: any) => <code key={c.name} className="mono text-ink ml-1">{c.name}</code>)}
          </div>
        )}
        {!(diff.onlyInA?.length || diff.onlyInB?.length || diff.changed?.length) && (
          <div className="text-positive text-meta">sin diferencias</div>
        )}
      </div>
    </div>
  );
}
