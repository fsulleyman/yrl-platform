import React from 'react';
import Link from 'next/link';
import { Shield, ArrowRight } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface NoticeBannerProps {
  variant?: 'fullWidth' | 'card';
  className?: string;
}

export function NoticeBanner({ variant = 'card', className }: NoticeBannerProps) {
  if (variant === 'fullWidth') {
    return (
      <aside
        aria-label="Official YRL Notice"
        className={twMerge(
          clsx(
            'w-full bg-[#0B1F3A] text-white border-b border-[#C9A227]/30 py-2.5 px-4 text-xs relative overflow-hidden',
            className
          )
        )}
      >
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#006B3F] shrink-0" aria-hidden="true" />
            <p className="text-slate-300">
              <strong className="text-[#FCD116] font-semibold">Official Notice: </strong>
              Nominations are 100% FREE. Interim positions are voluntary, non-partisan, and not
              government positions.
            </p>
          </div>
          <Link
            href="/notice"
            className="text-[#FCD116] hover:text-white font-semibold underline underline-offset-2 shrink-0 transition-colors inline-flex items-center gap-1"
          >
            <span>Read Full Notice</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Official YRL Notice"
      className={twMerge(
        clsx(
          'bg-[#0B1F3A] text-white rounded-xl border-2 border-[#C9A227]/30 p-5 sm:p-6 shadow-sm relative overflow-hidden',
          className
        )
      )}
    >
      <div
        className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#CE1126] via-[#FCD116] to-[#006B3F]"
        aria-hidden="true"
      />
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-full bg-white/10 border border-[#C9A227] flex items-center justify-center shrink-0 mt-0.5">
            <Shield className="w-4 h-4 text-[#C9A227]" />
          </div>
          <div className="space-y-0.5">
            <h3 className="font-heading font-bold text-sm text-white flex items-center gap-2">
              <span>Official Institutional Transparency Notice</span>
              <span className="text-[10px] uppercase font-bold bg-[#FCD116]/20 text-[#FCD116] px-1.5 py-0.5 rounded-[2px]">
                Important
              </span>
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
              Nominations are 100% FREE. All roles are interim, voluntary, and non-partisan. Positions
              within YRL are not positions in the Government of Ghana.
            </p>
          </div>
        </div>

        <Link href="/notice" className="shrink-0 w-full sm:w-auto">
          <span className="inline-flex items-center justify-center w-full sm:w-auto px-3.5 py-2 rounded-[4px] bg-white/10 hover:bg-white/15 text-xs font-semibold text-[#FCD116] hover:text-white border border-white/15 transition-colors gap-1.5">
            <span>Read Notice Board</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </span>
        </Link>
      </div>
    </aside>
  );
}
