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
  ArrowLeft,
  Lock,
  Calendar,
  User,
  ShieldAlert,
  HardDrive,
  ExternalLink,
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
      </DashboardLayout>
    );
  }

  const activeGrant = dataStore.getActivePermission(doc.id, user.id);
  const decision = canAccessDocument(user, doc, 'view_metadata', activeGrant);

  if (!decision.allowed) {
    return (
      <DashboardLayout user={user}>
        <div className="p-8 text-center bg-white border border-[#ECC7C7] rounded shadow-xs max-w-md mx-auto space-y-3">
          <ShieldAlert className="w-8 h-8 text-[#B64B4B] mx-auto" />
          <h2 className="text-base font-bold text-[#B64B4B]">Access Denied (403 Forbidden)</h2>
          <p className="text-xs text-[#343A40]">{decision.reason}</p>
          <p className="text-[11px] text-[#677582]">
            This unauthorized access attempt has been recorded in the tamper-evident audit trail.
          </p>
          <Link
            href="/documents"
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-[#F4F7F9] hover:bg-[#E9EFF3] border border-[#D0D9DF] text-[#263C50] rounded text-xs font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
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
      <div className="space-y-5">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <Link
              href="/documents"
              className="p-1.5 rounded bg-white hover:bg-[#F4F7F9] border border-[#D0D9DF] text-[#263C50] transition-colors"
              title="Back to Documents"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-bold text-[#263C50] tracking-tight truncate max-w-md">
                  {doc.name}
                </h1>
                <Badge variant={accessLevel} />
              </div>
              <p className="text-[11px] text-[#677582] mt-0.5">Classification: {doc.category}</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto">
            {/* Manage Sharing (Owner Only) */}
            {isOwner && (
              <Link
                href={`/documents/${doc.id}/access`}
                className="px-3.5 py-1.5 rounded bg-[#FAF3E8] hover:bg-[#F5E8D3] text-[#A87532] border border-[#E8D3B2] text-xs font-semibold flex items-center space-x-1.5 transition-colors"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Manage Permissions</span>
              </Link>
            )}

            {/* Server-Mediated Download Button */}
            {canDownload ? (
              <a
                href={`/api/documents/${doc.id}/download`}
                className="px-3.5 py-1.5 rounded bg-[#527C78] hover:bg-[#416863] text-white text-xs font-medium flex items-center space-x-1.5 transition-colors shadow-xs cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </a>
            ) : (
              <div className="px-3 py-1.5 rounded bg-[#F4F7F9] border border-[#D0D9DF] text-xs text-[#677582] flex items-center space-x-1.5">
                <Lock className="w-3.5 h-3.5 text-[#677582]" />
                <span>Confidential (Metadata Only)</span>
              </div>
            )}
          </div>
        </div>

        {/* Content Details */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="md:col-span-2 space-y-5">
            {/* Description & Overview */}
            <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-2">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#263C50]">
                Document Overview
              </h2>
              <p className="text-xs text-[#343A40] leading-relaxed">
                {doc.description || 'No description provided for this document.'}
              </p>
            </div>

            {/* File Preview Container */}
            <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#D0D9DF]">
                <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#263C50]">
                  Server-Mediated File Inspection
                </h2>
                <span className="text-[10px] text-[#677582]">Real-time authorization verified</span>
              </div>

              {canDownload ? (
                <div className="border border-[#D0D9DF] rounded bg-[#F6F9FA] p-6 text-center space-y-2">
                  <FileText className="w-8 h-8 text-[#527C78] mx-auto" />
                  <p className="text-xs font-bold text-[#263C50]">{doc.name}</p>
                  <p className="text-[11px] text-[#677582]">
                    MIME Type: <code className="text-[#263C50] font-mono font-medium">{doc.mime_type}</code>
                  </p>
                  <div className="pt-2">
                    <a
                      href={`/api/documents/${doc.id}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded bg-white hover:bg-[#EAF0F4] border border-[#D0D9DF] text-xs font-semibold text-[#263C50] transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5 text-[#527C78]" />
                      <span>Open Inline Viewer in New Tab</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center bg-[#F6F9FA] border border-[#D0D9DF] rounded space-y-1.5">
                  <Lock className="w-6 h-6 text-[#677582] mx-auto" />
                  <p className="text-xs font-bold text-[#263C50]">
                    File contents are confidential
                  </p>
                  <p className="text-[11px] text-[#677582] max-w-sm mx-auto leading-relaxed">
                    Administrator role grants metadata observability only. Content inspection requires explicit
                    READ or EDIT permission granted by the document owner.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Security & Provenance Sidebar */}
          <div className="space-y-5">
            <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3.5">
              <h2 className="text-[11px] font-bold uppercase tracking-wider text-[#263C50] pb-2 border-b border-[#D0D9DF]">
                Security Provenance
              </h2>

              <div className="space-y-2.5 text-xs">
                <div className="pb-2.5 border-b border-[#D0D9DF]">
                  <span className="text-[10px] text-[#677582] uppercase font-semibold block">Owner</span>
                  <div className="flex items-center space-x-1.5 mt-0.5 text-[#263C50]">
                    <User className="w-3.5 h-3.5 text-[#527C78]" />
                    <span className="font-semibold">{doc.owner ? doc.owner.full_name : 'Unknown'}</span>
                  </div>
                </div>

                <div className="pb-2.5 border-b border-[#D0D9DF]">
                  <span className="text-[10px] text-[#677582] uppercase font-semibold block">Storage Bucket Path</span>
                  <div className="flex items-center space-x-1.5 mt-0.5 text-[#677582] font-mono text-[11px] truncate">
                    <HardDrive className="w-3.5 h-3.5 text-[#527C78] shrink-0" />
                    <span className="truncate">{doc.storage_path}</span>
                  </div>
                </div>

                <div className="pb-2.5 border-b border-[#D0D9DF]">
                  <span className="text-[10px] text-[#677582] uppercase font-semibold block">File Size</span>
                  <p className="text-[#263C50] font-mono text-xs font-medium mt-0.5">
                    {(doc.file_size / 1024).toFixed(1)} KB ({doc.file_size} bytes)
                  </p>
                </div>

                <div>
                  <span className="text-[10px] text-[#677582] uppercase font-semibold block">Created Date</span>
                  <div className="flex items-center space-x-1.5 mt-0.5 text-[#343A40] text-xs">
                    <Calendar className="w-3.5 h-3.5 text-[#527C78]" />
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
