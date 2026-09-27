'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Lock, Mail, AlertCircle, Loader2, ArrowRight, ShieldCheck, CheckCircle2, Info } from 'lucide-react';
import { registerMemberAccountAction } from '../actions';

export default function MemberRegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please verify and retype.');
      setIsSubmitting(false);
      return;
    }

    try {
      const formData = new FormData();
      formData.set('email', email);
      formData.set('password', password);
      formData.set('confirmPassword', confirmPassword);

      const result = await registerMemberAccountAction(formData);
      if (!result.success) {
        setError(result.error || 'Failed to create member account.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage(
        result.message || 'Your account credentials have been created! You can now sign in.'
      );
      setIsSubmitting(false);
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#0B1F3A] text-[#C9A227] mb-4 shadow-sm">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A]">
          Set Up Member Account
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Create login credentials for your official YRL membership record or application.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Civic Integrity Notice */}
        <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-900 flex items-start gap-2.5">
          <Info className="w-4 h-4 flex-shrink-0 text-blue-700 mt-0.5" />
          <div>
            <strong>Civic Notice:</strong> Account creation establishes your login credentials.
            It does not automatically grant or activate membership. Only applications officially verified
            and approved by the YRL Secretariat carry active membership status.
          </div>
        </div>

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

          {successMessage ? (
            <div className="space-y-5 text-center py-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-slate-900">Account Created Successfully</h2>
              <p className="text-xs text-slate-600">{successMessage}</p>
              <Link href="/member/login">
                <Button className="w-full justify-center bg-[#0B1F3A] hover:bg-[#15345E] text-white py-2.5 font-medium shadow-sm mt-4">
                  Proceed to Sign In
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="member-reg-email"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Registered Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="h-5 h-5" />
                  </div>
                  <input
                    id="member-reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="kwame@example.com"
                    disabled={isSubmitting}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 min-h-[44px]"
                  />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  Must match the email address submitted during membership application.
                </p>
              </div>

              <div>
                <label
                  htmlFor="member-reg-password"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Create Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 h-5" />
                  </div>
                  <input
                    id="member-reg-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 6 characters"
                    disabled={isSubmitting}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 min-h-[44px]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="member-reg-confirm-password"
                  className="block text-sm font-medium text-slate-700 mb-1"
                >
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <div className="relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="h-5 h-5" />
                  </div>
                  <input
                    id="member-reg-confirm-password"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    disabled={isSubmitting}
                    className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#C9A227] focus:border-transparent text-sm disabled:bg-slate-100 disabled:text-slate-500 min-h-[44px]"
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full justify-center bg-[#0B1F3A] hover:bg-[#15345E] text-white py-2.5 font-medium shadow-sm min-h-[44px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting Up Account...
                  </>
                ) : (
                  <>
                    Set Up Member Account
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-200 pt-5 text-center text-xs text-slate-500 space-y-2">
            <p>
              Already configured your credentials?{' '}
              <Link
                href="/member/login"
                className="text-[#0B1F3A] hover:text-[#C9A227] font-semibold underline underline-offset-2"
              >
                Sign in to Member Portal
              </Link>
            </p>
            <p>
              Haven&apos;t applied yet?{' '}
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
