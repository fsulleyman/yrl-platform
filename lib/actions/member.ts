'use server';

import { headers } from 'next/headers';
import {
  memberSubmissionSchema,
  updateMemberProfileSchema,
  type MemberSubmissionInput,
  type UpdateMemberProfileInput,
} from '@/lib/validations/member';
import { createAdminClient } from '@/lib/supabase/server';
import { sendMembershipEmail } from '@/lib/email/resend';
import { getMemberAuthResult, getMemberSession } from '@/lib/auth/server';
import type { MemberRecord, MemberApplicationSummary } from '@/lib/auth/types';

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

export type MemberDataResult = {
  success: boolean;
  error?: string;
  member?: MemberRecord;
  application?: MemberApplicationSummary | null;
  status?: string;
};

export type UpdateProfileResult = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  member?: MemberRecord;
};

/**
 * Server Action: getMemberDataAction
 *
 * Secure server-side query for the authenticated member.
 * Derives user identity strictly from session cookies; ignores any client-provided IDs.
 */
export async function getMemberDataAction(): Promise<MemberDataResult> {
  try {
    const authResult = await getMemberAuthResult();

    if (authResult.status === 'unauthenticated') {
      return {
        success: false,
        error: 'Unauthorized: Please sign in to access the member portal.',
        status: 'unauthenticated',
      };
    }

    if (authResult.status === 'pending_activation') {
      return {
        success: false,
        error: 'Your membership application has been received and payment is pending administrative activation.',
        application: authResult.application,
        status: 'pending_activation',
      };
    }

    if (authResult.status === 'not_a_member') {
      return {
        success: false,
        error: 'No active membership found for your account.',
        status: 'not_a_member',
      };
    }

    return {
      success: true,
      member: authResult.session.member,
      application: authResult.session.application,
      status: 'authenticated',
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'Failed to retrieve membership information.'),
    };
  }
}

/**
 * Server Action: updateMemberProfileAction
 *
 * Secure server-side handler for member self-service profile editing.
 * 1. Derives member identity strictly from session cookies (zero client ID trust)
 * 2. Enforces Zod strict allowlist validation (zero mass assignment)
 * 3. Enforces phone number uniqueness across members
 * 4. Updates ONLY permitted editable fields in 'members' table
 * 5. Emits 'member_profile_updated' audit event with previous and new states
 */
export async function updateMemberProfileAction(input: unknown): Promise<UpdateProfileResult> {
  try {
    const session = await getMemberSession();
    if (!session || !session.member) {
      return {
        success: false,
        error: 'Unauthorized: Please sign in to update your profile.',
      };
    }

    const validationResult = updateMemberProfileSchema.safeParse(input);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Please correct the highlighted fields.',
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const validated = validationResult.data;
    const supabase = createAdminClient();

    // If phone number is updated, ensure no other member has that phone number
    const normalizedPhone = validated.phone_number.trim();
    if (normalizedPhone !== session.member.phone_number) {
      const { data: existingPhone, error: phoneErr } = await supabase
        .from('members')
        .select('id')
        .eq('phone_number', normalizedPhone)
        .neq('id', session.member.id)
        .maybeSingle();

      if (phoneErr) {
        console.error('[B13.4 Error] Phone check error:', phoneErr.message);
      }

      if (existingPhone) {
        return {
          success: false,
          error: 'Another member with this phone number is already registered.',
          fieldErrors: {
            phone_number: ['This phone number is already registered to another member.'],
          },
        };
      }
    }

    // Strict allowlist: Only update the explicitly allowed profile fields
    const updatePayload = {
      phone_number: normalizedPhone,
      whatsapp_number: validated.whatsapp_number || null,
      district_municipality: validated.district_municipality,
      town_community: validated.town_community,
      occupation: validated.occupation,
      education_level: validated.education_level,
      availability: validated.availability,
      engagement_interests: validated.engagement_interests,
      updated_at: new Date().toISOString(),
    };

    // Calculate previous vs new state for audit
    const previousState: Record<string, any> = {
      phone_number: session.member.phone_number,
      whatsapp_number: session.member.whatsapp_number,
      district_municipality: session.member.district_municipality,
      town_community: session.member.town_community,
      occupation: session.member.occupation,
      education_level: session.member.education_level,
      availability: session.member.availability,
      engagement_interests: session.member.engagement_interests,
    };

    const { data: updatedMember, error: updateError } = await supabase
      .from('members')
      .update(updatePayload)
      .eq('id', session.member.id)
      .select('*')
      .single();

    if (updateError || !updatedMember) {
      console.error('[B13.4 Error] Member profile update failed:', updateError?.message);
      return {
        success: false,
        error: 'Unable to update profile. Please try again.',
      };
    }

    // Audit log (never log sensitive secrets or tokens)
    try {
      await supabase.from('audit_logs').insert({
        entity_type: 'member',
        entity_id: session.member.id,
        actor_id: session.member.email,
        action: 'member_profile_updated',
        previous_state: previousState,
        new_state: updatePayload,
      });
    } catch (auditErr: any) {
      console.error('[B13.4 Error] Audit log insertion failed:', auditErr.message);
    }

    return {
      success: true,
      member: updatedMember as MemberRecord,
    };
  } catch (err: any) {
    return {
      success: false,
      error: sanitizeError(err, 'An unexpected error occurred while updating your profile. Please try again.'),
    };
  }
}
