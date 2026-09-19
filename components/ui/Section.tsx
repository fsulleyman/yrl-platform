import React from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  as?: 'section' | 'div' | 'article';
  background?: 'white' | 'slate' | 'navy' | 'dark';
  containerSize?: 'default' | 'narrow' | 'wide' | 'full';
  spacing?: 'sm' | 'md' | 'lg';
  hasPillarDivider?: boolean;
}

export function Section({
  as: Component = 'section',
  background = 'white',
  containerSize = 'default',
  spacing = 'md',
  hasPillarDivider = false,
  className,
  children,
  ...props
}: SectionProps) {
  const backgrounds = {
    white: 'bg-white text-[#0F172A]',
    slate: 'bg-slate-50 text-[#0F172A] border-y border-slate-200/80',
    navy: 'bg-[#0B1F3A] text-white',
    dark: 'bg-[#061120] text-slate-100',
  };

  const containerSizes = {
    narrow: 'max-w-4xl',
    default: 'max-w-6xl',
    wide: 'max-w-7xl',
    full: 'max-w-full',
  };

  const spacings = {
    sm: 'py-8 sm:py-12',
    md: 'py-14 sm:py-20',
    lg: 'py-20 sm:py-28',
  };

  return (
    <Component
      className={twMerge(
        clsx(
          'relative px-4 sm:px-6 lg:px-8',
          spacings[spacing],
          backgrounds[background],
          className
        )
      )}
      {...props}
    >
      {hasPillarDivider && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-[#C9A227]/70" />
      )}
      <div className={twMerge(clsx('mx-auto w-full', containerSizes[containerSize]))}>
        {children}
      </div>
    </Component>
  );
}
