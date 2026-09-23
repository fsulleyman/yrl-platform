/**
 * Phase B14 Correction: Super Admin Activity Log Types
 * Authoritative types for viewing and filtering system audit records
 */

export interface AuditLogEntry {
  id: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  action: string;
  previous_state: Record<string, any> | null;
  new_state: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  action?: string;
  entity_type?: string;
  actor_id?: string;
  search?: string;
  page?: number;
  pageSize?: number;
  startDate?: string;
  endDate?: string;
}

export interface PaginatedAuditLogsResult {
  logs: AuditLogEntry[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
