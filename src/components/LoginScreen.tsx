import { useState } from 'react';
import { api } from '../lib/api';
import { Button } from '../ds';

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.login(username.trim(), password);
      onLoggedIn();
    } catch (e: any) {
      setError(e?.message ?? 'no se pudo iniciar sesion');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-ground">
      <form
        onSubmit={submit}
        className="w-[360px] rounded-card border border-border bg-surface px-8 py-7"
      >
        <div className="flex items-center gap-3 mb-6">
          <img src="/qeb-logo.svg" alt="QEB" width={34} height={34} className="object-contain" />
          <div className="flex items-baseline gap-1.5">
            <h1 className="text-section font-semibold leading-none">qeb-diff</h1>
            <span className="mono text-muted text-meta">⇄</span>
          </div>
        </div>

        <p className="text-meta text-muted mb-5">
          Herramienta interna del equipo <span className="mono text-ink">Develop-QEB</span>. Acceso restringido.
        </p>

        <label className="block mb-4" htmlFor="user">
          <span className="text-meta text-muted">usuario</span>
          <input
            id="user"
            type="text"
            autoFocus
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-chip border border-border bg-raised px-3 text-body text-ink placeholder:text-muted focus:border-accent caret-accent mono"
            placeholder="akary"
          />
        </label>

        <label className="block" htmlFor="pwd">
          <span className="text-meta text-muted">password</span>
          <input
            id="pwd"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1.5 h-9 w-full rounded-chip border border-border bg-raised px-3 text-body text-ink placeholder:text-muted focus:border-accent caret-accent mono"
            placeholder="···········"
          />
        </label>

        {error && (
          <div className="mt-3 text-meta text-negative-ink bg-negative-bg border border-negative/30 rounded-chip px-2 py-1.5">
            {error}
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          disabled={loading || !username.trim() || !password.trim()}
          className="mt-5 w-full"
        >
          {loading ? 'validando…' : 'entrar'}
        </Button>

        <p className="mt-4 text-meta text-muted">
          Si no tienes acceso, pídele a Akary o Mario que te den de alta.
        </p>
      </form>
    </div>
  );
}
