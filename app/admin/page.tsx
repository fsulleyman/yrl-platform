import React from 'react';
import { redirect } from 'next/navigation';
import { getAdminAuthResult } from '@/lib/auth/server';
import { getAdminScopedData } from './data';
import { AdminDashboard } from './AdminDashboard';
import { logoutAdmin } from './actions';
import { Button } from '@/components/ui/Button';
import { ShieldAlert, LogOut } from 'lucide-react';

export const metadata = {
  title: 'Interim Review Portal | YRL',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
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
              : 'your account does not have an assigned administrative role (Super Admin, National Reviewer, or Regional Coordinator).'}
          </p>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-[2px] text-xs text-amber-900 mb-6 text-left">
            <strong>Secretariat Notice:</strong>{' '}
            {isDeactivated
              ? 'Please contact the Super Administrator if you require your access reactivated.'
              : 'Administrative access is restricted to verified vetting officers. Please contact the Super Admin to configure your role permissions.'}
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

  // 3. Authorized administrative session: fetch role-scoped data
  const scopedData = await getAdminScopedData(authResult.session);

  return (
    <AdminDashboard
      session={authResult.session}
      initialNominations={scopedData.nominations}
      initialMembers={scopedData.members}
      initialContactMessages={scopedData.contactMessages}
      initialNewsArticles={scopedData.newsArticles}
      initialAdminUsers={scopedData.adminUsers || []}
    />
  );
}
