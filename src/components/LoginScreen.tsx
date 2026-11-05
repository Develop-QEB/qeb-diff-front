import { useState } from 'react';
import { ArrowsLeftRight } from '@phosphor-icons/react';
import { api } from '../lib/api';
import { Button } from '../ds';

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await api.login(password);
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
        <div className="flex items-center gap-2 mb-6">
          <ArrowsLeftRight size={18} weight="bold" aria-hidden className="text-ink" />
          <h1 className="text-section font-semibold leading-none">qeb-diff</h1>
        </div>

        <p className="text-meta text-muted mb-5">
          Herramienta interna del equipo <span className="mono text-ink">Develop-QEB</span>. Acceso restringido.
        </p>

        <label className="block" htmlFor="pwd">
          <span className="text-meta text-muted">password</span>
          <input
            id="pwd"
            type="password"
            autoFocus
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
          disabled={loading || !password.trim()}
          className="mt-5 w-full"
        >
          {loading ? 'validando…' : 'entrar'}
        </Button>

        <p className="mt-4 text-meta text-muted">
          Si no tienes la password, pídela a Akary o Mario.
        </p>
      </form>
    </div>
  );
}
