'use server';

import { revalidatePath } from 'next/cache';
import { createAuthClient, createAdminClient } from '@/lib/supabase/server';
import { getAdminSession } from '@/lib/auth/server';
import {
  type AdminSession,
  NATIONAL_PORTFOLIOS,
  type NominationStatus,
  type NominationReviewRecord,
  isNominationInScope,
} from '@/lib/auth/types';
import {
  updateStatusSchema,
  submitReviewSchema,
  type UpdateStatusInput,
  type SubmitReviewInput,
} from '@/lib/validations/admin';
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
