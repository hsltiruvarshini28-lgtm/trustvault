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
      // Redirect to login page with signed_out query param
      router.push('/login?message=signed_out');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred while signing out.');
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="h-16 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          {onToggleSidebar && (
            <button
              onClick={onToggleSidebar}
              className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg focus:outline-hidden"
              aria-label="Toggle Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <Link href="/dashboard" className="flex items-center space-x-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 group-hover:bg-teal-500/20 transition-colors">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-base sm:text-lg tracking-tight text-white flex items-center gap-1.5">
                TrustVault
                <span className="text-[10px] font-mono tracking-widest px-1.5 py-0.2 bg-teal-950 text-teal-400 border border-teal-800/60 rounded">
                  v1.0
                </span>
              </span>
              <p className="text-[10px] text-slate-400 hidden sm:block">Zero-Trust Document Vault & Audit</p>
            </div>
          </Link>
        </div>

        {/* User Identity & Secure Sign Out Button */}
        {user ? (
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-sm font-semibold text-slate-200">{user.full_name}</span>
              <span className="text-xs text-slate-400">{user.email}</span>
            </div>

            <Badge variant={user.role} />

            <div className="h-6 w-px bg-slate-800 hidden sm:block" />

            <button
              id="header-sign-out-btn"
              onClick={() => setIsSignOutModalOpen(true)}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs sm:text-sm font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-700/60 rounded-lg transition-colors cursor-pointer"
              title="Sign Out of TrustVault"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg transition-colors"
          >
            <User className="w-4 h-4" />
            <span>Sign In</span>
          </Link>
        )}
      </header>

      {errorMsg && (
        <div className="bg-rose-900/60 border-b border-rose-700/80 px-4 py-2 text-xs text-rose-200 text-center">
          {errorMsg}
        </div>
      )}

      {/* Confirmation Dialog */}
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
