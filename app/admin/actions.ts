'use server';

import { revalidatePath } from 'next/cache';
import { createAuthClient, createAdminClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/auth/server';
import {
  type AdminSession,
  type AdminRole,
  type AdminUserRecord,
  NATIONAL_PORTFOLIOS,
  type NominationStatus,
  type NominationReviewRecord,
  isNominationInScope,
} from '@/lib/auth/types';
import {
  updateStatusSchema,
  submitReviewSchema,
  inviteAdminSchema,
  updateAdminRoleSchema,
  setAdminStatusSchema,
  deleteAdminUserSchema,
  exportAdminDataSchema,
  type UpdateStatusInput,
  type SubmitReviewInput,
  type InviteAdminInput,
  type UpdateAdminRoleInput,
  type SetAdminStatusInput,
  type DeleteAdminUserInput,
  type ExportAdminDataInput,
  type ExportDataset,
} from '@/lib/validations/admin';
import {
  formatNominationsCsv,
  formatMembersCsv,
  formatInquiriesCsv,
  formatReviewsCsv,
} from '@/lib/export/csv';
import {
  createNewsArticleSchema,
  updateNewsArticleSchema,
  togglePublishSchema,
  deleteNewsArticleSchema,
  type CreateNewsArticleInput,
  type UpdateNewsArticleInput,
  type TogglePublishInput,
  type DeleteNewsArticleInput,
} from '@/lib/validations/news';

import { headers } from 'next/headers';
import { adminLoginRateLimiter, extractClientIp } from '@/lib/security/rate-limit';
import { sanitizeError } from '@/lib/errors';

export interface AdminLoginResult {
  success: boolean;
  error?: string;
}

export interface MutationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Server Action: Authenticate admin user with Supabase Auth
 * Includes process-local rate limiting and security audit logging
 */
export async function loginWithSupabase(formData: FormData): Promise<AdminLoginResult> {
  const email = (formData.get('email') as string)?.trim();
  const password = formData.get('password') as string;

  if (!email || !password) {
    return {
      success: false,
      error: 'Please provide both email and password.',
    };
  }

  // 1. Process-local rate limiting check for admin authentication
  let ip = '127.0.0.1';
  try {
    const headerList = await headers();
    ip = extractClientIp(headerList);
  } catch {
    ip = '127.0.0.1';
  }
  const rateLimit = adminLoginRateLimiter.check(ip);

  if (!rateLimit.allowed) {
    return {
      success: false,
      error: `Too many failed sign-in attempts. Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
    };
  }

  try {
    const supabase = await createAuthClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Record failed authentication event in audit_logs (never record password!)
      try {
        const adminDb = createAdminClient();
        await adminDb.from('audit_logs').insert({
          entity_type: 'auth',
          entity_id: email,
          actor_id: email || 'anonymous',
          action: 'admin_login_failed',
          previous_state: null,
          new_state: { reason: 'invalid_credentials' },
          ip_address: ip,
        });
      } catch (logErr) {
        console.error('[Audit Log Error] Failed to record login failure audit:', logErr);
      }

      return {
        success: false,
        error: 'Invalid email or password. Please verify your credentials.',
      };
    }

    // Reset rate limiter for this IP on successful authentication
    adminLoginRateLimiter.reset(ip);

    // Record successful authentication event in audit_logs
    try {
      const adminDb = createAdminClient();
      await adminDb.from('audit_logs').insert({
        entity_type: 'auth',
        entity_id: email,
        actor_id: email,
        action: 'admin_login',
        previous_state: null,
        new_state: { status: 'success', method: 'password' },
        ip_address: ip,
      });
    } catch (logErr) {
      console.error('[Audit Log Error] Failed to record login audit:', logErr);
    }

    revalidatePath('/admin');
    return { success: true };
  } catch (err: any) {
    console.error('[Admin Auth Error] Sign-in failed:', err?.message || err);
    return {
      success: false,
      error: sanitizeError(err, 'Authentication failed. Please check your connection and try again.'),
    };
  }
}

/**
 * Server Action: Terminate Supabase Auth admin session with audit logging
 */
export async function logoutAdmin(): Promise<void> {
  try {
    const session = await getAdminSession();
    if (session?.user?.email) {
      try {
        const adminDb = createAdminClient();
        await adminDb.from('audit_logs').insert({
          entity_type: 'auth',
          entity_id: session.user.id || session.user.email,
          actor_id: session.user.email,
          action: 'admin_logout',
          previous_state: null,
          new_state: { status: 'logged_out' },
        });
      } catch (logErr) {
        console.error('[Audit Log Error] Failed to record logout audit:', logErr);
      }
    }

    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error('[Admin Auth Error] Logout failed:', err);
  }
  revalidatePath('/admin');
}

/**
 * Server Action: Transition Nomination Status with server-side RBAC scoping & audit logging
 */
export async function transitionNominationStatus(
  input: UpdateStatusInput
): Promise<MutationResult<{ status: NominationStatus }>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: active administrator session required.' };
  }

  const parseResult = updateStatusSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid status transition input.',
    };
  }

  const { nominationId, status: newStatus, reason } = parseResult.data;
  const supabase = createAdminClient();

  // 1. Fetch nomination to verify existence and check scope
  const { data: nomination, error: fetchError } = await supabase
    .from('nominations')
    .select('id, reference_id, status, position_applied, region, region_if_regional_minister')
    .eq('id', nominationId)
    .single();

  if (fetchError || !nomination) {
    return { success: false, error: 'Nomination record not found.' };
  }

  // 2. Enforce server-side RBAC scope
  if (!isNominationInScope(nomination, session)) {
    return {
      success: false,
      error: 'Access denied: this nomination is outside your authorized portfolio or regional scope.',
    };
  }

  const previousStatus = nomination.status;

  // 3. Perform the mutation
  const { error: updateError } = await supabase
    .from('nominations')
    .update({
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', nominationId);

  if (updateError) {
    console.error('[Admin Mutation Error] Failed to update nomination status:', updateError.message);
    return { success: false, error: 'Database update failed. Please try again.' };
  }

  // 4. Create audit log entry
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'nomination',
      entity_id: nomination.id,
      actor_id: session.user.email,
      action: 'status_change',
      previous_state: { status: previousStatus },
      new_state: { status: newStatus, reason: reason || null },
    });
  } catch (auditErr: any) {
    console.error('[Audit Log Error] Failed to record status change audit:', auditErr?.message || auditErr);
  }

  revalidatePath('/admin');
  return { success: true, data: { status: newStatus } };
}

/**
 * Server Action: Submit Reviewer Assessment & Notes with server-side RBAC scoping & audit logging
 */
export async function submitNominationReview(
  input: SubmitReviewInput
): Promise<MutationResult<{ reviewId: string }>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: active administrator session required.' };
  }

  const parseResult = submitReviewSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid review assessment input.',
    };
  }

  const { nominationId, reviewStage, rating, recommendation, notes } = parseResult.data;
  const supabase = createAdminClient();

  // 1. Fetch nomination to verify existence and check scope
  const { data: nomination, error: fetchError } = await supabase
    .from('nominations')
    .select('id, reference_id, position_applied, region, region_if_regional_minister')
    .eq('id', nominationId)
    .single();

  if (fetchError || !nomination) {
    return { success: false, error: 'Nomination record not found.' };
  }

  // 2. Enforce server-side RBAC scope
  if (!isNominationInScope(nomination, session)) {
    return {
      success: false,
      error: 'Access denied: this nomination is outside your authorized portfolio or regional scope.',
    };
  }

  // 3. Insert review into nomination_reviews
  const { data: reviewRecord, error: insertError } = await supabase
    .from('nomination_reviews')
    .insert({
      nomination_id: nomination.id,
      reviewer_id: session.user.id,
      reviewer_name: session.user.email,
      review_stage: reviewStage,
      rating: rating ?? null,
      recommendation,
      notes: notes || null,
    })
    .select('id')
    .single();

  if (insertError || !reviewRecord) {
    console.error('[Admin Mutation Error] Failed to submit review:', insertError?.message);
    return { success: false, error: 'Failed to record review. Please try again.' };
  }

  // 4. Create audit log entry
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'nomination',
      entity_id: nomination.id,
      actor_id: session.user.email,
      action: 'review_submitted',
      previous_state: null,
      new_state: {
        review_id: reviewRecord.id,
        review_stage: reviewStage,
        rating: rating ?? null,
        recommendation,
        notes: notes || null,
      },
    });
  } catch (auditErr: any) {
    console.error('[Audit Log Error] Failed to record review audit:', auditErr?.message || auditErr);
  }

  revalidatePath('/admin');
  return { success: true, data: { reviewId: reviewRecord.id } };
}

/**
 * Server Action: Fetch existing reviews for a nomination within authorized scope
 */
export async function getNominationReviews(
  nominationId: string
): Promise<MutationResult<NominationReviewRecord[]>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: active administrator session required.' };
  }

  const supabase = createAdminClient();

  // Verify nomination is in scope
  const { data: nomination, error: fetchError } = await supabase
    .from('nominations')
    .select('id, position_applied, region, region_if_regional_minister')
    .eq('id', nominationId)
    .single();

  if (fetchError || !nomination) {
    return { success: false, error: 'Nomination record not found.' };
  }

  if (!isNominationInScope(nomination, session)) {
    return {
      success: false,
      error: 'Access denied: this nomination is outside your authorized scope.',
    };
  }

  const { data: reviews, error: reviewsError } = await supabase
    .from('nomination_reviews')
    .select('*')
    .eq('nomination_id', nominationId)
    .order('created_at', { ascending: false });

  if (reviewsError) {
    console.error('[Admin Error] Failed to fetch reviews:', reviewsError.message);
    return { success: false, error: 'Failed to fetch reviews.' };
  }

  return { success: true, data: reviews || [] };
}

/* ==============================================================================
 * B9: DYNAMIC NEWS CMS / NEWS MANAGEMENT SERVER ACTIONS
 * Strictly restricted to Super Admin role
 * ============================================================================== */

/**
 * Server Action: Create a new news article (Super Admin only)
 */
export async function createNewsArticle(
  input: CreateNewsArticleInput
): Promise<MutationResult<{ id: string; slug: string }>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Super Admin privileges required to create news articles.' };
  }

  const parseResult = createNewsArticleSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid news article data.',
    };
  }

  const articleData = parseResult.data;
  const supabase = createAdminClient();

  // Check slug uniqueness
  const { data: existing } = await supabase
    .from('news_articles')
    .select('id')
    .eq('slug', articleData.slug)
    .maybeSingle();

  if (existing) {
    return {
      success: false,
      error: `An article with slug "${articleData.slug}" already exists. Please choose a unique slug.`,
    };
  }

  const { data: created, error: insertError } = await supabase
    .from('news_articles')
    .insert({
      title: articleData.title,
      slug: articleData.slug,
      date: articleData.date,
      category: articleData.category,
      author: articleData.author,
      excerpt: articleData.excerpt,
      content: articleData.content,
      image: articleData.image || null,
      is_published: articleData.is_published,
    })
    .select('id, slug')
    .single();

  if (insertError || !created) {
    console.error('[News CMS Error] Failed to create article:', insertError?.message);
    return { success: false, error: 'Failed to create article in database.' };
  }

  // Audit log
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'news_article',
      entity_id: created.id,
      actor_id: session.user.email,
      action: 'news_created',
      previous_state: null,
      new_state: {
        slug: created.slug,
        title: articleData.title,
        category: articleData.category,
        is_published: articleData.is_published,
      },
    });
  } catch (auditErr: any) {
    console.error('[Audit Log Error] Failed to record news creation audit:', auditErr?.message || auditErr);
  }

  revalidatePath('/admin');
  revalidatePath('/news');
  revalidatePath(`/news/${created.slug}`);

  return { success: true, data: { id: created.id, slug: created.slug } };
}

/**
 * Server Action: Update an existing news article (Super Admin only)
 */
export async function updateNewsArticle(
  input: UpdateNewsArticleInput
): Promise<MutationResult<{ id: string; slug: string }>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Super Admin privileges required to edit news articles.' };
  }

  const parseResult = updateNewsArticleSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid news update data.',
    };
  }

  const { id, ...updateFields } = parseResult.data;
  const supabase = createAdminClient();

  // Fetch previous state
  const { data: previous, error: fetchError } = await supabase
    .from('news_articles')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !previous) {
    return { success: false, error: 'News article not found.' };
  }

  // If slug is changing, verify uniqueness
  if (updateFields.slug && updateFields.slug !== previous.slug) {
    const { data: existingSlug } = await supabase
      .from('news_articles')
      .select('id')
      .eq('slug', updateFields.slug)
      .neq('id', id)
      .maybeSingle();

    if (existingSlug) {
      return {
        success: false,
        error: `An article with slug "${updateFields.slug}" already exists.`,
      };
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('news_articles')
    .update({
      ...updateFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('id, slug')
    .single();

  if (updateError || !updated) {
    console.error('[News CMS Error] Failed to update article:', updateError?.message);
    return { success: false, error: 'Failed to update news article in database.' };
  }

  // Audit log
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'news_article',
      entity_id: id,
      actor_id: session.user.email,
      action: 'news_updated',
      previous_state: {
        slug: previous.slug,
        title: previous.title,
        category: previous.category,
        is_published: previous.is_published,
      },
      new_state: {
        slug: updated.slug,
        title: updateFields.title ?? previous.title,
        category: updateFields.category ?? previous.category,
        is_published: updateFields.is_published ?? previous.is_published,
      },
    });
  } catch (auditErr: any) {
    console.error('[Audit Log Error] Failed to record news update audit:', auditErr?.message || auditErr);
  }

  revalidatePath('/admin');
  revalidatePath('/news');
  revalidatePath(`/news/${previous.slug}`);
  if (updated.slug !== previous.slug) {
    revalidatePath(`/news/${updated.slug}`);
  }

  return { success: true, data: { id: updated.id, slug: updated.slug } };
}

/**
 * Server Action: Toggle an article's published status (Super Admin only)
 */
export async function toggleNewsArticlePublishStatus(
  input: TogglePublishInput
): Promise<MutationResult<{ id: string; is_published: boolean }>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Super Admin privileges required.' };
  }

  const parseResult = togglePublishSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid toggle input.',
    };
  }

  const { id, is_published } = parseResult.data;
  const supabase = createAdminClient();

  const { data: previous, error: fetchError } = await supabase
    .from('news_articles')
    .select('id, slug, is_published')
    .eq('id', id)
    .single();

  if (fetchError || !previous) {
    return { success: false, error: 'News article not found.' };
  }

  const { error: updateError } = await supabase
    .from('news_articles')
    .update({
      is_published,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (updateError) {
    console.error('[News CMS Error] Failed to toggle publish status:', updateError.message);
    return { success: false, error: 'Failed to update publish status.' };
  }

  // Audit log
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'news_article',
      entity_id: id,
      actor_id: session.user.email,
      action: 'news_status_change',
      previous_state: { is_published: previous.is_published },
      new_state: { is_published },
    });
  } catch (auditErr: any) {
    console.error('[Audit Log Error] Failed to record news status change audit:', auditErr?.message || auditErr);
  }

  revalidatePath('/admin');
  revalidatePath('/news');
  revalidatePath(`/news/${previous.slug}`);

  return { success: true, data: { id, is_published } };
}

/**
 * Server Action: Delete a news article (Super Admin only)
 * Includes required audit logging capturing minimum: id, slug, title, category, is_published.
 */
export async function deleteNewsArticle(
  input: DeleteNewsArticleInput
): Promise<MutationResult<{ id: string; slug: string }>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Super Admin privileges required to delete news articles.' };
  }

  const parseResult = deleteNewsArticleSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid delete input.',
    };
  }

  const { id } = parseResult.data;
  const supabase = createAdminClient();

  // Fetch previous state to record in audit log
  const { data: previous, error: fetchError } = await supabase
    .from('news_articles')
    .select('id, slug, title, category, is_published')
    .eq('id', id)
    .single();

  if (fetchError || !previous) {
    return { success: false, error: 'News article not found.' };
  }

  // Delete the article
  const { error: deleteError } = await supabase
    .from('news_articles')
    .delete()
    .eq('id', id);

  if (deleteError) {
    console.error('[News CMS Error] Failed to delete news article:', deleteError.message);
    return { success: false, error: 'Failed to delete news article.' };
  }

  // Mandatory Deletion Audit Log
  try {
    await supabase.from('audit_logs').insert({
      entity_type: 'news_article',
      entity_id: previous.id,
      actor_id: session.user.email,
      action: 'news_deleted',
      previous_state: {
        id: previous.id,
        slug: previous.slug,
        title: previous.title,
        category: previous.category,
        is_published: previous.is_published,
      },
      new_state: null,
    });
  } catch (auditErr: any) {
    console.error('[Audit Log Error] Failed to record news deletion audit:', auditErr?.message || auditErr);
  }

  revalidatePath('/admin');
  revalidatePath('/news');
  revalidatePath(`/news/${previous.slug}`);

  return { success: true, data: { id: previous.id, slug: previous.slug } };
}

/* ==============================================================================
 * B12.1: ADMINISTRATOR MANAGEMENT SERVER ACTIONS
 * Strictly restricted to Super Admin role
 * ============================================================================== */

/**
 * Server Action: List all administrator accounts (Super Admin only)
 */
export async function listAdminUsers(): Promise<MutationResult<AdminUserRecord[]>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Super Admin privileges required to list administrators.' };
  }

  try {
    const supabase = createAdminClient();
    const { data: userList, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 100,
    });

    if (error) {
      console.error('[Admin User Error] Failed to list users:', error.message);
      return { success: false, error: 'Failed to retrieve administrator list.' };
    }

    const adminRecords: AdminUserRecord[] = (userList?.users || [])
      .filter((u) => u.app_metadata?.role) // Only include users with an administrative role
      .map((u) => ({
        id: u.id,
        email: u.email || '',
        role: (u.app_metadata?.role as AdminRole) || 'national_reviewer',
        assignedRegion: u.app_metadata?.assigned_region || null,
        disabled: u.app_metadata?.disabled === true,
        createdAt: u.created_at,
        lastSignInAt: u.last_sign_in_at || null,
      }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return { success: true, data: adminRecords };
  } catch (err: any) {
    console.error('[Admin User Error] Exception in listAdminUsers:', err?.message || err);
    return { success: false, error: 'Unexpected error retrieving administrators.' };
  }
}

/**
 * Server Action: Invite a new administrator account (Super Admin only)
 * Uses Supabase Auth inviteUserByEmail so the invited user establishes their OWN password.
 * The system never creates, sees, logs, or returns a password.
 */
export async function inviteAdminUser(
  input: InviteAdminInput
): Promise<MutationResult<{ id: string; email: string; role: AdminRole }>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Super Admin privileges required to invite administrators.' };
  }

  const parseResult = inviteAdminSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid administrator invitation input.',
    };
  }

  const { email, role, assignedRegion } = parseResult.data;
  const normalizedEmail = email.toLowerCase().trim();
  const supabase = createAdminClient();

  try {
    // 1. Check existing users in Supabase Auth
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error('[Admin User Error] Failed to check existing users:', listError.message);
      return { success: false, error: 'Unable to verify administrator records. Please try again.' };
    }

    const existingUser = userList.users.find(
      (u) => u.email?.toLowerCase() === normalizedEmail
    );

    // CASE B & C: Existing active administrator
    if (existingUser && existingUser.app_metadata?.role && existingUser.app_metadata?.disabled !== true) {
      return {
        success: false,
        error: 'An administrator with this email already exists.',
      };
    }

    // Existing deactivated administrator
    if (existingUser && existingUser.app_metadata?.disabled === true) {
      return {
        success: false,
        error: 'An account with this email exists but is deactivated. Please reactivate the account in the administrator list.',
      };
    }

    let siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl) {
      try {
        const headerList = await headers();
        const origin = headerList.get('origin');
        const host = headerList.get('host');
        const proto = headerList.get('x-forwarded-proto') || 'https';
        if (origin) {
          siteUrl = origin;
        } else if (host) {
          siteUrl = `${proto}://${host}`;
        }
      } catch {
        // Fallback for non-request environments
      }
    }
    if (!siteUrl) {
      siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';
    }
    const redirectTo = `${siteUrl}/admin/login`;

    let targetUserId = '';

    // CASE F: Existing user who was invited or registered but has not completed onboarding
    if (existingUser) {
      // Re-trigger invite for pending user
      const { data: reInviteData, error: reInviteError } = await supabase.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: {
            role,
            assigned_region: role === 'regional_coordinator' ? assignedRegion : null,
          },
          redirectTo,
        }
      );

      if (reInviteError || !reInviteData.user) {
        console.error('[Admin User Error] Failed to resend invitation:', reInviteError?.message);
        return { success: false, error: 'Unable to send invitation. Please verify the email address and try again.' };
      }
      targetUserId = existingUser.id;
    } else {
      // CASE A: Fresh invitation for new user
      const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          data: {
            role,
            assigned_region: role === 'regional_coordinator' ? assignedRegion : null,
          },
          redirectTo,
        }
      );

      if (inviteError || !inviteData.user) {
        console.error('[Admin User Error] Failed to invite user:', inviteError?.message);
        if (inviteError?.message?.toLowerCase().includes('already') && inviteError?.message?.toLowerCase().includes('registered')) {
          return { success: false, error: 'An administrator with this email already exists.' };
        }
        return { success: false, error: 'Unable to send invitation. Please verify the email address and try again.' };
      }
      targetUserId = inviteData.user.id;
    }

    // Ensure role and regional assignments are set in app_metadata
    const { error: updateError } = await supabase.auth.admin.updateUserById(targetUserId, {
      app_metadata: {
        role,
        assigned_region: role === 'regional_coordinator' ? assignedRegion : null,
        disabled: false,
      },
    });

    if (updateError) {
      console.error('[Admin User Error] Failed to update user app_metadata:', updateError.message);
      return { success: false, error: 'Failed to configure administrator permissions.' };
    }

    // Record audit log entry (Phase 11: strictly NEVER record password, tokens, or secrets)
    try {
      await supabase.from('audit_logs').insert({
        entity_type: 'admin_user',
        entity_id: targetUserId,
        actor_id: session.user.email,
        action: 'admin_user_invited',
        previous_state: existingUser ? { role: existingUser.app_metadata?.role, disabled: existingUser.app_metadata?.disabled } : null,
        new_state: {
          email: normalizedEmail,
          role,
          assigned_region: role === 'regional_coordinator' ? assignedRegion : null,
          disabled: false,
        },
      });
    } catch (auditErr: any) {
      console.error('[Audit Log Error] Failed to record admin invitation audit:', auditErr?.message || auditErr);
    }

    try {
      revalidatePath('/admin');
    } catch {
      // Gracefully handle execution in unit test or non-request contexts
    }

    return {
      success: true,
      data: {
        id: targetUserId,
        email: normalizedEmail,
        role,
      },
    };
  } catch (err: any) {
    console.error('[Admin User Error] Exception in inviteAdminUser:', err?.message || err);
    return { success: false, error: 'Unexpected error sending administrator invitation.' };
  }
}

