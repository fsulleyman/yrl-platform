'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LogOut, Loader2 } from 'lucide-react';
import { logoutMemberAction } from './actions';

export function MemberSignOutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleSignOut() {
    setIsLoggingOut(true);
    try {
      await logoutMemberAction();
      router.push('/member/login');
      router.refresh();
    } catch (err) {
      console.error('Failed to sign out:', err);
      setIsLoggingOut(false);
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleSignOut}
      disabled={isLoggingOut}
      className="border-white/30 text-white hover:bg-white/10"
    >
      {isLoggingOut ? (
        <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
      ) : (
        <LogOut className="w-3.5 h-3.5 mr-1" />
      )}
      Sign Out
    </Button>
  );
}
