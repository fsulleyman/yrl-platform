'use server';

import { headers } from 'next/headers';
import { contactSubmissionSchema, type ContactSubmissionInput } from '@/lib/validations/contact';
import { createAdminClient } from '@/lib/supabase/server';
import { sendContactConfirmationEmail } from '@/lib/email/resend';

import { publicSubmissionRateLimiter, extractClientIp } from '@/lib/security/rate-limit';
import { sanitizeError } from '@/lib/errors';

export type ContactActionResult = {
  success: boolean;
  referenceId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Server Action: submitContactMessage
 * 
 * Secure server-side handler for the YRL contact form.
 * 1. Verifies IP rate limiting via centralized in-memory rate limiter
 * 2. Checks honeypot anti-bot field
 * 3. Validates all 3 contact fields via Zod
 * 4. Normalizes text fields (trimmed name/message, lowercased/trimmed email)
 * 5. Inserts into Supabase via service-role client with initial status 'received'
 * 6. Returns database-generated authoritative reference ID (YRL-MSG-YYYY-XXXX)
 */
export async function submitContactMessage(data: unknown): Promise<ContactActionResult> {
  try {
    // 1. IP-based rate limiting check
    let ip = '127.0.0.1';
    try {
      const headerList = await headers();
      ip = extractClientIp(headerList);
    } catch {
      ip = '127.0.0.1';
    }

    const rateLimit = publicSubmissionRateLimiter.check(ip);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Too many submissions received from this network. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
      };
    }

    // 2. Honeypot check (hidden anti-bot field)
    const rawData = (typeof data === 'object' && data !== null) ? (data as Record<string, unknown>) : {};
    if (typeof rawData.honeypot === 'string' && rawData.honeypot.trim().length > 0) {
      // Silently reject bots with generic success without persisting to DB or issuing any official reference ID
      return {
        success: true,
      };
    }

    // 3. Server-side validation via Zod (never trust client input)
    const validationResult = contactSubmissionSchema.safeParse(data);
    if (!validationResult.success) {
      const flattened = validationResult.error.flatten();
      return {
        success: false,
        error: 'Please correct the highlighted fields.',
        fieldErrors: flattened.fieldErrors,
      };
    }

    const validatedData = validationResult.data;
    // Strip honeypot before DB insert
    const { honeypot: _honeypot, ...contactRecord } = validatedData;

    // Normalize input
    const normalizedFullName = contactRecord.full_name.trim();
    const normalizedEmail = contactRecord.email.trim().toLowerCase();
    const normalizedMessage = contactRecord.message.trim();

    // 4. Initialize Supabase admin client (server-side only, bypasses RLS safely)
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (err: any) {
      console.error('[B5 Error] Supabase admin client initialization failed:', err.message);
      return {
        success: false,
        error: 'System configuration error: Database connection is not available. Please try again later.',
      };
    }

    // 5. Database Insert (authoritative reference_id is generated database-side via generate_yrl_reference('MSG', 'seq_contact_ref'))
    const { data: insertedData, error: insertError } = await supabase
      .from('contact_messages')
      .insert({
        full_name: normalizedFullName,
        email: normalizedEmail,
        message: normalizedMessage,
        status: 'received',
      })
      .select('reference_id')
      .single();

    if (insertError) {
      console.error('[B5 Error] Database insert error code:', insertError.code);
      return {
        success: false,
        error: 'Unable to send your message at this time. Please check your connection and try again.',
      };
    }

    if (!insertedData || !insertedData.reference_id) {
      console.error('[B5 Error] Database insert succeeded but reference_id was not returned.');
      return {
        success: false,
        error: 'Message was saved, but reference generation could not be confirmed. Please contact YRL secretariat.',
      };
    }

    // 6. Non-blocking email dispatch (graceful degradation)
    try {
      await sendContactConfirmationEmail(normalizedEmail, {
        fullName: normalizedFullName,
        referenceId: insertedData.reference_id,
      });
    } catch (emailErr: any) {
      // Email failure must never prevent successful message submission
      console.error('[B6 Notice] Non-blocking contact confirmation email dispatch error:', emailErr?.message || emailErr);
    }

    return {
      success: true,
      referenceId: insertedData.reference_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An unexpected error occurred while processing your message. Please try again.'),
    };
  }
}
