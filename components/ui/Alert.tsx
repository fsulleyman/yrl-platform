import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Info, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
}

export function Alert({
  variant = 'info',
  title,
  className,
  children,
  ...props
}: AlertProps) {
  const configs = {
    info: {
      container: 'bg-[#0B1F3A]/5 border-[#0B1F3A]/20 text-[#0B1F3A]',
      icon: <Info className="w-5 h-5 text-[#0B1F3A] shrink-0 mt-0.5" />,
      titleColor: 'text-[#0B1F3A]',
      bodyColor: 'text-slate-700',
    },
    success: {
      container: 'bg-emerald-50 border-emerald-200 text-emerald-900',
      icon: <CheckCircle2 className="w-5 h-5 text-[#006B3F] shrink-0 mt-0.5" />,
      titleColor: 'text-[#006B3F]',
      bodyColor: 'text-emerald-950',
    },
    warning: {
      container: 'bg-amber-50/90 border-[#C9A227]/40 text-amber-950',
      icon: <AlertTriangle className="w-5 h-5 text-[#C9A227] shrink-0 mt-0.5" />,
      titleColor: 'text-amber-900',
      bodyColor: 'text-amber-900',
    },
    error: {
      container: 'bg-rose-50 border-rose-200 text-rose-950',
      icon: <AlertCircle className="w-5 h-5 text-[#CE1126] shrink-0 mt-0.5" />,
      titleColor: 'text-[#CE1126]',
      bodyColor: 'text-rose-950',
    },
  };

  const current = configs[variant];

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={twMerge(
        clsx(
          'flex items-start gap-3 p-4 rounded-[6px] border text-sm',
          current.container,
          className
        )
      )}
      {...props}
    >
      {current.icon}
      <div className="flex-1 space-y-1">
        {title && (
          <h4 className={twMerge(clsx('font-bold leading-tight font-heading', current.titleColor))}>
            {title}
          </h4>
        )}
        <div className={twMerge(clsx('leading-relaxed', current.bodyColor))}>
          {children}
        </div>
      </div>
    </div>
  );
}
