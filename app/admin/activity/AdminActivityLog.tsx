'use client';

import React, { useState, useTransition } from 'react';
import { Button } from '@/components/ui/Button';
import {
  RefreshCw,
  Search,
  Filter,
  Clock,
  Shield,
  FileCheck2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Eye,
  User,
  Activity,
  Layers,
  CheckCircle,
  XCircle,
  ArrowRight,
} from 'lucide-react';
import { getActivityLogsAction } from '@/lib/actions/activity';
import type { AuditLogEntry, PaginatedAuditLogsResult, AuditLogFilters } from '@/lib/audit/types';
import type { AdminSession } from '@/lib/auth/types';

interface AdminActivityLogProps {
  session: AdminSession;
  initialData: PaginatedAuditLogsResult;
}

const ACTION_OPTIONS = [
  { value: 'all', label: 'All Actions' },
  { value: 'payment_verified', label: 'Payment Verified' },
  { value: 'payment_rejected', label: 'Payment Rejected' },
  { value: 'payment_receipt_submitted', label: 'Payment Receipt Submitted' },
  { value: 'payment_created', label: 'Payment Created' },
  { value: 'membership_activated', label: 'Membership Activated' },
  { value: 'membership_application_created', label: 'Membership Application Created' },
  { value: 'status_change', label: 'Nomination Status Changed' },
  { value: 'review_submitted', label: 'Nomination Review Submitted' },
  { value: 'admin_login', label: 'Admin Login' },
  { value: 'admin_login_failed', label: 'Admin Login Failed' },
  { value: 'admin_logout', label: 'Admin Logout' },
  { value: 'admin_user_invited', label: 'Admin User Invited' },
  { value: 'admin_deactivated', label: 'Admin Deactivated' },
  { value: 'admin_user_deleted', label: 'Admin Deleted' },
  { value: 'news_created', label: 'News Created' },
  { value: 'news_status_change', label: 'News Status Changed' },
  { value: 'data_exported', label: 'Data Exported' },
];

const ENTITY_OPTIONS = [
  { value: 'all', label: 'All Entities' },
  { value: 'payment', label: 'Payment' },
  { value: 'membership_application', label: 'Membership Application' },
  { value: 'nomination', label: 'Nomination' },
  { value: 'admin_user', label: 'Admin User' },
  { value: 'news_article', label: 'News Article' },
  { value: 'auth', label: 'Authentication' },
  { value: 'export', label: 'Export' },
];

