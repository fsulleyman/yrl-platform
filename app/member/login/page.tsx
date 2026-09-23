'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, AlertCircle, Loader2, ArrowRight, ShieldCheck } from 'lucide-react';
import { loginMemberAction } from '../actions';

export default function MemberLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('email', email);
      formData.set('password', password);

      const result = await loginMemberAction(formData);
      if (!result.success) {
        setError(result.error || 'Failed to sign in. Please verify your credentials.');
        setIsSubmitting(false);
        return;
      }

      router.push(result.redirectTo || '/member');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0B1F3A] text-[#C9A227] mb-4 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A]">
          Member Portal
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Sign in to view your official Member ID and update your civic profile.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-sm sm:rounded-lg sm:px-10 border border-slate-200">
          {error && (
            <div
              role="alert"
              className="mb-6 p-4 rounded-md bg-red-50 border border-red-200 flex items-start gap-3 text-red-800 text-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="member-email"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Registered Email Address
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 h-5" />
                </div>
                <input
                  id="member-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="kwame@example.com"
                  disabled={isSubmitting}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="member-password"
                className="block text-sm font-medium text-slate-700 mb-1"
              >
                Password
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 h-5" />
                </div>
                <input
                  id="member-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={isSubmitting}
                  className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full justify-center bg-[#0B1F3A] hover:bg-[#15345E] text-white py-2.5 font-medium shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Signing In...
                </>
              ) : (
                <>
                  Sign In to Member Portal
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-5 text-center text-xs text-slate-500">
            <p>
              Not yet a registered member?{' '}
              <Link
                href="/get-involved/join"
                className="text-[#0B1F3A] hover:text-[#C9A227] font-semibold underline underline-offset-2"
              >
                Submit membership application
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
