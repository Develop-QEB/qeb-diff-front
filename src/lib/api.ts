export type RepoName = 'front' | 'back';
export type BranchName = 'main' | 'stage' | 'dev' | 'release';
export type DbName = 'main' | 'dev' | 'release' | 'stage';

export interface Commit {
  hash: string;
  shortHash: string;
  author: string;
  email: string;
  date: string;
  subject: string;
  isMerge: boolean;
  isRevert: boolean;
}

export interface BranchHead {
  branch: BranchName;
  hash: string;
  shortHash: string;
  author: string;
  date: string;
  subject: string;
}

export type CommitPresence = 'exact' | 'equivalent' | 'absent';
export interface DiffCommit extends Commit {
  kind: 'exclusivo' | 'equivalente';
  equivalentOf?: string;
  isIgnored?: boolean;
  presence: Record<BranchName, CommitPresence>;
}

export interface BranchDiffRes {
  onlyInA: DiffCommit[];
  onlyInB: DiffCommit[];
  common: string;
  summary: { exclusivosA: number; exclusivosB: number; equivalentesA: number; equivalentesB: number; mergesA: number; mergesB: number; revertsA: number; revertsB: number };
}

const API_BASE = ((import.meta as any).env?.VITE_API_URL ?? '').toString().replace(/\/+$/, '');
const u = (path: string): string => `${API_BASE}${path}`;

const TOKEN_KEY = 'qeb-diff-token';
export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY) ?? '',
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => localStorage.removeItem(TOKEN_KEY),
};

const unauthHandlers = new Set<() => void>();
export function onUnauthorized(fn: () => void): () => void {
  unauthHandlers.add(fn);
  return () => unauthHandlers.delete(fn);
}
function triggerUnauthorized() {
  tokenStore.clear();
  for (const fn of unauthHandlers) try { fn(); } catch { /* noop */ }
}

function authHeaders(): Record<string, string> {
  const t = tokenStore.get();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

async function j<T>(path: string): Promise<T> {
  const r = await fetch(u(path), { headers: authHeaders() });
  if (r.status === 401) { triggerUnauthorized(); throw new Error('sesion invalida'); }
  if (!r.ok) throw new Error((await r.json()).error || `${r.status}`);
  return r.json();
}
async function t(path: string): Promise<string> {
  const r = await fetch(u(path), { headers: authHeaders() });
  if (r.status === 401) { triggerUnauthorized(); throw new Error('sesion invalida'); }
  if (!r.ok) throw new Error(await r.text());
  return r.text();
}

export const api = {
  health: () => j<{ ok: boolean }>('/api/health'),
  heads: (repo: RepoName) => j<BranchHead[]>(`/api/branches/heads/${repo}`),
  commits: (repo: RepoName, branch: BranchName, limit = 300) => j<Commit[]>(`/api/branches/commits/${repo}/${branch}?limit=${limit}`),
  compare: (repo: RepoName, a: BranchName, b: BranchName) => j<BranchDiffRes>(`/api/branches/compare/${repo}/${a}/${b}`),
  files: (repo: RepoName, a: BranchName, b: BranchName) => j<string[]>(`/api/branches/files/${repo}/${a}/${b}`),
  fileDiff: (repo: RepoName, a: BranchName, b: BranchName, file: string) => t(`/api/branches/file-diff/${repo}/${a}/${b}?file=${encodeURIComponent(file)}`),
  schemaPing: () => j<Record<DbName, { ok: boolean; version?: string; tables?: number; tablesBase?: number; views?: number; routines?: number; columns?: number; error?: string }>>('/api/schema/ping'),
  snapshot: (db: DbName, refresh = false) => j<any>(`/api/schema/snapshot/${db}${refresh ? '?refresh=1' : ''}`),
  schemaCompare: (a: DbName, b: DbName, refresh = false) => j<any>(`/api/schema/compare/${a}/${b}${refresh ? '?refresh=1' : ''}`),
  schemaMatrix: () => j<any>('/api/schema/matrix'),
  diagMigrations: () => j<any>('/api/diagnostico/migrations'),
  diagDeps: (repo: RepoName) => j<any>(`/api/diagnostico/deps/${repo}`),
  diagEnv: (repo: RepoName) => j<any>(`/api/diagnostico/env/${repo}`),
  branchAnomalies: (repo: RepoName) => j<any[]>(`/api/anomalies/branches/${repo}`),
  schemaAnomalies: () => j<any[]>('/api/anomalies/schema'),
  listIgnored: (repo?: RepoName) => j<any[]>(`/api/ignored${repo ? `?repo=${repo}` : ''}`),
  addIgnored: async (repo: RepoName, hash: string, subject: string, reason?: string) => {
    const r = await fetch(u('/api/ignored'), { method: 'POST', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify({ repo, hash, subject, reason }) });
    if (!r.ok) throw new Error((await r.json()).error);
    return r.json();
  },
  removeIgnored: async (repo: RepoName, hash: string) => {
    const r = await fetch(u('/api/ignored'), { method: 'DELETE', headers: { 'content-type': 'application/json', ...authHeaders() }, body: JSON.stringify({ repo, hash }) });
    if (!r.ok) throw new Error((await r.json()).error);
    return r.json();
  },
  login: async (password: string) => {
    const r = await fetch(u('/api/auth/login'), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password }) });
    if (!r.ok) throw new Error((await r.json()).error ?? 'login fallido');
    const { token } = await r.json();
    tokenStore.set(token);
    return token as string;
  },
  checkAuth: async () => {
    const r = await fetch(u('/api/auth/check'), { headers: authHeaders() });
    const body = await r.json();
    return Boolean(body?.ok);
  },
  logout: () => tokenStore.clear(),
};
