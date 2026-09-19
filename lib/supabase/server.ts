import { createClient } from '@supabase/supabase-js';

// Strict runtime assertion that this file is never executed on the client
if (typeof window !== 'undefined') {
  throw new Error('CRITICAL SECURITY ERROR: lib/supabase/server.ts must never be imported in client-side code.');
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

/**
 * Server client with service role privileges.
 * Used ONLY in Server Actions, secure API routes, and the interim password-gated admin portal.
 */
export function createAdminClient() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error('Supabase admin credentials missing. Set SUPABASE_SERVICE_ROLE_KEY in .env');
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/**
 * Server client with anon role privileges, respecting RLS.
 */
export function createServerClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase public credentials missing. Set NEXT_PUBLIC_SUPABASE_ANON_KEY in .env');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
