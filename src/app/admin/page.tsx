'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  FileText,
  Lock,
  CheckCircle2,
  Activity,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { UserProfile, DocumentRecord, AuditLogRecord } from '@/types';

export default function AdminPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadAdminData = async () => {
    try {
      // 1. Check current user and verify ADMIN role
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated) {
        router.push('/login?message=session_required');
        return;
      }
      if (meData.user.role !== 'ADMIN') {
        router.push('/dashboard');
        return;
      }
      setCurrentUser(meData.user);

      // 2. Fetch all users
      const usersRes = await fetch('/api/admin/users');
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users || []);
      }

      // 3. Fetch all system documents (metadata only)
      const docsRes = await fetch('/api/documents');
      if (docsRes.ok) {
        const docsData = await docsRes.json();
        setDocuments(docsData.documents || []);
      }

      // 4. Fetch all audit logs
      const auditRes = await fetch('/api/audit');
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        setAuditLogs(auditData.logs || []);
      }

      setLoading(false);
    } catch {
      router.push('/dashboard');
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (!confirm(`Are you sure you want to change account status for ${targetUser.full_name} to ${nextStatus}?`)) {
      return;
    }

    try {
      setActionLoading(targetUser.id);
      setStatusMsg(null);

      const res = await fetch(`/api/admin/users/${targetUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update user status');
      }

      setStatusMsg({ type: 'success', text: `Account status updated for ${targetUser.email} to ${nextStatus}.` });
      await loadAdminData();
      setActionLoading(null);
    } catch (err: unknown) {
      setStatusMsg({ type: 'error', text: err instanceof Error ? err.message : 'Operation failed' });
      setActionLoading(null);
    }
  };

  if (loading || !currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading Administrator Control Center...
      </div>
    );
  }

  // Detect suspicious activity: repeated DENIED requests by actor
  const deniedLogs = auditLogs.filter((l) => l.result === 'DENIED');
  const deniedByActor: Record<string, number> = {};
  deniedLogs.forEach((l) => {
    const actorKey = l.actor ? l.actor.email : l.ip_address || 'Unknown';
    deniedByActor[actorKey] = (deniedByActor[actorKey] || 0) + 1;
  });

  return (
    <DashboardLayout user={currentUser}>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-indigo-400" />
              <span>Administrative Security Dashboard</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Enterprise identity governance, system-wide metadata observation, and suspicious event triage.
            </p>
          </div>

          <div className="p-3 bg-indigo-950/40 border border-indigo-800/60 rounded-xl flex items-center space-x-2 text-xs text-indigo-300">
            <Lock className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Zero-Trust Policy: Administrators cannot view or download confidential document contents without explicit owner grants.
            </span>
          </div>
        </div>

        {statusMsg && (
          <div
            className={`p-4 rounded-xl flex items-center space-x-3 text-sm ${
              statusMsg.type === 'success'
                ? 'bg-emerald-950/60 border border-emerald-700/80 text-emerald-300'
                : 'bg-rose-950/60 border border-rose-700/80 text-rose-300'
            }`}
          >
            {statusMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span>{statusMsg.text}</span>
          </div>
        )}

        {/* Suspicious Activity & Denied Pattern Card */}
        {deniedLogs.length > 0 && (
          <div className="p-5 bg-rose-950/30 border border-rose-900/60 rounded-xl space-y-3">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>Suspicious Activity Monitoring: Denied Access Attempts Detected ({deniedLogs.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {Object.entries(deniedByActor).map(([actor, count]) => (
                <div key={actor} className="p-3 bg-slate-900 border border-rose-800/40 rounded-lg text-xs space-y-1">
                  <span className="font-semibold text-slate-200 block truncate">{actor}</span>
                  <div className="flex items-center justify-between text-slate-400">
                    <span>Denied Requests:</span>
                    <span className="font-bold text-rose-400 font-mono">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Account Management Table */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-teal-400" />
                <span>Corporate User Accounts & Roles</span>
              </h2>
              <p className="text-xs text-slate-400">Manage user account status (ACTIVE vs DISABLED)</p>
            </div>
            <span className="text-xs font-mono text-slate-500">{users.length} total users</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3">Full Name</th>
                  <th scope="col" className="px-6 py-3">Email Address</th>
                  <th scope="col" className="px-6 py-3">System Role</th>
                  <th scope="col" className="px-6 py-3">Account Status</th>
                  <th scope="col" className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {users.map((u) => {
                  const isCurrent = u.id === currentUser.id;
                  const isLoadingThis = actionLoading === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-white">
                        {u.full_name} {isCurrent && <span className="text-xs text-teal-400 font-normal">(You)</span>}
                      </td>

                      <td className="px-6 py-3.5 text-xs font-mono text-slate-400">
                        {u.email}
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge variant={u.role} />
                      </td>

                      <td className="px-6 py-3.5">
                        <Badge variant={u.status} />
                      </td>

                      <td className="px-6 py-3.5 text-right">
                        {!isCurrent && (
                          <button
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={Boolean(isLoadingThis)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors flex items-center space-x-1 ml-auto cursor-pointer ${
                              u.status === 'ACTIVE'
                                ? 'bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-rose-300'
                                : 'bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-700/60 text-emerald-300'
                            }`}
                          >
                            {u.status === 'ACTIVE' ? (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Disable Account</span>
                              </>
                            ) : (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Activate Account</span>
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* System-Wide Document Metadata Observer Table */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <span>System-Wide Document Metadata</span>
              </h2>
              <p className="text-xs text-slate-400">
                Observability on document count, classifications, and storage utilization (content inspection restricted)
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">{documents.length} total documents</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-3">Document Name</th>
                  <th scope="col" className="px-6 py-3">Category</th>
                  <th scope="col" className="px-6 py-3">Owner</th>
                  <th scope="col" className="px-6 py-3">Size</th>
                  <th scope="col" className="px-6 py-3">Content Access Restriction</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-6 py-3 font-semibold text-white">
                      {doc.name}
                    </td>
                    <td className="px-6 py-3 text-xs">
                      <span className="px-2 py-0.5 bg-slate-800 border border-slate-700 rounded text-slate-300">
                        {doc.category}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-xs text-slate-300">
                      {doc.owner ? doc.owner.full_name : 'Unknown'}
                    </td>
                    <td className="px-6 py-3 text-xs font-mono text-slate-400">
                      {(doc.file_size / 1024).toFixed(0)} KB
                    </td>
                    <td className="px-6 py-3">
                      <span className="inline-flex items-center space-x-1.5 text-xs text-amber-400 bg-amber-950/40 border border-amber-800/60 px-2.5 py-0.5 rounded">
                        <Lock className="w-3 h-3" />
                        <span>Confidential (Metadata Only)</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
