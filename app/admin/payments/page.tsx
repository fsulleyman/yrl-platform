import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminAuthResult } from '@/lib/auth/server';
import { getAdminPaymentsList } from '@/lib/payment/service';
import { PaymentVerificationQueue } from './PaymentVerificationQueue';
import Link from 'next/link';
import { logoutAdmin } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, LogOut, ArrowLeft, Activity } from 'lucide-react';
import type { PaginatedPaymentsResult } from '@/lib/payment/types';

export const metadata = {
  title: 'Payment Verification Queue | YRL Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminPaymentsPage() {
  const authResult = await getAdminAuthResult();

  // 1. Unauthenticated state: redirect to dedicated login page
  if (authResult.status === 'unauthenticated') {
    redirect('/admin/login');
  }

  // 2. Authenticated user without approved administrative role or deactivated
  if (authResult.status === 'unauthorized_role') {
    const isDeactivated = authResult.detectedRole === 'deactivated';

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-[4px] border border-red-200 shadow-md p-5 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-[#0E1E3B] mb-2">
            {isDeactivated ? 'Account Deactivated' : 'Access Restricted'}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            You are signed in as <strong className="font-mono">{authResult.user.email}</strong>, but{' '}
            {isDeactivated
              ? 'your administrative account has been deactivated by the Super Administrator.'
              : 'your account does not have an assigned administrative role.'}
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[2px] text-xs text-amber-900 mb-6 text-left">
            <strong>Secretariat Notice:</strong> Administrative access is restricted to verified vetting officers.
          </div>
          <form action={logoutAdmin}>
            <Button variant="outline" size="sm" type="submit" className="mx-auto flex items-center gap-2">
              <LogOut className="w-4 h-4" /> Sign Out
            </Button>
          </form>
        </div>
      </div>
    );
  }

  const session = authResult.session;

  // 3. Load initial payments list scoped to session
  const initialResult = await getAdminPaymentsList(session, {
    page: 1,
    pageSize: 20,
    status: 'pending_verification',
  });

  const initialData: PaginatedPaymentsResult = initialResult.success && initialResult.data
    ? initialResult.data
    : {
        payments: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
        totalAmountReceived: 0,
        verifiedPaymentsCount: 0,
        currency: 'GHS',
      };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans pb-16">
      {/* Top Identity Header */}
      <header className="bg-white border-b border-slate-200 px-3 sm:px-8 py-3 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-[4px] bg-[#0E1E3B] text-white flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
              YRL
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                <span className="text-xs sm:text-base font-bold text-[#0E1E3B] leading-tight">
                  Interim Review Portal
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-semibold bg-slate-100 text-slate-700 border border-slate-300 capitalize">
                  {session.role.replace('_', ' ')}
                </span>
                {session.assignedRegion && (
                  <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-semibold bg-[#006B3F]/10 text-[#006B3F] border border-[#006B3F]/30">
                    {session.assignedRegion} Region
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-xs text-slate-500 font-mono mt-0.5 truncate">
                {session.user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/admin">
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex items-center gap-1.5 min-h-[38px]"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            {session.role === 'super_admin' && (
              <Link href="/admin/activity">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs flex items-center gap-1.5 min-h-[38px]"
                >
                  <Activity className="w-3.5 h-3.5 text-purple-600" />
                  <span className="hidden sm:inline">Activity Log</span>
                </Button>
              </Link>
            )}
            <form action={logoutAdmin}>
              <Button
                variant="outline"
                size="sm"
                type="submit"
                className="text-xs flex items-center gap-1.5 hover:bg-red-50 hover:text-red-700 hover:border-red-300 min-h-[38px]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log Out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6">
        <PaymentVerificationQueue session={session} initialData={initialData} />
      </main>
    </div>
  );
}
