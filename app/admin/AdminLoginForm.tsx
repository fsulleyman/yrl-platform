'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Lock, AlertCircle, Loader2, CheckCircle2, KeyRound, ArrowLeft, ShieldAlert, LogOut } from 'lucide-react';
import { loginWithSupabase, logoutAdmin } from './actions';
import { createClient } from '@/lib/supabase/client';

export interface AdminLoginFormProps {
  initialAuthStatus?: 'authenticated' | 'unauthorized_role' | 'unauthenticated';
  initialUserEmail?: string | null;
  initialRole?: string | null;
}

export function AdminLoginForm({
  initialAuthStatus = 'unauthenticated',
  initialUserEmail = null,
  initialRole = null,
}: AdminLoginFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingLink, setIsVerifyingLink] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);

  // Initial mode determination based on initialAuthStatus
  const [mode, setMode] = useState<'login' | 'setup_password' | 'forgot_password' | 'unauthorized'>(
    initialAuthStatus === 'unauthorized_role' ? 'unauthorized' : 'login'
  );

  // Password setup fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password reset request field
  const [resetEmail, setResetEmail] = useState('');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    async function processIncomingAuth() {
      try {
        const hash = window.location.hash || '';
        const search = window.location.search || '';

        const hashParams = new URLSearchParams(hash.replace(/^#/, ''));
        const searchParams = new URLSearchParams(search);

        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');
        const hashType = hashParams.get('type');

        const code = searchParams.get('code');
        const tokenHash = searchParams.get('token_hash');
        const searchType = searchParams.get('type') as any;

        const hasTokens = Boolean(
          (accessToken && refreshToken) ||
          code ||
          (tokenHash && (searchType || hashType)) ||
          hashType === 'invite' ||
          hashType === 'recovery'
        );

        if (!hasTokens) {
          if (initialAuthStatus === 'authenticated') {
            window.location.replace('/admin');
            return;
          }
          return;
        }

        // We have invitation / recovery tokens in the URL
        if (isMounted) setIsVerifyingLink(true);
        const supabase = createClient();

        // 1. Implicit Grant flow (#access_token=...&refresh_token=...)
        if (accessToken && refreshToken) {
          const { data, error: sessionErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionErr) {
            console.error('[Admin Auth] Failed to establish session from invite hash:', sessionErr.message);
            if (isMounted) {
              setError('The invitation or recovery link is invalid or has expired. Please contact your Super Administrator.');
              setIsVerifyingLink(false);
            }
            return;
          }

          // Clean sensitive tokens from URL history
          window.history.replaceState(null, '', window.location.pathname);

          if (isMounted) {
            if (data.session?.user?.email) {
              setInvitedEmail(data.session.user.email);
            }
            setMode('setup_password');
            setIsVerifyingLink(false);
          }
          return;
        }

        // 2. PKCE code exchange (?code=...)
        if (code) {
          const { data, error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
          if (codeErr) {
            console.error('[Admin Auth] Failed to exchange code for session:', codeErr.message);
            if (isMounted) {
              setError('The invitation or recovery link is invalid or has expired. Please contact your Super Administrator.');
              setIsVerifyingLink(false);
            }
            return;
          }

          window.history.replaceState(null, '', window.location.pathname);

          if (isMounted) {
            if (data.session?.user?.email) {
              setInvitedEmail(data.session.user.email);
            }
            setMode('setup_password');
            setIsVerifyingLink(false);
          }
          return;
        }

        // 3. OTP verification (?token_hash=...&type=...)
        if (tokenHash) {
          const { data, error: otpErr } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: (searchType || hashType || 'invite') as any,
          });

          if (otpErr) {
            console.error('[Admin Auth] Failed to verify OTP token:', otpErr.message);
            if (isMounted) {
              setError('The invitation or recovery link is invalid or has expired. Please contact your Super Administrator.');
              setIsVerifyingLink(false);
            }
            return;
          }

          window.history.replaceState(null, '', window.location.pathname);

          if (isMounted) {
            if (data.session?.user?.email) {
              setInvitedEmail(data.session.user.email);
            }
            setMode('setup_password');
            setIsVerifyingLink(false);
          }
          return;
        }
      } catch (err: any) {
        console.error('[Admin Auth] Link processing exception:', err?.message || err);
        if (isMounted) {
          setError('Unable to process the invitation link. Please check your network connection.');
          setIsVerifyingLink(false);
        }
      }
    }

    processIncomingAuth();

    try {
      const supabase = createClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          if (isMounted) {
            setMode('setup_password');
            if (session?.user?.email) {
              setInvitedEmail(session.user.email);
            }
          }
        }
      });

      return () => {
        isMounted = false;
        subscription.unsubscribe();
      };
    } catch {
      // Graceful fallback for test or SSR contexts
    }
  }, [initialAuthStatus]);

  const handleLoginSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await loginWithSupabase(formData);
      if (!result.success && result.error) {
        setError(result.error);
      } else if (result.success) {
        // Full navigation ensures fresh session cookies are sent to /admin
        window.location.href = '/admin';
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSetupPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters in length.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter your chosen password.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message || 'Unable to establish password. The invitation link may have expired.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Password established successfully! Entering administration portal...');
      setTimeout(() => {
        window.location.href = '/admin';
      }, 1000);
    } catch {
      setError('An unexpected error occurred while saving your password. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!resetEmail.trim()) {
      setError('Please provide your administrator email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const supabase = createClient();
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/admin/login` : undefined;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo,
      });

      if (resetError) {
        console.error('[Auth Error] Password reset error:', resetError.message);
      }
      setSuccessMessage('If an administrator account exists with this email, a password reset link has been dispatched to your inbox.');
    } catch {
      setError('Unable to process password reset request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 1. Loading state during invite token verification
  if (isVerifyingLink) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-[4px] border border-slate-300 shadow-md p-5 sm:p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#0E1E3B] animate-spin mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-slate-800">Verifying Administrator Invitation...</h2>
          <p className="text-xs text-slate-500 mt-1">Establishing your secure administrative session</p>
        </div>
      </div>
    );
  }

  // 2. Redirect state when user is already authenticated and visiting without invite tokens
  if (initialAuthStatus === 'authenticated' && mode !== 'setup_password' && !error) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-[4px] border border-slate-300 shadow-md p-5 sm:p-8 text-center">
          <Loader2 className="w-8 h-8 text-[#0E1E3B] animate-spin mx-auto mb-3" />
          <h2 className="text-sm font-semibold text-slate-800">Redirecting to Administration Portal...</h2>
          <p className="text-xs text-slate-500 mt-1">Verifying your active administrator session</p>
        </div>
      </div>
    );
  }

  // 3. Unauthorized / Deactivated Role View
  if (mode === 'unauthorized') {
    const isDeactivated = initialRole === 'deactivated';
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-[4px] border border-red-200 shadow-md p-5 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-[#0E1E3B] mb-2">
            {isDeactivated ? 'Account Deactivated' : 'Access Restricted'}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            You are signed in as <strong className="font-mono">{initialUserEmail || 'an existing user'}</strong>, but{' '}
            {isDeactivated
              ? 'your administrative account has been deactivated by the Super Administrator.'
              : 'your account does not have an approved administrative role.'}
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[2px] text-xs text-amber-900 mb-6 text-left">
            <strong>Secretariat Notice:</strong>{' '}
            {isDeactivated
              ? 'Please contact the Super Administrator if you believe this is an error.'
              : 'Administrative access is restricted to verified vetting officers. Contact the Super Admin to configure your role permissions.'}
          </div>
          <form action={logoutAdmin}>
            <Button variant="outline" size="sm" type="submit" className="mx-auto flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </form>
          <div className="pt-4 mt-4 border-t border-slate-100 text-center">
            <button
              type="button"
              onClick={() => {
                setMode('login');
              }}
              className="text-xs text-slate-500 hover:text-slate-800"
            >
              Sign In with Another Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Standard interactive card (Login, Setup Password, Forgot Password)
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
      <div className="max-w-md w-full bg-white rounded-[4px] border border-slate-300 shadow-md p-5 sm:p-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-full bg-[#0E1E3B] text-white flex items-center justify-center shrink-0">
            {mode === 'setup_password' ? <KeyRound className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#0E1E3B]">
              {mode === 'setup_password'
                ? 'Set Up Administrator Password'
                : mode === 'forgot_password'
                ? 'Reset Administrator Password'
                : 'YRL Administration Portal'}
            </h1>
            <p className="text-xs text-slate-500">
              {mode === 'setup_password'
                ? 'Establish your private account password to activate your access'
                : mode === 'forgot_password'
                ? 'Request a secure password reset link'
                : 'Authenticated Administrative Access'}
            </p>
          </div>
        </div>

        {/* Error notification */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-[2px] text-xs text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Success notification */}
        {successMessage && (
          <div className="mb-4 p-3 bg-emerald-50 border border-emerald-300 rounded-[2px] text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* MODE 1: SETUP PASSWORD (INVITE / RECOVERY ACCEPTANCE) */}
        {mode === 'setup_password' && (
          <form onSubmit={handleSetupPasswordSubmit} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-[4px] text-xs text-blue-900 leading-relaxed">
              <strong>Account Setup:</strong> You are establishing your own confidential password for your YRL administrator account.
              {invitedEmail && (
                <div className="mt-1 text-slate-700 font-medium">
                  Account: <span className="font-mono text-[#0E1E3B]">{invitedEmail}</span>
                </div>
              )}
            </div>

            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Choose Password *
              </label>
              <input
                id="new-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0E1E3B]"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Confirm Password *
              </label>
              <input
                id="confirm-password"
                type="password"
                required
                minLength={8}
                autoComplete="new-password"
                placeholder="Re-enter your chosen password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0E1E3B]"
              />
            </div>

            <Button
              variant="secondary"
              fullWidth
              size="md"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-[#0E1E3B] hover:bg-[#1a3461] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Password...</span>
                </>
              ) : (
                'Save Password & Access Portal'
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setMode('login')}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Standard Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE 2: FORGOT PASSWORD REQUEST */}
        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <p className="text-xs text-slate-600 leading-relaxed">
              Enter your registered administrator email address. We will dispatch a password recovery link to your inbox.
            </p>

            <div>
              <label
                htmlFor="reset-email"
                className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1"
              >
                Administrator Email Address *
              </label>
              <input
                id="reset-email"
                type="email"
                required
                autoComplete="email"
                placeholder="admin@domain.org"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                className="w-full text-sm px-3.5 py-2.5 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-2 focus:ring-[#0E1E3B]"
              />
            </div>

            <Button
              variant="secondary"
              fullWidth
              size="md"
              type="submit"
              disabled={isSubmitting}
              className="flex items-center justify-center gap-2 bg-[#0E1E3B] hover:bg-[#1a3461] text-white"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Dispatching Reset Link...</span>
                </>
              ) : (
                'Send Password Reset Link'
              )}
            </Button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMessage(null);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to Standard Sign In
              </button>
            </div>
          </form>
        )}

        {/* MODE 3: STANDARD LOGIN */}
        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
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
              <div className="flex items-center justify-between mb-1">
                <label
                  htmlFor="admin-password"
                  className="block text-xs font-semibold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setMode('forgot_password');
                    setError(null);
                    setSuccessMessage(null);
                  }}
                  className="text-[11px] text-[#0E1E3B] hover:underline"
                >
                  Forgot Password?
                </button>
              </div>
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
                'Sign In to Administration Portal'
              )}
            </Button>

            <div className="pt-2 text-center">
              <p className="text-xs text-slate-500">
                Need access or credential recovery?{' '}
                <span className="text-[#0E1E3B] font-semibold">Contact your Super Administrator</span>
              </p>
            </div>
          </form>
        )}

        <p className="text-[11px] text-slate-400 text-center mt-6">
          Youth Republic Leadership • Confidential Administration Portal
        </p>
      </div>
    </div>
  );
}
