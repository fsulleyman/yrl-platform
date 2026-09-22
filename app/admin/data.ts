import { createAdminClient } from '@/lib/supabase/server';
import {
  type AdminSession,
  type AdminRole,
  type AdminUserRecord,
  NATIONAL_PORTFOLIOS,
} from '@/lib/auth/types';
import { getFilesystemNewsArticles } from '@/lib/news';
import { maskNominationRecord } from '@/lib/security/privacy';

export interface AdminScopedData {
  nominations: any[];
  members: any[];
  contactMessages: any[];
  newsArticles: any[];
  adminUsers: AdminUserRecord[];
}

/**
 * Server-side role-scoped data fetching.
 * Enforces data isolation boundaries based on the authenticated AdminSession:
 * - Super Admin: views all nominations, members, contact messages, news articles, and administrator accounts.
 * - National Reviewer: restricted to the 11 national portfolios in NATIONAL_PORTFOLIOS with PII masking.
 * - Regional Coordinator: restricted to records matching their assigned region with PII masking.
 */
export async function getAdminScopedData(session: AdminSession): Promise<AdminScopedData> {
  const supabase = createAdminClient();

  if (session.role === 'super_admin') {
    const [nomRes, memRes, msgRes, newsRes, userListRes] = await Promise.all([
      supabase.from('nominations').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('news_articles').select('*').order('date', { ascending: false }),
      supabase.auth.admin.listUsers({ page: 1, perPage: 100 }),
    ]);

    let news = newsRes.data || [];
    if (newsRes.error || news.length === 0) {
      // Fallback to filesystem news articles if database table is not yet seeded
      news = getFilesystemNewsArticles();
    }

    const adminUsers: AdminUserRecord[] = (userListRes.data?.users || [])
      .filter((u) => u.app_metadata?.role)
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

    return {
      nominations: nomRes.data || [],
      members: memRes.data || [],
      contactMessages: msgRes.data || [],
      newsArticles: news,
      adminUsers,
    };
  }

  if (session.role === 'national_reviewer') {
    const { data: nominations, error } = await supabase
      .from('nominations')
      .select('*')
      .in('position_applied', [...NATIONAL_PORTFOLIOS])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[National Reviewer Error] Failed to fetch nominations:', error.message);
    }

    const maskedNominations = (nominations || []).map((n) =>
      maskNominationRecord(n, session.role)
    );

    return {
      nominations: maskedNominations,
      members: [],
      contactMessages: [],
      newsArticles: [],
      adminUsers: [],
    };
  }

  if (session.role === 'regional_coordinator') {
    const assignedRegion = session.assignedRegion;
    if (!assignedRegion) {
      return { nominations: [], members: [], contactMessages: [], newsArticles: [], adminUsers: [] };
    }

    // Scoped by region of residence OR regional deployment choice
    const [nomRes, memRes] = await Promise.all([
      supabase
        .from('nominations')
        .select('*')
        .or(`region.eq.${assignedRegion},region_if_regional_minister.eq.${assignedRegion}`)
        .order('created_at', { ascending: false }),
      supabase
        .from('members')
        .select('*')
        .eq('region', assignedRegion)
        .order('created_at', { ascending: false }),
    ]);

    const maskedNominations = (nomRes.data || []).map((n) =>
      maskNominationRecord(n, session.role)
    );

    return {
      nominations: maskedNominations,
      members: memRes.data || [],
      contactMessages: [],
      newsArticles: [],
      adminUsers: [],
    };
  }

  return { nominations: [], members: [], contactMessages: [], newsArticles: [], adminUsers: [] };
}
