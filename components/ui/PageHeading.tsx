import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface PageHeadingProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: 'left' | 'center';
  as?: 'h1' | 'h2' | 'h3';
}

export function PageHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  as: HeadingTag = 'h1',
  className,
  children,
  ...props
}: PageHeadingProps) {
  return (
    <div
      className={twMerge(
        clsx(
          'space-y-3',
          align === 'center' ? 'text-center mx-auto max-w-3xl' : 'text-left max-w-4xl',
          className
        )
      )}
      {...props}
    >
      {eyebrow && (
        <span className="inline-block text-xs font-bold uppercase tracking-widest text-[#C9A227] font-heading">
          {eyebrow}
        </span>
      )}
      <HeadingTag className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0B1F3A] tracking-tight font-heading leading-tight">
        {title}
      </HeadingTag>
      {description && (
        <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
          {description}
        </p>
      )}
      {children}
    </div>
  );
}
