'use client';

import React, { useState } from 'react';
import {
  Users,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  FileText,
  Lock,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { UserProfile, DocumentRecord, AuditLogRecord } from '@/types';

interface AdminConsoleClientProps {
  currentUser: UserProfile;
  initialUsers: UserProfile[];
  initialDocuments: DocumentRecord[];
  initialAuditLogs: AuditLogRecord[];
}

export function AdminConsoleClient({
  currentUser,
  initialUsers,
  initialDocuments,
  initialAuditLogs,
}: AdminConsoleClientProps) {
  const [users, setUsers] = useState<UserProfile[]>(initialUsers);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // Keep current state on error
    }
  };

  const handleToggleUserStatus = async (targetUser: UserProfile) => {
    const nextStatus = targetUser.status === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
    if (
      !confirm(
        `Are you sure you want to change account status for ${targetUser.full_name} to ${nextStatus}?`
      )
    ) {
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

      setStatusMsg({
        type: 'success',
        text: `Account status updated for ${targetUser.email} to ${nextStatus}.`,
      });
      await refreshUsers();
      setActionLoading(null);
    } catch (err: unknown) {
      setStatusMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'Operation failed',
      });
      setActionLoading(null);
    }
  };

  // Detect suspicious activity: repeated DENIED requests by actor
  const deniedLogs = initialAuditLogs.filter((l) => l.result === 'DENIED');
  const deniedByActor: Record<string, number> = {};
  deniedLogs.forEach((l) => {
    const actorKey = l.actor ? l.actor.email : l.ip_address || 'Unknown';
    deniedByActor[actorKey] = (deniedByActor[actorKey] || 0) + 1;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-[#263C50] tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-[#527C78]" />
            <span>User & Identity Administration</span>
          </h1>
          <p className="text-xs text-[#677582] mt-0.5">
            Enterprise identity governance, system-wide metadata observation, and suspicious event triage.
          </p>
        </div>

        <div className="p-3 bg-[#203142] text-white border border-[#16222E] rounded shadow-xs flex items-center space-x-2 text-xs">
          <Lock className="w-3.5 h-3.5 text-[#527C78] shrink-0" />
          <span className="text-[#E9EFEC] text-[11px]">
            Zero-Trust Policy: Administrators cannot view or download confidential document contents without explicit owner grants.
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded flex items-center space-x-2 text-xs ${
            statusMsg.type === 'success'
              ? 'bg-[#EAF3EE] border border-[#BCD5C7] text-[#46785C]'
              : 'bg-[#FBEBEB] border border-[#ECC7C7] text-[#B64B4B]'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#46785C] shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-[#B64B4B] shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* Suspicious Activity & Denied Pattern Card */}
      {deniedLogs.length > 0 && (
        <div className="p-4 bg-[#FBEBEB] border border-[#ECC7C7] rounded shadow-xs space-y-2.5">
          <div className="flex items-center space-x-2 text-[#B64B4B] font-bold text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>Security Event Monitoring: Blocked Authorization Attempts Detected ({deniedLogs.length})</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {Object.entries(deniedByActor).map(([actor, count]) => (
              <div key={actor} className="p-2.5 bg-white border border-[#ECC7C7] rounded text-xs space-y-0.5">
                <span className="font-bold text-[#263C50] block truncate">{actor}</span>
                <div className="flex items-center justify-between text-[#677582]">
                  <span>Denied Requests:</span>
                  <span className="font-bold text-[#B64B4B] font-mono">{count}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Account Management Table */}
      <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#D0D9DF]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#263C50] flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#527C78]" />
              <span>Corporate User Accounts & Roles</span>
            </h2>
            <p className="text-[11px] text-[#677582]">Manage account status (ACTIVE vs DISABLED)</p>
          </div>
          <span className="text-[11px] font-mono font-semibold text-[#263C50]">
            {users.length} total users
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#343A40]">
            <thead className="bg-[#F0F4F7] text-[11px] font-bold uppercase tracking-wider text-[#263C50] border-b border-[#D0D9DF]">
              <tr>
                <th scope="col" className="px-5 py-3">Full Name</th>
                <th scope="col" className="px-5 py-3">Email Address</th>
                <th scope="col" className="px-5 py-3">System Role</th>
                <th scope="col" className="px-5 py-3">Account Status</th>
                <th scope="col" className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0D9DF]">
              {users.map((u) => {
                const isCurrent = u.id === currentUser.id;
                const isLoadingThis = actionLoading === u.id;

                return (
                  <tr key={u.id} className="hover:bg-[#F6F9FA] transition-colors">
                    <td className="px-5 py-3 font-semibold text-[#263C50]">
                      {u.full_name}{' '}
                      {isCurrent && (
                        <span className="text-[11px] text-[#527C78] font-normal">(Current User)</span>
                      )}
                    </td>

                    <td className="px-5 py-3 font-mono text-[11px] text-[#677582]">
                      {u.email}
                    </td>

                    <td className="px-5 py-3">
                      <Badge variant={u.role} />
                    </td>

                    <td className="px-5 py-3">
                      <Badge variant={u.status} />
                    </td>

                    <td className="px-5 py-3 text-right">
                      {!isCurrent && (
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          disabled={Boolean(isLoadingThis)}
                          className={`px-2.5 py-1 rounded text-xs font-semibold transition-colors inline-flex items-center space-x-1 cursor-pointer disabled:opacity-50 ${
                            u.status === 'ACTIVE'
                              ? 'bg-[#FBEBEB] hover:bg-[#F8DADA] border border-[#ECC7C7] text-[#B64B4B]'
                              : 'bg-[#EAF3EE] hover:bg-[#DBEDE1] border border-[#BCD5C7] text-[#46785C]'
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
      <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#D0D9DF]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#263C50] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#527C78]" />
              <span>System-Wide Document Metadata</span>
            </h2>
            <p className="text-[11px] text-[#677582]">
              Observability on document classifications and storage utilization (content inspection restricted)
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold text-[#263C50]">
            {initialDocuments.length} total documents
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#343A40]">
            <thead className="bg-[#F0F4F7] text-[11px] font-bold uppercase tracking-wider text-[#263C50] border-b border-[#D0D9DF]">
              <tr>
                <th scope="col" className="px-5 py-3">Document Name</th>
                <th scope="col" className="px-5 py-3">Category</th>
                <th scope="col" className="px-5 py-3">Owner</th>
                <th scope="col" className="px-5 py-3">Size</th>
                <th scope="col" className="px-5 py-3">Content Access Restriction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#D0D9DF]">
              {initialDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-[#F6F9FA] transition-colors">
                  <td className="px-5 py-3 font-semibold text-[#263C50]">
                    {doc.name}
                  </td>
                  <td className="px-5 py-3">
                    <span className="px-2 py-0.5 bg-[#F4F7F9] border border-[#D0D9DF] rounded text-[11px] text-[#263C50] font-medium">
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-xs text-[#263C50] font-medium">
                    {doc.owner ? doc.owner.full_name : 'Unknown'}
                  </td>
                  <td className="px-5 py-3 text-xs font-mono text-[#677582]">
                    {(doc.file_size / 1024).toFixed(0)} KB
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center space-x-1 text-[11px] text-[#A87532] bg-[#FAF3E8] border border-[#E8D3B2] px-2 py-0.5 rounded font-medium">
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
  );
}
