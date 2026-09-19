'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Lock, AlertCircle, Loader2 } from 'lucide-react';
import { loginWithSupabase } from './actions';

export function AdminLoginForm() {
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await loginWithSupabase(formData);
      if (!result.success && result.error) {
        setError(result.error);
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-[4px] border border-slate-300 shadow-md p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#0E1E3B] text-white flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0E1E3B]">YRL Review Portal</h1>
            <p className="text-xs text-slate-500">Authenticated Administrative Access</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[2px] text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="admin-email"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Email Address
            </label>
            <input
              id="admin-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="reviewer@domain.org"
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0E1E3B]"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
            >
              Password
            </label>
            <input
              id="admin-password"
              type="password"
              name="password"
              required
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0E1E3B]"
            />
          </div>

          <Button
            variant="secondary"
            fullWidth
            size="md"
            type="submit"
            disabled={isSubmitting}
            className="flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              'Sign In to Review Portal'
            )}
          </Button>
        </form>

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Youth Republic Leadership • Confidential Review Portal
        </p>
      </div>
    </div>
  );
}