/**
 * Server Action: Update an administrator's role or regional assignment (Super Admin only)
 * Enforces invariant: cannot demote the sole remaining active Super Admin
 */
export async function updateAdminUserRole(
  input: UpdateAdminRoleInput
): Promise<MutationResult<{ id: string; role: AdminRole; assignedRegion?: string | null }>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Super Admin privileges required to update administrator roles.' };
  }

  const parseResult = updateAdminRoleSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid role update input.',
    };
  }

  const { userId, role, assignedRegion } = parseResult.data;
  const supabase = createAdminClient();

  try {
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return { success: false, error: 'Failed to verify existing administrator records.' };
    }

    const targetUser = userList.users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Target administrator account not found.' };
    }

    // Invariant check: if target is currently super_admin and new role is not super_admin
    const currentRole = targetUser.app_metadata?.role;
    if (currentRole === 'super_admin' && role !== 'super_admin') {
      const activeSuperAdmins = userList.users.filter(
        (u) => u.app_metadata?.role === 'super_admin' && u.app_metadata?.disabled !== true
      );
      if (activeSuperAdmins.length <= 1) {
        return {
          success: false,
          error: 'Operation aborted: Cannot demote the sole remaining active Super Administrator.',
        };
      }
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...targetUser.app_metadata,
        role,
        assigned_region: role === 'regional_coordinator' ? assignedRegion : null,
      },
    });

    if (updateError) {
      console.error('[Admin User Error] Failed to update role:', updateError.message);
      return { success: false, error: 'Failed to update administrator role in database.' };
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        entity_type: 'admin_user',
        entity_id: userId,
        actor_id: session.user.email,
        action: 'admin_role_changed',
        previous_state: {
          role: currentRole,
          assigned_region: targetUser.app_metadata?.assigned_region || null,
        },
        new_state: {
          role,
          assigned_region: role === 'regional_coordinator' ? assignedRegion : null,
        },
      });
    } catch (auditErr: any) {
      console.error('[Audit Log Error] Failed to record role change audit:', auditErr?.message || auditErr);
    }

    revalidatePath('/admin');
    return {
      success: true,
      data: {
        id: userId,
        role,
        assignedRegion: role === 'regional_coordinator' ? assignedRegion : null,
      },
    };
  } catch (err: any) {
    console.error('[Admin User Error] Exception in updateAdminUserRole:', err?.message || err);
    return { success: false, error: 'Unexpected error updating administrator role.' };
  }
}

