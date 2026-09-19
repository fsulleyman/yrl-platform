import { Resend } from 'resend';
import { getEmailFrom, isResendConfigured } from './config';
import { renderNominationEmail, type NominationEmailData } from './templates/nomination';
import { renderMembershipEmail, type MembershipEmailData } from './templates/member';
import { renderContactConfirmationEmail, type ContactEmailData } from './templates/contact';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  text: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
}

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!isResendConfigured()) {
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

/**
 * Generic email delivery function using Resend.
 * Gracefully handles unconfigured environment or API delivery failures.
 */
export async function sendEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  const client = getResendClient();
  if (!client) {
    // Resend is not configured (e.g. during local dev or before API key is provided).
    // Graceful no-op.
    return {
      success: false,
      skipped: true,
      error: 'Resend API key is not configured.',
    };
  }

  const fromAddress = options.from || getEmailFrom();
  if (!fromAddress) {
    return {
      success: false,
      skipped: true,
      error: 'Sender email (YRL_EMAIL_FROM or YRL_CONTACT_EMAIL) is not configured.',
    };
  }

  try {
    const { data, error } = await client.emails.send({
      from: fromAddress,
      to: [options.to],
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {
      console.error('[Email Delivery Error]', error.message);
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: true,
      id: data?.id,
    };
  } catch (err: any) {
    console.error('[Email Delivery Exception]', err?.message || 'Unknown error');
    return {
      success: false,
      error: err?.message || 'Unknown error during email dispatch',
    };
  }
}

/**
 * Send nomination confirmation email
 */
export async function sendNominationEmail(to: string, data: NominationEmailData): Promise<SendEmailResult> {
  const { subject, html, text } = renderNominationEmail(data);
  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Send general civic membership confirmation email
 */
export async function sendMembershipEmail(to: string, data: MembershipEmailData): Promise<SendEmailResult> {
  const { subject, html, text } = renderMembershipEmail(data);
  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}

/**
 * Send contact inquiry confirmation email
 */
export async function sendContactConfirmationEmail(to: string, data: ContactEmailData): Promise<SendEmailResult> {
  const { subject, html, text } = renderContactConfirmationEmail(data);
  return sendEmail({
    to,
    subject,
    html,
    text,
  });
}
