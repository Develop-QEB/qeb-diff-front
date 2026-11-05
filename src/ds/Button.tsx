import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from './cn';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}

const base =
  'inline-flex items-center justify-center gap-1.5 rounded-chip border text-body font-medium transition-colors whitespace-nowrap disabled:opacity-50 disabled:pointer-events-none';

const sizeMap: Record<Size, string> = {
  sm: 'h-7 px-3 text-meta',
  md: 'h-8 px-3.5',
};

const variantMap: Record<Variant, string> = {
  primary: 'bg-ink text-ground border-ink hover:bg-ink/90',
  secondary: 'bg-transparent text-ink border-border hover:border-control',
  ghost: 'bg-transparent text-muted border-transparent hover:text-ink',
  danger: 'bg-transparent text-negative border-negative/50 hover:bg-negative-bg',
};

export function Button({ variant = 'secondary', size = 'md', className, children, ...props }: ButtonProps) {
  return (
    <button {...props} className={cn(base, sizeMap[size], variantMap[variant], className)}>
      {children}
    </button>
  );
}