/**
 * Server Action: Deactivate or reactivate an administrator account (Super Admin only)
 * Enforces invariant: cannot deactivate the sole remaining active Super Admin
 */
export async function setAdminUserStatus(
  input: SetAdminStatusInput
): Promise<MutationResult<{ id: string; disabled: boolean }>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Super Admin privileges required to modify account status.' };
  }

  const parseResult = setAdminStatusSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid status input.',
    };
  }

  const { userId, disabled } = parseResult.data;
  const supabase = createAdminClient();

  try {
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return { success: false, error: 'Failed to verify existing administrator records.' };
    }

    const targetUser = userList.users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Target administrator account not found.' };
    }

    // Invariant check: if deactivating, check if target is super_admin and active
    if (disabled && targetUser.app_metadata?.role === 'super_admin') {
      const activeSuperAdmins = userList.users.filter(
        (u) => u.app_metadata?.role === 'super_admin' && u.app_metadata?.disabled !== true
      );
      if (activeSuperAdmins.length <= 1) {
        return {
          success: false,
          error: 'Operation aborted: Cannot deactivate the sole remaining active Super Administrator.',
        };
      }
    }

    const previousDisabled = targetUser.app_metadata?.disabled === true;

    const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      app_metadata: {
        ...targetUser.app_metadata,
        disabled,
      },
    });

    if (updateError) {
      console.error('[Admin User Error] Failed to update account status:', updateError.message);
      return { success: false, error: 'Failed to update administrator account status.' };
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        entity_type: 'admin_user',
        entity_id: userId,
        actor_id: session.user.email,
        action: disabled ? 'admin_deactivated' : 'admin_reactivated',
        previous_state: { disabled: previousDisabled },
        new_state: { disabled },
      });
    } catch (auditErr: any) {
      console.error('[Audit Log Error] Failed to record status update audit:', auditErr?.message || auditErr);
    }

    revalidatePath('/admin');
    return { success: true, data: { id: userId, disabled } };
  } catch (err: any) {
    console.error('[Admin User Error] Exception in setAdminUserStatus:', err?.message || err);
    return { success: false, error: 'Unexpected error changing administrator status.' };
  }
}

