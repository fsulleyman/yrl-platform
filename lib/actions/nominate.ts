'use server';

import { headers } from 'next/headers';
import { nominationSubmissionSchema, type NominationSubmissionInput } from '@/lib/validations/nomination';
import { createAdminClient } from '@/lib/supabase/server';

// Basic in-memory sliding window rate limiter for IP
const ipSubmissionTracker = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SUBMISSIONS_PER_IP = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const timestamps = ipSubmissionTracker.get(ip) || [];
  const validTimestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
  
  if (validTimestamps.length >= MAX_SUBMISSIONS_PER_IP) {
    return true;
  }

  validTimestamps.push(now);
  ipSubmissionTracker.set(ip, validTimestamps);
  return false;
}

export type NominationActionResult = {
  success: boolean;
  referenceId?: string;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitNomination(data: NominationSubmissionInput): Promise<NominationActionResult> {
  try {
    // 1. Check IP rate limit
    const headerList = await headers();
    const forwardedFor = headerList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1';

    if (isRateLimited(ip)) {
      return {
        success: false,
        error: 'Too many submissions received from this network. Please wait a few minutes before trying again.',
      };
    }

    // 2. Honeypot check (hidden bot field)
    if (data.honeypot && data.honeypot.trim().length > 0) {
      // Silently reject bots with generic success to prevent reverse engineering
      return {
        success: true,
        referenceId: 'REF-' + Math.random().toString(36).substring(2, 10).toUpperCase(),
      };
    }

    // 3. Server-side validation via Zod
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
    const { honeypot, ...dbRecord } = validatedData;

    // 4. Initialize Supabase admin client (server-side only)
    let supabase;
    try {
      supabase = createAdminClient();
    } catch (err: any) {
      console.error('Supabase initialization error:', err.message);
      return {
        success: false,
        error: 'System configuration error: Database connection is not yet configured. Please ensure environment variables are set.',
      };
    }

    // 5. Application-level check for duplicate application
    const { data: existingNomination, error: checkError } = await supabase
      .from('nominations')
      .select('id')
      .eq('email', dbRecord.email.toLowerCase())
      .eq('position_applied', dbRecord.position_applied)
      .maybeSingle();

    if (checkError) {
      console.error('Database pre-check error:', checkError);
    }

    if (existingNomination) {
      return {
        success: false,
        error: 'You have already submitted a nomination for this position. If you need to make changes or inquire about your status, please contact Youth Republic Leadership.',
      };
    }

    // 6. Database Insert
    const { data: insertedData, error: insertError } = await supabase
      .from('nominations')
      .insert({
        ...dbRecord,
        email: dbRecord.email.toLowerCase(),
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('Database insert error:', insertError);

      // Handle unique constraint violation (code 23505)
      if (insertError.code === '23505') {
        return {
          success: false,
          error: 'You have already submitted a nomination for this position. Each applicant may only apply once per position.',
        };
      }

      return {
        success: false,
        error: 'Unable to save your nomination at this time. Please check your internet connection and try again.',
      };
    }

    return {
      success: true,
      referenceId: insertedData.id,
    };
  } catch (err: any) {
    console.error('Unexpected submission error:', err);
    return {
      success: false,
      error: 'An unexpected error occurred while processing your nomination. Please try again.',
    };
  }
}
