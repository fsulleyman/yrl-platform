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
  listAdminUsers,
  inviteAdminUser,
  updateAdminUserRole,
  setAdminUserStatus,
  deleteAdminUser,
  exportAdminData,
} from './actions';
import {
  type AdminSession,
  type AdminRole,
  type AdminUserRecord,
  ADMIN_ROLES,
  NATIONAL_PORTFOLIOS,
  NOMINATION_STATUSES,
  type NominationStatus,
  type NominationReviewRecord,
  type ReviewRecommendation,
} from '@/lib/auth/types';
import { GHANA_REGIONS, YRL_POSITIONS } from '@/lib/validations/nomination';
import { NEWS_CATEGORIES, slugify, type NewsCategory } from '@/lib/validations/news';
import type { NewsArticle } from '@/lib/news';
import Link from 'next/link';
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
  Menu,
  UserPlus,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  Filter,
  Download,
  FileCheck2,
  Activity,
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
  initialAdminUsers?: AdminUserRecord[];
}

export function AdminDashboard({
  session,
  initialNominations,
  initialMembers,
  initialContactMessages = [],
  initialNewsArticles = [],
  initialAdminUsers = [],
}: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'nominations' | 'members' | 'messages' | 'news' | 'administrators'>('nominations');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);
  const [nominationsList, setNominationsList] = useState<NominationRecord[]>(initialNominations);
  const [selectedRecord, setSelectedRecord] = useState<NominationRecord | null>(null);

  // Admin User Management state (Phase B12.1 & B12.2 - Super Admin only)
  const [adminUsersList, setAdminUsersList] = useState<AdminUserRecord[]>(initialAdminUsers);
  const [isAdminInviteModalOpen, setIsAdminInviteModalOpen] = useState<boolean>(false);
  const [editingAdmin, setEditingAdmin] = useState<AdminUserRecord | null>(null);
  const [deletingAdmin, setDeletingAdmin] = useState<AdminUserRecord | null>(null);
  const [deleteAdminLoading, setDeleteAdminLoading] = useState<boolean>(false);
  const [deleteAdminError, setDeleteAdminError] = useState<string | null>(null);
  const [deleteAdminSuccess, setDeleteAdminSuccess] = useState<string | null>(null);
  const [adminActionLoading, setAdminActionLoading] = useState<boolean>(false);
  const [adminActionError, setAdminActionError] = useState<string | null>(null);
  const [adminActionSuccess, setAdminActionSuccess] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<string>('');
  const [inviteRole, setInviteRole] = useState<AdminRole>('national_reviewer');
  const [inviteRegion, setInviteRegion] = useState<string>('');
  const [invitationSuccessNotice, setInvitationSuccessNotice] = useState<{ email: string; role: AdminRole } | null>(null);

  // Data Export state (Phase B12.2)
  const [exportingDataset, setExportingDataset] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);

  // Members search and filter state
  const [memberSearchQuery, setMemberSearchQuery] = useState<string>('');
  const [memberRegionFilter, setMemberRegionFilter] = useState<string>('all');

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

  // ==============================================================================
  // B12.1: Admin User Management Handlers
  // ==============================================================================
  const handleOpenInviteAdminModal = () => {
    setInviteEmail('');
    setInviteRole('national_reviewer');
    setInviteRegion('');
    setAdminActionError(null);
    setAdminActionSuccess(null);
    setIsAdminInviteModalOpen(true);
  };

  const handleInviteAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminActionLoading(true);
    setAdminActionError(null);
    setAdminActionSuccess(null);

    const res = await inviteAdminUser({
      email: inviteEmail.trim(),
      role: inviteRole,
      assignedRegion: inviteRole === 'regional_coordinator' ? inviteRegion : null,
    });

    setAdminActionLoading(false);
    if (!res.success) {
      setAdminActionError(res.error || 'Failed to invite administrator.');
      return;
    }

    if (res.data) {
      setInvitationSuccessNotice({
        email: res.data.email,
        role: res.data.role,
      });
    }

    // Refresh admin list
    const listRes = await listAdminUsers();
    if (listRes.success && listRes.data) {
      setAdminUsersList(listRes.data);
    }

    setIsAdminInviteModalOpen(false);
  };

  const handleOpenEditAdminModal = (admin: AdminUserRecord) => {
    setEditingAdmin(admin);
    setInviteRole(admin.role);
    setInviteRegion(admin.assignedRegion || '');
    setAdminActionError(null);
    setAdminActionSuccess(null);
  };

  const handleUpdateAdminRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;

    setAdminActionLoading(true);
    setAdminActionError(null);

    const res = await updateAdminUserRole({
      userId: editingAdmin.id,
      role: inviteRole,
      assignedRegion: inviteRole === 'regional_coordinator' ? inviteRegion : null,
    });

    setAdminActionLoading(false);
    if (!res.success) {
      setAdminActionError(res.error || 'Failed to update administrator role.');
      return;
    }

    // Refresh admin list
    const listRes = await listAdminUsers();
    if (listRes.success && listRes.data) {
      setAdminUsersList(listRes.data);
    }
    setEditingAdmin(null);
  };

  const handleToggleAdminStatus = async (admin: AdminUserRecord) => {
    const nextDisabled = !admin.disabled;
    const actionLabel = nextDisabled ? 'deactivate' : 'reactivate';

    if (!confirm(`Are you sure you want to ${actionLabel} administrator ${admin.email}?`)) {
      return;
    }

    const res = await setAdminUserStatus({
      userId: admin.id,
      disabled: nextDisabled,
    });

    if (!res.success) {
      alert(res.error || `Failed to ${actionLabel} administrator.`);
      return;
    }

    // Refresh admin list
    const listRes = await listAdminUsers();
    if (listRes.success && listRes.data) {
      setAdminUsersList(listRes.data);
    }
  };

  const handleConfirmDeleteAdmin = async () => {
    if (!deletingAdmin) return;
    setDeleteAdminLoading(true);
    setDeleteAdminError(null);

    const res = await deleteAdminUser({ userId: deletingAdmin.id });
    setDeleteAdminLoading(false);

    if (!res.success) {
      setDeleteAdminError(res.error || 'Failed to permanently delete administrator account.');
      return;
    }

    setDeleteAdminSuccess(`Administrator ${deletingAdmin.email} has been permanently deleted.`);
    setDeletingAdmin(null);

    // Refresh admin list
    const listRes = await listAdminUsers();
    if (listRes.success && listRes.data) {
      setAdminUsersList(listRes.data);
    }
  };

  const handleExportCsv = async (
    dataset: 'nominations' | 'members' | 'inquiries' | 'reviews',
    region?: string
  ) => {
    setExportingDataset(dataset);
    setExportError(null);

    try {
      const res = await exportAdminData({ dataset, region });
      if (!res.success || !res.data) {
        alert(res.error || `Failed to export ${dataset}.`);
        return;
      }

      const blob = new Blob([res.data.csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', res.data.filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('[Export Error] Failed to download CSV:', err);
      alert('An unexpected error occurred while downloading the export.');
    } finally {
      setExportingDataset(null);
    }
  };


  // Filtered Civic Members (B12.1 Responsive Search & Filter)
  const filteredMembers = initialMembers.filter((m) => {
    if (memberRegionFilter !== 'all' && m.region !== memberRegionFilter) {
      return false;
    }
    if (!memberSearchQuery.trim()) return true;
    const q = memberSearchQuery.toLowerCase();
    const nameMatch = m.full_name?.toLowerCase().includes(q);
    const idMatch = m.member_id?.toLowerCase().includes(q);
    const phoneMatch = (m.phone_number || m.phone || '').toLowerCase().includes(q);
    const emailMatch = (m.email || '').toLowerCase().includes(q);
    const districtMatch = (m.district_municipality || m.district || '').toLowerCase().includes(q);
    return nameMatch || idMatch || phoneMatch || emailMatch || districtMatch;
  });

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
      <header className="bg-white border-b border-slate-200 px-3 sm:px-8 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[4px] bg-[#0E1E3B] text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
              YRL
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <h1 className="text-xs sm:text-base font-bold text-[#0E1E3B] leading-tight">
                  Interim Review Portal
                </h1>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                  {getRoleLabel(session.role)}
                </span>
                {session.assignedRegion && (
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-semibold bg-[#006B3F]/10 text-[#006B3F] border border-[#006B3F]/30">
                    {session.assignedRegion} Region
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[170px] sm:max-w-none">
                {session.user.email}
              </p>
            </div>
          </div>

          {/* Desktop Log Out */}
          <div className="hidden sm:flex items-center gap-3 shrink-0">
            <form action={logoutAdmin}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="text-xs flex items-center gap-1.5 hover:bg-red-50 hover:text-red-700 hover:border-red-300 min-h-[38px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </Button>
            </form>
          </div>

          {/* Mobile Hamburger Menu Button */}
          <div className="flex sm:hidden items-center shrink-0">
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2.5 rounded-[4px] border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle navigation drawer"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Slide-Out Navigation Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex sm:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full p-5 shadow-2xl flex flex-col justify-between z-10">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[4px] bg-[#0E1E3B] text-white flex items-center justify-center font-bold text-xs">
                    YRL
                  </div>
                  <div>
                    <div className="text-xs font-bold text-[#0E1E3B]">Review Portal</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                      {session.user.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-slate-600"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Navigation
                </span>
              </div>

              <nav className="space-y-1.5">
                <button
                  onClick={() => {
                    setActiveTab('nominations');
                    setIsMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-semibold min-h-[44px] transition-colors ${
                    activeTab === 'nominations'
                      ? 'bg-[#0E1E3B] text-white'
                      : 'text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <FileText className="w-4 h-4" /> Nominations
                  </span>
                  <span className="text-[11px] opacity-80">{nominationsList.length}</span>
                </button>

                {(session.role === 'super_admin' || session.role === 'regional_coordinator') && (
                  <button
                    onClick={() => {
                      setActiveTab('members');
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-semibold min-h-[44px] transition-colors ${
                      activeTab === 'members'
                        ? 'bg-[#0E1E3B] text-white'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="w-4 h-4" /> Registered Members
                    </span>
                    <span className="text-[11px] opacity-80">{initialMembers.length}</span>
                  </button>
                )}

                {session.role === 'super_admin' && (
                  <>
                    <button
                      onClick={() => {
                        setActiveTab('messages');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-semibold min-h-[44px] transition-colors ${
                        activeTab === 'messages'
                          ? 'bg-[#0E1E3B] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Mail className="w-4 h-4" /> Inquiries
                      </span>
                      <span className="text-[11px] opacity-80">{initialContactMessages.length}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('news');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-semibold min-h-[44px] transition-colors ${
                        activeTab === 'news'
                          ? 'bg-[#0E1E3B] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Newspaper className="w-4 h-4" /> News &amp; Notices
                      </span>
                      <span className="text-[11px] opacity-80">{newsList.length}</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveTab('administrators');
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-semibold min-h-[44px] transition-colors ${
                        activeTab === 'administrators'
                          ? 'bg-[#0E1E3B] text-white'
                          : 'text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span className="flex items-center gap-2.5">
                        <Shield className="w-4 h-4" /> Administrators
                      </span>
                      <span className="text-[11px] opacity-80">{adminUsersList.length}</span>
                    </button>
                  </>
                )}
                <Link
                  href="/admin/payments"
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-semibold min-h-[44px] text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-2.5">
                    <FileCheck2 className="w-4 h-4 text-[#0E1E3B]" /> Payments
                  </span>
                </Link>
                {session.role === 'super_admin' && (
                  <Link
                    href="/admin/activity"
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-[4px] text-xs font-semibold min-h-[44px] text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <span className="flex items-center gap-2.5">
                      <Activity className="w-4 h-4 text-purple-600" /> Activity Log
                    </span>
                  </Link>
                )}
              </nav>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <form action={logoutAdmin}>
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  type="submit"
                  className="text-xs flex items-center justify-center gap-1.5 text-red-700 border-red-200 hover:bg-red-50 min-h-[44px]"
                >
                  <LogOut className="w-4 h-4" /> Sign Out
                </Button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-6">
        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="bg-white p-3 sm:p-3.5 rounded-[4px] border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Nominations
              </span>
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0E1E3B] shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#0E1E3B] mt-1">{nominationsList.length}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Dossiers in scope</div>
          </div>

          <div className="bg-white p-3 sm:p-3.5 rounded-[4px] border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                Members
              </span>
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-600 shrink-0" />
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#0E1E3B] mt-1">{initialMembers.length}</div>
            <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Civic registrants</div>
          </div>

          {session.role === 'super_admin' && (
            <>
              <div className="bg-white p-3 sm:p-3.5 rounded-[4px] border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Inquiries
                  </span>
                  <Mail className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-600 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#0E1E3B] mt-1">
                  {initialContactMessages.length}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Public messages</div>
              </div>

              <div className="bg-white p-3 sm:p-3.5 rounded-[4px] border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    News
                  </span>
                  <Newspaper className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-600 shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#0E1E3B] mt-1">{newsList.length}</div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">Published notices</div>
              </div>

              <div className="bg-white p-3 sm:p-3.5 rounded-[4px] border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wider truncate">
                    Admins
                  </span>
                  <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#C9A227] shrink-0" />
                </div>
                <div className="text-xl sm:text-2xl font-bold text-[#0E1E3B] mt-1">
                  {adminUsersList.length}
                </div>
                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 truncate">System users</div>
              </div>
            </>
          )}
        </div>

        {/* Mobile Current Section Header */}
        <div className="flex sm:hidden items-center justify-between bg-white px-3.5 py-2.5 rounded-[4px] border border-slate-200 shadow-xs mb-4">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 shrink-0">Section:</span>
            <span className="text-xs sm:text-sm font-bold text-[#0E1E3B] capitalize truncate">
              {activeTab === 'administrators'
                ? 'Administrators'
                : activeTab === 'messages'
                ? 'Inquiries'
                : activeTab === 'news'
                ? 'News & Notices'
                : activeTab}
            </span>
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-xs font-semibold text-[#0E1E3B] flex items-center gap-1.5 bg-slate-100 px-3 py-2 rounded-[4px] border border-slate-300 min-h-[40px] shrink-0"
          >
            <Menu className="w-3.5 h-3.5" /> Switch
          </button>
        </div>

        {/* Navigation Tabs (Desktop / Tablet) */}
        <div className="hidden sm:flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveTab('nominations')}
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors ${
                activeTab === 'nominations'
                  ? 'bg-[#0E1E3B] text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              Nominations ({nominationsList.length})
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

            {/* Administrators tab visible to Super Admin (Phase B12.1) */}
            {session.role === 'super_admin' && (
              <button
                onClick={() => setActiveTab('administrators')}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors ${
                  activeTab === 'administrators'
                    ? 'bg-[#0E1E3B] text-white shadow-xs'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Shield className="w-4 h-4" />
                Administrators ({adminUsersList.length})
              </button>
            )}
            {/* Payments Link */}
            <Link
              href="/admin/payments"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
            >
              <FileCheck2 className="w-4 h-4 text-[#0E1E3B]" />
              Payments
            </Link>
            {/* Activity Log Link (Super Admin Only) */}
            {session.role === 'super_admin' && (
              <Link
                href="/admin/activity"
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[4px] transition-colors bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              >
                <Activity className="w-4 h-4 text-purple-600" />
                Activity Log
              </Link>
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

            {/* Nominations Action & Export Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-[4px] border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-500">
                Showing <strong className="text-[#0E1E3B]">{filteredNominations.length}</strong> of{' '}
                <strong className="text-[#0E1E3B]">{nominationsList.length}</strong> scoped nominations
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleExportCsv(
                      'nominations',
                      session.role === 'super_admin' && filterRegion !== 'all' ? filterRegion : undefined
                    )
                  }
                  disabled={exportingDataset === 'nominations'}
                  className="text-xs flex items-center justify-center gap-1.5 min-h-[40px] w-full sm:w-auto"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="truncate">
                    {exportingDataset === 'nominations'
                      ? 'Exporting Nominations...'
                      : session.role === 'super_admin'
                      ? filterRegion !== 'all'
                        ? `Export Nominations (${filterRegion})`
                        : 'Export Nominations (All Regions)'
                      : session.role === 'regional_coordinator'
                      ? `Export Nominations (${session.assignedRegion})`
                      : 'Export Nominations (11 National Portfolios)'}
                  </span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleExportCsv('reviews')}
                  disabled={exportingDataset === 'reviews'}
                  className="text-xs flex items-center justify-center gap-1.5 min-h-[40px] w-full sm:w-auto"
                  title="Export evaluation reviews for authorized nominations"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>{exportingDataset === 'reviews' ? 'Exporting Reviews...' : 'Export Reviews'}</span>
                </Button>
              </div>
            </div>

            {/* Nominations Table (Desktop Table + Mobile Cards) */}
            <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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

              {/* Mobile Card View (Single-hand review friendly) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredNominations.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No nomination records matching current filters.
                  </div>
                ) : (
                  filteredNominations.map((nom) => (
                    <div key={nom.id} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-[#0E1E3B]">{nom.full_name}</div>
                          {nom.reference_id && (
                            <div className="text-[11px] font-mono text-[#0B1F3A] font-semibold mt-0.5">
                              {nom.reference_id}
                            </div>
                          )}
                        </div>
                        <Badge status={nom.status} size="sm" />
                      </div>

                      <div className="text-xs text-slate-800">
                        <span className="font-semibold">{nom.position_applied}</span>
                        {nom.region_if_regional_minister && (
                          <div className="text-[11px] text-[#C9A227] font-semibold mt-0.5">
                            Deployment: {nom.region_if_regional_minister} Region
                          </div>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                        <span>📍 {nom.region} Region ({nom.district_municipality})</span>
                        <span>
                          📅 {new Date(nom.created_at || nom.submitted_at || Date.now()).toLocaleDateString('en-GB')}
                        </span>
                      </div>

                      <div className="text-xs text-slate-500 font-mono break-all">
                        {nom.email} • {nom.phone_number}
                      </div>

                      <div className="pt-1.5 flex justify-end">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedRecord(nom)}
                          className="text-xs h-9 px-3 min-h-[42px] w-full sm:w-auto flex items-center justify-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> View Full Dossier
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Members (with B12.1 Search, Region Filter & Mobile Card View) */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            {/* Search & Filter Bar */}
            <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Search Members
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filter by name, ID, phone, email, district..."
                    value={memberSearchQuery}
                    onChange={(e) => setMemberSearchQuery(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                  Region Filter
                </label>
                <select
                  value={memberRegionFilter}
                  onChange={(e) => setMemberRegionFilter(e.target.value)}
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
            </div>

            <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-[#0E1E3B] text-sm">
                    Registered Civic Members {session.assignedRegion ? `(${session.assignedRegion} Region)` : ''}
                  </h3>
                  <span className="text-xs text-slate-500 font-mono">
                    Showing: {filteredMembers.length} of {initialMembers.length}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    handleExportCsv(
                      'members',
                      session.role === 'super_admin' && memberRegionFilter !== 'all' ? memberRegionFilter : undefined
                    )
                  }
                  disabled={exportingDataset === 'members'}
                  className="text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[40px]"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span className="truncate">
                    {exportingDataset === 'members'
                      ? 'Exporting Members...'
                      : session.role === 'super_admin'
                      ? memberRegionFilter !== 'all'
                        ? `Export Members (${memberRegionFilter})`
                        : 'Export Members (All Regions)'
                      : `Export Members (${session.assignedRegion || 'Assigned Region'})`}
                  </span>
                </Button>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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
                    {filteredMembers.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-12 text-center text-slate-500">
                          No member records matching current criteria.
                        </td>
                      </tr>
                    ) : (
                      filteredMembers.map((m) => (
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

              {/* Mobile Card View (Easy single-hand reading) */}
              <div className="block md:hidden divide-y divide-slate-100">
                {filteredMembers.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No member records matching current criteria.
                  </div>
                ) : (
                  filteredMembers.map((m) => (
                    <div key={m.id} className="p-4 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-sm text-[#0E1E3B]">{m.full_name}</div>
                        {m.member_id && (
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                            {m.member_id}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-3 gap-y-1 font-mono break-all">
                        <span>📞 {m.phone_number || m.phone || '—'}</span>
                        <span>📧 {m.email || '—'}</span>
                      </div>

                      <div className="text-xs text-slate-500 flex items-center justify-between pt-1">
                        <span>📍 {m.region} Region {m.district_municipality || m.district ? `(${m.district_municipality || m.district})` : ''}</span>
                        <span>{new Date(m.created_at || m.joined_at || Date.now()).toLocaleDateString('en-GB')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Contact Messages (Super Admin only - Desktop Table + Mobile Cards) */}
        {activeTab === 'messages' && session.role === 'super_admin' && (
          <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-[#0E1E3B] text-sm">Secretariat Inquiries</h3>
                <span className="text-xs text-slate-500 font-mono">Total: {initialContactMessages.length}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExportCsv('inquiries')}
                disabled={exportingDataset === 'inquiries'}
                className="text-xs flex items-center justify-center gap-1.5 w-full sm:w-auto min-h-[40px]"
              >
                <Download className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                <span>{exportingDataset === 'inquiries' ? 'Exporting Inquiries...' : 'Export Inquiries (All)'}</span>
              </Button>
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
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

            {/* Mobile Card View */}
            <div className="block md:hidden divide-y divide-slate-100">
              {initialContactMessages.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  No contact messages found.
                </div>
              ) : (
                initialContactMessages.map((msg) => (
                  <div key={msg.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-sm text-[#0E1E3B]">{msg.full_name}</div>
                        {msg.reference_id && (
                          <div className="text-[11px] font-mono text-[#0B1F3A] font-semibold mt-0.5">
                            {msg.reference_id}
                          </div>
                        )}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                        {msg.status}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 font-mono break-all">{msg.email}</div>

                    <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 leading-relaxed">
                      {msg.message}
                    </p>

                    <div className="text-[11px] text-slate-400 text-right pt-0.5">
                      {new Date(msg.created_at).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                ))
              )}
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
                className="text-xs flex items-center justify-center gap-1.5 bg-[#0E1E3B] hover:bg-[#1a3461] w-full sm:w-auto min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Create Article</span>
              </Button>
            </div>

            <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
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

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {newsList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No news articles found. Click &quot;Create Article&quot; to publish your first announcement.
                  </div>
                ) : (
                  newsList.map((article) => (
                    <div key={article.slug} className="p-4 space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-bold text-sm text-[#0E1E3B]">{article.title}</div>
                        {article.is_published !== false ? (
                          <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Published
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
                            Draft
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                        <span className="text-[11px] px-1.5 py-0.5 rounded font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {article.category || 'Official Notice'}
                        </span>
                        <span>📅 {article.date ? new Date(article.date).toLocaleDateString('en-GB') : '—'}</span>
                        <span className="font-mono break-all">/news/{article.slug}</span>
                      </div>

                      <div className="pt-2 flex flex-wrap gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTogglePublish(article)}
                          className="text-xs h-9 px-2.5 min-h-[40px] flex-1 flex items-center justify-center"
                        >
                          {article.is_published !== false ? 'Unpublish' : 'Publish'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditNewsModal(article)}
                          className="text-xs h-9 px-2.5 min-h-[40px] flex-1 flex items-center justify-center gap-1"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(article)}
                          className="text-xs h-9 px-2.5 min-h-[40px] text-red-600 hover:bg-red-50 flex items-center justify-center"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Administrators (Super Admin only - Phase B12.1) */}
        {activeTab === 'administrators' && session.role === 'super_admin' && (
          <div className="space-y-4">
            {/* Invitation Success Notice Banner (Phase B12.1.1) */}
            {invitationSuccessNotice && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-[4px] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Administrator Invitation Dispatched</span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                    An official invitation has been sent to <strong className="font-mono">{invitationSuccessNotice.email}</strong>. The recipient will receive an email link to establish their own password and access the review portal.
                  </p>
                </div>
                <button
                  onClick={() => setInvitationSuccessNotice(null)}
                  className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded font-semibold self-start sm:self-center shrink-0"
                >
                  Dismiss Notice
                </button>
              </div>
            )}

            {/* Deletion Success Notice Banner (Phase B12.2) */}
            {deleteAdminSuccess && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-[4px] shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{deleteAdminSuccess}</span>
                </div>
                <button
                  onClick={() => setDeleteAdminSuccess(null)}
                  className="text-xs px-3 py-1.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded font-semibold self-start sm:self-center shrink-0"
                >
                  Dismiss Notice
                </button>
              </div>
            )}

            {/* Header & Actions Bar */}
            <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-[#0E1E3B] text-base">
                  System Administrators
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage institutional administrative accounts, role assignments, and access permissions.
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenInviteAdminModal}
                className="text-xs flex items-center justify-center gap-1.5 bg-[#0E1E3B] hover:bg-[#1a3461] min-h-[40px] w-full sm:w-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>Invite Administrator</span>
              </Button>
            </div>

            {/* Administrators Table Container */}
            <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 uppercase text-[11px] font-bold tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4">Administrator Email</th>
                      <th className="py-3.5 px-4">Role</th>
                      <th className="py-3.5 px-4">Assigned Region</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Last Sign In</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminUsersList.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-12 text-center text-slate-500">
                          No administrator accounts found.
                        </td>
                      </tr>
                    ) : (
                      adminUsersList.map((admin) => (
                        <tr key={admin.id} className="hover:bg-slate-50/80">
                          <td className="py-3 px-4 font-mono font-medium text-[#0E1E3B]">
                            {admin.email}
                            {admin.email.toLowerCase() === session.user.email.toLowerCase() && (
                              <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-sans font-semibold">
                                You
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-xs px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-300">
                              {getRoleLabel(admin.role)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-600 text-xs">
                            {admin.assignedRegion ? `${admin.assignedRegion} Region` : '—'}
                          </td>
                          <td className="py-3 px-4">
                            {admin.disabled ? (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold bg-red-50 text-red-700 border border-red-200">
                                <UserX className="w-3 h-3" /> Deactivated
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <UserCheck className="w-3 h-3" /> Active
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-500 text-xs">
                            {admin.lastSignInAt
                              ? new Date(admin.lastSignInAt).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : 'Never'}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleOpenEditAdminModal(admin)}
                                className="text-xs h-7 px-2"
                                title="Change role or region"
                              >
                                <Edit2 className="w-3 h-3 mr-1" /> Role
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleToggleAdminStatus(admin)}
                                className={`text-xs h-7 px-2 ${
                                  admin.disabled
                                    ? 'text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300'
                                    : 'text-amber-700 hover:bg-amber-50 hover:border-amber-300'
                                }`}
                                title={admin.disabled ? 'Reactivate administrator' : 'Deactivate administrator'}
                              >
                                {admin.disabled ? 'Reactivate' : 'Deactivate'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setDeletingAdmin(admin);
                                  setDeleteAdminError(null);
                                }}
                                className="text-xs h-7 px-2 text-red-700 hover:bg-red-50 hover:border-red-300"
                                title="Permanently delete administrator"
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Delete
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="block md:hidden divide-y divide-slate-100">
                {adminUsersList.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-500">
                    No administrator accounts found.
                  </div>
                ) : (
                  adminUsersList.map((admin) => (
                    <div key={admin.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="font-mono text-xs font-bold text-[#0E1E3B] break-all">
                          {admin.email}
                          {admin.email.toLowerCase() === session.user.email.toLowerCase() && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-sans font-semibold">
                              You
                            </span>
                          )}
                        </div>
                        {admin.disabled ? (
                          <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-red-50 text-red-700 border border-red-200 shrink-0">
                            Deactivated
                          </span>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                            Active
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap gap-x-2 gap-y-1">
                        <span className="font-semibold">{getRoleLabel(admin.role)}</span>
                        {admin.assignedRegion && (
                          <span className="text-slate-500">• {admin.assignedRegion} Region</span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-400 flex items-center justify-between pt-0.5">
                        <span>
                          Last sign in:{' '}
                          {admin.lastSignInAt
                            ? new Date(admin.lastSignInAt).toLocaleDateString('en-GB')
                            : 'Never'}
                        </span>
                        <span>Joined: {new Date(admin.createdAt).toLocaleDateString('en-GB')}</span>
                      </div>

                      <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditAdminModal(admin)}
                          className="text-xs h-9 px-3 min-h-[40px] w-full flex items-center justify-center gap-1.5"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Role
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAdminStatus(admin)}
                          className={`text-xs h-9 px-3 min-h-[40px] w-full flex items-center justify-center gap-1.5 ${
                            admin.disabled
                              ? 'text-emerald-700 hover:bg-emerald-50'
                              : 'text-amber-700 hover:bg-amber-50'
                          }`}
                        >
                          {admin.disabled ? 'Reactivate' : 'Deactivate'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDeletingAdmin(admin);
                            setDeleteAdminError(null);
                          }}
                          className="text-xs h-9 px-3 min-h-[40px] w-full flex items-center justify-center gap-1.5 text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Read-Only Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-300">
            {/* Modal Header */}
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0 pr-2">
                <span className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-semibold block">
                  Reference: {selectedRecord.reference_id || selectedRecord.id.substring(0, 8)}
                </span>
                <h2 className="text-sm sm:text-lg font-bold text-[#0E1E3B] truncate">
                  {selectedRecord.full_name} — {selectedRecord.position_applied}
                </h2>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                aria-label="Close dossier"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content - Read Only */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-xs sm:text-sm text-slate-800">
              {/* Status Display & Transition Workflow (Phase B8) */}
              <div className="p-3.5 sm:p-4 bg-slate-50 rounded-[4px] border border-slate-200 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-700 text-xs sm:text-sm">Current Status:</span>
                    <Badge status={selectedRecord.status} size="sm" />
                  </div>
                  <div className="text-[11px] sm:text-xs text-slate-500 font-mono break-all">
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
                  <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                    <select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value as NominationStatus)}
                      disabled={isUpdatingStatus}
                      className="text-xs px-3 py-2 border border-slate-300 rounded bg-white font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] w-full sm:w-auto min-h-[40px] sm:min-h-0"
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
                      className="text-xs px-3 py-2 border border-slate-300 rounded bg-white flex-1 focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] w-full min-h-[40px] sm:min-h-0"
                    />

                    {!showStatusConfirm ? (
                      <Button
                        variant="primary"
                        size="sm"
                        type="button"
                        disabled={isUpdatingStatus || newStatus === selectedRecord.status}
                        onClick={() => setShowStatusConfirm(true)}
                        className="text-xs whitespace-nowrap bg-[#0E1E3B] hover:bg-[#1a3461] w-full sm:w-auto min-h-[40px]"
                      >
                        Change Status
                      </Button>
                    ) : (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
                        <Button
                          variant="primary"
                          size="sm"
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={handleStatusUpdate}
                          className="text-xs bg-[#006B3F] hover:bg-[#005230] text-white w-full sm:w-auto min-h-[40px]"
                        >
                          {isUpdatingStatus ? 'Updating...' : 'Confirm Update'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          type="button"
                          disabled={isUpdatingStatus}
                          onClick={() => setShowStatusConfirm(false)}
                          className="text-xs w-full sm:w-auto min-h-[40px]"
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Personal & Contact Details */}
              <div className="border border-slate-200 rounded-[2px] p-3.5 sm:p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  1. Personal &amp; Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
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
                    <span className="font-medium font-mono break-all">{selectedRecord.phone_number}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-xs">WhatsApp</span>
                    <span className="font-medium font-mono break-all">{selectedRecord.whatsapp_number || 'Same'}</span>
                  </div>
                  <div className="col-span-1 sm:col-span-2 md:col-span-2">
                    <span className="text-slate-500 block text-xs">Email</span>
                    <span className="font-medium font-mono break-all">{selectedRecord.email}</span>
                  </div>
                </div>
              </div>

              {/* Geographic Info */}
              <div className="border border-slate-200 rounded-[2px] p-3.5 sm:p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  2. Geographic Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <div className="border border-slate-200 rounded-[2px] p-3.5 sm:p-4">
                <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-3 border-b pb-1">
                  3. Professional &amp; Educational Background
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
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
              <div className="border border-slate-200 rounded-[2px] p-3.5 sm:p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-bold text-[#0E1E3B] text-xs uppercase tracking-wider mb-2 border-b pb-1">
                    5. Referee Details
                  </h4>
                  <div className="space-y-1">
                    <p><span className="text-slate-500">Name:</span> {selectedRecord.referee_name}</p>
                    <p><span className="text-slate-500">Relationship:</span> {selectedRecord.referee_relationship}</p>
                    <p><span className="text-slate-500">Phone:</span> <span className="font-mono break-all">{selectedRecord.referee_phone}</span></p>
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
              <div className="border border-slate-200 rounded-[4px] p-3.5 sm:p-4 bg-white space-y-4">
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
                          className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[40px] sm:min-h-0"
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
                          className="w-full text-xs px-2.5 py-2 border border-slate-300 rounded bg-white focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[40px] sm:min-h-0"
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
                              className={`w-8 h-8 rounded text-xs font-bold transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center ${
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
                        className="text-xs flex items-center justify-center gap-1.5 bg-[#0E1E3B] hover:bg-[#1a3461] w-full sm:w-auto min-h-[40px]"
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
            <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <Button variant="outline" size="sm" onClick={() => setSelectedRecord(null)} className="w-full sm:w-auto min-h-[40px]">
                Close Dossier
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit News Article Modal (Phase B9) */}
      {isNewsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col border border-slate-300">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h2 className="text-sm sm:text-base font-bold text-[#0E1E3B]">
                {editingArticle ? 'Edit News Article' : 'Create News Article'}
              </h2>
              <button
                onClick={() => setIsNewsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNews} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-4 sm:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 text-xs sm:text-sm">
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
                    className="w-full text-xs px-3 py-2.5 sm:py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[40px] sm:min-h-0"
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
                      className="w-full text-xs px-3 py-2.5 sm:py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] font-mono break-all min-h-[40px] sm:min-h-0"
                    />
                    <span className="text-[11px] text-slate-500 mt-0.5 block break-all">
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
                      className="w-full text-xs px-3 py-2.5 sm:py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] bg-white min-h-[40px] sm:min-h-0"
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
                      className="w-full text-xs px-3 py-2.5 sm:py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[40px] sm:min-h-0"
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
                      className="w-full text-xs px-3 py-2.5 sm:py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[40px] sm:min-h-0"
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
                    className="w-full text-xs px-3 py-2.5 sm:py-2 border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[40px] sm:min-h-0"
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

              <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsNewsModalOpen(false)}
                  disabled={newsActionLoading}
                  className="w-full sm:w-auto min-h-[40px] justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={newsActionLoading}
                  className="bg-[#0E1E3B] hover:bg-[#1a3461] w-full sm:w-auto min-h-[40px] justify-center"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-md w-full p-4 sm:p-6 border border-red-200">
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
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
                disabled={newsActionLoading}
                className="w-full sm:w-auto min-h-[40px] justify-center"
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleDeleteNews}
                disabled={newsActionLoading}
                className="bg-red-600 hover:bg-red-700 text-white border-none w-full sm:w-auto min-h-[40px] justify-center"
              >
                {newsActionLoading ? 'Deleting...' : 'Delete Article'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Administrator Modal (Phase B12.1) */}
      {isAdminInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col border border-slate-300">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-bold text-[#0E1E3B]">Invite Administrator</h3>
                <p className="text-xs text-slate-500">Send an official invitation email to provision a new administrator account.</p>
              </div>
              <button
                onClick={() => setIsAdminInviteModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInviteAdmin} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4 overflow-y-auto">
              {adminActionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{adminActionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="admin@domain.org"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 sm:py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[42px]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Administrative Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 sm:py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[42px]"
                >
                  <option value="national_reviewer">National Reviewer (11 National Portfolios)</option>
                  <option value="regional_coordinator">Regional Coordinator (Assigned Region)</option>
                  <option value="super_admin">Super Administrator (Full System Scope)</option>
                </select>
              </div>

              {inviteRole === 'regional_coordinator' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Region *
                  </label>
                  <select
                    required
                    value={inviteRegion}
                    onChange={(e) => setInviteRegion(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 sm:py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[42px]"
                  >
                    <option value="">Select Ghanaian Region</option>
                    {GHANA_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region} Region
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                <strong>Credential Ownership:</strong> The invited administrator will receive an email from Supabase Auth containing a secure link to establish their own private password.
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAdminInviteModalOpen(false)}
                  disabled={adminActionLoading}
                  className="w-full sm:w-auto min-h-[40px] justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={adminActionLoading}
                  className="bg-[#0E1E3B] hover:bg-[#1a3461] w-full sm:w-auto min-h-[40px] justify-center"
                >
                  {adminActionLoading ? 'Sending Invitation...' : 'Send Invitation'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Administrator Role Modal (Phase B12.1) */}
      {editingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-md w-full border border-slate-300">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="min-w-0 pr-2">
                <h3 className="text-sm sm:text-base font-bold text-[#0E1E3B]">Update Administrator Role</h3>
                <p className="text-xs text-slate-500 font-mono break-all">{editingAdmin.email}</p>
              </div>
              <button
                onClick={() => setEditingAdmin(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateAdminRole} className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              {adminActionError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{adminActionError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Administrative Role *
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as AdminRole)}
                  className="w-full text-xs sm:text-sm px-3 py-2.5 sm:py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[42px]"
                >
                  <option value="national_reviewer">National Reviewer (11 National Portfolios)</option>
                  <option value="regional_coordinator">Regional Coordinator (Assigned Region)</option>
                  <option value="super_admin">Super Administrator (Full System Scope)</option>
                </select>
              </div>

              {inviteRole === 'regional_coordinator' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Assigned Region *
                  </label>
                  <select
                    required
                    value={inviteRegion}
                    onChange={(e) => setInviteRegion(e.target.value)}
                    className="w-full text-xs sm:text-sm px-3 py-2.5 sm:py-2 border border-slate-300 rounded-[4px] focus:outline-none focus:ring-1 focus:ring-[#0E1E3B] min-h-[42px]"
                  >
                    <option value="">Select Ghanaian Region</option>
                    {GHANA_REGIONS.map((region) => (
                      <option key={region} value={region}>
                        {region} Region
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded text-xs text-slate-600">
                <strong>Governance Rule:</strong> The system strictly prevents demoting or deactivating the last active Super Administrator.
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingAdmin(null)}
                  disabled={adminActionLoading}
                  className="w-full sm:w-auto min-h-[40px] justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={adminActionLoading}
                  className="bg-[#0E1E3B] hover:bg-[#1a3461] w-full sm:w-auto min-h-[40px] justify-center"
                >
                  {adminActionLoading ? 'Saving...' : 'Save Role Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Permanent Administrator Deletion Modal (Phase B12.2) */}
      {deletingAdmin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-[4px] shadow-xl max-w-md w-full border border-red-300">
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-red-100 flex items-center justify-between bg-red-50">
              <div className="flex items-center gap-2 text-red-900 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Permanently Delete Administrator</span>
              </div>
              <button
                onClick={() => {
                  setDeletingAdmin(null);
                  setDeleteAdminError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded min-h-[40px] min-w-[40px] flex items-center justify-center shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-3.5 sm:space-y-4">
              {deleteAdminError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{deleteAdminError}</span>
                </div>
              )}

              <div className="p-3.5 sm:p-4 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900 space-y-2">
                <p className="font-bold text-amber-950">Warning: This action is permanent and irreversible.</p>
                <p>
                  You are about to permanently delete the administrator account for{' '}
                  <strong className="font-mono text-[#0E1E3B] break-all">{deletingAdmin.email}</strong>.
                </p>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  • Their login credentials and authentication account will be completely removed.<br />
                  • Historical audit logs, nomination reviews, and system data will be securely preserved.<br />
                  • The sole remaining active Super Administrator cannot be deleted.
                </p>
              </div>

              <div className="pt-2 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-slate-100">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDeletingAdmin(null);
                    setDeleteAdminError(null);
                  }}
                  disabled={deleteAdminLoading}
                  className="w-full sm:w-auto min-h-[40px] justify-center"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleConfirmDeleteAdmin}
                  disabled={deleteAdminLoading}
                  className="bg-red-700 hover:bg-red-800 text-white flex items-center justify-center gap-1.5 min-h-[40px] w-full sm:w-auto"
                >
                  <Trash2 className="w-4 h-4 shrink-0" />
                  <span>{deleteAdminLoading ? 'Deleting...' : 'Delete Permanently'}</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
