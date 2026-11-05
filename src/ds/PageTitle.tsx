import type { ReactNode } from 'react';

export interface PageTitleProps {
  title: string;
  finding?: ReactNode;
  actions?: ReactNode;
}

export function PageTitle({ title, finding, actions }: PageTitleProps) {
  return (
    <header className="flex items-start justify-between gap-6 pt-8 pb-6">
      <div className="flex-1 min-w-0">
        <h1>{title}</h1>
        {finding && (
          <p className="mt-2 text-body text-muted">{finding}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
