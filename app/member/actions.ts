'use server';

import { headers } from 'next/headers';
import { createAuthClient } from '@/lib/supabase/server';
import { publicSubmissionRateLimiter, extractClientIp } from '@/lib/security/rate-limit';
import { sanitizeError } from '@/lib/errors';
import { getMemberAuthResult } from '@/lib/auth/server';

export interface MemberLoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Server Action: loginMemberAction
 *
 * Authenticates a member with their registered email and password via Supabase Auth cookies.
 * Does not trust any browser identity claims.
 */
export async function loginMemberAction(formData: FormData): Promise<MemberLoginResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Please enter both your registered email and password.',
    };
  }

  let ip = '127.0.0.1';
  try {
    const headerList = await headers();
    ip = extractClientIp(headerList);
  } catch {
    ip = '127.0.0.1';
  }

  const rateLimit = publicSubmissionRateLimiter.check(ip);
  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many sign-in attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
    };
  }

  try {
    const supabase = await createAuthClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        success: false,
        error: 'Invalid email or password. Please verify your credentials.',
      };
    }

    // Verify member auth state server-side
    const memberResult = await getMemberAuthResult();
    if (memberResult.status === 'authenticated' || memberResult.status === 'pending_activation') {
      return {
        success: true,
        redirectTo: '/member',
      };
    }

    return {
      success: true,
      redirectTo: '/member',
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'Failed to sign in. Please try again.'),
    };
  }
}

/**
 * Server Action: logoutMemberAction
 *
 * Signs the member out and clears session cookies.
 */
export async function logoutMemberAction(): Promise<{ success: boolean }> {
  try {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
    return { success: true };
  } catch (err) {
    console.error('[Member Auth] Sign out error:', err);
    return { success: true };
  }
}
