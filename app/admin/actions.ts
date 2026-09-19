'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';

const ADMIN_COOKIE_NAME = 'yrl_admin_auth';

export async function loginAdmin(formData: FormData): Promise<void> {
  const password = formData.get('password') as string;
  const configuredPassword = process.env.ADMIN_VIEW_PASSWORD;

  if (!configuredPassword || password !== configuredPassword) {
    return;
  }

  // Set HTTP-only session cookie
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, 'authenticated_session', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 24 hours
    path: '/',
  });

  revalidatePath('/admin');
}

export async function logoutAdmin(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);
  revalidatePath('/admin');
}

export async function updateNominationStatus(
  id: string,
  newStatus: 'submitted' | 'screening' | 'shortlisted' | 'interview' | 'selected' | 'declined'
) {
  const cookieStore = await cookies();
  const session = cookieStore.get(ADMIN_COOKIE_NAME);

  if (!session || session.value !== 'authenticated_session') {
    throw new Error('Unauthorized');
  }

  const supabase = createAdminClient();
  const { error } = await supabase
    .from('nominations')
    .update({ status: newStatus })
    .eq('id', id);

  if (error) {
    console.error('Failed to update nomination status:', error);
    return { success: false, error: error.message };
  }

  revalidatePath('/admin');
  return { success: true };
}
