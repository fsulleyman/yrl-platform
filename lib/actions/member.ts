'use server';

import { headers } from 'next/headers';
import { memberSubmissionSchema, type MemberSubmissionInput } from '@/lib/validations/member';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMembershipEmail } from '@/lib/email/resend';

import { publicSubmissionRateLimiter, extractClientIp } from '@/lib/security/rate-limit';
import { sanitizeError } from '@/lib/errors';

export type MemberActionResult = {
  success: boolean;
  memberId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

/**
 * Server Action: registerMember
 *
 * Secure server-side handler for the YRL general civic membership form.
 * 1. Verifies IP rate limiting via centralized in-memory rate limiter
 * 2. Checks honeypot anti-bot field
 * 3. Validates all 15 membership fields via Zod
 * 4. Normalizes email and enforces duplicate constraint (email & phone)
 * 5. Inserts into Supabase via service-role client with initial status 'active'
 * 6. Returns database-generated authoritative member ID (YRL-MEM-YYYY-XXXX)
 */
export async function registerMember(data: unknown): Promise<MemberActionResult> {
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
      // Silently reject bots with generic success without persisting to DB or issuing any official member ID
      return {
        success: true,
      };
    }

    // 3. Server-side validation via Zod (never trust client input)
    const validationResult = memberSubmissionSchema.safeParse(data);
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
    const { honeypot: _honeypot, ...memberRecord } = validatedData;

    // Normalize email (lowercase and trimmed to match database constraint)
    const normalizedEmail = memberRecord.email.trim().toLowerCase();
    const normalizedPhone = memberRecord.phone_number.trim();

    // 4. Initialize Supabase admin client (server-side only, bypasses RLS safely)
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (err: any) {
      console.error('[B4 Error] Supabase admin client initialization failed:', err.message);
      return {
        success: false,
        error: 'System configuration error: Database connection is not available. Please try again later.',
      };
    }

    // 5. Pre-check for duplicate application (email)
    const { data: existingEmail, error: checkEmailError } = await supabase
      .from('members')
      .select('id')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (checkEmailError) {
      console.error('[B4 Error] Database email pre-check error:', checkEmailError.message);
    }

    if (existingEmail) {
      return {
        success: false,
        error: 'A member with this email address has already registered.',
      };
    }

    // Pre-check for duplicate application (phone)
    const { data: existingPhone, error: checkPhoneError } = await supabase
      .from('members')
      .select('id')
      .eq('phone_number', normalizedPhone)
      .maybeSingle();

    if (checkPhoneError) {
      console.error('[B4 Error] Database phone pre-check error:', checkPhoneError.message);
    }

    if (existingPhone) {
      return {
        success: false,
        error: 'A member with this phone number has already registered.',
      };
    }

    // 6. Database Insert (authoritative member_id is generated database-side via generate_yrl_reference('MEM', 'seq_member_ref'))
    const { data: insertedData, error: insertError } = await supabase
      .from('members')
      .insert({
        ...memberRecord,
        email: normalizedEmail,
        phone_number: normalizedPhone,
        engagement_interests: memberRecord.engagement_interests || [],
        status: 'active',
      })
      .select('member_id')
      .single();

    if (insertError) {
      console.error('[B4 Error] Database insert error code:', insertError.code);

      // Handle PostgreSQL unique constraint violation (code 23505) under concurrent race conditions
      if (insertError.code === '23505') {
        const errorDetail = `${insertError.message || ''} ${insertError.details || ''}`;
        if (errorDetail.includes('uq_members_phone') || errorDetail.includes('phone')) {
          return {
            success: false,
            error: 'A member with this phone number has already registered.',
          };
        }
        if (errorDetail.includes('uq_members_email') || errorDetail.includes('email')) {
          return {
            success: false,
            error: 'A member with this email address has already registered.',
          };
        }
        return {
          success: false,
          error: 'A member with this email address or phone number has already registered.',
        };
      }

      return {
        success: false,
        error: 'Unable to register membership right now. Please try again.',
      };
    }

    if (!insertedData || !insertedData.member_id) {
      console.error('[B4 Error] Database insert succeeded but member_id was not returned.');
      return {
        success: false,
        error: 'Registration was saved, but membership ID could not be confirmed. Please contact YRL secretariat.',
      };
    }

    // 7. Non-blocking email dispatch (graceful degradation)
    try {
      const emailResult = await sendMembershipEmail(normalizedEmail, {
        fullName: memberRecord.full_name,
        memberId: insertedData.member_id,
        region: memberRecord.region,
        occupation: memberRecord.occupation,
      });

      if (emailResult.success) {
        await supabase
          .from('members')
          .update({
            email_sent: true,
            email_sent_at: new Date().toISOString(),
          })
          .eq('member_id', insertedData.member_id);
      }
    } catch (emailErr: any) {
      // Email failure must never prevent successful member registration
      console.error('[B6 Notice] Non-blocking membership email dispatch error:', emailErr?.message || emailErr);
    }

    return {
      success: true,
      memberId: insertedData.member_id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An unexpected error occurred while processing your registration. Please try again.'),
    };
  }
}
