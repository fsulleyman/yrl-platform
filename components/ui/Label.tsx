import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({
  className,
  required,
  children,
  ...props
}: LabelProps) {
  return (
    <label
      className={twMerge(
        clsx(
          'block text-sm font-semibold text-slate-800 tracking-tight select-none font-heading',
          className
        )
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-[#CE1126] ml-1 font-bold" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
