import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { canAccessDocument } from '@/lib/auth/authorization';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import {
  FileText,
  Download,
  KeyRound,
  Trash2,
  ArrowLeft,
  Lock,
  Calendar,
  User,
  ShieldAlert,
  HardDrive,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?message=session_required');
  }

  const { id } = await params;
  const doc = dataStore.getDocumentById(id);

  if (!doc) {
    return (
      <DashboardLayout user={user}>
        <div className="p-12 text-center bg-slate-900 border border-slate-800 rounded-xl max-w-lg mx-auto space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Document Not Found</h2>
          <p className="text-sm text-slate-400">
            The requested document does not exist, or access has been restricted.
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Documents</span>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const activeGrant = dataStore.getActivePermission(doc.id, user.id);
  const decision = canAccessDocument(user, doc, 'view_metadata', activeGrant);

  if (!decision.allowed) {
    return (
      <DashboardLayout user={user}>
        <div className="p-12 text-center bg-slate-900 border border-rose-800/60 rounded-xl max-w-lg mx-auto space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h2 className="text-xl font-bold text-white">Access Denied (403 Forbidden)</h2>
          <p className="text-sm text-slate-300">{decision.reason}</p>
          <p className="text-xs text-slate-500">
            This unauthorized access attempt has been recorded in the tamper-evident audit trail.
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center space-x-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Repository</span>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const isOwner = doc.owner_id === user.id;
  const accessLevel = isOwner
    ? 'OWNER'
    : activeGrant
    ? activeGrant.permission
    : user.role === 'ADMIN'
    ? 'METADATA_ONLY'
    : 'NONE';

  const canDownload = isOwner || accessLevel === 'READ' || accessLevel === 'EDIT';

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Navigation & Actions Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/documents"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-extrabold text-white tracking-tight truncate max-w-md">
                  {doc.name}
                </h1>
                <Badge variant={accessLevel} />
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Classification: {doc.category}</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 w-full sm:w-auto">
            {/* Manage Sharing (Owner Only) */}
            {isOwner && (
              <Link
                href={`/documents/${doc.id}/access`}
                className="px-3.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-sm font-semibold flex items-center space-x-2 transition-colors"
              >
                <KeyRound className="w-4 h-4" />
                <span>Manage Access</span>
              </Link>
            )}

            {/* Server-Mediated Download Button */}
            {canDownload ? (
              <a
                href={`/api/documents/${doc.id}/download`}
                className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold shadow-md flex items-center space-x-2 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download File</span>
              </a>
            ) : (
              <div className="px-3 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-xs text-slate-400 flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-slate-500" />
                <span>Content Restricted (Metadata Only)</span>
              </div>
            )}
          </div>
        </div>

        {/* Metadata Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            {/* Description & Overview */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Document Overview
              </h2>
              <p className="text-sm text-slate-200 leading-relaxed">
                {doc.description || 'No description provided for this document.'}
              </p>
            </div>

            {/* File Preview Container */}
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Server-Mediated Preview
                </h2>
                <span className="text-xs text-slate-500">Fresh authorization verified on load</span>
              </div>

              {canDownload ? (
                <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950 p-6 text-center space-y-3">
                  <FileText className="w-12 h-12 text-teal-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-200">{doc.name}</p>
                  <p className="text-xs text-slate-400">
                    MIME Type: <code className="text-slate-300 font-mono">{doc.mime_type}</code>
                  </p>
                  <div className="pt-2">
                    <a
                      href={`/api/documents/${doc.id}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-teal-300 transition-colors"
                    >
                      <span>Open Inline Viewer in New Tab</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-slate-950 border border-slate-800/80 rounded-lg space-y-2">
                  <Lock className="w-8 h-8 text-slate-600 mx-auto" />
                  <p className="text-sm font-medium text-slate-400">
                    File contents are confidential.
                  </p>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Administrator role grants metadata visibility only. Content inspection requires explicit
                    READ or EDIT permission granted by the document owner.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Security & Provenance Sidebar */}
          <div className="space-y-6">
            <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                Security Provenance
              </h2>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Owner</span>
                  <div className="flex items-center space-x-2 mt-0.5 text-slate-200">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>{doc.owner ? doc.owner.full_name : 'Unknown'}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">Isolated Storage Path</span>
                  <div className="flex items-center space-x-2 mt-0.5 text-slate-400 font-mono text-xs truncate">
                    <HardDrive className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="truncate">{doc.storage_path}</span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">File Size</span>
                  <p className="text-slate-200 font-mono text-xs mt-0.5">
                    {(doc.file_size / 1024).toFixed(1)} KB ({doc.file_size} bytes)
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">Uploaded Date</span>
                  <div className="flex items-center space-x-2 mt-0.5 text-slate-300 text-xs">
                    <Calendar className="w-4 h-4 text-slate-500" />
                    <span>{new Date(doc.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
