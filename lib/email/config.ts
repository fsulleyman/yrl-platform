/**
 * YRL Email Configuration
 * 
 * Manages configuration-driven email settings for Youth Republic Leadership.
 * All email addresses and secrets are loaded from environment variables and never hardcoded.
 * 
 * Environment Variables:
 * - YRL_CONTACT_EMAIL: The official public contact email for YRL (used on /contact, footer, privacy policy).
 * - YRL_EMAIL_FROM: The sender address for transactional emails via Resend (e.g. "Youth Republic Leadership <info@...>" or personal email during interim).
 * - RESEND_API_KEY: Server-only API key for Resend email delivery.
 */

export function getContactEmail(): string {
  return (
    process.env.NEXT_PUBLIC_YRL_CONTACT_EMAIL ||
    process.env.YRL_CONTACT_EMAIL ||
    ''
  );
}

export function getEmailFrom(): string {
  return (
    process.env.YRL_EMAIL_FROM ||
    process.env.YRL_CONTACT_EMAIL ||
    process.env.NEXT_PUBLIC_YRL_CONTACT_EMAIL ||
    ''
  );
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim().length > 0);
}
