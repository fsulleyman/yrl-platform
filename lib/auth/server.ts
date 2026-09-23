import { createAuthClient, createAdminClient } from '@/lib/supabase/server';
import {
  type AdminRole,
  type AdminSession,
  type AdminUser,
  type MemberSession,
  type MemberUser,
  type MemberRecord,
  type MemberApplicationSummary,
} from './types';

export type AdminAuthResult =
  | { status: 'authenticated'; session: AdminSession }
  | { status: 'unauthorized_role'; user: AdminUser; detectedRole?: string }
  | { status: 'unauthenticated' };

/**
 * Validates the current Supabase Auth session server-side and extracts RBAC metadata.
 * Returns 'unauthenticated' if no valid session, 'unauthorized_role' if role is missing/invalid,
 * or 'authenticated' with full session context.
 */
export async function getAdminAuthResult(): Promise<AdminAuthResult> {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { status: 'unauthenticated' };
    }

    const adminUser: AdminUser = {
      id: user.id,
      email: user.email || '',
    };

    const role = user.app_metadata?.role as AdminRole | undefined;
    const assignedRegion = user.app_metadata?.assigned_region as string | undefined;

    // Immediate revocation check for deactivated administrators
    if (user.app_metadata?.disabled === true) {
      return {
        status: 'unauthorized_role',
        user: adminUser,
        detectedRole: 'deactivated',
      };
    }

    const validRoles: AdminRole[] = ['super_admin', 'national_reviewer', 'regional_coordinator'];
    if (!role || !validRoles.includes(role)) {
      return {
        status: 'unauthorized_role',
        user: adminUser,
        detectedRole: typeof role === 'string' ? role : undefined,
      };
    }

    // Regional coordinator must have an assigned region
    if (role === 'regional_coordinator' && !assignedRegion) {
      return {
        status: 'unauthorized_role',
        user: adminUser,
        detectedRole: 'regional_coordinator (missing assigned_region)',
      };
    }

    return {
      status: 'authenticated',
      session: {
        user: adminUser,
        role,
        assignedRegion: role === 'regional_coordinator' ? assignedRegion : undefined,
      },
    };
  } catch (err) {
    console.error('[Auth Error] Failed to retrieve admin session:', err);
    return { status: 'unauthenticated' };
  }
}

/**
 * Quick helper that returns the AdminSession if authorized, or null otherwise.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const result = await getAdminAuthResult();
  if (result.status === 'authenticated') {
    return result.session;
  }
  return null;
}

export type MemberAuthResult =
  | { status: 'authenticated'; session: MemberSession }
  | { status: 'pending_activation'; user: MemberUser; application: MemberApplicationSummary }
  | { status: 'not_a_member'; user: MemberUser }
  | { status: 'unauthenticated' };

/**
 * Validates the current Supabase Auth session for member self-service.
 * Derives authenticated member identity strictly server-side from session cookies.
 * Does not trust any browser-provided member ID, email, or application ID.
 */
export async function getMemberAuthResult(): Promise<MemberAuthResult> {
  try {
    const supabase = await createAuthClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !user.email) {
      return { status: 'unauthenticated' };
    }

    const memberUser: MemberUser = {
      id: user.id,
      email: user.email,
    };

    const normalizedEmail = user.email.trim().toLowerCase();
    const adminClient = createAdminClient();

    // Look up authoritative member row by normalized email
    const { data: member, error: memError } = await adminClient
      .from('members')
      .select('*')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (memError) {
      console.error('[Auth Error] Failed to lookup member by email:', memError.message);
    }

    // Look up linked membership application (if any)
    let application: MemberApplicationSummary | null = null;
    if (member?.id) {
      const { data: appData } = await adminClient
        .from('membership_applications')
        .select('id, application_number, status, submitted_at, activated_at')
        .eq('member_id', member.id)
        .maybeSingle();
      if (appData) {
        application = appData;
      }
    }

    if (!application) {
      const { data: appData } = await adminClient
        .from('membership_applications')
        .select('id, application_number, status, submitted_at, activated_at')
        .eq('email', normalizedEmail)
        .order('submitted_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (appData) {
        application = appData;
      }
    }

    if (member) {
      return {
        status: 'authenticated',
        session: {
          user: memberUser,
          member: member as MemberRecord,
          application,
        },
      };
    }

    if (application) {
      return {
        status: 'pending_activation',
        user: memberUser,
        application,
      };
    }

    return {
      status: 'not_a_member',
      user: memberUser,
    };
  } catch (err) {
    console.error('[Auth Error] Failed to retrieve member session:', err);
    return { status: 'unauthenticated' };
  }
}

/**
 * Quick helper that returns the MemberSession if authenticated and active member, or null otherwise.
 */
export async function getMemberSession(): Promise<MemberSession | null> {
  const result = await getMemberAuthResult();
  if (result.status === 'authenticated') {
    return result.session;
  }
  return null;
}
