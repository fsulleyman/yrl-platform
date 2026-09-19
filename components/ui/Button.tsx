import React, { forwardRef } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'gold' | 'text';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none';

    const variants = {
      primary:
        'bg-[#0B1F3A] text-white hover:bg-[#152E52] active:bg-[#061120] focus-visible:ring-[#0B1F3A] shadow-sm',
      secondary:
        'bg-slate-100 text-[#0B1F3A] border border-slate-200 hover:bg-slate-200 active:bg-slate-300 focus-visible:ring-slate-400',
      outline:
        'border border-[#0B1F3A] text-[#0B1F3A] bg-transparent hover:bg-[#0B1F3A]/5 active:bg-[#0B1F3A]/10 focus-visible:ring-[#0B1F3A]',
      ghost:
        'text-[#0B1F3A] hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-[#0B1F3A]',
      destructive:
        'bg-[#CE1126] text-white hover:bg-[#A50E1E] active:bg-[#800A16] focus-visible:ring-[#CE1126] shadow-sm',
      gold:
        'bg-[#C9A227] text-[#0B1F3A] font-semibold hover:bg-[#B38E1E] active:bg-[#9A7B1D] focus-visible:ring-[#C9A227] shadow-sm',
      text:
        'text-[#0B1F3A] hover:text-[#006B3F] underline-offset-4 hover:underline p-0 h-auto font-normal focus-visible:ring-[#0B1F3A]',
    };

    const sizes = {
      sm: 'text-xs px-3 py-1.5 rounded-[4px] min-h-[32px] gap-1.5',
      md: 'text-sm px-4 py-2.5 rounded-[6px] min-h-[44px] gap-2',
      lg: 'text-base px-6 py-3.5 rounded-[6px] min-h-[50px] gap-2.5 font-semibold',
    };

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={twMerge(
          clsx(
            baseStyles,
            variants[variant],
            variant !== 'text' && sizes[size],
            fullWidth && 'w-full',
            className
          )
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
