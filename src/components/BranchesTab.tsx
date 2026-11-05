import { useEffect, useMemo, useState } from 'react';
import { api, BranchName, DiffCommit, RepoName } from '../lib/api';
import { PageTitle, Select, Checkbox, Button, StatusPill, LadderBadge, cn, type LadderSlot } from '../ds';

const FLOW_ORDER: BranchName[] = ['stage', 'dev', 'release', 'main'];

function presenceSlot(p: 'exact' | 'equivalent' | 'absent'): LadderSlot {
  if (p === 'exact') return 'present';
  if (p === 'equivalent') return 'equivalent';
  return 'absent';
}

const BRANCHES: BranchName[] = ['main', 'stage', 'dev', 'release'];
const REPOS: RepoName[] = ['front', 'back'];

export default function BranchesTab() {
  const [repo, setRepo] = useState<RepoName>('back');
  const [a, setA] = useState<BranchName>('main');
  const [b, setB] = useState<BranchName>('dev');
  const [heads, setHeads] = useState<Record<BranchName, string | undefined>>({} as any);
  const [diff, setDiff] = useState<{ onlyInA: DiffCommit[]; onlyInB: DiffCommit[]; common: string; summary: { exclusivosA: number; exclusivosB: number; equivalentesA: number; equivalentesB: number; mergesA: number; mergesB: number; revertsA: number; revertsB: number } } | null>(null);
  const [hideEquiv, setHideEquiv] = useState(true);
  const [hideMerges, setHideMerges] = useState(true);
  const [hideReverts, setHideReverts] = useState(true);
  const [hideIgnored, setHideIgnored] = useState(true);

  const [files, setFiles] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileText, setFileText] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleIgnore(c: DiffCommit) {
    try {
      if (c.isIgnored) await api.removeIgnored(repo, c.hash);
      else await api.addIgnored(repo, c.hash, c.subject);
      await run();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    api.heads(repo).then((hs) => {
      const m: any = {};
      for (const h of hs) m[h.branch] = h.shortHash;
      setHeads(m);
    }).catch((e) => setError(String(e)));
  }, [repo]);

  async function run() {
    setLoading(true);
    setError(null);
    setSelectedFile(null);
    setFileText('');
    try {
      const [d, f] = await Promise.all([api.compare(repo, a, b), api.files(repo, a, b)]);
      setDiff(d);
      setFiles(f);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function pickFile(f: string) {
    setSelectedFile(f);
    setFileText('cargando diff…');
    try {
      setFileText(await api.fileDiff(repo, a, b, f));
    } catch (e: any) {
      setFileText(`error: ${e?.message ?? e}`);
    }
  }

  useEffect(() => { run(); /* eslint-disable-next-line */ }, [repo, a, b]);

  const sameSha = useMemo(() => heads[a] && heads[b] && heads[a] === heads[b], [heads, a, b]);

  const finding = useMemo(() => {
    if (!diff) return null;
    const exclA = diff.summary.exclusivosA - (hideReverts ? diff.summary.revertsA : 0);
    const exclB = diff.summary.exclusivosB;
    if (sameSha) return <>Las dos ramas apuntan al mismo HEAD <span className="mono text-ink">{heads[a]}</span>.</>;
    return <>En <span className="mono text-ink">{a}</span> hay <span className="mono text-ink">{exclA}</span> commits exclusivos, en <span className="mono text-ink">{b}</span> hay <span className="mono text-ink">{exclB}</span>.</>;
  }, [diff, sameSha, heads, a, b, hideReverts]);

  return (
    <div className="flex h-full flex-col">
      <PageTitle title="Ramas" finding={finding} />

      <div className="flex items-center gap-4 pb-4 hairline-b">
        <Select label="repo" value={repo} onChange={(e) => setRepo(e.target.value as RepoName)}>
          {REPOS.map((r) => <option key={r} value={r}>{r}-qeb</option>)}
        </Select>
        <Select label="A" value={a} onChange={(e) => setA(e.target.value as BranchName)}>
          {BRANCHES.map((br) => <option key={br} value={br}>{br}{heads[br] ? ` · ${heads[br]}` : ''}</option>)}
        </Select>
        <Select label="B" value={b} onChange={(e) => setB(e.target.value as BranchName)}>
          {BRANCHES.map((br) => <option key={br} value={br}>{br}{heads[br] ? ` · ${heads[br]}` : ''}</option>)}
        </Select>
        <Button size="sm" onClick={run} disabled={loading}>
          {loading ? 'cargando…' : 'refrescar'}
        </Button>
        {sameSha && <StatusPill tone="positive"><span className="mono">HEADs iguales</span></StatusPill>}
        {error && <StatusPill tone="negative">{error}</StatusPill>}
      </div>

      <div className="flex flex-wrap items-center gap-5 py-3 hairline-b">
        <Checkbox checked={hideEquiv} onChange={setHideEquiv} label="ocultar equivalentes" />
        <Checkbox checked={hideMerges} onChange={setHideMerges} label="ocultar merges" />
        <Checkbox checked={hideReverts} onChange={setHideReverts} label="ocultar reverts" />
        <Checkbox checked={hideIgnored} onChange={setHideIgnored} label="ocultar ignorados" />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-12 gap-0">
        <CommitColumn
          side="A"
          title={`solo en ${a}`}
          summary={diff ? { exclusivos: diff.summary.exclusivosA, equivalentes: diff.summary.equivalentesA, merges: diff.summary.mergesA, reverts: diff.summary.revertsA } : undefined}
          commits={(diff?.onlyInA ?? []).filter((c) => (!hideEquiv || c.kind === 'exclusivo') && (!hideMerges || !c.isMerge) && (!hideReverts || !c.isRevert) && (!hideIgnored || !c.isIgnored))}
          onToggleIgnore={toggleIgnore}
          className="col-span-3"
        />
        <CommitColumn
          side="B"
          title={`solo en ${b}`}
          summary={diff ? { exclusivos: diff.summary.exclusivosB, equivalentes: diff.summary.equivalentesB, merges: diff.summary.mergesB, reverts: diff.summary.revertsB } : undefined}
          commits={(diff?.onlyInB ?? []).filter((c) => (!hideEquiv || c.kind === 'exclusivo') && (!hideMerges || !c.isMerge) && (!hideReverts || !c.isRevert) && (!hideIgnored || !c.isIgnored))}
          onToggleIgnore={toggleIgnore}
          className="col-span-3"
        />
        <div className="col-span-2 border-l border-r border-rule overflow-y-auto bg-ground">
          <div className="sticky top-0 z-10 bg-ground px-3 py-2 hairline-b">
            <div className="text-meta text-muted">archivos diff</div>
          </div>
          {files.length === 0 && <div className="px-3 py-4 text-meta text-muted">sin diferencias</div>}
          <ul className="text-meta mono">
            {files.map((f) => (
              <li
                key={f}
                className={cn(
                  'cursor-pointer border-b border-rule px-3 py-1.5 hover:bg-surface break-all',
                  selectedFile === f ? 'bg-surface text-ink select-line-top' : 'text-muted',
                )}
                onClick={() => pickFile(f)}
                title={f}
              >
                {f}
              </li>
            ))}
          </ul>
        </div>
        <div className="col-span-4 overflow-auto bg-ground">
          <div className="sticky top-0 z-10 bg-ground px-3 py-2 hairline-b mono text-meta text-muted">
            {selectedFile ?? 'selecciona un archivo'}
          </div>
          <pre className="whitespace-pre p-3 text-meta leading-tight mono text-ink">{fileText}</pre>
        </div>
      </div>
    </div>
  );
}

function CommitColumn({ title, commits, className, summary, side, onToggleIgnore }: {
  title: string;
  commits: DiffCommit[];
  className?: string;
  summary?: { exclusivos: number; equivalentes: number; merges: number; reverts: number };
  side: 'A' | 'B';
  onToggleIgnore?: (c: DiffCommit) => void;
}) {
  return (
    <div className={cn(className, 'overflow-y-auto border-r border-rule bg-ground')}>
      <div className="sticky top-0 z-10 bg-ground px-3 py-2 hairline-b">
        <div className="flex items-baseline gap-2">
          <span className="text-label text-ink font-medium">{title}</span>
          <span className="num mono text-meta text-muted">({commits.length})</span>
        </div>
        {summary && (
          <div className="mt-1 text-meta text-muted mono">
            <span className="num">{summary.exclusivos}</span> excl ·{' '}
            <span className="num">{summary.equivalentes}</span> equiv ·{' '}
            <span className="num">{summary.merges}</span> merges ·{' '}
            <span className="num">{summary.reverts}</span> reverts
          </div>
        )}
      </div>

      {commits.length === 0 && <div className="px-3 py-4 text-meta text-muted">sin commits</div>}

      <ul>
        {commits.map((c) => (
          <li
            key={c.hash}
            className={cn(
              'border-b border-rule px-3 py-2.5 hover:bg-surface transition-colors',
              c.kind === 'equivalente' && 'opacity-70',
            )}
          >
            <div className="flex flex-wrap items-center gap-2 text-meta text-muted mono">
              <span className="text-ink">{c.shortHash}</span>
              <span>·</span>
              <span className="num">{new Date(c.date).toLocaleString()}</span>
              {c.isMerge && <StatusPill tone="neutral"><span className="mono">merge</span></StatusPill>}
              {c.isRevert && <StatusPill tone="neutral"><span className="mono">revert</span></StatusPill>}
              {c.isIgnored && <StatusPill tone="neutral"><span className="mono">ignorado</span></StatusPill>}
              {c.kind === 'equivalente' && (
                <StatusPill tone="neutral">
                  <span className="mono" title={c.equivalentOf ? `equivalente a ${c.equivalentOf}` : 'equivalente por patch-id'}>
                    {c.equivalentOf ? `≈ ${c.equivalentOf}` : 'equiv'}
                  </span>
                </StatusPill>
              )}
              <LadderBadge
                slots={FLOW_ORDER.map((br) => presenceSlot(c.presence[br])) as [LadderSlot, LadderSlot, LadderSlot, LadderSlot]}
                labels={FLOW_ORDER as unknown as [string, string, string, string]}
                size="sm"
              />
              {onToggleIgnore && (
                <button
                  type="button"
                  className="ml-auto text-meta text-muted hover:text-ink underline"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleIgnore(c);
                  }}
                  title={c.isIgnored ? 'des-ignorar' : 'marcar como intencional'}
                >
                  {c.isIgnored ? 'des-ignorar' : 'ignorar'}
                </button>
              )}
            </div>
            <div className={cn('mt-1 text-body break-words', side === 'A' ? 'text-ink' : 'text-ink')}>{c.subject}</div>
            <div className="text-meta text-muted">{c.author}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
