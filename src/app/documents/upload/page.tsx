'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { UploadCloud, FileCheck2, AlertTriangle, ArrowLeft, ShieldAlert } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { UserProfile } from '@/types';

export default function UploadDocumentPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Finance');
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (!data.authenticated) {
          router.push('/login?message=session_required');
        } else {
          setUser(data.user);
        }
      })
      .catch(() => router.push('/login?message=session_required'));
  }, [router]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setErrorMsg('Please select a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('description', description);
      formData.append('category', category);

      const res = await fetch('/api/documents', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      // Persist in localStorage as secondary client safeguard across serverless containers
      try {
        const stored = localStorage.getItem('trustvault_local_docs');
        const list = stored ? JSON.parse(stored) : [];
        const filtered = Array.isArray(list) ? list.filter((d: any) => d && d.id !== data.document.id) : [];
        filtered.unshift(data.document);
        localStorage.setItem('trustvault_local_docs', JSON.stringify(filtered.slice(0, 25)));
      } catch {
        // Ignore localStorage error
      }

      setSuccessMsg(`Document "${data.document.name}" uploaded successfully to private storage.`);
      setTimeout(() => {
        window.location.href = `/documents/${data.document.id}`;
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-[#EDF2F4] text-[#263C50] flex items-center justify-center text-xs">
        Loading upload console...
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto space-y-5">
        <div className="flex items-center space-x-3">
          <Link
            href="/documents"
            className="p-1.5 rounded bg-white hover:bg-[#F4F7F9] border border-[#D0D9DF] text-[#263C50] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-[#263C50] tracking-tight flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#527C78]" />
              <span>Secure Document Ingestion</span>
            </h1>
            <p className="text-xs text-[#677582] mt-0.5">
              Files are sanitized, magic-byte validated, and deposited into an isolated private bucket.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-[#FBEBEB] border border-[#ECC7C7] rounded flex items-center space-x-2 text-[#B64B4B] text-xs">
            <AlertTriangle className="w-4 h-4 text-[#B64B4B] shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-[#EAF3EE] border border-[#BCD5C7] rounded flex items-center space-x-2 text-[#46785C] text-xs">
            <FileCheck2 className="w-4 h-4 text-[#46785C] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="p-6 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-4">
          {/* File Picker Zone */}
          <div>
            <label className="block text-[11px] font-bold text-[#263C50] uppercase mb-1.5">
              Select Document File (Max 15MB)
            </label>
            <div className="border border-dashed border-[#D0D9DF] hover:border-[#527C78] rounded p-6 text-center bg-[#F6F9FA] hover:bg-[#EAF0F4] transition-colors">
              <input
                type="file"
                id="file-upload-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.docx,.xlsx,.pptx,.txt,.png,.jpg,.jpeg"
                required
                className="hidden"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer block space-y-1.5">
                <UploadCloud className="w-8 h-8 text-[#527C78] mx-auto" />
                <div className="text-xs font-bold text-[#263C50]">
                  {file ? file.name : 'Click to select file or drag and drop'}
                </div>
                <p className="text-[11px] text-[#677582]">
                  Permitted: PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG (verified via binary signatures)
                </p>
                {file && (
                  <p className="text-[11px] text-[#527C78] font-mono font-medium">
                    Size: {(file.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </label>
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-[11px] font-bold text-[#263C50] uppercase mb-1" htmlFor="category-select">
              Classification Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-white border border-[#D0D9DF] text-xs text-[#263C50] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
            >
              <option value="Finance">Finance</option>
              <option value="Engineering">Engineering</option>
              <option value="Executive">Executive</option>
              <option value="Legal">Legal</option>
              <option value="General">General</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[11px] font-bold text-[#263C50] uppercase mb-1" htmlFor="description-input">
              Document Description / Confidentiality Context
            </label>
            <textarea
              id="description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Enter document description or confidentiality context..."
              className="w-full px-3 py-1.5 rounded bg-white border border-[#D0D9DF] text-xs text-[#263C50] placeholder-[#677582] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
            />
          </div>

          <div className="p-3 bg-[#F6F9FA] border border-[#D0D9DF] rounded flex items-start space-x-2 text-[11px] text-[#677582]">
            <ShieldAlert className="w-3.5 h-3.5 text-[#A87532] shrink-0 mt-0.5" />
            <span>
              Server-side file validation inspects magic bytes. Files with spoofed extensions or directory traversal paths (<code className="text-[#263C50] font-semibold">../</code>) will be rejected.
            </span>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-2 px-3 rounded bg-[#527C78] hover:bg-[#416863] text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <span>Validating and Storing Document...</span>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload to Secure Vault</span>
              </>
            )}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
