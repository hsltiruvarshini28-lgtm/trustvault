'use client';

import React from 'react';
import { LogOut, X } from 'lucide-react';
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
    >
      <div className="relative w-full max-w-md p-6 bg-white border border-[#DDE2DF] rounded-md shadow-lg text-[#343A40]">
        <button
          onClick={onClose}
          disabled={loading}
          aria-label="Close dialog"
          className="absolute top-4 right-4 text-[#737B82] hover:text-[#343A40] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center space-x-3 mb-4">
          <div className="p-2 bg-[#FAF0F0] border border-[#EFCACA] rounded text-[#B64B4B]">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 id="signout-modal-title" className="text-base font-semibold text-[#263C50]">
              Sign Out of Session
            </h3>
            <p className="text-xs text-[#737B82]">TrustVault Session Termination</p>
          </div>
        </div>

        {user && (
          <div className="p-3 my-4 bg-[#F7F7F4] border border-[#DDE2DF] rounded flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-[#343A40]">{user.full_name}</p>
              <p className="text-[11px] text-[#737B82]">{user.email}</p>
            </div>
            <Badge variant={user.role} />
          </div>
        )}

        <p className="text-xs text-[#737B82] mb-6 leading-relaxed">
          Your current authenticated zero-trust session will be invalidated on the server. You will need to re-authenticate with credentials to access confidential documents or the audit log.
        </p>

        <div className="flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-medium text-[#343A40] bg-white hover:bg-[#F7F7F4] border border-[#DDE2DF] rounded transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#B64B4B] hover:bg-[#9E3E3E] rounded transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            {loading ? (
              <span>Signing out...</span>
            ) : (
              <>
                <LogOut className="w-3.5 h-3.5" />
                <span>Confirm Sign Out</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
