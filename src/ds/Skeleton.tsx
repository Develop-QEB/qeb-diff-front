import { cn } from './cn';

export interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  rounded?: 'none' | 'chip' | 'full';
}

export function Skeleton({ className, width, height = 12, rounded = 'chip' }: SkeletonProps) {
  const style: React.CSSProperties = {};
  if (width !== undefined) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height !== undefined) style.height = typeof height === 'number' ? `${height}px` : height;
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block bg-raised animate-pulse align-middle',
        rounded === 'chip' && 'rounded-chip',
        rounded === 'full' && 'rounded-full',
        className,
      )}
      style={style}
    />
  );
}

export function SkeletonText({ lines = 1, widths }: { lines?: number; widths?: Array<string | number> }) {
  const arr = Array.from({ length: lines }, (_, i) => widths?.[i] ?? (i === lines - 1 ? '60%' : '100%'));
  return (
    <div className="flex flex-col gap-1.5">
      {arr.map((w, i) => (
        <Skeleton key={i} width={w} height={12} />
      ))}
    </div>
  );
}

export function SkeletonRow({ cols = 6, rowHeight = 42 }: { cols?: number; rowHeight?: number }) {
  return (
    <tr style={{ height: rowHeight }} aria-hidden>
      {Array.from({ length: cols }, (_, i) => (
        <td key={i} className="px-3 border-b border-rule">
          <Skeleton width={i === 0 ? '85%' : i === cols - 1 ? '40%' : '70%'} height={12} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonCommitRow() {
  return (
    <li className="border-b border-rule px-3 py-2.5" aria-hidden>
      <div className="flex flex-wrap items-center gap-2">
        <Skeleton width={54} height={10} />
        <Skeleton width={120} height={10} />
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        <Skeleton width="90%" height={13} />
        <Skeleton width="55%" height={13} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Skeleton width={72} height={10} />
        <Skeleton width={40} height={10} rounded="full" />
      </div>
    </li>
  );
}

export function SkeletonList({ count = 5 }: { count?: number }) {
  return (
    <ul>
      {Array.from({ length: count }, (_, i) => (
        <SkeletonCommitRow key={i} />
      ))}
    </ul>
  );
}

export function SkeletonKpi() {
  return (
    <span className="inline-flex items-center gap-1 rounded-chip border border-border bg-surface px-2 py-0.5" aria-hidden>
      <Skeleton width={30} height={11} />
      <span className="text-muted">·</span>
      <Skeleton width={80} height={11} />
    </span>
  );
}
