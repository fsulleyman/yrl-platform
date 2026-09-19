'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error securely
    console.error('Application runtime error boundary caught:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 bg-slate-50">
      <div className="max-w-lg w-full bg-white border border-slate-200 rounded-[4px] p-8 sm:p-10 shadow-sm border-t-4 border-t-[#CE1126]">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-6 h-6 text-[#CE1126]" />
          </div>
          <div>
            <span className="text-xs uppercase tracking-wider text-rose-700 font-semibold">
              System Notice
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#0E1E3B] tracking-tight">
              Something Went Wrong
            </h1>
          </div>
        </div>

        <p className="text-slate-700 text-sm sm:text-base leading-relaxed mb-6">
          An unexpected error occurred while processing this page. Your submitted data has not been lost. You can attempt to reload the view or return to the main platform.
        </p>

        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 p-3 bg-slate-100 rounded-[2px] text-xs font-mono text-slate-800 break-all border border-slate-200">
            {error.message}
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <Link href="/">
            <Button variant="outline" size="md">
              Return to Homepage
            </Button>
          </Link>
          <Button variant="primary" size="md" onClick={() => reset()}>
            Try Again
          </Button>
        </div>
      </div>
    </div>
  );
}
