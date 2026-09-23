import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getAdminAuthResult } from '@/lib/auth/server';
import { getAdminActivityLogs } from '@/lib/audit/service';
import { AdminActivityLog } from './AdminActivityLog';
import { logoutAdmin } from '@/app/admin/actions';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, LogOut, ArrowLeft, FileCheck2, LayoutDashboard } from 'lucide-react';
import type { PaginatedAuditLogsResult } from '@/lib/audit/types';

export const metadata = {
  title: 'Audit & Activity Log | YRL Admin',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminActivityPage() {
  const authResult = await getAdminAuthResult();

  // 1. Unauthenticated state: redirect immediately to dedicated login page
  if (authResult.status === 'unauthenticated') {
    redirect('/admin/login');
  }

  // 2. Authenticated user without approved role or deactivated
  if (authResult.status === 'unauthorized_role') {
    const isDeactivated = authResult.detectedRole === 'deactivated';

    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-[4px] border border-red-200 shadow-md p-5 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-[#0E1E3B] mb-2">
            {isDeactivated ? 'Account Deactivated' : 'Access Restricted (403 Forbidden)'}
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            You are signed in as <strong className="font-mono">{authResult.user.email}</strong>, but{' '}
            {isDeactivated
              ? 'your administrative account has been deactivated by the Super Administrator.'
              : 'your account does not have an assigned administrative role.'}
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[2px] text-xs text-amber-900 mb-6 text-left">
            <strong>Security Notice:</strong> The Activity Log is restricted strictly to Super Administrators.
          </div>
          <div className="flex flex-col gap-2">
            <Link href="/admin">
              <Button variant="outline" size="sm" fullWidth className="text-xs">
                ← Return to Admin
              </Button>
            </Link>
            <form action={logoutAdmin}>
              <Button variant="outline" size="sm" type="submit" fullWidth className="text-xs flex items-center justify-center gap-2">
                <LogOut className="w-4 h-4" /> Sign Out
              </Button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  const session = authResult.session;

  // 3. HARD SECURITY GATE: Non-super-admins (regional_coordinator, national_reviewer) MUST be denied
  if (session.role !== 'super_admin') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-3 sm:p-4">
        <div className="max-w-md w-full bg-white rounded-[4px] border border-red-200 shadow-md p-5 sm:p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-700 flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-[#0E1E3B] mb-2">
            Access Denied (403 Forbidden)
          </h1>
          <p className="text-xs text-slate-600 leading-relaxed mb-4">
            The Activity Log contains confidential system-wide audit records and is strictly restricted to the{' '}
            <strong className="text-slate-900">Super Administrator</strong>.
          </p>
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-[2px] text-xs text-rose-900 mb-6 text-left">
            <div>
              <strong>Current Signed-in Role:</strong>{' '}
              <span className="font-mono capitalize font-bold">{session.role.replace(/_/g, ' ')}</span>
            </div>
            {session.assignedRegion && (
              <div className="mt-1">
                <strong>Assigned Region:</strong> {session.assignedRegion}
              </div>
            )}
            <p className="text-[11px] text-rose-700 mt-2">
              Regional Coordinators and National Reviewers are not authorized to inspect security audit logs.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <Link href="/admin" className="w-full">
              <Button variant="outline" size="sm" fullWidth className="text-xs flex items-center justify-center gap-1.5">
                <LayoutDashboard className="w-3.5 h-3.5" /> Return to Dashboard
              </Button>
            </Link>
            <Link href="/admin/payments" className="w-full">
              <Button variant="outline" size="sm" fullWidth className="text-xs flex items-center justify-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" /> Payments
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // 4. Super Admin: Load initial activity data scoped to super_admin
  const initialResult = await getAdminActivityLogs(session, {
    page: 1,
    pageSize: 20,
  });

  const initialData: PaginatedAuditLogsResult = initialResult.success && initialResult.data
    ? initialResult.data
    : {
        logs: [],
        totalCount: 0,
        page: 1,
        pageSize: 20,
        totalPages: 1,
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
                  Activity Audit Trail
                </span>
                <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded font-semibold bg-purple-100 text-purple-800 border border-purple-300">
                  Super Administrator
                </span>
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
            <Link href="/admin/payments">
              <Button
                variant="outline"
                size="sm"
                className="text-xs flex items-center gap-1.5 min-h-[38px]"
              >
                <FileCheck2 className="w-3.5 h-3.5 text-[#0E1E3B]" />
                <span className="hidden sm:inline">Payments</span>
              </Button>
            </Link>
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
        <AdminActivityLog session={session} initialData={initialData} />
      </main>
    </div>
  );
}