export function AdminActivityLog({ session, initialData }: AdminActivityLogProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>(initialData.logs);
  const [totalCount, setTotalCount] = useState<number>(initialData.totalCount);
  const [page, setPage] = useState<number>(initialData.page);
  const [totalPages, setTotalPages] = useState<number>(initialData.totalPages);
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const fetchLogs = (overrideFilters: Partial<AuditLogFilters> = {}) => {
    setError(null);
    startTransition(async () => {
      const filters: AuditLogFilters = {
        action: actionFilter === 'all' ? undefined : actionFilter,
        entity_type: entityFilter === 'all' ? undefined : entityFilter,
        search: searchQuery.trim() || undefined,
        page,
        pageSize: 20,
        ...overrideFilters,
      };

      const res = await getActivityLogsAction(filters);
      if (res.success && res.data) {
        setLogs(res.data.logs);
        setTotalCount(res.data.totalCount);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
      } else {
        setError(res.error || 'Failed to load activity logs.');
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs({ page: 1 });
  };

  const handleActionChange = (newAction: string) => {
    setActionFilter(newAction);
    fetchLogs({ action: newAction === 'all' ? undefined : newAction, page: 1 });
  };

  const handleEntityChange = (newEntity: string) => {
    setEntityFilter(newEntity);
    fetchLogs({ entity_type: newEntity === 'all' ? undefined : newEntity, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchLogs({ page: newPage });
  };

  const handleResetFilters = () => {
    setActionFilter('all');
    setEntityFilter('all');
    setSearchQuery('');
    fetchLogs({
      action: undefined,
      entity_type: undefined,
      search: undefined,
      page: 1,
    });
  };

  const toggleRowExpand = (id: string) => {
    setExpandedRows((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const getActionBadge = (action: string) => {
    if (action.includes('verified') || action.includes('activated')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle className="w-3 h-3 text-emerald-700" />
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    if (action.includes('rejected') || action.includes('failed') || action.includes('deleted') || action.includes('deactivated')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-100 text-rose-800 border border-rose-300">
          <XCircle className="w-3 h-3 text-rose-700" />
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    if (action.includes('receipt') || action.includes('created') || action.includes('submitted')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-100 text-blue-800 border border-blue-300">
          <Activity className="w-3 h-3 text-blue-700" />
          {action.replace(/_/g, ' ')}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-300">
        <Clock className="w-3 h-3 text-slate-600" />
        {action.replace(/_/g, ' ')}
      </span>
    );
  };

  const getEntityBadge = (entity: string) => {
    switch (entity) {
      case 'payment':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-300">
            <FileCheck2 className="w-3 h-3 text-amber-700" />
            payment
          </span>
        );
      case 'membership_application':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-900 border border-indigo-300">
            <User className="w-3 h-3 text-indigo-700" />
            application
          </span>
        );
      case 'nomination':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-900 border border-emerald-300">
            <Layers className="w-3 h-3 text-emerald-700" />
            nomination
          </span>
        );
      case 'admin_user':
      case 'auth':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-900 border border-purple-300">
            <Shield className="w-3 h-3 text-purple-700" />
            {entity}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {entity}
          </span>
        );
    }
  };

  const inferRole = (actorId: string): string => {
    if (actorId === 'applicant') return 'applicant';
    if (actorId === 'system') return 'system';
    if (actorId.includes('@')) return 'administrator';
    return 'user';
  };

  return (
    <div className="space-y-5">
      {/* Header and Controls */}
      <div className="bg-white p-5 rounded-[4px] border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-[#0E1E3B] tracking-tight">
                Activity &amp; Audit Log
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                Super Admin Only
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Authoritative timeline of administrative decisions, payment lifecycle transitions, and security events.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchLogs()}
              disabled={isPending}
              className="text-xs flex items-center gap-1.5 min-h-[38px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="pt-3 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Action Type
            </label>
            <select
              value={actionFilter}
              onChange={(e) => handleActionChange(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
            >
              {ACTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Entity Type
            </label>
            <select
              value={entityFilter}
              onChange={(e) => handleEntityChange(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
            >
              {ENTITY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Search Reference / Actor
            </label>
            <form onSubmit={handleSearchSubmit} className="flex gap-1.5">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ID, actor, email..."
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-[4px] bg-white text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0E1E3B]"
              />
              <Button type="submit" size="sm" variant="outline" className="px-2.5">
                <Search className="w-3.5 h-3.5" />
              </Button>
            </form>
          </div>

          <div className="flex items-end">
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="w-full text-xs text-slate-600 hover:text-slate-900 min-h-[38px]"
            >
              Reset Filters
            </Button>
          </div>
        </div>
      </div>

      {/* Error Notice */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-[4px] text-xs text-red-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Audit Log Table */}
      <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Total Records: <strong className="font-mono text-[#0E1E3B]">{totalCount}</strong>
          </span>
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
        </div>

        {logs.length === 0 ? (
          <div className="p-12 text-center">
            <Activity className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 mb-1">No activity recorded.</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are no audit logs matching your current filter criteria.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-3">Date / Time</th>
                  <th className="py-3 px-3">Actor</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3">Action</th>
                  <th className="py-3 px-3">Entity</th>
                  <th className="py-3 px-3">Reference</th>
                  <th className="py-3 px-3 text-right">Result / State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((entry) => {
                  const isExpanded = Boolean(expandedRows[entry.id]);
                  const dateStr = new Date(entry.created_at).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  });

                  return (
                    <React.Fragment key={entry.id}>
                      <tr className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {dateStr}
                        </td>
                        <td className="py-3 px-3 font-medium text-slate-900 max-w-[160px] truncate" title={entry.actor_id}>
                          {entry.actor_id}
                        </td>
                        <td className="py-3 px-3 text-slate-600 capitalize">
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 font-medium border border-slate-200">
                            {inferRole(entry.actor_id)}
                          </span>
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getActionBadge(entry.action)}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {getEntityBadge(entry.entity_type)}
                        </td>
                        <td className="py-3 px-3 font-mono text-[11px] text-slate-700 max-w-[180px] truncate" title={entry.entity_id}>
                          {entry.new_state?.payment_reference ||
                            entry.new_state?.application_number ||
                            entry.entity_id}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => toggleRowExpand(entry.id)}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#0E1E3B] hover:underline"
                          >
                            <span>{isExpanded ? 'Hide' : 'Details'}</span>
                            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable State Diff */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-b border-slate-200">
                          <td colSpan={7} className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 font-sans">
                                  Previous State
                                </span>
                                <pre className="text-[11px] text-slate-700 overflow-x-auto whitespace-pre-wrap bg-slate-50 p-2 rounded max-h-48">
                                  {entry.previous_state ? JSON.stringify(entry.previous_state, null, 2) : 'null'}
                                </pre>
                              </div>

                              <div className="bg-white p-3 rounded border border-slate-200 shadow-xs">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 font-sans">
                                  New State / Metadata
                                </span>
                                <pre className="text-[11px] text-slate-700 overflow-x-auto whitespace-pre-wrap bg-slate-50 p-2 rounded max-h-48">
                                  {entry.new_state ? JSON.stringify(entry.new_state, null, 2) : 'null'}
                                </pre>
                              </div>
                            </div>
                            <div className="mt-2 text-[10px] text-slate-400 font-mono">
                              Log ID: {entry.id}
                              {entry.ip_address && ` • IP: ${entry.ip_address}`}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-200 bg-white flex items-center justify-between">
            <span className="text-xs text-slate-600">
              Showing page <strong className="font-mono text-slate-900">{page}</strong> of{' '}
              <strong className="font-mono text-slate-900">{totalPages}</strong>
            </span>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1 || isPending}
                onClick={() => handlePageChange(page - 1)}
                className="text-xs flex items-center gap-1"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages || isPending}
                onClick={() => handlePageChange(page + 1)}
                className="text-xs flex items-center gap-1"
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
