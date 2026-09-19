import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'neutral' | 'gold' | 'navy';
  status?: 'submitted' | 'screening' | 'shortlisted' | 'interview' | 'selected' | 'declined';
  size?: 'sm' | 'md';
}

export function Badge({
  className,
  variant = 'default',
  status,
  size = 'md',
  children,
  ...props
}: BadgeProps) {
  let calculatedVariant = variant;
  let statusText = children;

  if (status) {
    switch (status) {
      case 'submitted':
        calculatedVariant = 'neutral';
        statusText = statusText || 'Submitted';
        break;
      case 'screening':
        calculatedVariant = 'primary';
        statusText = statusText || 'In Screening';
        break;
      case 'shortlisted':
      case 'interview':
        calculatedVariant = 'warning';
        statusText = statusText || 'Shortlisted';
        break;
      case 'selected':
        calculatedVariant = 'success';
        statusText = statusText || 'Selected';
        break;
      case 'declined':
        calculatedVariant = 'error';
        statusText = statusText || 'Declined';
        break;
    }
  }

  const variants = {
    default: 'bg-slate-100 text-[#0B1F3A] border-slate-200',
    primary: 'bg-[#0B1F3A] text-white border-[#0B1F3A]',
    success: 'bg-emerald-50 text-[#006B3F] border-emerald-300',
    warning: 'bg-amber-50 text-amber-900 border-[#C9A227]/50',
    error: 'bg-rose-50 text-[#CE1126] border-rose-300',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200',
    gold: 'bg-amber-50 text-amber-900 border-[#C9A227]/40',
    navy: 'bg-[#0B1F3A]/10 text-[#0B1F3A] border-[#0B1F3A]/20',
  };

  const sizes = {
    sm: 'text-[11px] px-2 py-0.5 font-medium tracking-wide',
    md: 'text-xs px-2.5 py-1 font-medium tracking-wide',
  };

  return (
    <span
      className={twMerge(
        clsx(
          'inline-flex items-center gap-1.5 border rounded-full uppercase',
          variants[calculatedVariant],
          sizes[size],
          className
        )
      )}
      {...props}
    >
      {statusText}
    </span>
  );
}
