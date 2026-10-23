import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Files,
  KeyRound,
  ShieldCheck,
  UploadCloud,
  FileText,
  ArrowRight,
  Shield,
  Clock,
  Users,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login?message=session_required');
  }

  // Fetch real data
  const visibleDocs = dataStore.getVisibleDocuments(user);
  const auditLogs = dataStore.getAuditLogs(user).slice(0, 6);
  const integrity = dataStore.verifyIntegrity();

  const ownedDocs = visibleDocs.filter((d) => d.owner_id === user.id);
  const sharedDocs = visibleDocs.filter((d) => d.owner_id !== user.id);

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Header / Session Bar */}
        <div className="bg-white border border-[#D0D9DF] rounded p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <h1 className="text-lg font-bold text-[#263C50] tracking-tight">
                Vault Security Overview
              </h1>
              <Badge variant={user.role} />
            </div>
            <p className="text-xs text-[#677582]">
              Authenticated as <span className="font-semibold text-[#263C50]">{user.full_name}</span> ({user.email}) • Session Active
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            {user.role !== 'VIEWER' && (
              <Link
                href="/documents/upload"
                className="px-3.5 py-1.5 rounded bg-[#527C78] hover:bg-[#416863] text-white font-medium text-xs transition-colors flex items-center space-x-1.5 shadow-xs"
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Upload Document</span>
              </Link>
            )}

            <Link
              href="/documents"
              className="px-3.5 py-1.5 rounded bg-white hover:bg-[#F4F7F9] border border-[#D0D9DF] text-[#263C50] font-medium text-xs transition-colors flex items-center space-x-1"
            >
              <span>Document Repository</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#677582]" />
            </Link>
          </div>
        </div>

        {/* Structured Enterprise Metrics Strip */}
        <div className="bg-white border border-[#D0D9DF] rounded shadow-xs overflow-hidden">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#D0D9DF]">
            <div className="p-5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#677582] uppercase tracking-wider">
                <span>Accessible Documents</span>
                <Files className="w-3.5 h-3.5 text-[#527C78]" />
              </div>
              <div className="text-2xl font-bold text-[#263C50]">{visibleDocs.length}</div>
              <p className="text-[11px] text-[#677582]">
                {ownedDocs.length} owned, {sharedDocs.length} shared
              </p>
            </div>

            <div className="p-5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#677582] uppercase tracking-wider">
                <span>Access Permissions</span>
                <KeyRound className="w-3.5 h-3.5 text-[#A87532]" />
              </div>
              <div className="text-2xl font-bold text-[#263C50]">
                {user.role === 'OWNER' ? 'Full Control' : sharedDocs.length}
              </div>
              <p className="text-[11px] text-[#677582]">
                {user.role === 'OWNER' ? 'Owner of confidential files' : 'Active grants from owners'}
              </p>
            </div>

            <div className="p-5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#677582] uppercase tracking-wider">
                <span>Audit Chain Integrity</span>
                <ShieldCheck className="w-3.5 h-3.5 text-[#46785C]" />
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-2xl font-bold text-[#263C50]">
                  {integrity.valid ? 'INTACT' : 'TAMPERED'}
                </span>
                <Badge variant={integrity.valid ? 'INTACT' : 'TAMPERED'} />
              </div>
              <p className="text-[11px] text-[#677582] font-mono">
                {integrity.totalVerified} verified blocks
              </p>
            </div>

            <div className="p-5 space-y-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-[#677582] uppercase tracking-wider">
                <span>Security Events</span>
                <Clock className="w-3.5 h-3.5 text-[#527C78]" />
              </div>
              <div className="text-2xl font-bold text-[#263C50]">{auditLogs.length}</div>
              <p className="text-[11px] text-[#677582]">Recorded in current window</p>
            </div>
          </div>
        </div>

        {/* Recent Activity & Security Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Audit Log Table */}
          <div className="lg:col-span-2 bg-white border border-[#D0D9DF] rounded p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#D0D9DF]">
              <div>
                <h2 className="text-sm font-bold text-[#263C50]">Recent Security Audit Events</h2>
                <p className="text-[11px] text-[#677582]">Cryptographic append-only activity trail</p>
              </div>
              <Link
                href="/audit"
                className="text-xs font-semibold text-[#527C78] hover:text-[#416863] flex items-center space-x-1"
              >
                <span>View Full Trail</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-[#D0D9DF]">
              {auditLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-[#677582]">
                  No audit records logged in the current session window.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="py-2.5 flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-[#263C50]">{log.action}</span>
                        <Badge variant={log.result} />
                      </div>
                      <div className="text-[11px] text-[#677582] flex items-center space-x-2">
                        <span>Actor: {log.actor ? log.actor.full_name : 'System/Unauth'}</span>
                        <span>•</span>
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                        {log.document && (
                          <>
                            <span>•</span>
                            <span className="text-[#263C50] font-mono truncate max-w-[180px]">
                              {log.document.name}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="hidden sm:block text-right">
                      <span className="font-mono text-[10px] text-[#677582]">
                        Hash: {log.event_hash.substring(0, 10)}...
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Security Controls */}
          <div className="space-y-4">
            <div className="bg-white border border-[#D0D9DF] rounded p-5 shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-[#263C50]">Security Controls</h2>
              <p className="text-[11px] text-[#677582]">Verification and governance shortcuts</p>

              <div className="space-y-2 pt-1">
                <Link
                  href="/security"
                  className="block p-3 rounded bg-[#F4F7F9] hover:bg-[#E9EFF3] border border-[#D0D9DF] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#263C50]">
                    <span className="flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#527C78]" />
                      Security Center
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#677582]" />
                  </div>
                  <p className="text-[11px] text-[#677582] mt-0.5">
                    Live SHA-256 chain verification & denied requests telemetry.
                  </p>
                </Link>

                <Link
                  href="/documents"
                  className="block p-3 rounded bg-[#F4F7F9] hover:bg-[#E9EFF3] border border-[#D0D9DF] transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-[#263C50]">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-[#527C78]" />
                      Document Permissions
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#677582]" />
                  </div>
                  <p className="text-[11px] text-[#677582] mt-0.5">
                    Grant READ/EDIT permissions or immediately revoke access.
                  </p>
                </Link>

                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin"
                    className="block p-3 rounded bg-[#F4F7F9] hover:bg-[#E9EFF3] border border-[#D0D9DF] transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold text-[#263C50]">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-[#527C78]" />
                        User Account Management
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-[#677582]" />
                    </div>
                    <p className="text-[11px] text-[#677582] mt-0.5">
                      Activate or disable corporate user accounts.
                    </p>
                  </Link>
                )}
              </div>
            </div>

            {/* Zero-Trust Notice with Deep Slate anchor */}
            <div className="p-4 bg-[#203142] text-white border border-[#16222E] rounded shadow-xs space-y-1">
              <span className="font-semibold block text-[11px] uppercase tracking-wider text-[#A2B5C4]">
                Zero-Trust Enforcement
              </span>
              <p className="text-[11px] text-[#E9EFEC] leading-relaxed">
                Document access is verified server-side on every request. Signed URLs and admin content overrides are prohibited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
