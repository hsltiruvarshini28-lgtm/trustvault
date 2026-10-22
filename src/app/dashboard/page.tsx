import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Files,
  KeyRound,
  ShieldCheck,
  UploadCloud,
  FileText,
  AlertTriangle,
  ArrowRight,
  Shield,
  Clock,
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
      <div className="space-y-8">
        {/* Welcome Banner */}
        <div className="p-6 sm:p-8 bg-gradient-to-r from-slate-900 via-slate-900 to-teal-950/40 border border-slate-800 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2.5">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Welcome, {user.full_name}
              </h1>
              <Badge variant={user.role} />
            </div>
            <p className="text-sm text-slate-400">
              Zero-trust session active for <code className="text-teal-400 font-mono">{user.email}</code>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {user.role !== 'VIEWER' && (
              <Link
                href="/documents/upload"
                className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-md transition-colors flex items-center space-x-2"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Upload Document</span>
              </Link>
            )}

            <Link
              href="/documents"
              className="px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-medium text-sm transition-colors flex items-center space-x-1.5"
            >
              <span>Explore Vault</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Accessible Files</span>
              <Files className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-3xl font-black text-white">{visibleDocs.length}</div>
            <p className="text-xs text-slate-500">
              {ownedDocs.length} owned, {sharedDocs.length} shared
            </p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Active Permissions</span>
              <KeyRound className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-3xl font-black text-white">
              {user.role === 'OWNER' ? 'Full Control' : sharedDocs.length}
            </div>
            <p className="text-xs text-slate-500">
              {user.role === 'OWNER' ? 'Owner of confidential files' : 'Granted by document owners'}
            </p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Audit Hash Chain</span>
              <ShieldCheck className="w-4 h-4 text-teal-400" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-2xl font-black text-white">
                {integrity.valid ? 'INTACT' : 'TAMPERED'}
              </span>
              <Badge variant={integrity.valid ? 'INTACT' : 'TAMPERED'} />
            </div>
            <p className="text-xs text-slate-500">{integrity.totalVerified} verified sequential blocks</p>
          </div>

          <div className="p-5 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
              <span>Security Events</span>
              <Clock className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-3xl font-black text-white">{auditLogs.length}</div>
            <p className="text-xs text-slate-500">Logged in current window</p>
          </div>
        </div>

        {/* Recent Activity & Quick Access */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Audit Log */}
          <div className="lg:col-span-2 p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Recent Security Audit Events</h2>
                <p className="text-xs text-slate-400">Real cryptographic audit trail</p>
              </div>
              <Link
                href="/audit"
                className="text-xs font-semibold text-teal-400 hover:text-teal-300 flex items-center space-x-1"
              >
                <span>View Full Trail</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800/80">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3.5 flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-slate-200">{log.action}</span>
                      <Badge variant={log.result} />
                    </div>
                    <div className="text-xs text-slate-400 flex items-center space-x-2">
                      <span>Actor: {log.actor ? log.actor.full_name : 'System/Unauth'}</span>
                      <span>•</span>
                      <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      {log.document && (
                        <>
                          <span>•</span>
                          <span className="text-slate-300 font-mono truncate max-w-[200px]">
                            {log.document.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="hidden sm:block text-right">
                    <span className="font-mono text-[10px] text-slate-500">
                      Hash: {log.event_hash.substring(0, 10)}...
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Security Actions */}
          <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
            <h2 className="text-lg font-bold text-white">Security Verification</h2>
            <p className="text-xs text-slate-400">Live checks on authorization and hash chain immutability</p>

            <div className="space-y-3 pt-2">
              <Link
                href="/security"
                className="block p-3.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/40 transition-colors"
              >
                <div className="flex items-center justify-between text-sm font-semibold text-white">
                  <span className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-400" />
                    Security Center
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Inspect denied access attempts and run live cryptographic chain verification.
                </p>
              </Link>

              <Link
                href="/documents"
                className="block p-3.5 rounded-lg bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-teal-500/40 transition-colors"
              >
                <div className="flex items-center justify-between text-sm font-semibold text-white">
                  <span className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-teal-400" />
                    Manage Document Access
                  </span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Owners can grant READ/EDIT permissions or immediately revoke access.
                </p>
              </Link>

              {user.role === 'ADMIN' && (
                <Link
                  href="/admin"
                  className="block p-3.5 rounded-lg bg-indigo-950/30 hover:bg-indigo-950/50 border border-indigo-800/50 hover:border-indigo-600 transition-colors"
                >
                  <div className="flex items-center justify-between text-sm font-semibold text-indigo-300">
                    <span className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-indigo-400" />
                      Admin User Management
                    </span>
                    <ArrowRight className="w-4 h-4 text-indigo-400" />
                  </div>
                  <p className="text-xs text-indigo-200/70 mt-1">
                    Manage corporate user accounts and enable/disable account access.
                  </p>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
