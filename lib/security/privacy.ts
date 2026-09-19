/**
 * YRL Privacy & PII Protection Utilities
 *
 * Implements data minimization and presentation-level redaction for sensitive
 * personally identifiable information (PII) according to Ghanaian Data Protection
 * standards and YRL administrative security policy.
 *
 * IMPORTANT: These functions must ONLY be used for display, export previews, and audit logs.
 * Never mask values before database insertion or updates.
 */

/**
 * Masks a phone number, preserving the country/operator code and last 3-4 digits.
 * Example: '+233241234567' -> '+233****4567'
 *          '0241234567'    -> '024****567'
 */
export function maskPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const trimmed = phone.trim();
  if (trimmed.length <= 4) return '****';
  if (trimmed.length <= 7) {
    return trimmed.slice(0, 2) + '***' + trimmed.slice(-2);
  }
  return trimmed.slice(0, 4) + '****' + trimmed.slice(-3);
}

/**
 * Masks an email address, preserving first char, last char of local part, and domain.
 * Example: 'kofi.mensah@example.org' -> 'k***h@example.org'
 *          'ab@example.com'         -> 'a***@example.com'
 */
export function maskEmail(email: string | null | undefined): string {
  if (!email) return '';
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf('@');
  if (atIdx <= 1) return '***' + trimmed.slice(atIdx);
  const local = trimmed.slice(0, atIdx);
  const domain = trimmed.slice(atIdx);
  if (local.length <= 2) {
    return local[0] + '***' + domain;
  }
  return local[0] + '***' + local[local.length - 1] + domain;
}

/**
 * Masks a date of birth (YYYY-MM-DD), preserving the year for age verification while masking day/month.
 * Example: '1998-04-12' -> '1998-**-**'
 */
export function maskDateOfBirth(dob: string | null | undefined): string {
  if (!dob) return '';
  const trimmed = dob.trim();
  const parts = trimmed.split('-');
  if (parts.length === 3) {
    return `${parts[0]}-**-**`;
  }
  return '****-**-**';
}

/**
 * Masks sensitive document URLs (CVs, national IDs).
 * Example: 'https://storage.example.com/uploads/id_card_123.pdf' -> '[DOCUMENT_ATTACHED]'
 */
export function maskDocumentUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  return '[DOCUMENT_ATTACHED]';
}

/**
 * Masks residential address details, preserving community/town if comma-separated.
 * Example: 'Flat 4B, Ridge Towers, Accra' -> '[CONFIDENTIAL STREET], Accra'
 */
export function maskAddress(address: string | null | undefined): string {
  if (!address) return '';
  const trimmed = address.trim();
  if (trimmed.length <= 10) return '[CONFIDENTIAL_ADDRESS]';
  const commaIdx = trimmed.lastIndexOf(',');
  if (commaIdx !== -1) {
    return `[CONFIDENTIAL STREET], ${trimmed.slice(commaIdx + 1).trim()}`;
  }
  return '[CONFIDENTIAL_ADDRESS]';
}

/**
 * Masks a nomination record for presentation based on reviewer role.
 * Super Admin retains full visibility; regional coordinators and reviewers receive redacted PII.
 */
export function maskNominationRecord<T extends Record<string, any>>(
  nomination: T,
  role: 'super_admin' | 'national_reviewer' | 'regional_coordinator'
): T {
  if (role === 'super_admin') {
    return nomination; // Super admin has full audit and review visibility
  }

  const masked: Record<string, any> = { ...nomination };

  if (typeof masked.phone_number === 'string') {
    masked.phone_number = maskPhone(masked.phone_number);
  }
  if (typeof masked.whatsapp_number === 'string') {
    masked.whatsapp_number = maskPhone(masked.whatsapp_number);
  }
  if (typeof masked.date_of_birth === 'string') {
    masked.date_of_birth = maskDateOfBirth(masked.date_of_birth);
  }
  if (typeof masked.id_document_url === 'string') {
    masked.id_document_url = maskDocumentUrl(masked.id_document_url);
  }
  if (typeof masked.referee_phone === 'string') {
    masked.referee_phone = maskPhone(masked.referee_phone);
  }
  if (typeof masked.reference1_phone === 'string') {
    masked.reference1_phone = maskPhone(masked.reference1_phone);
  }
  if (typeof masked.reference2_phone === 'string') {
    masked.reference2_phone = maskPhone(masked.reference2_phone);
  }

  return masked as T;
}
