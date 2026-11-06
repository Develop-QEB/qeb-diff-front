import { ArrowsLeftRight, GitBranch, Database, WarningDiamond, GridFour, Stethoscope, SignOut, Ghost, Terminal, type Icon } from '@phosphor-icons/react';
import { cn } from './cn';

export type RailTab = 'branches' | 'schema' | 'anomalias' | 'matriz' | 'diagnostico' | 'huerfanas' | 'logs';

export interface IconRailProps {
  tab: RailTab;
  onChange: (t: RailTab) => void;
  onLogout: () => void;
  workspace?: string;
}

const items: Array<{ id: RailTab; label: string; Icon: Icon }> = [
  { id: 'branches',    label: 'Ramas',           Icon: GitBranch },
  { id: 'schema',      label: 'Bases de datos',  Icon: Database },
  { id: 'anomalias',   label: 'Anomalías',       Icon: WarningDiamond },
  { id: 'matriz',      label: 'Matriz BD',       Icon: GridFour },
  { id: 'diagnostico', label: 'Diagnóstico',     Icon: Stethoscope },
  { id: 'huerfanas',   label: 'Huérfanas',        Icon: Ghost },
  { id: 'logs',        label: 'Logs',             Icon: Terminal },
];

export function IconRail({ tab, onChange, onLogout, workspace }: IconRailProps) {
  return (
    <nav
      aria-label="qeb-diff navigation"
      className="flex h-full w-rail shrink-0 flex-col items-center border-r border-rule bg-ground"
    >
      <div
        className="relative flex h-rail w-full items-center justify-center"
        aria-label={`workspace ${workspace ?? 'qeb-diff'}`}
        title={`QEB · qeb-diff${workspace ? ' · ' + workspace : ''}`}
      >
        <img src="/qeb-logo.svg" alt="QEB" width={30} height={30} className="object-contain" />
        <ArrowsLeftRight
          size={10}
          weight="bold"
          aria-hidden
          className="absolute right-1.5 bottom-2 text-muted"
        />
      </div>

      <div className="mt-2 flex flex-1 flex-col items-center gap-1">
        {items.map((it) => {
          const active = tab === it.id;
          return (
            <button
              key={it.id}
              type="button"
              onClick={() => onChange(it.id)}
              aria-label={it.label}
              aria-current={active ? 'page' : undefined}
              title={it.label}
              className={cn(
                'group flex h-10 w-10 items-center justify-center rounded-card transition-colors',
                active ? 'text-ink' : 'text-muted hover:text-ink',
              )}
            >
              <it.Icon size={18} weight={active ? 'bold' : 'regular'} aria-hidden />
              <span className="sr-only">{it.label}</span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onLogout}
        aria-label="Cerrar sesión"
        title="Cerrar sesión"
        className="mb-3 flex h-10 w-10 items-center justify-center rounded-card text-muted transition-colors hover:text-ink"
      >
        <SignOut size={18} weight="regular" aria-hidden />
        <span className="sr-only">Cerrar sesión</span>
      </button>
    </nav>
  );
}
