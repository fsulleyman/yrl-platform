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
  AlertTriangle,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { GHANA_REGIONS } from '@/lib/validations/nomination';
import { getAdminPaymentsListAction } from '@/lib/actions/payment';
import { exportAdminData } from '@/app/admin/actions';
import type { AdminSession } from '@/lib/auth/types';
import type {
  PaymentQueueItem,
  PaginatedPaymentsResult,
  PaymentListFilters,
  PaymentReconciliationSummary,
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
  const [reconciliation, setReconciliation] = useState<PaymentReconciliationSummary | null>(
    initialData.reconciliation || null
  );

  // Granular Filter States
  const [statusFilter, setStatusFilter] = useState<string>('pending_verification');
  const [regionFilter, setRegionFilter] = useState<string>(
    session.role === 'regional_coordinator' ? session.assignedRegion || '' : ''
  );
  const [hasReceiptFilter, setHasReceiptFilter] = useState<'all' | 'with_receipt' | 'without_receipt'>('all');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>('all');
  const [dateRangeFilter, setDateRangeFilter] = useState<string>('all');
  const [startDateFilter, setStartDateFilter] = useState<string>('');
  const [endDateFilter, setEndDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const isRegional = session.role === 'regional_coordinator';

  // Derived counts from current queue view
  const pendingCount = payments.filter((p) => p.status === 'pending_verification').length;
  const verifiedCount = payments.filter((p) => p.status === 'successful').length;
  const rejectedCount = payments.filter((p) => p.status === 'rejected').length;
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportPaymentsCsv = async () => {
    setIsExporting(true);
    setError(null);
    try {
      const res = await exportAdminData({
        dataset: 'payments',
        region: isRegional ? session.assignedRegion || undefined : regionFilter || undefined,
      });

      if (!res.success || !res.data) {
        setError(res.error || 'Failed to export payment records.');
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
      setError(err?.message || 'Unexpected error exporting payments CSV.');
    } finally {
      setIsExporting(false);
    }
  };

  const fetchPayments = async (overrideFilters: Partial<PaymentListFilters> = {}) => {
    setError(null);
    startTransition(async () => {
      const activeHasReceipt = overrideFilters.hasReceipt !== undefined ? overrideFilters.hasReceipt : hasReceiptFilter;
      const activeMethod = overrideFilters.paymentMethod !== undefined ? overrideFilters.paymentMethod : paymentMethodFilter;
      const activeDateRange = overrideFilters.dateRange !== undefined ? overrideFilters.dateRange : dateRangeFilter;
      const activeStartDate = overrideFilters.startDate !== undefined ? overrideFilters.startDate : startDateFilter;
      const activeEndDate = overrideFilters.endDate !== undefined ? overrideFilters.endDate : endDateFilter;
      const activeStatus = overrideFilters.status !== undefined ? overrideFilters.status : statusFilter;
      const activeRegion = overrideFilters.region !== undefined ? overrideFilters.region : regionFilter;
      const activeSearch = overrideFilters.search !== undefined ? overrideFilters.search : searchQuery;
      const activePage = overrideFilters.page !== undefined ? overrideFilters.page : page;

      const filters: PaymentListFilters = {
        page: activePage,
        pageSize,
        status: (activeStatus === 'all' ? undefined : (activeStatus as any)) || undefined,
        region: isRegional ? session.assignedRegion || undefined : (activeRegion || undefined),
        search: activeSearch.trim() || undefined,
        hasReceipt: activeHasReceipt === 'all' ? undefined : activeHasReceipt,
        paymentMethod: activeMethod === 'all' ? undefined : activeMethod,
        dateRange: activeDateRange === 'all' ? undefined : activeDateRange,
        startDate: activeStartDate || undefined,
        endDate: activeEndDate || undefined,
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
        if (res.data.reconciliation) {
          setReconciliation(res.data.reconciliation);
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
    setHasReceiptFilter('all');
    setPaymentMethodFilter('all');
    setDateRangeFilter('all');
    setStartDateFilter('');
    setEndDateFilter('');
    fetchPayments({
      status: undefined,
      region: isRegional ? session.assignedRegion || undefined : undefined,
      search: undefined,
      hasReceipt: undefined,
      paymentMethod: undefined,
      dateRange: undefined,
      startDate: undefined,
      endDate: undefined,
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

      {/* Authoritative Operational Financial Reconciliation Summary */}
      <div className="bg-gradient-to-r from-[#0E1E3B] to-[#15345E] text-white p-5 sm:p-6 rounded-[4px] border border-[#0E1E3B] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs uppercase tracking-wider text-[#FCD116] font-bold">
                Authoritative Membership Fee Reconciliation
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-white/10 text-white border border-white/20">
                {isRegional ? `Jurisdiction: ${session.assignedRegion} Region` : 'Jurisdiction: National Secretariat'}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Exact server-aggregated membership fee standing across authorized jurisdiction.
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-[11px] text-slate-300 block">Total Membership Fee Records</span>
            <span className="text-lg font-bold font-mono text-[#FCD116]">
              {reconciliation ? reconciliation.totalRecords : totalCount}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded border border-white/10">
            <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-medium">
              Verified Revenue
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-emerald-400 mt-1">
              GH₵{(reconciliation ? reconciliation.totalVerifiedAmount : totalAmountReceived).toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-300 mt-0.5 block">
              {reconciliation ? reconciliation.verifiedCount : verifiedPaymentsCount} verified
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded border border-white/10">
            <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-medium">
              Pending Review
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-amber-300 mt-1">
              GH₵{(reconciliation ? reconciliation.totalPendingAmount : (pendingCount * 5)).toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-300 mt-0.5 block">
              {reconciliation ? reconciliation.pendingVerificationCount : pendingCount} in review
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded border border-white/10">
            <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-medium">
              Rejected Payments
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-rose-300 mt-1">
              GH₵{(reconciliation ? reconciliation.totalRejectedAmount : (rejectedCount * 5)).toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-300 mt-0.5 block">
              {reconciliation ? reconciliation.rejectedCount : rejectedCount} declined
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs p-3.5 rounded border border-white/10">
            <span className="text-[11px] text-slate-300 uppercase tracking-wider block font-medium">
              Receipt Evidence Rate
            </span>
            <div className="text-xl sm:text-2xl font-bold font-mono text-white mt-1">
              {reconciliation
                ? `${reconciliation.receiptsWithEvidenceCount} / ${reconciliation.totalRecords}`
                : `${payments.filter((p) => p.has_receipt).length} / ${payments.length}`}
            </div>
            <span className="text-[11px] text-slate-300 mt-0.5 block">
              {reconciliation && reconciliation.totalRecords > 0
                ? `${Math.round((reconciliation.receiptsWithEvidenceCount / reconciliation.totalRecords) * 100)}% with attachment`
                : 'With attachment'}
            </span>
          </div>
        </div>
      </div>

      {/* FILTERED QUEUE STATISTICS: Current Table View */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">
          <span>Current Queue View Metrics</span>
          {statusFilter !== 'all' && (
            <span className="text-[11px] text-amber-700 font-medium normal-case">
              Status Filter: <strong className="capitalize">{statusFilter.replace('_', ' ')}</strong>
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
                Total In Current Scope
              </span>
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-[#0E1E3B] mt-2">
              {totalCount}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Submissions matching filters</p>
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-[4px] border border-slate-200 shadow-xs space-y-3">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by payment ref, applicant name, or txn reference..."
                className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-[4px] border border-slate-300 focus:outline-none focus:border-[#0E1E3B] focus:ring-1 focus:ring-[#0E1E3B]"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="submit"
                size="sm"
                disabled={isPending}
                className="text-xs bg-[#0E1E3B] hover:bg-[#1a335f] text-white min-h-[38px]"
              >
                Search / Filter
              </Button>

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs text-slate-500 hover:text-slate-800 underline px-2 py-1"
              >
                Reset All
              </button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isExporting}
                onClick={handleExportPaymentsCsv}
                className="text-xs min-h-[38px] flex items-center gap-1.5 border-slate-300 hover:bg-slate-50"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
              </Button>
            </div>
          </div>

          {/* Granular Dropdown Filters */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 pt-2 border-t border-slate-100">
            {/* Status Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Payment Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-[#0E1E3B]"
              >
                <option value="pending_verification">Pending Verification</option>
                <option value="successful">Verified / Successful</option>
                <option value="rejected">Rejected</option>
                <option value="pending">Pending Payment</option>
                <option value="all">All Statuses</option>
              </select>
            </div>

            {/* Receipt Presence Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Receipt Evidence
              </label>
              <select
                value={hasReceiptFilter}
                onChange={(e) => {
                  const val = e.target.value as 'all' | 'with_receipt' | 'without_receipt';
                  setHasReceiptFilter(val);
                  fetchPayments({ hasReceipt: val === 'all' ? undefined : val, page: 1 });
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-[#0E1E3B]"
              >
                <option value="all">All Submissions</option>
                <option value="with_receipt">Receipt Attached</option>
                <option value="without_receipt">No Receipt / Missing</option>
              </select>
            </div>

            {/* Payment Method Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Payment Method
              </label>
              <select
                value={paymentMethodFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaymentMethodFilter(val);
                  fetchPayments({ paymentMethod: val === 'all' ? undefined : val, page: 1 });
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-[#0E1E3B]"
              >
                <option value="all">All Methods</option>
                <option value="manual_mobile_money">Manual Mobile Money</option>
                <option value="paystack">Paystack Gateway</option>
              </select>
            </div>

            {/* Date Range Filter */}
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Date Range
              </label>
              <select
                value={dateRangeFilter}
                onChange={(e) => {
                  const val = e.target.value;
                  setDateRangeFilter(val);
                  fetchPayments({ dateRange: val === 'all' ? undefined : val, page: 1 });
                }}
                className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-[#0E1E3B]"
              >
                <option value="all">All Time</option>
                <option value="today">Today</option>
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="custom">Custom Date Range</option>
              </select>
            </div>

            {/* Region Filter (National Admin only) */}
            {!isRegional ? (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Region Scope
                </label>
                <select
                  value={regionFilter}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-300 bg-white text-slate-700 focus:outline-none focus:border-[#0E1E3B]"
                >
                  <option value="">All 16 Regions</option>
                  {GHANA_REGIONS.map((r: string) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                  Region Scope
                </label>
                <div className="px-2.5 py-1.5 text-xs rounded-[4px] border border-slate-200 bg-slate-100 text-slate-600 truncate font-medium">
                  {session.assignedRegion}
                </div>
              </div>
            )}
          </div>

          {/* Custom Date Pickers (visible if custom selected) */}
          {dateRangeFilter === 'custom' && (
            <div className="flex flex-wrap items-center gap-3 pt-2 bg-slate-50 p-2.5 rounded border border-slate-200 text-xs">
              <span className="text-slate-600 font-medium">Custom Date Range:</span>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">From:</span>
                <input
                  type="date"
                  value={startDateFilter}
                  onChange={(e) => {
                    setStartDateFilter(e.target.value);
                    fetchPayments({ startDate: e.target.value, page: 1 });
                  }}
                  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">To:</span>
                <input
                  type="date"
                  value={endDateFilter}
                  onChange={(e) => {
                    setEndDateFilter(e.target.value);
                    fetchPayments({ endDate: e.target.value, page: 1 });
                  }}
                  className="px-2 py-1 border border-slate-300 rounded text-xs bg-white"
                />
              </div>
            </div>
          )}
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

      {/* Queue Table Container */}
      <div className="bg-white rounded-[4px] border border-slate-200 shadow-xs overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                <th className="py-3 px-3 sm:px-4">Payment Ref</th>
                <th className="py-3 px-3 sm:px-4">Application</th>
                <th className="py-3 px-3 sm:px-4">Applicant</th>
                <th className="py-3 px-3 sm:px-4">Region</th>
                <th className="py-3 px-3 sm:px-4">Amount</th>
                <th className="py-3 px-3 sm:px-4">Txn Reference</th>
                <th className="py-3 px-3 sm:px-4">Receipt</th>
                <th className="py-3 px-3 sm:px-4">Submitted Date</th>
                <th className="py-3 px-3 sm:px-4">Status</th>
                <th className="py-3 px-3 sm:px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-slate-400">
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
                    <td className="py-3 px-3 sm:px-4 whitespace-nowrap">
                      {item.has_receipt ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <FileCheck2 className="w-3 h-3 text-emerald-600" />
                          Attached {item.receipt_file_size ? `(${(item.receipt_file_size / 1024).toFixed(0)}KB)` : ''}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                          No Receipt
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 sm:px-4 text-slate-500 whitespace-nowrap text-[11px]">
                      {item.submitted_at ? new Date(item.submitted_at).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="py-3 px-3 sm:px-4">
                      {getStatusBadge(item.status)}
                      {item.status === 'rejected' && item.rejection_reason && (
                        <div
                          className="text-[10px] text-rose-600 truncate max-w-[160px] mt-0.5"
                          title={item.rejection_reason}
                        >
                          {item.rejection_reason}
                        </div>
                      )}
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

        {/* Mobile Card View (Single-hand review friendly on mobile screens) */}
        <div className="block md:hidden divide-y divide-slate-100">
          {payments.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No payment submissions match the selected filters.
            </div>
          ) : (
            payments.map((item) => (
              <div key={item.id} className="p-3.5 sm:p-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-xs text-[#0E1E3B] truncate">
                      {item.payment_reference}
                    </div>
                    <div className="text-[11px] font-mono text-slate-500">
                      App #{item.application_number}
                    </div>
                  </div>
                  <div className="shrink-0">{getStatusBadge(item.status)}</div>
                </div>

                <div className="flex items-center justify-between text-xs">
                  <div>
                    <div className="font-bold text-slate-900">{item.full_name}</div>
                    <div className="text-[11px] text-slate-500 font-mono">{item.phone_number}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900">GH₵ {item.amount.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">{item.region} Region</div>
                  </div>
                </div>

                {item.transaction_reference && (
                  <div className="text-[11px] font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    <span className="text-slate-400 mr-1">Txn:</span>
                    {item.transaction_reference}
                  </div>
                )}

                {/* Evidence and Method info */}
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                  {item.has_receipt ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <FileCheck2 className="w-3 h-3 text-emerald-600" />
                      Receipt Attached {item.receipt_file_size ? `(${(item.receipt_file_size / 1024).toFixed(0)}KB)` : ''}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded font-medium bg-slate-100 text-slate-500 border border-slate-200">
                      No Receipt Attached
                    </span>
                  )}
                  {item.payment_method && (
                    <span className="text-slate-400 capitalize text-[10px]">
                      {item.payment_method.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>

                {/* Rejection Note if Rejected */}
                {item.status === 'rejected' && item.rejection_reason && (
                  <div className="p-2 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[11px] space-y-0.5">
                    <span className="font-bold uppercase tracking-wider text-[10px] block text-rose-900">
                      Rejection Reason:
                    </span>
                    <p className="line-clamp-2">{item.rejection_reason}</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400">
                    {item.submitted_at
                      ? new Date(item.submitted_at).toLocaleDateString('en-GB', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })
                      : 'N/A'}
                  </span>
                  <Link
                    href={`/admin/payments/${item.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[4px] text-xs font-semibold bg-[#0E1E3B] hover:bg-[#1a335f] text-white min-h-[40px] transition-colors"
                  >
                    Review Dossier
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))
          )}
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
