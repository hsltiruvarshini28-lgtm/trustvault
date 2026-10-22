'use client';

import React from 'react';
import { LogOut, AlertTriangle, X } from 'lucide-react';
import { UserProfile } from '@/types';
import { Badge } from '@/components/ui/Badge';

interface SignOutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  user: UserProfile | null;
  loading: boolean;
}

export function SignOutModal({ isOpen, onClose, onConfirm, user, loading }: SignOutModalProps) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signout-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs"
    >
      <div className="relative w-full max-w-md p-6 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl text-slate-100">
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400">
            <LogOut className="w-6 h-6" />
          </div>
          <div>
            <h3 id="signout-modal-title" className="text-lg font-bold text-white">
              Confirm Sign Out
            </h3>
            <p className="text-xs text-slate-400">TrustVault Security Session Management</p>
          </div>
        </div>

        {user && (
          <div className="p-3 my-4 bg-slate-800/80 border border-slate-700/60 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-200">{user.full_name}</p>
              <p className="text-xs text-slate-400">{user.email}</p>
            </div>
            <Badge variant={user.role} />
          </div>
        )}

        <p className="text-sm text-slate-300 mb-6 leading-relaxed">
          Are you sure you want to sign out of TrustVault? Your current authenticated session will be invalidated,
          and you will need to sign in again to access confidential documents or audit logs.
        </p>

        <div className="flex items-center justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-4 py-2 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors flex items-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Signing out...</span>
            ) : (
              <>
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
