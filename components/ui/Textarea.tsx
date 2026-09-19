import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean | string;
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, helperText, disabled, id, rows = 4, ...props }, ref) => {
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="w-full space-y-1.5">
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          disabled={disabled}
          aria-invalid={hasError ? 'true' : undefined}
          aria-describedby={
            errorMessage && id ? `${id}-error` : helperText && id ? `${id}-helper` : undefined
          }
          className={twMerge(
            clsx(
              'w-full px-3.5 py-2.5 rounded-[6px] text-sm text-[#0F172A] bg-white border transition-colors outline-none resize-y',
              'placeholder:text-slate-400',
              hasError
                ? 'border-[#CE1126] focus:border-[#CE1126] focus:ring-2 focus:ring-[#CE1126]/20'
                : 'border-slate-300 hover:border-slate-400 focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#0B1F3A]/20',
              disabled && 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none',
              className
            )
          )}
          {...props}
        />
        {errorMessage && (
          <p id={id ? `${id}-error` : undefined} className="text-xs font-medium text-[#CE1126]">
            {errorMessage}
          </p>
        )}
        {!errorMessage && helperText && (
          <p id={id ? `${id}-helper` : undefined} className="text-xs text-slate-500">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
