import { useEffect, useState } from 'react';
import BranchesTab from './components/BranchesTab';
import SchemaTab from './components/SchemaTab';
import AnomaliasTab from './components/AnomaliasTab';
import MatrizBdTab from './components/MatrizBdTab';
import DiagnosticoTab from './components/DiagnosticoTab';
import LoginScreen from './components/LoginScreen';
import { IconRail, type RailTab } from './ds';
import { api, onUnauthorized, tokenStore } from './lib/api';

type AuthState = 'checking' | 'in' | 'out';

export default function App() {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [tab, setTab] = useState<RailTab>('branches');

  useEffect(() => {
    if (!tokenStore.get()) {
      setAuthState('out');
      return;
    }
    api.checkAuth().then((ok) => setAuthState(ok ? 'in' : 'out')).catch(() => setAuthState('out'));
    const unsub = onUnauthorized(() => setAuthState('out'));
    return () => {
      unsub();
    };
  }, []);

  if (authState === 'checking') {
    return (
      <div className="flex h-full items-center justify-center text-body text-muted">
        verificando sesión…
      </div>
    );
  }
  if (authState === 'out') {
    return <LoginScreen onLoggedIn={() => setAuthState('in')} />;
  }

  return (
    <div className="flex h-full bg-ground">
      <IconRail
        tab={tab}
        onChange={setTab}
        onLogout={() => {
          api.logout();
          setAuthState('out');
        }}
        workspace="Develop-QEB"
      />
      <main className="min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-[1600px] px-8">
          {tab === 'branches' && <BranchesTab />}
          {tab === 'schema' && <SchemaTab />}
          {tab === 'anomalias' && <AnomaliasTab />}
          {tab === 'matriz' && <MatrizBdTab />}
          {tab === 'diagnostico' && <DiagnosticoTab />}
        </div>
      </main>
    </div>
  );
}
