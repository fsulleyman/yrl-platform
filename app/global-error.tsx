'use client';

import React, { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error securely server-side without exposing internal details to user
    console.error('[YRL Global Error Boundary Caught]:', error.digest || 'Fatal unhandled exception');
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased text-slate-800">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-[4px] p-8 sm:p-10 shadow-sm border-t-4 border-t-[#CE1126]">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-6 h-6 text-[#CE1126]" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wider text-rose-700 font-semibold">
                System Notice
              </span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0E1E3B] tracking-tight">
                Application Interrupted
              </h1>
            </div>
          </div>

          <p className="text-slate-600 text-sm leading-relaxed mb-6">
            A critical system error occurred while rendering the platform. No submitted data has been compromised. You can reload the application or return to the homepage.
          </p>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <a
              href="/"
              className="px-4 py-2 text-xs font-semibold text-[#0E1E3B] border border-slate-300 rounded-[4px] hover:bg-slate-50 transition-colors"
            >
              Return to Homepage
            </a>
            <button
              onClick={() => reset()}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0E1E3B] rounded-[4px] hover:bg-[#0A162B] transition-colors"
            >
              Reload Platform
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
