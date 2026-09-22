import React from 'react';
import { getAdminAuthResult } from '@/lib/auth/server';
import { AdminLoginForm } from '../AdminLoginForm';

export const metadata = {
  title: 'Admin Sign In | YRL',
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = 'force-dynamic';

export default async function AdminLoginPage() {
  const authResult = await getAdminAuthResult();

  const userEmail =
    authResult.status === 'authenticated'
      ? authResult.session.user.email
      : authResult.status === 'unauthorized_role'
      ? authResult.user.email
      : null;

  const role =
    authResult.status === 'authenticated'
      ? authResult.session.role
      : authResult.status === 'unauthorized_role'
      ? authResult.detectedRole
      : null;

  return (
    <AdminLoginForm
      initialAuthStatus={authResult.status}
      initialUserEmail={userEmail}
      initialRole={role}
    />
  );
}
