import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface RadioProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: boolean;
}

export const Radio = forwardRef<HTMLInputElement, RadioProps>(
  ({ className, label, description, error, disabled, id, ...props }, ref) => {
    return (
      <label
        htmlFor={id}
        className={twMerge(
          clsx(
            'inline-flex items-start gap-2.5 select-none cursor-pointer',
            disabled && 'cursor-not-allowed opacity-60'
          )
        )}
      >
        <input
          ref={ref}
          id={id}
          type="radio"
          disabled={disabled}
          className={twMerge(
            clsx(
              'mt-0.5 w-4 h-4 rounded-full border transition-colors cursor-pointer',
              'accent-[#0B1F3A] text-[#0B1F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B1F3A]',
              error ? 'border-[#CE1126]' : 'border-slate-300 hover:border-slate-400',
              disabled && 'cursor-not-allowed',
              className
            )
          )}
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm font-medium text-slate-800 leading-tight">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-slate-500 leading-normal mt-0.5">
                {description}
              </span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Radio.displayName = 'Radio';
