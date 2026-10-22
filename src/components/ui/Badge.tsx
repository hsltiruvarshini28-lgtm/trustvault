import React from 'react';

export type BadgeVariant =
  | 'ALLOWED'
  | 'DENIED'
  | 'READ'
  | 'EDIT'
  | 'OWNER'
  | 'ADMIN'
  | 'VIEWER'
  | 'ACTIVE'
  | 'DISABLED'
  | 'METADATA_ONLY';

interface BadgeProps {
  variant: BadgeVariant | string;
  children?: React.ReactNode;
  size?: 'sm' | 'md';
}

export function Badge({ variant, children, size = 'sm' }: BadgeProps) {
  const text = children || variant;
  const upper = (typeof text === 'string' ? text : variant).toUpperCase();

  let colorClasses = 'bg-slate-800 text-slate-200 border-slate-700';

  switch (upper) {
    case 'ALLOWED':
    case 'ACTIVE':
    case 'INTACT':
      colorClasses = 'bg-emerald-950/80 text-emerald-400 border-emerald-700/60';
      break;
    case 'DENIED':
    case 'DISABLED':
    case 'TAMPERED':
    case 'DELETED':
      colorClasses = 'bg-rose-950/80 text-rose-400 border-rose-700/60';
      break;
    case 'READ':
      colorClasses = 'bg-sky-950/80 text-sky-400 border-sky-700/60';
      break;
    case 'EDIT':
      colorClasses = 'bg-amber-950/80 text-amber-400 border-amber-700/60';
      break;
    case 'OWNER':
      colorClasses = 'bg-purple-950/80 text-purple-400 border-purple-700/60';
      break;
    case 'ADMIN':
      colorClasses = 'bg-indigo-950/80 text-indigo-400 border-indigo-700/60';
      break;
    case 'VIEWER':
      colorClasses = 'bg-cyan-950/80 text-cyan-400 border-cyan-700/60';
      break;
    case 'METADATA_ONLY':
      colorClasses = 'bg-slate-900 text-slate-400 border-slate-700';
      break;
  }

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs font-semibold' : 'px-3 py-1 text-sm font-semibold';

  return (
    <span
      className={`inline-flex items-center justify-center rounded-md border tracking-wide uppercase ${colorClasses} ${sizeClasses}`}
    >
      {text}
    </span>
  );
}
