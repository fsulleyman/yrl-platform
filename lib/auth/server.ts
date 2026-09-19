import { createAuthClient } from '@/lib/supabase/server';
import { type AdminRole, type AdminSession, type AdminUser } from './types';

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
