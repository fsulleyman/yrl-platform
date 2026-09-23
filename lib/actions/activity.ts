'use server';

import { getAdminAuthResult } from '@/lib/auth/server';
import { getAdminActivityLogs, type ActivityLogsResult } from '@/lib/audit/service';
import type { AuditLogFilters } from '@/lib/audit/types';

/**
 * Server Action: getActivityLogsAction
 *
 * Secure entry point for client components to request paginated/filtered audit logs:
 * - Server-side authentication check
 * - Strict super_admin role verification
 * - Rejects unauthorized requests BEFORE querying audit logs
 */
export async function getActivityLogsAction(
  filters: AuditLogFilters = {}
): Promise<ActivityLogsResult> {
  const authResult = await getAdminAuthResult();

  if (authResult.status === 'unauthenticated') {
    return {
      success: false,
      error: 'Unauthorized: Session expired or invalid.',
      statusCode: 401,
    };
  }

  if (authResult.status === 'unauthorized_role') {
    return {
      success: false,
      error: 'Forbidden: Account does not have administrative privileges.',
      statusCode: 403,
    };
  }

  const session = authResult.session;

  // Strict super_admin role verification
  if (session.role !== 'super_admin') {
    return {
      success: false,
      error: 'Forbidden: Only Super Administrators may access the Activity Log.',
      statusCode: 403,
    };
  }

  return await getAdminActivityLogs(session, filters);
}
