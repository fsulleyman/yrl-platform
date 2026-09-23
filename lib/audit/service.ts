/**
 * Phase B14 Correction: Super Admin Activity Log Service
 * Authoritative queries for viewing system audit records with strict RBAC & sanitization
 */

import { createAdminClient } from '@/lib/supabase/server';
import { type AdminSession } from '@/lib/auth/types';
import { type AuditLogEntry, type AuditLogFilters, type PaginatedAuditLogsResult } from './types';

// Sensitive key patterns that must NEVER be returned to the client
const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /token/i,
  /secret/i,
  /cookie/i,
  /signature/i,
  /credential/i,
  /authorization/i,
  /apikey/i,
  /api_key/i,
  /private_key/i,
  /service_role/i,
  /signed_url/i,
  /signedurl/i,
  /bearer/i,
  /access_token/i,
  /refresh_token/i,
  /webhook_signature/i,
  /receipt_signed_url/i,
];

/**
 * Recursively sanitizes a value, stripping secrets, tokens, credentials, and signed URLs.
 */
function sanitizeValue(key: string, val: any): any {
  if (val === null || val === undefined) return val;

  for (const pattern of SENSITIVE_KEY_PATTERNS) {
    if (pattern.test(key)) {
      return '[REDACTED]';
    }
  }

  if (typeof val === 'string') {
    // Detect JWT patterns or URLs containing signature tokens
    if (
      val.startsWith('eyJh') ||
      val.includes('token=') ||
      val.includes('Signature=') ||
      val.includes('X-Amz-Signature=')
    ) {
      return '[REDACTED]';
    }
    return val;
  }

  if (Array.isArray(val)) {
    return val.map((item, idx) => sanitizeValue(String(idx), item));
  }

  if (typeof val === 'object') {
    return sanitizeObject(val);
  }

  return val;
}

/**
 * Sanitizes state objects to prevent any accidental leakage of credentials or sensitive data.
 */
export function sanitizeObject(obj: Record<string, any> | null): Record<string, any> | null {
  if (!obj || typeof obj !== 'object') return obj;

  const sanitized: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    sanitized[k] = sanitizeValue(k, v);
  }
  return sanitized;
}

export interface ActivityLogsResult {
  success: boolean;
  data?: PaginatedAuditLogsResult;
  error?: string;
  statusCode?: number;
}

/**
 * Authoritative query for the Super Admin Activity Log.
 *
 * HARD SECURITY INVARIANTS:
 * 1. ONLY super_admin may call this service.
 * 2. Non-super-admins (regional_coordinator, national_reviewer, applicant, member) are REJECTED with Forbidden.
 * 3. Server sanitization: secrets, tokens, signed URLs, credentials stripped before response.
 * 4. Server-side pagination and ordering (newest first).
 */
export async function getAdminActivityLogs(
  session: AdminSession,
  filters: AuditLogFilters = {}
): Promise<ActivityLogsResult> {
  try {
    // 1. HARD SECURITY GATE: STRICTLY super_admin
    if (!session || session.role !== 'super_admin') {
      return {
        success: false,
        error: 'Forbidden: Only Super Administrators may access the Activity Log.',
        statusCode: 403,
      };
    }

    const supabase = createAdminClient();
    const page = Math.max(1, filters.page || 1);
    const pageSize = Math.min(50, Math.max(1, filters.pageSize || 20));
    const offset = (page - 1) * pageSize;

    let query = supabase
      .from('audit_logs')
      .select(
        'id, entity_type, entity_id, actor_id, action, previous_state, new_state, ip_address, user_agent, created_at',
        { count: 'exact' }
      );

    // 2. Action filter
    if (filters.action && filters.action !== 'all') {
      query = query.eq('action', filters.action);
    }

    // 3. Entity type filter
    if (filters.entity_type && filters.entity_type !== 'all') {
      query = query.eq('entity_type', filters.entity_type);
    }

    // 4. Actor filter
    if (filters.actor_id && filters.actor_id !== 'all') {
      query = query.eq('actor_id', filters.actor_id);
    }

    // 5. Date range filter
    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }
    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    // 6. Search query (search across entity_id, actor_id, or action)
    if (filters.search && filters.search.trim()) {
      const q = filters.search.trim();
      query = query.or(`entity_id.ilike.%${q}%,actor_id.ilike.%${q}%,action.ilike.%${q}%`);
    }

    // 7. Order: newest activity first
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

    const { data, count, error } = await query;
    if (error) {
      console.error('[Audit Error] Failed to fetch audit logs:', error.message);
      return { success: false, error: 'Failed to retrieve activity log.', statusCode: 500 };
    }

    const totalCount = count || 0;
    const sanitizedLogs: AuditLogEntry[] = (data || []).map((row: any) => ({
      id: row.id,
      entity_type: row.entity_type,
      entity_id: row.entity_id,
      actor_id: row.actor_id,
      action: row.action,
      previous_state: sanitizeObject(row.previous_state),
      new_state: sanitizeObject(row.new_state),
      ip_address: row.ip_address,
      user_agent: row.user_agent,
      created_at: row.created_at,
    }));

    return {
      success: true,
      statusCode: 200,
      data: {
        logs: sanitizedLogs,
        totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize) || 1,
      },
    };
  } catch (err: any) {
    console.error('[Audit Error] Exception in getAdminActivityLogs:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while loading activity log.',
      statusCode: 500,
    };
  }
}
