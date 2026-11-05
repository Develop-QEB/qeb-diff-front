import { cn } from './cn';

export interface QebLoaderProps {
  size?: number;
  label?: string;
  className?: string;
}

export function QebLoader({ size = 72, label, className }: QebLoaderProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label ?? 'cargando'}
      className={cn('inline-flex flex-col items-center gap-3', className)}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 220 220"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
        className="qeb-loader-svg"
      >
        <path
          className="qeb-loader-path"
          d="M26 115 H38 C47.4 115 54.9 107.3 54.9 98 V97 C54.9 92.5 58.6 88.9 63.1 88.9 C67.8 88.9 71.5 92.5 71.5 97 V136.5 C71.5 141 75.3 144.7 80.3 144.7 C85 144.7 88.9 141 88.9 136.5 V63.3 C88.9 58.6 92.6 54.7 97.3 54.7 C102 54.7 105.8 58.6 105.8 63.3 V173 C105.8 177.7 109.7 181.7 114.5 181.7 C119.3 181.7 123 177.7 123 173 V28.8 C123 23.8 126.7 20 131.5 20 C136.2 20 140 23.8 140 28.8 V95 C140 106.4 149 115 159.5 115 H192"
          transform="translate(2 9)"
          stroke="currentColor"
          strokeWidth={12}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          pathLength={1}
        />
      </svg>
      {label && <div className="text-meta text-muted mono">{label}</div>}
    </div>
  );
}

export function QebLoaderFullscreen({ label = 'cargando…' }: { label?: string }) {
  return (
    <div className="flex h-full items-center justify-center bg-ground text-ink">
      <QebLoader size={96} label={label} />
    </div>
  );
}
