/**
 * Authoritative Administrative Roles and Scopes for YRL Platform
 * Model B / Phase B7
 */

export type AdminRole = 'super_admin' | 'national_reviewer' | 'regional_coordinator';

export interface AdminUser {
  id: string;
  email: string;
}

export interface AdminSession {
  user: AdminUser;
  role: AdminRole;
  assignedRegion?: string;
}

/**
 * Authoritative allow-list of the 11 national portfolios in position_enum.
 * Used for National Reviewer scoping.
 */
export const NATIONAL_PORTFOLIOS = [
  'Chief of Staff',
  'Minister for Education',
  'Minister for Youth Employment and Entrepreneurship',
  'Minister for Finance',
  'Minister for Research, Science and Technology',
  'Minister for Communications',
  'Minister for Health',
  'Minister for Agriculture',
  'Minister for Gender, Women and Social Protection',
  'Minister for Local Government and Community Development',
  'Attorney-General and Minister for Justice',
] as const;

export type NationalPortfolio = (typeof NATIONAL_PORTFOLIOS)[number];

export const REGIONAL_PORTFOLIO = 'Interim Regional Minister' as const;

/**
 * Validates whether a given nomination record falls within the admin session's authorized scope.
 */
export function isNominationInScope(
  nomination: { position_applied: string; region: string; region_if_regional_minister?: string | null },
  session: AdminSession
): boolean {
  if (session.role === 'super_admin') {
    return true;
  }

  if (session.role === 'national_reviewer') {
    return (NATIONAL_PORTFOLIOS as readonly string[]).includes(nomination.position_applied);
  }

  if (session.role === 'regional_coordinator') {
    const assignedRegion = session.assignedRegion;
    if (!assignedRegion) return false;
    return (
      nomination.region === assignedRegion ||
      nomination.region_if_regional_minister === assignedRegion
    );
  }

  return false;
}

/**
 * Authoritative Nomination Statuses matching PostgreSQL nomination_status_enum
 */
export const NOMINATION_STATUSES = [
  'submitted',
  'screening',
  'shortlisted',
  'interview',
  'selected',
  'declined',
] as const;

export type NominationStatus = (typeof NOMINATION_STATUSES)[number];

export const REVIEW_RECOMMENDATIONS = ['advance', 'hold', 'decline'] as const;
export type ReviewRecommendation = (typeof REVIEW_RECOMMENDATIONS)[number];

export interface NominationReviewRecord {
  id: string;
  nomination_id: string;
  reviewer_id?: string | null;
  reviewer_name?: string | null;
  review_stage: string;
  rating?: number | null;
  recommendation: ReviewRecommendation;
  notes?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface AuditLogRecord {
  id: string;
  entity_type: string;
  entity_id: string;
  actor_id: string;
  action: string;
  previous_state?: Record<string, any> | null;
  new_state?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export const ADMIN_ROLES = ['super_admin', 'national_reviewer', 'regional_coordinator'] as const;

export interface AdminUserRecord {
  id: string;
  email: string;
  role: AdminRole;
  assignedRegion?: string | null;
  disabled: boolean;
  createdAt: string;
  lastSignInAt?: string | null;
}
