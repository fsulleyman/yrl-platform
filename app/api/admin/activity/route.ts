import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuthResult } from '@/lib/auth/server';
import { getAdminActivityLogs } from '@/lib/audit/service';

export const dynamic = 'force-dynamic';

/**
 * API Route Handler: /api/admin/activity
 *
 * Provides a direct HTTP endpoint for administrative activity logs with strict super_admin RBAC:
 * - Unauthenticated -> 401 Unauthorized
 * - Authenticated non-super_admin -> 403 Forbidden
 * - Super admin -> 200 OK with sanitized paginated logs
 */
export async function GET(req: NextRequest) {
  const authResult = await getAdminAuthResult();

  if (authResult.status === 'unauthenticated') {
    return NextResponse.json(
      {
        success: false,
        error: 'Unauthorized: Authentication required.',
      },
      { status: 401 }
    );
  }

  if (authResult.status === 'unauthorized_role' || authResult.session?.role !== 'super_admin') {
    return NextResponse.json(
      {
        success: false,
        error: 'Forbidden: Super Administrator authority required.',
        role: authResult.status === 'unauthorized_role' ? authResult.detectedRole : authResult.session?.role,
      },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || undefined;
  const entity_type = searchParams.get('entity_type') || undefined;
  const actor_id = searchParams.get('actor_id') || undefined;
  const search = searchParams.get('search') || undefined;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

  const result = await getAdminActivityLogs(authResult.session, {
    action,
    entity_type,
    actor_id,
    search,
    page,
    pageSize,
  });

  return NextResponse.json(result, { status: result.statusCode || (result.success ? 200 : 500) });
}
