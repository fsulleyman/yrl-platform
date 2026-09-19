import { createAdminClient } from '@/lib/supabase/server';
import { type AdminSession, NATIONAL_PORTFOLIOS } from '@/lib/auth/types';
import { getFilesystemNewsArticles } from '@/lib/news';
import { maskNominationRecord } from '@/lib/security/privacy';

export interface AdminScopedData {
  nominations: any[];
  members: any[];
  contactMessages: any[];
  newsArticles: any[];
}

/**
 * Server-side role-scoped data fetching.
 * Enforces data isolation boundaries based on the authenticated AdminSession:
 * - Super Admin: views all nominations, members, contact messages, and news articles (unmasked).
 * - National Reviewer: restricted to the 11 national portfolios in NATIONAL_PORTFOLIOS with PII masking.
 * - Regional Coordinator: restricted to records matching their assigned region with PII masking.
 */
export async function getAdminScopedData(session: AdminSession): Promise<AdminScopedData> {
  const supabase = createAdminClient();

  if (session.role === 'super_admin') {
    const [nomRes, memRes, msgRes, newsRes] = await Promise.all([
      supabase.from('nominations').select('*').order('created_at', { ascending: false }),
      supabase.from('members').select('*').order('created_at', { ascending: false }),
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('news_articles').select('*').order('date', { ascending: false }),
    ]);

    let news = newsRes.data || [];
    if (newsRes.error || news.length === 0) {
      // Fallback to filesystem news articles if database table is not yet seeded
      news = getFilesystemNewsArticles();
    }

    return {
      nominations: nomRes.data || [],
      members: memRes.data || [],
      contactMessages: msgRes.data || [],
      newsArticles: news,
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
    };
  }

  if (session.role === 'regional_coordinator') {
    const assignedRegion = session.assignedRegion;
    if (!assignedRegion) {
      return { nominations: [], members: [], contactMessages: [], newsArticles: [] };
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
    };
  }

  return { nominations: [], members: [], contactMessages: [], newsArticles: [] };
}
