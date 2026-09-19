'use client';

import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import {
  logoutAdmin,
  transitionNominationStatus,
  submitNominationReview,
  getNominationReviews,
  createNewsArticle,
  updateNewsArticle,
  toggleNewsArticlePublishStatus,
  deleteNewsArticle,
} from './actions';
import {
  type AdminSession,
  type AdminRole,
  NATIONAL_PORTFOLIOS,
  NOMINATION_STATUSES,
  type NominationStatus,
  type NominationReviewRecord,
  type ReviewRecommendation,
} from '@/lib/auth/types';
import { GHANA_REGIONS, YRL_POSITIONS } from '@/lib/validations/nomination';
import { NEWS_CATEGORIES, slugify, type NewsCategory } from '@/lib/validations/news';
import type { NewsArticle } from '@/lib/news';
import {
  Eye,
  X,
  Users,
  FileText,
  Mail,
  Shield,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  Send,
  Newspaper,
  Plus,
  Edit2,
  Trash2,
  Globe,
  EyeOff,
  ExternalLink,
} from 'lucide-react';

interface NominationRecord {
  id: string;
  reference_id?: string;
  full_name: string;
  date_of_birth: string;
  gender: string | null;
  phone_number: string;
  whatsapp_number: string | null;
  email: string;
  region: string;
  district_municipality: string;
  town_community: string;
  occupation: string;
  organisation_institution: string | null;
  education_level: string;
  area_of_study_profession: string;
  position_applied: string;
  region_if_regional_minister: string | null;
  has_leadership_experience: boolean;
  prior_position: string | null;
  prior_organisation: string | null;
  prior_duration: string | null;
  prior_responsibilities: string | null;
  suitability_statement: string | null;
  proudest_achievement: string | null;
  q1_why_serve: string;
  q2_leadership_as_service: string;
  q3_first_90_days: string;
  q4_recruitment_plan: string;
  q5_recruitment_estimate: string | null;
  q6_regional_building_plan: string | null;
  weekly_hours: string;
  willing_online_meetings: boolean;
  willing_physical_activities: boolean;
  referee_name: string;
  referee_relationship: string;
  referee_phone: string;
  declaration_agreed: boolean;
  status: 'submitted' | 'screening' | 'shortlisted' | 'interview' | 'selected' | 'declined';
  created_at?: string;
  submitted_at?: string;
}

interface MemberRecord {
  id: string;
  member_id?: string;
  full_name: string;
  phone_number?: string;
  phone?: string;
  email: string | null;
  region: string;
  district_municipality?: string;
  district?: string | null;
  created_at?: string;
  joined_at?: string;
}

interface ContactMessageRecord {
  id: string;
  reference_id?: string;
  full_name: string;
  email: string;
  message: string;
  status: string;
  created_at: string;
}

interface AdminDashboardProps {
  session: AdminSession;
  initialNominations: NominationRecord[];
  initialMembers: MemberRecord[];
  initialContactMessages?: ContactMessageRecord[];
  initialNewsArticles?: NewsArticle[];
}

