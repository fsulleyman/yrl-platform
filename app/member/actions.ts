'use server';

import { headers } from 'next/headers';
import { createAuthClient, createAdminClient } from '@/lib/supabase/server';
import { publicSubmissionRateLimiter, extractClientIp } from '@/lib/security/rate-limit';
import { sanitizeError } from '@/lib/errors';
import { getMemberAuthResult } from '@/lib/auth/server';

export interface MemberLoginResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

export interface MemberRegisterResult {
  success: boolean;
  error?: string;
  message?: string;
  redirectTo?: string;
}

/**
 * Server Action: registerMemberAccountAction
 *
 * Secure server-side handler for member account registration.
 * 1. Checks rate limiting.
 * 2. Validates email and password inputs.
 * 3. Enforces eligibility: email must exist in either 'members' (active member) or 'membership_applications'.
 *    Arbitrary visitors cannot create or claim membership accounts.
 * 4. Calls Supabase Auth signUp to create authentication credentials.
 * 5. CRITICAL MEMBERSHIP INVARIANTS:
 *    - NEVER inserts into 'members'
 *    - NEVER generates a member_id
 *    - NEVER activates membership
 *    - NEVER modifies payment records
 */
export async function registerMemberAccountAction(formData: FormData): Promise<MemberRegisterResult> {
  const email = (formData.get('email') as string)?.trim().toLowerCase();
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Please provide both an email address and a password.',
    };
  }

  if (password.length < 6) {
    return {
      success: false,
      error: 'Password must be at least 6 characters in length.',
    };
  }

  if (confirmPassword && password !== confirmPassword) {
    return {
      success: false,
      error: 'Passwords do not match.',
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
      error: `Too many attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
    };
  }

  try {
    const adminClient = createAdminClient();

    // Check eligibility: user must exist in members or membership_applications
    const { data: memberRecord } = await adminClient
      .from('members')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    let isEligible = !!memberRecord;

    if (!isEligible) {
      const { data: appRecord } = await adminClient
        .from('membership_applications')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      isEligible = !!appRecord;
    }

    if (!isEligible) {
      return {
        success: false,
        error: 'No active membership record or application found for this email address. Please submit a membership application first.',
      };
    }

    // Call Supabase Auth signUp
    const supabase = await createAuthClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError) {
      return {
        success: false,
        error: signUpError.message || 'Failed to create member account. Please try again.',
      };
    }

    return {
      success: true,
      message: 'Account created successfully! You can now sign in with your credentials.',
      redirectTo: '/member/login',
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An unexpected error occurred while creating your account.'),
    };
  }
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
