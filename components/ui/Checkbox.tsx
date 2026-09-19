import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: React.ReactNode;
  description?: string;
  error?: boolean | string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, error, disabled, id, ...props }, ref) => {
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="space-y-1">
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
            type="checkbox"
            disabled={disabled}
            aria-invalid={hasError ? 'true' : undefined}
            className={twMerge(
              clsx(
                'mt-0.5 w-4 h-4 rounded-[3px] border transition-colors cursor-pointer',
                'accent-[#0B1F3A] text-[#0B1F3A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#0B1F3A]',
                hasError ? 'border-[#CE1126]' : 'border-slate-300 hover:border-slate-400',
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
        {errorMessage && (
          <p className="text-xs font-medium text-[#CE1126] pl-6.5">{errorMessage}</p>
        )}
      </div>
    );
  }
);

Checkbox.displayName = 'Checkbox';
