import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: 'none' | 'navy' | 'gold' | 'flag' | 'green';
  variant?: 'bordered' | 'elevated' | 'flat';
}

export function Card({
  className,
  accent = 'none',
  variant = 'bordered',
  children,
  ...props
}: CardProps) {
  const accents = {
    none: '',
    navy: 'border-t-4 border-t-[#0B1F3A]',
    gold: 'border-t-4 border-t-[#C9A227]',
    green: 'border-t-4 border-t-[#006B3F]',
    flag: 'flag-stripe-top',
  };

  const variants = {
    bordered: 'bg-white border border-slate-200/90 shadow-[0_1px_3px_rgba(15,23,42,0.04)]',
    elevated: 'bg-white border border-slate-200 shadow-sm',
    flat: 'bg-slate-50/80 border border-slate-200/60',
  };

  return (
    <div
      className={twMerge(
        clsx(
          'rounded-[6px] p-6 text-[#0F172A] relative overflow-hidden',
          variants[variant],
          accents[accent],
          className
        )
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge(clsx('mb-4 pb-3 border-b border-slate-100', className))} {...props}>
      {children}
    </div>
  );
}

export interface CardTitleProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: 'h2' | 'h3' | 'h4';
}

export function CardTitle({
  as: Component = 'h3',
  className,
  children,
  ...props
}: CardTitleProps) {
  return (
    <Component
      className={twMerge(
        clsx('text-lg font-bold text-[#0B1F3A] tracking-tight font-heading', className)
      )}
      {...props}
    >
      {children}
    </Component>
  );
}

export function CardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={twMerge(
        clsx('text-sm text-slate-600 leading-relaxed mt-1', className)
      )}
      {...props}
    >
      {children}
    </p>
  );
}

export function CardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={twMerge(clsx('text-sm text-slate-700 leading-relaxed', className))} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={twMerge(
        clsx('mt-6 pt-4 border-t border-slate-100 flex items-center justify-between', className)
      )}
      {...props}
    >
      {children}
    </div>
  );
}
