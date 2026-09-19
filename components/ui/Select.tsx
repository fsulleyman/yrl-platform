import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  options?: SelectOption[];
  placeholder?: string;
  error?: boolean | string;
  helperText?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      options,
      placeholder,
      error,
      helperText,
      disabled,
      id,
      children,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const errorMessage = typeof error === 'string' ? error : undefined;

    return (
      <div className="w-full space-y-1.5">
        <div className="relative">
          <select
            ref={ref}
            id={id}
            disabled={disabled}
            aria-invalid={hasError ? 'true' : undefined}
            aria-describedby={
              errorMessage && id ? `${id}-error` : helperText && id ? `${id}-helper` : undefined
            }
            className={twMerge(
              clsx(
                'w-full px-3.5 py-2.5 pr-10 rounded-[6px] text-sm text-[#0F172A] bg-white border transition-colors outline-none appearance-none cursor-pointer',
                hasError
                  ? 'border-[#CE1126] focus:border-[#CE1126] focus:ring-2 focus:ring-[#CE1126]/20'
                  : 'border-slate-300 hover:border-slate-400 focus:border-[#0B1F3A] focus:ring-2 focus:ring-[#0B1F3A]/20',
                disabled && 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none',
                className
              )
            )}
            defaultValue={props.defaultValue ?? (placeholder ? '' : undefined)}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options
              ? options.map((opt) => (
                  <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                    {opt.label}
                  </option>
                ))
              : children}
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
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

Select.displayName = 'Select';
