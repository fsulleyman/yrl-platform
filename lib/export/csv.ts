/**
 * YRL CSV Data Export Utility
 *
 * Provides RFC 4180-compliant CSV generation with:
 * 1. CSV Formula Injection (Spreadsheet Command Injection) neutralization
 * 2. UTF-8 Byte Order Mark (BOM) for Ghanaian names & Unicode characters
 * 3. Role-based field extraction and PII redaction preservation
 */

import { type AdminRole } from '@/lib/auth/types';
import { maskNominationRecord } from '@/lib/security/privacy';

/**
 * Escapes a single CSV cell according to RFC 4180 and security guidelines.
 * Neutralizes CSV formula injection by prefixing '=', '+', '-', '@', '\t', '\r' with a single quote (').
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str: string;
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      str = value.join('; ');
    } else if (value instanceof Date) {
      str = value.toISOString();
    } else {
      str = JSON.stringify(value);
    }
  } else {
    str = String(value);
  }

  // Formula injection defense: prefix dangerous leading characters with a single quote
  // Targets: '=', '+', '-', '@', tabs, or carriage returns at the start
  if (/^[=\+\-@\t\r]/.test(str)) {
    str = `'${str}`;
  }

  // If the cell contains quotes, commas, newlines, or begins with our formula guard ('), wrap in double quotes
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r') || str.startsWith("'")) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Formats a 2D array of headers and rows into an RFC 4180 CSV string with UTF-8 BOM.
 */
export function buildCsvString(
  headers: string[],
  rows: (unknown)[][]
): string {
  const headerLine = headers.map(escapeCsvCell).join(',');
  const rowLines = rows.map((row) => row.map(escapeCsvCell).join(','));
  const content = [headerLine, ...rowLines].join('\r\n');

  // Prepend UTF-8 BOM (\uFEFF) so Excel/Numbers automatically recognize UTF-8 characters (e.g., Ghanaian names)
  return `\uFEFF${content}`;
}

/**
 * Converts nomination records to CSV, preserving PII masking for non-super_admin roles.
 */
export function formatNominationsCsv(
  nominations: Record<string, any>[],
  role: AdminRole
): string {
  const headers = [
    'Reference ID',
    'Status',
    'Position Applied',
    'Full Name',
    'Region',
    'Regional Minister Deployment Region',
    'District / Municipality',
    'Town / Community',
    'Gender',
    'Date of Birth',
    'Phone Number',
    'WhatsApp Number',
    'Email Address',
    'Occupation',
    'Organisation / Institution',
    'Education Level',
    'Area of Study / Profession',
    'Has Leadership Experience',
    'Prior Position',
    'Prior Organisation',
    'Prior Duration',
    'Weekly Hours Available',
    'Willing Online Meetings',
    'Willing Physical Activities',
    'Declaration Agreed',
    'Submission Date',
  ];

  const processed = nominations.map((nom) => (role === 'super_admin' ? nom : maskNominationRecord(nom, role)));

  const rows = processed.map((nom) => [
    nom.reference_id || nom.id || '',
    nom.status || '',
    nom.position_applied || '',
    nom.full_name || '',
    nom.region || '',
    nom.region_if_regional_minister || '',
    nom.district_municipality || '',
    nom.town_community || '',
    nom.gender || '',
    nom.date_of_birth || '',
    nom.phone_number || '',
    nom.whatsapp_number || '',
    nom.email || '',
    nom.occupation || '',
    nom.organisation_institution || '',
    nom.education_level || '',
    nom.area_of_study_profession || '',
    nom.has_leadership_experience ? 'Yes' : 'No',
    nom.prior_position || '',
    nom.prior_organisation || '',
    nom.prior_duration || '',
    nom.weekly_hours || '',
    nom.willing_online_meetings ? 'Yes' : 'No',
    nom.willing_physical_activities ? 'Yes' : 'No',
    nom.declaration_agreed ? 'Yes' : 'No',
    nom.created_at || '',
  ]);

  return buildCsvString(headers, rows);
}

/**
 * Converts member records to CSV.
 */
export function formatMembersCsv(
  members: Record<string, any>[],
  _role: AdminRole
): string {
  const headers = [
    'Member Reference ID',
    'Full Name',
    'Region',
    'District / Municipality',
    'Town / Community',
    'Gender',
    'Date of Birth',
    'Phone Number',
    'WhatsApp Number',
    'Email Address',
    'Occupation',
    'Education Level',
    'Why Join Statement',
    'Availability',
    'Engagement Interests',
    'Registration Date',
  ];

  const rows = members.map((mem) => [
    mem.member_id || mem.id || '',
    mem.full_name || '',
    mem.region || '',
    mem.district_municipality || '',
    mem.town_community || '',
    mem.gender || '',
    mem.date_of_birth || '',
    mem.phone_number || '',
    mem.whatsapp_number || '',
    mem.email || '',
    mem.occupation || '',
    mem.education_level || '',
    mem.why_join || '',
    mem.availability || '',
    mem.engagement_interests || [],
    mem.created_at || '',
  ]);

  return buildCsvString(headers, rows);
}

/**
 * Converts contact inquiries to CSV (Super Admin only).
 */
export function formatInquiriesCsv(
  inquiries: Record<string, any>[]
): string {
  const headers = [
    'Reference ID',
    'Full Name',
    'Email Address',
    'Status',
    'Resolved',
    'Resolved Date',
    'Message',
    'Received Date',
  ];

  const rows = inquiries.map((msg) => [
    msg.reference_id || msg.id || '',
    msg.full_name || '',
    msg.email || '',
    msg.status || '',
    msg.resolved ? 'Yes' : 'No',
    msg.resolved_at || '',
    msg.message || '',
    msg.created_at || '',
  ]);

  return buildCsvString(headers, rows);
}

/**
 * Converts nomination reviews to CSV.
 */
export function formatReviewsCsv(
  reviews: Record<string, any>[]
): string {
  const headers = [
    'Review ID',
    'Nomination ID',
    'Reviewer Name',
    'Review Stage',
    'Recommendation',
    'Rating (1-5)',
    'Review Notes',
    'Review Date',
  ];

  const rows = reviews.map((rev) => [
    rev.id || '',
    rev.nomination_id || '',
    rev.reviewer_name || '',
    rev.review_stage || '',
    rev.recommendation || '',
    rev.rating !== null && rev.rating !== undefined ? rev.rating : '',
    rev.notes || '',
    rev.created_at || '',
  ]);

  return buildCsvString(headers, rows);
}
