'use client';

import React, { useState } from 'react';
import { Trash2, AlertTriangle, RefreshCw, X } from 'lucide-react';

interface DeleteDocumentButtonProps {
  docId: string;
  docName: string;
  compact?: boolean;
  redirectTo?: string;
}

export function DeleteDocumentButton({
  docId,
  docName,
  compact = false,
  redirectTo,
}: DeleteDocumentButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDelete = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);

      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete document');
      }

      // Remove from client localStorage cache
      try {
        const stored = localStorage.getItem('trustvault_local_docs');
        if (stored) {
          const list = JSON.parse(stored);
          const filtered = Array.isArray(list) ? list.filter((d: any) => d && d.id !== docId) : [];
          localStorage.setItem('trustvault_local_docs', JSON.stringify(filtered));
        }
      } catch {
        // Ignore localStorage error
      }

      setIsOpen(false);

      if (redirectTo) {
        window.location.href = redirectTo;
      } else {
        window.location.reload();
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Deletion failed');
      setLoading(false);
    }
  };

  return (
    <>
      {compact ? (
        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setIsOpen(true);
          }}
          className="p-1.5 rounded bg-[#FBEBEB] hover:bg-[#F8DADA] text-[#B64B4B] border border-[#ECC7C7] transition-colors cursor-pointer"
          title={`Delete "${docName}"`}
          aria-label={`Delete "${docName}"`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setIsOpen(true);
          }}
          className="px-3.5 py-1.5 rounded bg-[#FBEBEB] hover:bg-[#F8DADA] text-[#B64B4B] border border-[#ECC7C7] text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs"
          title={`Delete "${docName}"`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Document</span>
        </button>
      )}

      {/* Confirmation Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="bg-white rounded-lg border border-[#D0D9DF] shadow-xl max-w-md w-full p-6 space-y-4 relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={() => !loading && setIsOpen(false)}
              className="absolute top-4 right-4 text-[#677582] hover:text-[#263C50] p-1 rounded transition-colors"
              disabled={loading}
              aria-label="Close dialog"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Header Icon & Title */}
            <div className="flex items-start space-x-3">
              <div className="p-2.5 rounded-full bg-[#FBEBEB] border border-[#ECC7C7] text-[#B64B4B] shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h3 id="delete-dialog-title" className="text-sm font-bold text-[#263C50]">
                  Delete Document Confirmation
                </h3>
                <p className="text-xs text-[#677582] leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <strong className="text-[#263C50] break-all">{docName}</strong>?
                </p>
              </div>
            </div>

            {/* Warning Details */}
            <div className="p-3 bg-[#FAF8F5] border border-[#E8DFC8] rounded space-y-1.5 text-xs text-[#634B20]">
              <div className="flex items-center space-x-1.5 font-semibold text-[#8C5D1E]">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Zero-Trust Security Notice</span>
              </div>
              <p className="text-[11px] leading-relaxed text-[#677582]">
                This action will immediately revoke all active permissions, remove the document from visibility, and record a cryptographically chained entry in the tamper-evident audit log.
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 bg-[#FBEBEB] border border-[#ECC7C7] rounded text-xs text-[#B64B4B] flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-2.5 pt-2 border-t border-[#D0D9DF]">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                disabled={loading}
                className="px-3.5 py-1.5 rounded bg-[#F4F7F9] hover:bg-[#E9EFF3] border border-[#D0D9DF] text-xs font-medium text-[#263C50] transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={loading}
                className="px-3.5 py-1.5 rounded bg-[#B64B4B] hover:bg-[#9E3E3E] text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
