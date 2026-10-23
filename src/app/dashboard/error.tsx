'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, RefreshCw, LogIn } from 'lucide-react';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function DashboardError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Dashboard Route Error:', error);
  }, [error]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4 select-none">
      <div className="bg-white border border-[#D0D9DF] rounded-lg p-6 sm:p-8 shadow-md max-w-md w-full space-y-5 text-center">
        <div className="w-12 h-12 rounded bg-[#FAF0F0] border border-[#EFCACA] text-[#B64B4B] flex items-center justify-center mx-auto shadow-xs">
          <ShieldAlert className="w-6 h-6 text-[#B64B4B]" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-base font-bold text-[#263C50] tracking-tight">
            Dashboard Security Retrieval Failed
          </h2>
          <p className="text-xs text-[#677582]">
            Unable to load the security overview and audit chain for your account. This may occur if your session expired or needs re-authentication.
          </p>
        </div>

        {error.message && (
          <div className="p-3 bg-[#FAF0F0] border border-[#EFCACA] rounded text-left text-xs text-[#B64B4B] font-mono break-words">
            <span className="font-semibold block mb-0.5 text-[10px] uppercase tracking-wider text-[#933D3D]">
              Diagnostic Information
            </span>
            <span>{error.message}</span>
            {error.digest && (
              <span className="block text-[10px] text-[#A85858] mt-1">
                Digest: {error.digest}
              </span>
            )}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
          <button
            onClick={() => reset()}
            className="flex-1 py-2 px-3 rounded bg-[#527C78] hover:bg-[#416863] text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reload Overview</span>
          </button>

          <Link
            href="/login"
            className="flex-1 py-2 px-3 rounded bg-white hover:bg-[#F4F7F9] border border-[#D0D9DF] text-[#263C50] font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In Again</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
