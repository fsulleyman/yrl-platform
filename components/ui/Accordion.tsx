'use client';

import React from 'react';
import { ChevronDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface AccordionItemProps {
  id: string;
  question: string;
  badge?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  className?: string;
}

export function AccordionItem({
  id,
  question,
  badge,
  isOpen,
  onToggle,
  children,
  className,
}: AccordionItemProps) {
  const triggerId = `accordion-trigger-${id}`;
  const contentId = `accordion-content-${id}`;

  return (
    <div
      className={twMerge(
        clsx(
          'border rounded-lg transition-colors overflow-hidden',
          isOpen
            ? 'border-[#C9A227]/40 bg-white shadow-xs'
            : 'border-slate-200 bg-white hover:border-slate-300',
          className
        )
      )}
    >
      <h3>
        <button
          id={triggerId}
          type="button"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-controls={contentId}
          className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-heading font-semibold text-base sm:text-lg text-[#0B1F3A] hover:text-[#C9A227] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A227] gap-4"
        >
          <span className="flex-1 flex items-center gap-3 flex-wrap">
            <span>{question}</span>
            {badge && (
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-sans">
                {badge}
              </span>
            )}
          </span>
          <ChevronDown
            className={twMerge(
              clsx(
                'w-5 h-5 text-slate-400 transition-transform duration-200 shrink-0',
                isOpen && 'transform rotate-180 text-[#C9A227]'
              )
            )}
            aria-hidden="true"
          />
        </button>
      </h3>

      <div
        id={contentId}
        role="region"
        aria-labelledby={triggerId}
        hidden={!isOpen}
        className={twMerge(
          clsx(
            'px-4 pb-5 sm:px-5 sm:pb-6 pt-1 text-sm sm:text-base text-slate-600 leading-relaxed border-t border-slate-100'
          )
        )}
      >
        {children}
      </div>
    </div>
  );
}

export interface AccordionProps {
  children: React.ReactNode;
  className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
  return (
    <div className={twMerge(clsx('space-y-3', className))}>
      {children}
    </div>
  );
}