/**
 * Server Action: Permanently delete an administrator account (Super Admin only)
 * Enforces invariant: cannot delete the sole remaining active Super Admin
 * Preserves organizational data and historical audit logs.
 */
export async function deleteAdminUser(
  input: DeleteAdminUserInput
): Promise<MutationResult<{ id: string; email: string }>> {
  const session = await getAdminSession();
  if (!session || session.role !== 'super_admin') {
    return {
      success: false,
      error: 'Unauthorized: Super Admin privileges required to permanently delete administrator accounts.',
    };
  }

  const parseResult = deleteAdminUserSchema.safeParse(input);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0]?.message || 'Invalid user ID.',
    };
  }

  const { userId } = parseResult.data;
  const supabase = createAdminClient();

  try {
    const { data: userList, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      return { success: false, error: 'Failed to verify existing administrator records.' };
    }

    const targetUser = userList.users.find((u) => u.id === userId);
    if (!targetUser) {
      return { success: false, error: 'Target administrator account not found.' };
    }

    // Invariant check: cannot delete the sole remaining active Super Admin
    if (targetUser.app_metadata?.role === 'super_admin' && targetUser.app_metadata?.disabled !== true) {
      const activeSuperAdmins = userList.users.filter(
        (u) => u.app_metadata?.role === 'super_admin' && u.app_metadata?.disabled !== true
      );
      if (activeSuperAdmins.length <= 1) {
        return {
          success: false,
          error: 'Operation aborted: Cannot permanently delete the sole remaining active Super Administrator.',
        };
      }
    }

    const targetEmail = targetUser.email || '';
    const targetRole = targetUser.app_metadata?.role;
    const targetRegion = targetUser.app_metadata?.assigned_region;
    const targetDisabled = targetUser.app_metadata?.disabled === true;

    // Permanently delete user from Supabase Auth GoTrue
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);
    if (deleteError) {
      console.error('[Admin User Error] Failed to delete user from Supabase Auth:', deleteError.message);
      return { success: false, error: 'Failed to permanently delete administrator account.' };
    }

    // Audit log (Phase 11 & B12.2: strictly record deletion event with actor and target metadata, preserving audit history)
    try {
      await supabase.from('audit_logs').insert({
        entity_type: 'admin_user',
        entity_id: userId,
        actor_id: session.user.email,
        action: 'admin_user_deleted',
        previous_state: {
          email: targetEmail,
          role: targetRole,
          assigned_region: targetRegion || null,
          disabled: targetDisabled,
        },
        new_state: {
          deleted: true,
          deleted_at: new Date().toISOString(),
          deleted_by: session.user.email,
        },
      });
    } catch (auditErr: any) {
      console.error('[Audit Log Error] Failed to record user deletion audit:', auditErr?.message || auditErr);
    }

    revalidatePath('/admin');
    return {
      success: true,
      data: {
        id: userId,
        email: targetEmail,
      },
    };
  } catch (err: any) {
    console.error('[Admin User Error] Exception in deleteAdminUser:', err?.message || err);
    return { success: false, error: 'Unexpected error permanently deleting administrator account.' };
  }
}

