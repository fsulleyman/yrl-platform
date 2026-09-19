import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ShieldAlert, Info, AlertTriangle } from 'lucide-react';

export interface DisclaimerProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'prominent' | 'compact';
  title?: string;
  showIcon?: boolean;
}

export function Disclaimer({
  className,
  variant = 'standard',
  title = 'PLEASE READ BEFORE APPLYING',
  showIcon = true,
  children,
  ...props
}: DisclaimerProps) {
  const variants = {
    standard:
      'bg-amber-50/70 border border-amber-200/90 border-l-[6px] border-l-[#C9A227] text-slate-900',
    prominent:
      'bg-[#0E1E3B] text-white border border-[#162B54] border-l-[6px] border-l-[#C9A227] shadow-sm',
    compact:
      'bg-slate-50 border border-slate-200 border-l-4 border-l-[#0E1E3B] text-slate-800 text-xs py-3 px-4',
  };

  const titleColors = {
    standard: 'text-[#0E1E3B]',
    prominent: 'text-[#FCD116]',
    compact: 'text-[#0E1E3B]',
  };

  const iconColors = {
    standard: 'text-[#C9A227]',
    prominent: 'text-[#FCD116]',
    compact: 'text-[#0E1E3B]',
  };

  return (
    <aside
      role="note"
      aria-label={title}
      className={twMerge(
        clsx(
          'rounded-r-[4px] p-5 sm:p-6 transition-all',
          variants[variant],
          className
        )
      )}
      {...props}
    >
      <div className="flex items-start gap-3.5">
        {showIcon && (
          <div className="shrink-0 mt-0.5">
            <ShieldAlert className={clsx('w-5 h-5', iconColors[variant])} aria-hidden="true" />
          </div>
        )}
        <div className="space-y-2.5 flex-1 min-w-0">
          {title && (
            <h4
              className={clsx(
                'text-xs sm:text-sm font-bold tracking-wider uppercase flex items-center gap-2',
                titleColors[variant]
              )}
            >
              {title}
            </h4>
          )}
          <div className="text-xs sm:text-sm leading-relaxed space-y-2 font-normal">
            {children}
          </div>
        </div>
      </div>
    </aside>
  );
}

/**
 * Verbatim Important Notice from YRL Charter
 * Mandated for Home page and above Nomination Submit button
 */
export function ImportantNoticeBox({ className, variant = 'standard' }: { className?: string; variant?: 'standard' | 'prominent' }) {
  return (
    <Disclaimer
      title="PLEASE READ BEFORE APPLYING"
      variant={variant}
      className={className}
    >
      <p className="font-semibold">
        Nominations are FREE. Youth Republic Leadership will not require applicants to pay money to submit a nomination.
      </p>
      <p>
        An interim appointment does not guarantee permanent appointment or election to the same position.
      </p>
      <p>
        Youth Republic Leadership is an independent, voluntary and non-partisan youth organisation. Interim positions within Youth Republic Leadership are not positions in the Government of Ghana.
      </p>
      <p className="text-slate-600 dark:text-slate-300">
        Applicants should not use Youth Republic Leadership&apos;s name, logo or position to make claims of governmental authority or to obtain personal benefits.
      </p>
    </Disclaimer>
  );
}
