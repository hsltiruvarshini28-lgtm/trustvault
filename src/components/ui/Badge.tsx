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
  | 'METADATA_ONLY'
  | 'INTACT'
  | 'TAMPERED'
  | 'PASS'
  | 'FAIL';

interface BadgeProps {
  variant: BadgeVariant | string;
  children?: React.ReactNode;
  size?: 'sm' | 'md';
}

export function Badge({ variant, children, size = 'sm' }: BadgeProps) {
  const text = children || variant;
  const upper = (typeof text === 'string' ? text : variant).toUpperCase();

  let colorClasses = 'bg-[#F7F7F4] text-[#343A40] border-[#DDE2DF]';

  switch (upper) {
    case 'ALLOWED':
    case 'ACTIVE':
    case 'INTACT':
    case 'PASS':
      colorClasses = 'bg-[#EDF4F0] text-[#46785C] border-[#C6D8CD]';
      break;
    case 'DENIED':
    case 'DISABLED':
    case 'TAMPERED':
    case 'DELETED':
    case 'FAIL':
      colorClasses = 'bg-[#FAF0F0] text-[#B64B4B] border-[#EFCACA]';
      break;
    case 'READ':
      colorClasses = 'bg-[#EEF3F7] text-[#263C50] border-[#CFDBE5]';
      break;
    case 'EDIT':
      colorClasses = 'bg-[#FAF4EC] text-[#A87532] border-[#EEDBBE]';
      break;
    case 'OWNER':
      colorClasses = 'bg-[#E9EFEC] text-[#263C50] border-[#C4D1CB] font-semibold';
      break;
    case 'ADMIN':
      colorClasses = 'bg-[#E5ECF0] text-[#263C50] border-[#C5D3DC] font-semibold';
      break;
    case 'VIEWER':
      colorClasses = 'bg-[#F7F7F4] text-[#527C78] border-[#DDE2DF]';
      break;
    case 'METADATA_ONLY':
      colorClasses = 'bg-[#F7F7F4] text-[#737B82] border-[#DDE2DF]';
      break;
  }

  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] font-medium'
      : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      className={`inline-flex items-center justify-center rounded border whitespace-nowrap leading-tight ${colorClasses} ${sizeClasses}`}
    >
      {text}
    </span>
  );
}