/**
 * Server Action: Role-scoped CSV data export
 * Enforces strict server-side scoping, PII masking preservation, and audit logging.
 */
export async function exportAdminData(
  input: ExportAdminDataInput
): Promise<MutationResult<{ filename: string; csvContent: string; recordCount: number }>> {
  const session = await getAdminSession();
  if (!session) {
    return { success: false, error: 'Unauthorized: Administrative authentication required.' };
  }

  const parseResult = exportAdminDataSchema.safeParse(input);
  if (!parseResult.success) {
    return { success: false, error: parseResult.error.issues[0]?.message || 'Invalid export request.' };
  }

  const { dataset, region: requestedRegion } = parseResult.data;

  // Immediate role-based dataset authorization checks
  if (dataset === 'members' && session.role === 'national_reviewer') {
    return { success: false, error: 'Unauthorized: National Reviewers do not have access to member records.' };
  }
  if (dataset === 'inquiries' && session.role !== 'super_admin') {
    return { success: false, error: 'Unauthorized: Only Super Administrators have access to export inquiry records.' };
  }

  const supabase = createAdminClient();
  const dateStr = new Date().toISOString().split('T')[0];

  try {
    let csvContent = '';
    let recordCount = 0;
    let filename = '';
    let scopeLabel = '';

    if (dataset === 'nominations') {
      let query = supabase.from('nominations').select('*');

      if (session.role === 'super_admin') {
        if (requestedRegion) {
          query = query.or(`region.eq.${requestedRegion},region_if_regional_minister.eq.${requestedRegion}`);
          scopeLabel = `region_${requestedRegion}`;
          filename = `yrl-nominations-${requestedRegion.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;
        } else {
          scopeLabel = 'all_regions';
          filename = `yrl-nominations-all-${dateStr}.csv`;
        }
      } else if (session.role === 'national_reviewer') {
        query = query.in('position_applied', [...NATIONAL_PORTFOLIOS]);
        scopeLabel = 'national_portfolios';
        filename = `yrl-nominations-national-portfolios-${dateStr}.csv`;
      } else if (session.role === 'regional_coordinator') {
        const assignedRegion = session.assignedRegion;
        if (!assignedRegion) {
          return { success: false, error: 'Regional Coordinator has no assigned region configured.' };
        }
        query = query.or(`region.eq.${assignedRegion},region_if_regional_minister.eq.${assignedRegion}`);
        scopeLabel = `region_${assignedRegion}`;
        filename = `yrl-nominations-${assignedRegion.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;
      }

      const { data: nominations, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('[Export Error] Failed to query nominations:', error.message);
        return { success: false, error: 'Failed to retrieve nomination records for export.' };
      }

      const records = nominations || [];
      recordCount = records.length;
      csvContent = formatNominationsCsv(records, session.role);
    } else if (dataset === 'members') {
      let query = supabase.from('members').select('*');

      if (session.role === 'super_admin') {
        if (requestedRegion) {
          query = query.eq('region', requestedRegion);
          scopeLabel = `region_${requestedRegion}`;
          filename = `yrl-members-${requestedRegion.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;
        } else {
          scopeLabel = 'all_regions';
          filename = `yrl-members-all-${dateStr}.csv`;
        }
      } else if (session.role === 'regional_coordinator') {
        const assignedRegion = session.assignedRegion;
        if (!assignedRegion) {
          return { success: false, error: 'Regional Coordinator has no assigned region configured.' };
        }
        query = query.eq('region', assignedRegion);
        scopeLabel = `region_${assignedRegion}`;
        filename = `yrl-members-${assignedRegion.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;
      }

      const { data: members, error } = await query.order('created_at', { ascending: false });
      if (error) {
        console.error('[Export Error] Failed to query members:', error.message);
        return { success: false, error: 'Failed to retrieve member records for export.' };
      }

      const records = members || [];
      recordCount = records.length;
      csvContent = formatMembersCsv(records, session.role);
    } else if (dataset === 'inquiries') {
      if (session.role !== 'super_admin') {
        return { success: false, error: 'Unauthorized: Only Super Administrators have access to export inquiry records.' };
      }

      const { data: inquiries, error } = await supabase
        .from('contact_messages')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[Export Error] Failed to query inquiries:', error.message);
        return { success: false, error: 'Failed to retrieve inquiry records for export.' };
      }

      const records = inquiries || [];
      recordCount = records.length;
      scopeLabel = 'all_inquiries';
      filename = `yrl-inquiries-all-${dateStr}.csv`;
      csvContent = formatInquiriesCsv(records);
    } else if (dataset === 'reviews') {
      let nomIds: string[] = [];

      if (session.role === 'super_admin') {
        scopeLabel = 'all_reviews';
        filename = `yrl-nomination-reviews-all-${dateStr}.csv`;
      } else if (session.role === 'national_reviewer') {
        const { data: noms } = await supabase
          .from('nominations')
          .select('id')
          .in('position_applied', [...NATIONAL_PORTFOLIOS]);
        nomIds = (noms || []).map((n) => n.id);
        scopeLabel = 'national_portfolios';
        filename = `yrl-nomination-reviews-national-portfolios-${dateStr}.csv`;
      } else if (session.role === 'regional_coordinator') {
        const assignedRegion = session.assignedRegion;
        if (!assignedRegion) {
          return { success: false, error: 'Regional Coordinator has no assigned region configured.' };
        }
        const { data: noms } = await supabase
          .from('nominations')
          .select('id')
          .or(`region.eq.${assignedRegion},region_if_regional_minister.eq.${assignedRegion}`);
        nomIds = (noms || []).map((n) => n.id);
        scopeLabel = `region_${assignedRegion}`;
        filename = `yrl-nomination-reviews-${assignedRegion.toLowerCase().replace(/\s+/g, '-')}-${dateStr}.csv`;
      }

      let reviewsQuery = supabase.from('nomination_reviews').select('*').order('created_at', { ascending: false });
      if (session.role !== 'super_admin') {
        if (nomIds.length === 0) {
          reviewsQuery = reviewsQuery.in('nomination_id', ['00000000-0000-0000-0000-000000000000']);
        } else {
          reviewsQuery = reviewsQuery.in('nomination_id', nomIds);
        }
      }

      const { data: reviews, error } = await reviewsQuery;
      if (error) {
        console.error('[Export Error] Failed to query reviews:', error.message);
        return { success: false, error: 'Failed to retrieve review records for export.' };
      }

      const records = reviews || [];
      recordCount = records.length;
      csvContent = formatReviewsCsv(records);
    } else {
      return { success: false, error: 'Unrecognized export dataset requested.' };
    }

    // Audit log
    try {
      await supabase.from('audit_logs').insert({
        entity_type: 'export',
        entity_id: dataset,
        actor_id: session.user.email,
        action: 'data_exported',
        new_state: {
          dataset,
          format: 'csv',
          role: session.role,
          scope: scopeLabel,
          record_count: recordCount,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (auditErr: any) {
      console.error('[Audit Log Error] Failed to record export audit:', auditErr?.message || auditErr);
    }

    return {
      success: true,
      data: {
        filename,
        csvContent,
        recordCount,
      },
    };
  } catch (err: any) {
    console.error('[Export Error] Exception in exportAdminData:', err?.message || err);
    return { success: false, error: 'Unexpected error generating CSV data export.' };
  }
}
