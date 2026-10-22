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

      setSuccessMsg(`Document "${data.document.name}" uploaded successfully to private storage.`);
      setTimeout(() => {
        router.push(`/documents/${data.document.id}`);
      }, 1500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading upload console...
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center space-x-3">
          <Link
            href="/documents"
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <UploadCloud className="w-6 h-6 text-teal-400" />
              <span>Secure Document Ingestion</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Files are sanitized, magic-byte validated, and deposited into an isolated private bucket.
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-950/60 border border-rose-700/80 rounded-xl flex items-center space-x-3 text-rose-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-700/80 rounded-xl flex items-center space-x-3 text-emerald-300 text-sm">
            <FileCheck2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
          {/* File Picker Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Select Document File (Max 15MB)
            </label>
            <div className="border-2 border-dashed border-slate-700 hover:border-teal-500/60 rounded-xl p-6 text-center bg-slate-950/40 transition-colors">
              <input
                type="file"
                id="file-upload-input"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                accept=".pdf,.docx,.xlsx,.pptx,.txt,.png,.jpg,.jpeg"
                required
                className="hidden"
              />
              <label htmlFor="file-upload-input" className="cursor-pointer block space-y-2">
                <UploadCloud className="w-8 h-8 text-teal-400 mx-auto" />
                <div className="text-sm font-semibold text-white">
                  {file ? file.name : 'Click to choose file or drag and drop'}
                </div>
                <p className="text-xs text-slate-400">
                  Permitted: PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG (verified via binary magic bytes)
                </p>
                {file && (
                  <p className="text-xs text-teal-300 font-mono">
                    Size: {(file.size / 1024).toFixed(1)} KB
                  </p>
                )}
              </label>
            </div>
          </div>

          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="category-select">
              Classification Category
            </label>
            <select
              id="category-select"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-teal-500"
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5" htmlFor="description-input">
              Document Description / Confidentiality Context
            </label>
            <textarea
              id="description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="e.g., Confidential Q3 internal audit report for executive review..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 text-sm focus:outline-hidden focus:border-teal-500"
            />
          </div>

          <div className="p-3.5 bg-slate-950/60 border border-slate-800 rounded-lg flex items-start space-x-2.5 text-xs text-slate-400">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              Server-side file validation automatically scans header signatures. Executables disguised as PDFs or
              files containing path traversal sequences (<code className="text-slate-300">../</code>) will be rejected.
            </span>
          </div>

          <button
            type="submit"
            disabled={uploading || !file}
            className="w-full py-3 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
          >
            {uploading ? (
              <span>Validating and Storing Document...</span>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                <span>Upload to Secure Vault</span>
              </>
            )}
          </button>
        </form>
      </div>
    </DashboardLayout>
  );
}
