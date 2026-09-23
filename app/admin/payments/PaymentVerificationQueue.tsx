'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Search,
  Filter,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  FileCheck2,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GHANA_REGIONS } from '@/lib/validations/nomination';
import { getAdminPaymentsListAction } from '@/lib/actions/payment';
import type { AdminSession } from '@/lib/auth/types';
import type {
  PaymentQueueItem,
  PaginatedPaymentsResult,
  PaymentListFilters,
} from '@/lib/payment/types';

interface PaymentVerificationQueueProps {
  session: AdminSession;
  initialData: PaginatedPaymentsResult;
}

export function PaymentVerificationQueue({
  session,
  initialData,
}: PaymentVerificationQueueProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [payments, setPayments] = useState<PaymentQueueItem[]>(initialData.payments || []);
  const [page, setPage] = useState<number>(initialData.page || 1);
  const [pageSize] = useState<number>(initialData.pageSize || 20);
  const [totalCount, setTotalCount] = useState<number>(initialData.totalCount || 0);
  const [totalPages, setTotalPages] = useState<number>(initialData.totalPages || 1);

  const [totalAmountReceived, setTotalAmountReceived] = useState<number>(
    initialData.totalAmountReceived ?? 0
  );
  const [verifiedPaymentsCount, setVerifiedPaymentsCount] = useState<number>(
    initialData.verifiedPaymentsCount ?? 0
  );
  const [currency, setCurrency] = useState<string>(initialData.currency || 'GHS');

  const [statusFilter, setStatusFilter] = useState<string>('pending_verification');
  const [regionFilter, setRegionFilter] = useState<string>(
    session.role === 'regional_coordinator' ? session.assignedRegion || '' : ''
  );
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const isRegional = session.role === 'regional_coordinator';

  // Derived counts from current queue view
  const pendingCount = payments.filter((p) => p.status === 'pending_verification').length;
  const verifiedCount = payments.filter((p) => p.status === 'successful').length;
  const rejectedCount = payments.filter((p) => p.status === 'rejected').length;

  const fetchPayments = async (overrideFilters: Partial<PaymentListFilters> = {}) => {
    setError(null);
    startTransition(async () => {
      const filters: PaymentListFilters = {
        page,
        pageSize,
        status: (statusFilter === 'all' ? undefined : (statusFilter as any)) || undefined,
        region: isRegional ? session.assignedRegion || undefined : (regionFilter || undefined),
        search: searchQuery.trim() || undefined,
        ...overrideFilters,
      };

      const res = await getAdminPaymentsListAction(filters);
      if (res.success && res.data) {
        setPayments(res.data.payments);
        setTotalCount(res.data.totalCount);
        setPage(res.data.page);
        setTotalPages(res.data.totalPages);
        if (typeof res.data.totalAmountReceived === 'number') {
          setTotalAmountReceived(res.data.totalAmountReceived);
        }
        if (typeof res.data.verifiedPaymentsCount === 'number') {
          setVerifiedPaymentsCount(res.data.verifiedPaymentsCount);
        }
        if (res.data.currency) {
          setCurrency(res.data.currency);
        }
      } else {
        setError(res.error || 'Failed to load payments.');
      }
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchPayments({ page: 1 });
  };

  const handleStatusChange = (newStatus: string) => {
    setStatusFilter(newStatus);
    fetchPayments({ status: newStatus === 'all' ? undefined : (newStatus as any), page: 1 });
  };

  const handleRegionChange = (newRegion: string) => {
    setRegionFilter(newRegion);
    fetchPayments({ region: newRegion || undefined, page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    fetchPayments({ page: newPage });
  };

  const handleResetFilters = () => {
    setStatusFilter('all');
    if (!isRegional) setRegionFilter('');
    setSearchQuery('');
    fetchPayments({
      status: undefined,
      region: isRegional ? session.assignedRegion || undefined : undefined,
      search: undefined,
      page: 1,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_verification':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3 h-3 text-amber-700" />
            Pending Verification
          </span>
        );
      case 'successful':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
            Verified / Successful
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            <XCircle className="w-3 h-3 text-rose-700" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Pending Payment
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#0E1E3B] transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[4px] bg-[#0E1E3B] text-white flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#0E1E3B]">
                Payment Verification Queue
              </h1>
              <p className="text-xs text-slate-500">
                Review applicant Mobile Money transactions, verify payment receipts, and activate memberships.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchPayments()}
            disabled={isPending}
            className="text-xs flex items-center gap-1.5 min-h-[38px]"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>
      </div>

      {/* Financial Summary & Filtered Queue Sections */}
      <div className="space-y-4">
        {/* FINANCIAL SUMMARY: Total Amount Received */}
        <div className="bg-[#0E1E3B] text-white p-5 rounded-[4px] border border-[#0E1E3B] shadow-sm">
          <span className="text-xs uppercase tracking-wider text-[#FCD116] font-bold block">
            Total Amount Received
          </span>
          <div className="text-3xl sm:text-4xl font-extrabold text-white mt-1.5 tracking-tight font-mono">
            GH₵{totalAmountReceived.toFixed(2)}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {verifiedPaymentsCount} verified {verifiedPaymentsCount === 1 ? 'payment' : 'payments'}
          </p>
        </div>

        {/* FILTERED QUEUE STATISTICS: Current Table View */}
        <div>
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
            <span>Filtered Queue Statistics (Current View)</span>
            {statusFilter !== 'all' && (
              <span className="text-[11px] text-amber-700 font-medium normal-case">
                Filter: <strong className="capitalize">{statusFilter.replace('_', ' ')}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-[4px] border border-amber-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                  Pending Verification
                </span>
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-amber-900 mt-2">
                {pendingCount}
              </div>
              <p className="text-[11px] text-amber-700 mt-1">Requires review &amp; verification</p>
            </div>

            <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Total In Scope
                </span>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#0E1E3B] mt-2">
                {totalCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Total submissions</p>
            </div>

            <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Verified in View
                </span>
                <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Shield className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#0E1E3B] mt-2">
                {verifiedCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Approved transactions</p>
            </div>

            <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  Rejected in View
                </span>
                <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center">
                  <XCircle className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl sm:text-3xl font-bold text-[#0E1E3B] mt-2">
                {rejectedCount}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">Declined receipts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by payment ref or txn reference..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-[4px] border border-slate-300 focus:outline-none focus:border-[#0E1E3B] focus:ring-1 focus:ring-[#0E1E3B]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="px-3 py-2 text-xs sm:text-sm rounded-[4px] border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-[#0E1E3B]"
            >
              <option value="pending_verification">Status: Pending Verification</option>
              <option value="successful">Status: Verified / Successful</option>
              <option value="rejected">Status: Rejected</option>
              <option value="pending">Status: Pending Payment</option>
              <option value="all">Status: All Statuses</option>
            </select>

            {!isRegional && (
              <select
                value={regionFilter}
                onChange={(e) => handleRegionChange(e.target.value)}
                className="px-3 py-2 text-xs sm:text-sm rounded-[4px] border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-[#0E1E3B]"
              >
                <option value="">All Regions</option>
                {GHANA_REGIONS.map((r: string) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            )}

            <Button
              type="submit"
              size="sm"
              disabled={isPending}
              className="text-xs bg-[#0E1E3B] hover:bg-[#1a335f] text-white min-h-[38px]"
            >
              Filter
            </Button>

            <button
              type="button"
              onClick={handleResetFilters}
              className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
            >
              Reset
            </button>
          </div>
        </form>

        {isRegional && (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
            <Shield className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              Showing submissions restricted to your assigned region: <strong>{session.assignedRegion}</strong>
            </span>
          </div>
        )}
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-[4px] flex items-center gap-2 text-xs text-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Queue Table */}
      <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Payment Ref</th>
                <th className="py-3 px-3 sm:px-4">Application</th>
                <th className="py-3 px-3 sm:px-4">Applicant</th>
                <th className="py-3 px-3 sm:px-4">Region</th>
                <th className="py-3 px-3 sm:px-4">Amount</th>
                <th className="py-3 px-3 sm:px-4">Txn Reference</th>
                <th className="py-3 px-3 sm:px-4">Submitted Date</th>
                <th className="py-3 px-3 sm:px-4">Status</th>
                <th className="py-3 px-3 sm:px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No payment submissions match the selected filters.
                  </td>
                </tr>
              ) : (
                payments.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 sm:px-4 font-mono font-semibold text-[#0E1E3B] whitespace-nowrap">
                      {item.payment_reference}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-slate-600 whitespace-nowrap">
                      {item.application_number}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      <div className="font-semibold text-slate-900">{item.full_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{item.phone_number}</div>
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                        {item.region}
                      </span>
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-semibold text-slate-900 whitespace-nowrap">
                      GH₵ {item.amount.toFixed(2)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 font-mono text-slate-800 text-[11px]">
                      {item.transaction_reference ? (
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                          {item.transaction_reference}
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {getStatusBadge(item.status)}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-right whitespace-nowrap">
                      <Link
                        href={`/admin/payments/${item.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[4px] text-xs font-semibold bg-[#0E1E3B] hover:bg-[#1a335f] text-white transition-colors"
                      >
                        Review
                        <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <div>
              Showing {Math.min((page - 1) * pageSize + 1, totalCount)} to{' '}
              {Math.min(page * pageSize, totalCount)} of{' '}
              <strong>{totalCount}</strong> items
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page <= 1 || isPending}
                className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                aria-label="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 py-1 font-mono text-slate-700">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page >= totalPages || isPending}
                className="p-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100"
                aria-label="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
