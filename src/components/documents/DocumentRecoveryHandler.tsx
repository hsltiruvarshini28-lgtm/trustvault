'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, RefreshCw } from 'lucide-react';

export function DocumentRecoveryHandler({ documentId }: { documentId: string }) {
  const [recovering, setRecovering] = useState(true);
  const [recovered, setRecovered] = useState(false);

  useEffect(() => {
    let isMounted = true;
    try {
      const stored = localStorage.getItem('trustvault_local_docs');
      if (stored) {
        const list = JSON.parse(stored);
        const match = Array.isArray(list) ? list.find((d: any) => d && d.id === documentId) : null;
        if (match) {
          fetch('/api/documents/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ document: match }),
          })
            .then((res) => res.json())
            .then((data) => {
              if (isMounted) {
                if (data.success) {
                  setRecovered(true);
                  window.location.reload();
                } else {
                  setRecovering(false);
                }
              }
            })
            .catch(() => {
              if (isMounted) setRecovering(false);
            });
          return;
        }
      }
    } catch {
      // LocalStorage access exception
    }
    setRecovering(false);

    return () => {
      isMounted = false;
    };
  }, [documentId]);

  if (recovering || recovered) {
    return (
      <div className="p-8 text-center bg-white border border-[#D0D9DF] rounded shadow-xs max-w-md mx-auto space-y-3">
        <RefreshCw className="w-8 h-8 text-[#527C78] mx-auto animate-spin" />
        <h2 className="text-base font-bold text-[#263C50]">Loading Document...</h2>
        <p className="text-xs text-[#677582]">
          Synchronizing verified cryptographic document metadata.
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 text-center bg-white border border-[#D0D9DF] rounded shadow-xs max-w-md mx-auto space-y-3">
      <ShieldAlert className="w-8 h-8 text-[#B64B4B] mx-auto" />
      <h2 className="text-base font-bold text-[#263C50]">Document Not Found</h2>
      <p className="text-xs text-[#677582]">
        The requested document record does not exist or access has been restricted.
      </p>
      <Link
        href="/documents"
        className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#F4F7F9] hover:bg-[#E9EFF3] border border-[#D0D9DF] text-[#263C50] rounded text-xs font-medium"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Documents</span>
      </Link>
    </div>
  );
}
