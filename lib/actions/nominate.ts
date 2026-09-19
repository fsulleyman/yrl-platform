'use server';

import { headers } from 'next/headers';
import { nominationSubmissionSchema, type NominationSubmissionInput } from '@/lib/validations/nomination';
import { createAdminClient } from '@/lib/supabase/server';
import { sendNominationEmail } from '@/lib/email/resend';

import { publicSubmissionRateLimiter, extractClientIp } from '@/lib/security/rate-limit';
import { sanitizeError } from '@/lib/errors';

export type NominationActionResult = {
  success: boolean;
  referenceId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Server Action: submitNomination
 *
 * Secure server-side handler for the YRL leadership nomination form.
 * 1. Verifies IP rate limiting via centralized in-memory rate limiter
 * 2. Checks honeypot anti-bot field
 * 3. Validates all 35 nomination fields via Zod
 * 4. Normalizes email and enforces duplicate constraint
 * 5. Inserts into Supabase via service-role client
 * 6. Returns database-generated authoritative reference ID (YRL-NOM-YYYY-XXXX)
 */
export async function submitNomination(data: unknown): Promise<NominationActionResult> {
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
    const validationResult = nominationSubmissionSchema.safeParse(data);
    if (!validationResult.success) {
      const flattened = validationResult.error.flatten();
      return {
        success: false,
        error: 'Please correct the errors in the form before submitting.',
        fieldErrors: flattened.fieldErrors,
      };
    }

    const validatedData = validationResult.data;
    // Strip honeypot before DB insert
    const { honeypot: _honeypot, ...dbRecord } = validatedData;

    // Normalize email (lowercase and trimmed to match database constraint)
    const normalizedEmail = dbRecord.email.trim().toLowerCase();

    // 4. Initialize Supabase admin client (server-side only, bypasses RLS safely)
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (err: any) {
      console.error('[B3 Error] Supabase admin client initialization failed:', err.message);
      return {
        success: false,
        error: 'System configuration error: Database connection is not available. Please try again later.',
      };
    }

    // 5. Pre-check for duplicate application (email + position_applied)
    const { data: existingNomination, error: checkError } = await supabase
      .from('nominations')
      .select('id')
      .eq('email', normalizedEmail)
      .eq('position_applied', dbRecord.position_applied)
      .maybeSingle();

    if (checkError) {
      console.error('[B3 Error] Database pre-check error:', checkError.message);
    }

    if (existingNomination) {
      return {
        success: false,
        error: 'You have already submitted a nomination for this position. Each applicant may only apply once per position.',
      };
    }

    // 6. Database Insert (authoritative reference_id is generated database-side)
    const { data: insertedData, error: insertError } = await supabase
      .from('nominations')
      .insert({
        ...dbRecord,
        email: normalizedEmail,
        status: 'submitted',
      })
      .select('reference_id')
      .single();

    if (insertError) {
      console.error('[B3 Error] Database insert error code:', insertError.code);

      // Handle PostgreSQL unique constraint violation (code 23505) under concurrent race conditions
      if (insertError.code === '23505') {
        return {
          success: false,
          error: 'You have already submitted a nomination for this position. Each applicant may only apply once per position.',
        };
      }

      return {
        success: false,
        error: 'Unable to save your nomination at this time. Please check your connection and try again.',
      };
    }

    if (!insertedData || !insertedData.reference_id) {
      console.error('[B3 Error] Database insert succeeded but reference_id was not returned.');
      return {
        success: false,
        error: 'Nomination was saved, but reference generation could not be confirmed. Please contact YRL secretariat.',
      };
    }

    // 7. Non-blocking email dispatch (graceful degradation)
    try {
      const emailResult = await sendNominationEmail(normalizedEmail, {
        fullName: dbRecord.full_name,
        referenceId: insertedData.reference_id,
        positionApplied: dbRecord.position_applied,
        region: dbRecord.region,
      });

      if (emailResult.success) {
        await supabase
          .from('nominations')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq('reference_id', insertedData.reference_id);
      }
    } catch (emailErr: any) {
      // Email failure must never prevent successful nomination submission
      console.error('[B6 Notice] Non-blocking nomination email dispatch error:', emailErr?.message || emailErr);
    }

    return {
      success: true,
      referenceId: insertedData.reference_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An unexpected error occurred while processing your nomination. Please try again.'),
    };
  }
}
