'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Shield, LogOut, User, Menu } from 'lucide-react';
import { UserProfile } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { SignOutModal } from '@/components/layout/SignOutModal';

interface HeaderProps {
  user: UserProfile | null;
  onToggleSidebar?: () => void;
}

export function Header({ user, onToggleSidebar }: HeaderProps) {
  const router = useRouter();
  const [isSignOutModalOpen, setIsSignOutModalOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSignOutConfirm = async () => {
    try {
      setSigningOut(true);
      setErrorMsg(null);

      const res = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Sign out failed');
      }

      setIsSignOutModalOpen(false);
      router.push('/login?message=signed_out');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred while signing out.');
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="h-13 bg-[#1A2836] border-b border-[#14202C] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30 select-none">
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-1.5 text-[#8EA2B3] hover:text-white rounded focus:outline-hidden"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link href="/dashboard" className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded bg-[#527C78] flex items-center justify-center text-white">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="font-semibold text-sm tracking-tight text-white">
                TrustVault
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-[#253748] text-[#CBD5E1] border border-[#374E63] rounded">
                v1.0
              </span>
              <span className="hidden lg:inline text-xs text-[#8EA2B3] pl-2 border-l border-[#2B3F52]">
                Document Security & Audit
              </span>
            </div>
          </Link>
        </div>

        {/* User Identity & Sign Out */}
        {user ? (
          <div className="flex items-center space-x-3 sm:space-x-3.5">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-semibold text-white leading-tight">{user.full_name}</span>
              <span className="text-[11px] text-[#8EA2B3] leading-tight">{user.email}</span>
            </div>

            <Badge variant={user.role} />

            <div className="h-4 w-px bg-[#2B3F52] hidden sm:block" />

            <button
              id="header-sign-out-btn"
              onClick={() => setIsSignOutModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-2.5 py-1 text-xs font-medium text-[#CBD5E1] hover:text-[#B64B4B] bg-[#223344] hover:bg-[#2C1D24] border border-[#344A5E] hover:border-[#8E3B3B] rounded transition-colors cursor-pointer"
              title="Sign Out of TrustVault"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#527C78] hover:bg-[#416863] rounded transition-colors"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </header>

      {errorMsg && (
        <div className="bg-[#FAF0F0] border-b border-[#EFCACA] px-4 py-2 text-xs text-[#B64B4B] text-center font-medium">
          {errorMsg}
        </div>
      )}

      <SignOutModal
        isOpen={isSignOutModalOpen}
        onClose={() => setIsSignOutModalOpen(false)}
        onConfirm={handleSignOutConfirm}
        user={user}
        loading={signingOut}
      />
    </>
  );
}