export function AdminDashboard({
  session,
  initialNominations,
  initialMembers,
  initialContactMessages = [],
  initialNewsArticles = [],
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'nominations' | 'members' | 'messages' | 'news'>('nominations');
  const [nominationsList, setNominationsList] = useState<NominationRecord[]>(initialNominations);
  const [selectedRecord, setSelectedRecord] = useState<NominationRecord | null>(null);

  // News Management state (Phase B9)
  const [newsList, setNewsList] = useState<NewsArticle[]>(initialNewsArticles);
  const [isNewsModalOpen, setIsNewsModalOpen] = useState<boolean>(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<NewsArticle | null>(null);

  // News Form state
  const [newsTitle, setNewsTitle] = useState<string>('');
  const [newsSlug, setNewsSlug] = useState<string>('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState<boolean>(false);
  const [newsCategory, setNewsCategory] = useState<string>('Official Notice');
  const [newsAuthor, setNewsAuthor] = useState<string>('YRL Interim National Secretariat');
  const [newsDate, setNewsDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [newsExcerpt, setNewsExcerpt] = useState<string>('');
  const [newsContent, setNewsContent] = useState<string>('');
  const [newsImage, setNewsImage] = useState<string>('');
  const [newsIsPublished, setNewsIsPublished] = useState<boolean>(true);

  // News Action feedback
  const [newsActionLoading, setNewsActionLoading] = useState<boolean>(false);
  const [newsActionError, setNewsActionError] = useState<string | null>(null);
  const [newsActionSuccess, setNewsActionSuccess] = useState<string | null>(null);

  // Reviews & Notes state
  const [reviews, setReviews] = useState<NominationReviewRecord[]>([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState<boolean>(false);

  // Status transition state
  const [newStatus, setNewStatus] = useState<NominationStatus>('submitted');
  const [statusReason, setStatusReason] = useState<string>('');
  const [showStatusConfirm, setShowStatusConfirm] = useState<boolean>(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<boolean>(false);
  const [statusSuccess, setStatusSuccess] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  // Review form state
  const [reviewStage, setReviewStage] = useState<string>('Screening Assessment');
  const [rating, setRating] = useState<number>(3);
  const [recommendation, setRecommendation] = useState<ReviewRecommendation>('advance');
  const [reviewNotes, setReviewNotes] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState<boolean>(false);
  const [reviewSuccess, setReviewSuccess] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<string | null>(null);

  // Client-side Filters within authorized scope
  const [filterRegion, setFilterRegion] = useState<string>('all');
  const [filterPosition, setFilterPosition] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Load reviews when a dossier is selected
  useEffect(() => {
    if (!selectedRecord) {
      setReviews([]);
      setStatusSuccess(null);
      setStatusError(null);
      setReviewSuccess(null);
      setReviewError(null);
      setShowStatusConfirm(false);
      return;
    }

    setNewStatus(selectedRecord.status);
    setStatusReason('');
    setStatusSuccess(null);
    setStatusError(null);
    setReviewSuccess(null);
    setReviewError(null);
    setShowStatusConfirm(false);

    setIsLoadingReviews(true);
    getNominationReviews(selectedRecord.id).then((res) => {
      setIsLoadingReviews(false);
      if (res.success && res.data) {
        setReviews(res.data);
      }
    });
  }, [selectedRecord]);

  const handleStatusUpdate = async () => {
    if (!selectedRecord) return;
    setIsUpdatingStatus(true);
    setStatusError(null);
    setStatusSuccess(null);

    const res = await transitionNominationStatus({
      nominationId: selectedRecord.id,
      status: newStatus,
      reason: statusReason.trim() || undefined,
    });

    setIsUpdatingStatus(false);
    if (!res.success) {
      setStatusError(res.error || 'Failed to update status.');
      return;
    }

    setStatusSuccess(`Status successfully updated to "${newStatus}".`);
    setShowStatusConfirm(false);

    // Update local state reactive
    setNominationsList((prev) =>
      prev.map((nom) => (nom.id === selectedRecord.id ? { ...nom, status: newStatus } : nom))
    );
    setSelectedRecord((prev) => (prev ? { ...prev, status: newStatus } : null));
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setIsSubmittingReview(true);
    setReviewError(null);
    setReviewSuccess(null);

    const res = await submitNominationReview({
      nominationId: selectedRecord.id,
      reviewStage,
      rating,
      recommendation,
      notes: reviewNotes.trim() || undefined,
    });

    setIsSubmittingReview(false);
    if (!res.success) {
      setReviewError(res.error || 'Failed to submit review.');
      return;
    }

    setReviewSuccess('Assessment and review notes recorded successfully.');
    setReviewNotes('');

    // Re-fetch reviews to get the latest list
    const updatedReviews = await getNominationReviews(selectedRecord.id);
    if (updatedReviews.success && updatedReviews.data) {
      setReviews(updatedReviews.data);
    }
  };

  // News Handlers (Phase B9)
  const openCreateNewsModal = () => {
    setEditingArticle(null);
    setNewsTitle('');
    setNewsSlug('');
    setSlugManuallyEdited(false);
    setNewsCategory('Official Notice');
    setNewsAuthor('YRL Interim National Secretariat');
    setNewsDate(new Date().toISOString().slice(0, 10));
    setNewsExcerpt('');
    setNewsContent('');
    setNewsImage('');
    setNewsIsPublished(true);
    setNewsActionError(null);
    setNewsActionSuccess(null);
    setIsNewsModalOpen(true);
  };

  const openEditNewsModal = (article: NewsArticle) => {
    setEditingArticle(article);
    setNewsTitle(article.title);
    setNewsSlug(article.slug);
    setSlugManuallyEdited(true);
    setNewsCategory(article.category || 'Official Notice');
    setNewsAuthor(article.author || 'YRL Interim National Secretariat');
    setNewsDate(article.date ? article.date.slice(0, 10) : new Date().toISOString().slice(0, 10));
    setNewsExcerpt(article.excerpt);
    setNewsContent(Array.isArray(article.content) ? article.content.join('\n\n') : article.content);
    setNewsImage(article.image || '');
    setNewsIsPublished(article.is_published ?? true);
    setNewsActionError(null);
    setNewsActionSuccess(null);
    setIsNewsModalOpen(true);
  };

  const handleTitleChange = (val: string) => {
    setNewsTitle(val);
    if (!slugManuallyEdited && !editingArticle) {
      setNewsSlug(slugify(val));
    }
  };

  const handleSaveNews = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsActionLoading(true);
    setNewsActionError(null);
    setNewsActionSuccess(null);

    // Split paragraphs by blank line or newline
    const paragraphs = newsContent
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (paragraphs.length === 0) {
      setNewsActionLoading(false);
      setNewsActionError('At least one content paragraph is required.');
      return;
    }

    if (editingArticle && editingArticle.id) {
      // Update
      const res = await updateNewsArticle({
        id: editingArticle.id,
        title: newsTitle.trim(),
        slug: newsSlug.trim(),
        date: newsDate,
        category: newsCategory.trim(),
        author: newsAuthor.trim(),
        excerpt: newsExcerpt.trim(),
        content: paragraphs,
        image: newsImage.trim() || null,
        is_published: newsIsPublished,
      });

      setNewsActionLoading(false);
      if (!res.success) {
        setNewsActionError(res.error || 'Failed to update article.');
        return;
      }

      setNewsList((prev) =>
        prev.map((art) =>
          art.id === editingArticle.id
            ? {
                ...art,
                title: newsTitle.trim(),
                slug: newsSlug.trim(),
                date: newsDate,
                category: newsCategory.trim(),
                author: newsAuthor.trim(),
                excerpt: newsExcerpt.trim(),
                content: paragraphs,
                image: newsImage.trim() || null,
                is_published: newsIsPublished,
              }
            : art
        )
      );
      setIsNewsModalOpen(false);
    } else {
      // Create
      const res = await createNewsArticle({
        title: newsTitle.trim(),
        slug: newsSlug.trim(),
        date: newsDate,
        category: newsCategory.trim(),
        author: newsAuthor.trim(),
        excerpt: newsExcerpt.trim(),
        content: paragraphs,
        image: newsImage.trim() || null,
        is_published: newsIsPublished,
      });

      setNewsActionLoading(false);
      if (!res.success) {
        setNewsActionError(res.error || 'Failed to create article.');
        return;
      }

      const newArticle: NewsArticle = {
        id: res.data?.id,
        title: newsTitle.trim(),
        slug: newsSlug.trim(),
        date: newsDate,
        category: newsCategory.trim(),
        author: newsAuthor.trim(),
        excerpt: newsExcerpt.trim(),
        content: paragraphs,
        image: newsImage.trim() || null,
        is_published: newsIsPublished,
      };

      setNewsList((prev) => [newArticle, ...prev]);
      setIsNewsModalOpen(false);
    }
  };

  const handleTogglePublish = async (article: NewsArticle) => {
    if (!article.id) {
      alert('Cannot toggle draft state on filesystem-only articles. Please create an authoritative record in the database.');
      return;
    }

    const nextPublished = !article.is_published;
    const res = await toggleNewsArticlePublishStatus({
      id: article.id,
      is_published: nextPublished,
    });

    if (res.success) {
      setNewsList((prev) =>
        prev.map((art) => (art.id === article.id ? { ...art, is_published: nextPublished } : art))
      );
    } else {
      alert(res.error || 'Failed to toggle publication status.');
    }
  };

  const handleDeleteNews = async () => {
    if (!deleteTarget || !deleteTarget.id) {
      alert('Cannot delete filesystem-only articles from the admin portal.');
      setDeleteTarget(null);
      return;
    }

    setNewsActionLoading(true);
    const res = await deleteNewsArticle({ id: deleteTarget.id });
    setNewsActionLoading(false);

    if (res.success) {
      setNewsList((prev) => prev.filter((art) => art.id !== deleteTarget.id));
      setDeleteTarget(null);
    } else {
      alert(res.error || 'Failed to delete article.');
    }
  };

  // Scoped list of positions for filter dropdown
  const availablePositions =
    session.role === 'national_reviewer'
      ? [...NATIONAL_PORTFOLIOS]
      : [...YRL_POSITIONS];

  // Scoped list of regions for filter dropdown
  const availableRegions =
    session.role === 'regional_coordinator' && session.assignedRegion
      ? [session.assignedRegion]
      : [...GHANA_REGIONS];

  // Filtered Nominations
  const filteredNominations = nominationsList.filter((item) => {
    if (filterRegion !== 'all' && item.region !== filterRegion) return false;
    if (filterPosition !== 'all' && item.position_applied !== filterPosition) return false;
    if (filterStatus !== 'all' && item.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.full_name?.toLowerCase().includes(q);
      const matchEmail = item.email?.toLowerCase().includes(q);
      const matchPhone = item.phone_number?.includes(q);
      const matchRef = item.reference_id?.toLowerCase().includes(q);
      if (!matchName && !matchEmail && !matchPhone && !matchRef) return false;
    }
    return true;
  });

  const getRoleLabel = (role: AdminRole) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'national_reviewer':
        return 'National Reviewer';
      case 'regional_coordinator':
        return 'Regional Coordinator';
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Top Identity & RBAC Banner */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-4 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-[#0E1E3B] text-white flex items-center justify-center font-bold text-sm">
              YRL
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#0E1E3B] leading-tight">
                  Interim Review Portal
                </h1>
                <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                  {getRoleLabel(session.role)}
                </span>
                {session.assignedRegion && (
                  <span className="text-xs px-2 py-0.5 rounded font-semibold bg-[#006B3F]/10 text-[#006B3F] border border-[#006B3F]/30">
                    {session.assignedRegion} Region
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                Authenticated: {session.user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <form action={logoutAdmin}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="text-xs flex items-center gap-1.5 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Navigation Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4 mb-6">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('nominations')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors ${
                activeTab === 'nominations'
                  ? 'bg-[#0E1E3B] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Nominations ({initialNominations.length})
            </button>

            {/* Members tab visible to Super Admin and Regional Coordinator */}
            {(session.role === 'super_admin' || session.role === 'regional_coordinator') && (
              <button
                onClick={() => setActiveTab('members')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors ${
                  activeTab === 'members'
                    ? 'bg-[#0E1E3B] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                Registered Members ({initialMembers.length})
              </button>
            )}

            {/* Contact Messages tab visible to Super Admin */}
            {session.role === 'super_admin' && (
              <button
                onClick={() => setActiveTab('messages')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors ${
                  activeTab === 'messages'
                    ? 'bg-[#0E1E3B] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Mail className="w-4 h-4" />
                Inquiries ({initialContactMessages.length})
              </button>
            )}

            {/* News & Announcements tab visible to Super Admin (Phase B9) */}
            {session.role === 'super_admin' && (
              <button
                onClick={() => setActiveTab('news')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors ${
                  activeTab === 'news'
                    ? 'bg-[#0E1E3B] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Newspaper className="w-4 h-4" />
                News &amp; Notices ({newsList.length})
              </button>
            )}
          </div>
        </div>

        {/* Tab 1: Nominations */}
        {activeTab === 'nominations' && (
          <div className="space-y-4">
            {/* Filter Bar */}
            <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Search
                </label>
                <input
                  type="text"
                  placeholder="Search name, ref, email, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Position Filter
                </label>
                <select
                  value={filterPosition}
                  onChange={(e) => setFilterPosition(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                >
                  <option value="all">All Available Positions</option>
                  {availablePositions.map((pos) => (
                    <option key={pos} value={pos}>
                      {pos}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Region Filter
                </label>
                <select
                  value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}
                  disabled={session.role === 'regional_coordinator'}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] disabled:bg-slate-100 disabled:text-slate-500"
                >
                  <option value="all">All Scoped Regions</option>
                  {availableRegions.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Status Filter
                </label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                >
                  <option value="all">All Statuses</option>
                  <option value="submitted">Submitted</option>
                  <option value="screening">Screening</option>
                  <option value="shortlisted">Shortlisted</option>
                  <option value="interview">Interview</option>
                  <option value="selected">Selected</option>
                  <option value="declined">Declined</option>
                </select>
              </div>
            </div>

            {/* Nominations Table */}
            <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Applicant &amp; Reference</th>
                      <th className="py-3.5 px-4">Position Applied</th>
                      <th className="py-3.5 px-4">Region &amp; District</th>
                      <th className="py-3.5 px-4">Date Submitted</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredNominations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No nomination records matching current filters.
                        </td>
                      </tr>
                    ) : (
                      filteredNominations.map((nom) => (
                        <tr key={nom.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-medium text-[#0E1E3B]">
                            <div className="font-bold text-sm">{nom.full_name}</div>
                            {nom.reference_id && (
                              <div className="text-[11px] font-mono text-[#0B1F3A] font-semibold">
                                {nom.reference_id}
                              </div>
                            )}
                            <div className="text-xs text-slate-500 font-mono">{nom.email}</div>
                            <div className="text-xs text-slate-500">{nom.phone_number}</div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-semibold text-slate-800">
                              {nom.position_applied}
                            </div>
                            {nom.region_if_regional_minister && (
                              <div className="text-xs text-[#C9A227] font-semibold mt-0.5">
                                Deployment: {nom.region_if_regional_minister} Region
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">
                            <div>{nom.region} Region</div>
                            <div className="text-xs text-slate-500">{nom.district_municipality}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs">
                            {new Date(nom.created_at || nom.submitted_at || Date.now()).toLocaleDateString(
                              'en-GB',
                              {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              }
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Badge status={nom.status} size="sm" />
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedRecord(nom)}
                              className="text-xs h-7 px-2.5"
                            >
                              <Eye className="w-3.5 h-3.5 mr-1" /> View Dossier
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Members */}
        {activeTab === 'members' && (
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-[#0E1E3B] text-sm">
                Registered Civic Members {session.assignedRegion ? `(${session.assignedRegion} Region)` : ''}
              </h3>
              <span className="text-xs text-slate-500 font-mono">Total: {initialMembers.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Full Name</th>
                    <th className="py-3.5 px-4">Member ID</th>
                    <th className="py-3.5 px-4">Phone</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Region</th>
                    <th className="py-3.5 px-4">District</th>
                    <th className="py-3.5 px-4">Joined Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialMembers.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500">
                        No member records found within authorized scope.
                      </td>
                    </tr>
                  ) : (
                    initialMembers.map((m) => (
                      <tr key={m.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 font-bold text-[#0E1E3B]">{m.full_name}</td>
                        <td className="py-3 px-4 text-xs font-mono font-semibold text-[#0B1F3A]">
                          {m.member_id || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-700 font-mono">
                          {m.phone_number || m.phone || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{m.email || '—'}</td>
                        <td className="py-3 px-4 text-slate-800 font-medium">{m.region} Region</td>
                        <td className="py-3 px-4 text-slate-600">
                          {m.district_municipality || m.district || '—'}
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(m.created_at || m.joined_at || Date.now()).toLocaleDateString('en-GB')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Contact Messages (Super Admin only) */}
        {activeTab === 'messages' && session.role === 'super_admin' && (
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-bold text-[#0E1E3B] text-sm">Secretariat Inquiries</h3>
              <span className="text-xs text-slate-500 font-mono">Total: {initialContactMessages.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4">Reference</th>
                    <th className="py-3.5 px-4">Sender</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Message</th>
                    <th className="py-3.5 px-4">Date</th>
                    <th className="py-3.5 px-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {initialContactMessages.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-slate-500">
                        No contact messages found.
                      </td>
                    </tr>
                  ) : (
                    initialContactMessages.map((msg) => (
                      <tr key={msg.id} className="hover:bg-slate-50/80">
                        <td className="py-3 px-4 text-xs font-mono font-semibold text-[#0B1F3A]">
                          {msg.reference_id || '—'}
                        </td>
                        <td className="py-3 px-4 font-bold text-[#0E1E3B]">{msg.full_name}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-xs">{msg.email}</td>
                        <td className="py-3 px-4 text-slate-700 max-w-md truncate">{msg.message}</td>
                        <td className="py-3 px-4 text-slate-500 text-xs">
                          {new Date(msg.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            {msg.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: News & Announcements (Super Admin only - Phase B9) */}
        {activeTab === 'news' && session.role === 'super_admin' && (
          <div className="space-y-4">
            <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-[#0E1E3B] text-base">
                  News &amp; Official Announcements
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Authoritative institutional communications. Published articles appear on <span className="font-mono text-[#0E1E3B]">/news</span> and <span className="font-mono text-[#0E1E3B]">/news/[slug]</span>.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={openCreateNewsModal}
                className="text-xs flex items-center gap-1.5 bg-[#0E1E3B] hover:bg-[#1a3461]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Article</span>
              </Button>
            </div>

            <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Title &amp; Slug</th>
                      <th className="py-3.5 px-4">Category</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {newsList.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-12 text-center text-slate-500">
                          No news articles found. Click &quot;Create Article&quot; to publish your first announcement.
                        </td>
                      </tr>
                    ) : (
                      newsList.map((article) => (
                        <tr key={article.slug} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4">
                            <div className="font-bold text-[#0E1E3B] line-clamp-1">{article.title}</div>
                            <div className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <span>/news/{article.slug}</span>
                              {article.is_published !== false && (
                                <a
                                  href={`/news/${article.slug}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-slate-400 hover:text-[#0E1E3B]"
                                  title="View on public site"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                              {article.category || 'Official Notice'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">
                            {article.date ? new Date(article.date).toLocaleDateString('en-GB') : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {article.is_published !== false ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <Globe className="w-3 h-3" /> Published
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                <EyeOff className="w-3 h-3" /> Draft
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleTogglePublish(article)}
                                className="text-xs h-7 px-2"
                                title={article.is_published !== false ? 'Unpublish (set to Draft)' : 'Publish to live website'}
                              >
                                {article.is_published !== false ? 'Unpublish' : 'Publish'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openEditNewsModal(article)}
                                className="text-xs h-7 px-2"
                                title="Edit article"
                              >
                                <Edit2 className="w-3 h-3 mr-1" /> Edit
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDeleteTarget(article)}
                                className="text-xs h-7 px-2 text-red-600 hover:bg-red-50 hover:border-red-300"
                                title="Delete article"
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Read-Only Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-300">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <span className="text-xs uppercase tracking-wider text-slate-500 font-semibold">
                  Reference: {selectedRecord.reference_id || selectedRecord.id.substring(0, 8)}
                </span>
                <h2 className="text-lg font-bold text-[#0E1E3B]">
                  {selectedRecord.full_name} — {selectedRecord.position_applied}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Read Only */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs sm:text-sm text-slate-800">
              {/* Status Display & Transition Workflow (Phase B8) */}
              <div className="p-4 bg-slate-50 rounded-[4px] border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 text-xs sm:text-sm">Current Status:</span>
                    <Badge status={selectedRecord.status} size="sm" />
                  </div>
                  <div className="text-xs text-slate-500 font-mono">
                    ID: {selectedRecord.id}
                  </div>
                </div>

                {/* Status Transition Form */}
                <div className="pt-1">
                  <h4 className="text-xs font-bold text-[#0E1E3B] uppercase tracking-wider mb-2">
                    Transition Review Status
                  </h4>
                  {statusSuccess && (
                    <div className="p-2.5 mb-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{statusSuccess}</span>
                    </div>
                  )}
                  {statusError && (
                    <div className="p-2.5 mb-3 text-xs bg-red-50 text-red-800 border border-red-200 rounded flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{statusError}</span>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as NominationStatus)}
                      disabled={isUpdatingStatus}
                      className="text-xs px-3 py-2 border border-slate-300 rounded bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                    >
                      {NOMINATION_STATUSES.map((st) => (
                        <option key={st} value={st}>
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Optional reason for status change..."
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      disabled={isUpdatingStatus}
                      className="text-xs px-3 py-2 border border-slate-300 rounded bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                    />

                    {!showStatusConfirm ? (
                      <Button
                        variant="primary"
                        size="sm"
                        type="button"
                        disabled={isUpdatingStatus || newStatus === selectedRecord.status}
                        onClick={() => setShowStatusConfirm(true)}
                        className="text-xs whitespace-nowrap bg-[#0E1E3B] hover:bg-[#1a3461]"
                      >
                        Change Status
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={handleStatusUpdate}
                          className="text-xs bg-[#006B3F] hover:bg-[#005230] text-white"
                        >
                          {isUpdatingStatus ? 'Updating...' : 'Confirm Update'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => setShowStatusConfirm(false)}
                          className="text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal & Contact Details */}
              <div className="border border-slate-200 rounded-[2px] p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  1. Personal &amp; Contact Information
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-xs">Date of Birth</span>
                    <span className="font-medium">{selectedRecord.date_of_birth}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Gender</span>
                    <span className="font-medium">{selectedRecord.gender || 'Not specified'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Phone</span>
                    <span className="font-medium font-mono">{selectedRecord.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">WhatsApp</span>
                    <span className="font-medium font-mono">{selectedRecord.whatsapp_number || 'Same'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-xs">Email</span>
                    <span className="font-medium font-mono">{selectedRecord.email}</span>
                  </div>
                </div>
              </div>

              {/* Geographic Info */}
              <div className="border border-slate-200 rounded-[2px] p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  2. Geographic Details
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <span className="text-slate-500 block text-xs">Region</span>
                    <span className="font-medium">{selectedRecord.region} Region</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">District/Municipality</span>
                    <span className="font-medium">{selectedRecord.district_municipality}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Town/Community</span>
                    <span className="font-medium">{selectedRecord.town_community}</span>
                  </div>
                </div>
              </div>

              {/* Professional Background */}
              <div className="border border-slate-200 rounded-[2px] p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  3. Professional &amp; Educational Background
                </h4>
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <span className="text-slate-500 block text-xs">Occupation</span>
                    <span className="font-medium">{selectedRecord.occupation}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Institution / Organisation</span>
                    <span className="font-medium">{selectedRecord.organisation_institution || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Education Level</span>
                    <span className="font-medium">{selectedRecord.education_level}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">Area of Study / Profession</span>
                    <span className="font-medium">{selectedRecord.area_of_study_profession}</span>
                  </div>
                </div>
              </div>

              {/* Leadership Questionnaire Responses */}
              <div className="border border-slate-200 rounded-[2px] p-4 space-y-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider border-b pb-1">
                  4. Leadership Vision &amp; Governance Questions (Q1–Q6)
                </h4>
                <div>
                  <h5 className="font-bold text-xs text-slate-700">Q1: Why serve in Youth Republic Leadership?</h5>
                  <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.q1_why_serve}
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-700">Q2: Perspective on Leadership as Service</h5>
                  <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.q2_leadership_as_service}
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-700">Q3: Priorities for First 90 Days</h5>
                  <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.q3_first_90_days}
                  </p>
                </div>
                <div>
                  <h5 className="font-bold text-xs text-slate-700">Q4: Grassroots Recruitment Plan</h5>
                  <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                    {selectedRecord.q4_recruitment_plan}
                  </p>
                </div>
                {selectedRecord.q5_recruitment_estimate && (
                  <div>
                    <h5 className="font-bold text-xs text-slate-700">Q5: Estimated Recruitment Target</h5>
                    <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1">
                      {selectedRecord.q5_recruitment_estimate}
                    </p>
                  </div>
                )}
                {selectedRecord.q6_regional_building_plan && (
                  <div>
                    <h5 className="font-bold text-xs text-slate-700">Q6: Regional Building Plan</h5>
                    <p className="bg-slate-50 p-2.5 rounded text-slate-800 mt-1 whitespace-pre-wrap leading-relaxed">
                      {selectedRecord.q6_regional_building_plan}
                    </p>
                  </div>
                )}
              </div>

              {/* Referee & Availability */}
              <div className="border border-slate-200 rounded-[2px] p-4 grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-2 border-b pb-1">
                    5. Referee Details
                  </h4>
                  <div className="space-y-1">
                    <p><span className="text-slate-500">Name:</span> {selectedRecord.referee_name}</p>
                    <p><span className="text-slate-500">Relationship:</span> {selectedRecord.referee_relationship}</p>
                    <p><span className="text-slate-500">Phone:</span> {selectedRecord.referee_phone}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-2 border-b pb-1">
                    6. Availability &amp; Commitments
                  </h4>
                  <div className="space-y-1">
                    <p><span className="text-slate-500">Weekly Hours:</span> {selectedRecord.weekly_hours}</p>
                    <p><span className="text-slate-500">Online Meetings:</span> {selectedRecord.willing_online_meetings ? 'Confirmed' : 'No'}</p>
                    <p><span className="text-slate-500">Physical Ground Activities:</span> {selectedRecord.willing_physical_activities ? 'Confirmed' : 'No'}</p>
                    <p><span className="text-slate-500">Declaration Agreed:</span> {selectedRecord.declaration_agreed ? 'Yes (Confirmed)' : 'No'}</p>
                  </div>
                </div>
              </div>

              {/* Section: Review Assessments & Notes (Phase B8) */}
              <div className="border border-slate-200 rounded-[4px] p-4 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-[#0E1E3B]" />
                    Reviewer Assessments &amp; Notes
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    {reviews.length} {reviews.length === 1 ? 'assessment' : 'assessments'}
                  </span>
                </div>

                {/* Existing Reviews List */}
                {isLoadingReviews ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    Loading review history...
                  </div>
                ) : reviews.length === 0 ? (
                  <div className="p-3 bg-slate-50 rounded text-center text-xs text-slate-500 border border-slate-200">
                    No review assessments recorded yet for this nomination.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {reviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-3 border border-slate-200 rounded-[2px] bg-slate-50 text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800">
                              {rev.reviewer_name || 'Reviewer'}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px] font-semibold">
                              {rev.review_stage}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {new Date(rev.created_at).toLocaleString('en-GB')}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-medium">Rating:</span>
                            <span className="font-bold text-[#C9A227]">
                              {rev.rating ? `${rev.rating} / 5` : 'N/A'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-medium">Recommendation:</span>
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                                rev.recommendation === 'advance'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : rev.recommendation === 'decline'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {rev.recommendation}
                            </span>
                          </div>
                        </div>

                        {rev.notes && (
                          <p className="mt-1.5 p-2 bg-white rounded border border-slate-200 text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {rev.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Review Form */}
                <div className="pt-3 border-t border-slate-200">
                  <h5 className="font-bold text-xs text-slate-700 uppercase tracking-wider mb-2">
                    Add Assessment / Review Note
                  </h5>

                  {reviewSuccess && (
                    <div className="p-2.5 mb-3 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200 rounded flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>{reviewSuccess}</span>
                    </div>
                  )}
                  {reviewError && (
                    <div className="p-2.5 mb-3 text-xs bg-red-50 text-red-800 border border-red-200 rounded flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{reviewError}</span>
                    </div>
                  )}

                  <form onSubmit={handleReviewSubmit} className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Review Stage
                        </label>
                        <select
                          value={reviewStage}
                          onChange={(e) => setReviewStage(e.target.value)}
                          disabled={isSubmittingReview}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                        >
                          <option value="Screening Assessment">Screening Assessment</option>
                          <option value="Preliminary Interview">Preliminary Interview</option>
                          <option value="Portfolio Assessment">Portfolio Assessment</option>
                          <option value="Final Selection">Final Selection</option>
                          <option value="Regional Evaluation">Regional Evaluation</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Recommendation
                        </label>
                        <select
                          value={recommendation}
                          onChange={(e) => setRecommendation(e.target.value as ReviewRecommendation)}
                          disabled={isSubmittingReview}
                          className="w-full text-xs px-2.5 py-1.5 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                        >
                          <option value="advance">Advance (Recommend for next stage)</option>
                          <option value="hold">Hold (Pending further review)</option>
                          <option value="decline">Decline</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Rating (1–5)
                        </label>
                        <div className="flex items-center gap-1.5 pt-0.5">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              disabled={isSubmittingReview}
                              className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                                rating === star
                                  ? 'bg-[#0E1E3B] text-white shadow-xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              {star}★
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Reviewer Notes &amp; Observations
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Document candidate evaluation, strengths, gaps, or interview observations..."
                        value={reviewNotes}
                        onChange={(e) => setReviewNotes(e.target.value)}
                        disabled={isSubmittingReview}
                        className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                      />
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        type="submit"
                        disabled={isSubmittingReview}
                        className="text-xs flex items-center gap-1.5 bg-[#0E1E3B] hover:bg-[#1a3461]"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{isSubmittingReview ? 'Recording...' : 'Record Assessment'}</span>
                      </Button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)}>
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit News Article Modal (Phase B9) */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-300">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-base font-bold text-[#0E1E3B]">
                {editingArticle ? 'Edit News Article' : 'Create News Article'}
              </h2>
              <button
                onClick={() => setIsNewsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNews} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto space-y-4 text-xs sm:text-sm">
                {newsActionError && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded text-xs">
                    {newsActionError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Article Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newsTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    placeholder="e.g. Interim Leadership Nominations Open Nationwide"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      URL Slug <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newsSlug}
                      onChange={(e) => {
                        setNewsSlug(e.target.value);
                        setSlugManuallyEdited(true);
                      }}
                      placeholder="e.g. interim-leadership-nominations-open"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] font-mono"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      Preview: /news/{newsSlug || '[slug]'}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Category <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={newsCategory}
                      onChange={(e) => setNewsCategory(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] bg-white"
                    >
                      {NEWS_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Author / Issuing Body <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newsAuthor}
                      onChange={(e) => setNewsAuthor(e.target.value)}
                      placeholder="YRL Interim National Secretariat"
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Publication Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={newsDate}
                      onChange={(e) => setNewsDate(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Excerpt / Summary <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={2}
                    required
                    value={newsExcerpt}
                    onChange={(e) => setNewsExcerpt(e.target.value)}
                    placeholder="Brief 1-2 sentence summary displayed on the news listing cards..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Article Content <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={6}
                    required
                    value={newsContent}
                    onChange={(e) => setNewsContent(e.target.value)}
                    placeholder="Enter article paragraphs here. Separate paragraphs with a blank line (double enter)..."
                    className="w-full text-xs p-2.5 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] font-sans"
                  />
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    Separate distinct paragraphs with a blank line.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Header Image URL (Optional)
                  </label>
                  <input
                    type="text"
                    value={newsImage}
                    onChange={(e) => setNewsImage(e.target.value)}
                    placeholder="https://... or /brand/logo.png"
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                  />
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={newsIsPublished}
                      onChange={(e) => setNewsIsPublished(e.target.checked)}
                      className="w-4 h-4 text-[#0E1E3B] rounded border-slate-300 focus:ring-[#0E1E3B]"
                    />
                    <span className="text-xs font-semibold text-slate-800">
                      Publish immediately to public website
                    </span>
                  </label>
                </div>
              </div>

              <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewsModalOpen(false)}
                  disabled={newsActionLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={newsActionLoading}
                  className="bg-[#0E1E3B] hover:bg-[#1a3461]"
                >
                  {newsActionLoading ? 'Saving...' : editingArticle ? 'Update Article' : 'Create Article'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete News Confirmation Modal (Phase B9) */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-md w-full p-6 border border-red-200">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <h3 className="font-bold text-base text-[#0E1E3B]">Confirm Article Deletion</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete the article{' '}
              <strong className="text-slate-900">&quot;{deleteTarget.title}&quot;</strong> ({deleteTarget.slug})?
            </p>
            <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 mb-6">
              <strong>Audit Notice:</strong> This action cannot be undone and will be logged in the permanent audit trail.
            </div>
            <div className="flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={newsActionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteNews}
                disabled={newsActionLoading}
                className="bg-red-600 hover:bg-red-700 text-white border-none"
              >
                {newsActionLoading ? 'Deleting...' : 'Delete Article'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
