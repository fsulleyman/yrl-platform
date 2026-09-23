import React from 'react';
import { redirect } from 'next/navigation';
import { getMemberSession } from '@/lib/auth/server';
import { MemberProfileForm } from './MemberProfileForm';

export const metadata = {
  title: 'Edit Civic Profile | YRL Member Portal',
  description: 'View and update your permitted YRL membership profile information.',
};

export const dynamic = 'force-dynamic';

export default async function MemberProfilePage() {
  const session = await getMemberSession();

  if (!session || !session.member) {
    redirect('/member/login');
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0B1F3A]">
            Member Profile & Civic Details
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            View your authoritative membership details and update permitted contact and civic preferences.
          </p>
        </div>

        <MemberProfileForm member={session.member} />
      </div>
    </div>
  );
}
