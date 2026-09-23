import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminAuthResult } from '@/lib/auth/server';
import { getAdminPaymentDetail } from '@/lib/payment/service';
import { PaymentReviewDetail } from './PaymentReviewDetail';
import { logoutAdmin } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, LogOut, ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Payment Review Detail | YRL Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ paymentId: string }>;
}

export default async function AdminPaymentDetailPage({ params }: PageProps) {
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
  const { paymentId } = await params;

  // 3. Load payment review detail scoped to session and region
  const detailResult = await getAdminPaymentDetail(session, paymentId);

  if (!detailResult.success || !detailResult.data) {
    return (
      <div className="min-h-screen bg-slate-100 p-6 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-[4px] border border-slate-200 shadow-sm p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#0E1E3B]">Unable to Load Payment Record</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            {detailResult.error || 'The requested payment record could not be found or you do not have permission to access it.'}
          </p>
          <div className="pt-2">
            <Link
              href="/admin/payments"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded text-xs font-semibold bg-[#0E1E3B] text-white hover:bg-[#1a335f]"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Verification Queue
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-6">
        <PaymentReviewDetail session={session} initialData={detailResult.data} />
      </main>
    </div>
  );
}
