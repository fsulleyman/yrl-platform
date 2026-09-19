'use server';

import { memberSchema, type MemberInput } from '@/lib/validations/nomination';
import { createAdminClient } from '@/lib/supabase/server';

export type MemberActionResult = {
  success: boolean;
  memberId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function registerMember(data: MemberInput): Promise<MemberActionResult> {
  try {
    // 1. Honeypot check
    if (data.honeypot && data.honeypot.trim().length > 0) {
      return {
        success: true,
        memberId: 'MBR-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      };
    }

    // 2. Validate via Zod
    const validationResult = memberSchema.safeParse(data);
    if (!validationResult.success) {
      return {
        success: false,
        error: 'Please correct the highlighted fields.',
        fieldErrors: validationResult.error.flatten().fieldErrors,
      };
    }

    const { honeypot, ...memberRecord } = validationResult.data;

    // 3. Connect to Supabase
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (err: any) {
      return {
        success: false,
        error: 'Database connection is not configured. Check environment variables.',
      };
    }

    // 4. Insert into members table
    const { data: inserted, error: insertError } = await supabase
      .from('members')
      .insert({
        ...memberRecord,
        email: memberRecord.email ? memberRecord.email.toLowerCase() : null,
        joined_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Member insert error:', insertError);
      return {
        success: false,
        error: 'Unable to register membership right now. Please try again.',
      };
    }

    return {
      success: true,
      memberId: inserted.id,
    };
  } catch (err: any) {
    console.error('Unexpected member registration error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.',
    };
  }
}
