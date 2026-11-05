import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';
import { cn } from './cn';

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={cn('w-full border-collapse text-body', className)} />;
}

export function THead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={className} />;
}

export function TBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className={className} />;
}

export function TR({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cn('h-row', className)} />;
}

export function TH({ className, numeric, ...props }: ThHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean }) {
  return (
    <th
      {...props}
      className={cn(
        'h-10 border-b border-rule px-3 text-meta font-normal text-muted align-middle',
        numeric ? 'text-right num' : 'text-left',
        className,
      )}
    />
  );
}

export function TD({ className, numeric, muted, mono, ...props }: TdHTMLAttributes<HTMLTableCellElement> & { numeric?: boolean; muted?: boolean; mono?: boolean }) {
  return (
    <td
      {...props}
      className={cn(
        'px-3 border-b border-rule align-middle',
        numeric && 'text-right num',
        mono && 'mono',
        muted && 'text-muted',
        className,
      )}
    />
  );
}
