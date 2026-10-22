'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  KeyRound,
  ShieldCheck,
  UserCheck,
  UserX,
  ArrowLeft,
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { UserProfile, DocumentRecord, DocumentPermissionRecord, PermissionLevel } from '@/types';

export default function ManageAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<UserProfile | null>(null);
  const [doc, setDoc] = useState<DocumentRecord | null>(null);
  const [activeGrants, setActiveGrants] = useState<DocumentPermissionRecord[]>([]);
  const [historicalGrants, setHistoricalGrants] = useState<DocumentPermissionRecord[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);

  const [selectedUserId, setSelectedUserId] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('READ');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    try {
      // 1. Current user
      const meRes = await fetch('/api/auth/me');
      const meData = await meRes.json();
      if (!meData.authenticated) {
        router.push('/login?message=session_required');
        return;
      }
      setUser(meData.user);

      // 2. Document details
      const docRes = await fetch(`/api/documents/${id}`);
      if (!docRes.ok) {
        router.push('/documents');
        return;
      }
      const docData = await docRes.json();
      setDoc(docData.document);

      // 3. Permissions
      const permRes = await fetch(`/api/documents/${id}/permissions`);
      if (permRes.ok) {
        const permData = await permRes.json();
        setActiveGrants(permData.active || []);
        setHistoricalGrants(permData.history || []);
      }

      // 4. Candidate users for sharing (Admin / Candidate list)
      // Provide standard demo users to choose from
      const candidates: UserProfile[] = [
        {
          id: '22222222-2222-4222-a222-222222222222',
          full_name: 'Bob Viewer',
          email: 'bob@trustvault.local',
          role: 'VIEWER',
          status: 'ACTIVE',
          created_at: '',
          updated_at: '',
        },
        {
          id: '33333333-3333-4333-a333-333333333333',
          full_name: 'Charlie Viewer',
          email: 'charlie@trustvault.local',
          role: 'VIEWER',
          status: 'ACTIVE',
          created_at: '',
          updated_at: '',
        },
      ];
      setAllUsers(candidates);
      if (candidates.length > 0) {
        setSelectedUserId(candidates[0].id);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to load access permissions.');
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/documents/${id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUserId,
          permission: permissionLevel,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to grant permission');
      }

      setSuccessMsg(`Access successfully granted: ${permissionLevel}`);
      await loadData();
      setLoading(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to grant permission');
      setLoading(false);
    }
  };

  const handleRevoke = async (targetUserId: string, targetName?: string) => {
    if (!confirm(`Are you sure you want to revoke access for ${targetName || 'this user'}? Their next document request will be blocked immediately.`)) {
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/documents/${id}/permissions/${targetUserId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke permission');
      }

      setSuccessMsg('Access revoked immediately. Subsequent download/view attempts by this user are now blocked.');
      await loadData();
      setLoading(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to revoke permission');
      setLoading(false);
    }
  };

  if (!user || !doc) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        Loading Access Control Console...
      </div>
    );
  }

  return (
    <DashboardLayout user={user}>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex items-center space-x-3">
          <Link
            href={`/documents/${doc.id}`}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <KeyRound className="w-6 h-6 text-amber-400" />
              <span>Manage Access Permissions</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Document: <span className="font-semibold text-white">{doc.name}</span>
            </p>
          </div>
        </div>

        {/* Feedback Alerts */}
        {errorMsg && (
          <div className="p-4 bg-rose-950/60 border border-rose-700/80 rounded-xl flex items-center space-x-3 text-rose-300 text-sm">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-4 bg-emerald-950/60 border border-emerald-700/80 rounded-xl flex items-center space-x-3 text-emerald-300 text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Grant New Permission Card */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-teal-400" />
              <span>Grant New Document Access</span>
            </h2>
            <span className="text-xs text-slate-400">Owner-only administrative action</span>
          </div>

          <form onSubmit={handleGrant} className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-teal-500"
              >
                {allUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.full_name} ({u.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Permission Level
              </label>
              <select
                value={permissionLevel}
                onChange={(e) => setPermissionLevel(e.target.value as PermissionLevel)}
                className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-sm focus:outline-hidden focus:border-teal-500"
              >
                <option value="READ">READ (View and Download)</option>
                <option value="EDIT">EDIT (View, Download, and Replace Content)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-md transition-colors flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <UserCheck className="w-4 h-4" />
                <span>Grant Access</span>
              </button>
            </div>
          </form>
        </div>

        {/* Active Grants Table */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span>Active Grants</span>
              </h2>
              <p className="text-xs text-slate-400">Users with currently authorized access</p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {activeGrants.length} active grant{activeGrants.length !== 1 ? 's' : ''}
            </span>
          </div>

          {activeGrants.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 bg-slate-950/40 rounded-lg">
              No users have active grants. Only the document owner can access this document.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {activeGrants.map((grant) => (
                <div key={grant.id} className="py-3.5 flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-semibold text-white">
                        {grant.user ? grant.user.full_name : 'Named User'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        ({grant.user ? grant.user.email : grant.user_id})
                      </span>
                      <Badge variant={grant.permission} />
                    </div>
                    <div className="text-xs text-slate-500 flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Granted on {new Date(grant.granted_at).toLocaleString()}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleRevoke(grant.user_id, grant.user?.full_name)}
                    disabled={loading}
                    className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900 border border-rose-700/60 text-xs font-semibold text-rose-300 transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <UserX className="w-3.5 h-3.5" />
                    <span>Revoke Access</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historical Grants Table */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <History className="w-5 h-5 text-slate-400" />
                <span>Historical Grants & Revocations</span>
              </h2>
              <p className="text-xs text-slate-400">
                Preserved historical record of revoked access permissions
              </p>
            </div>
            <span className="text-xs font-mono text-slate-500">
              {historicalGrants.length} record{historicalGrants.length !== 1 ? 's' : ''}
            </span>
          </div>

          {historicalGrants.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 bg-slate-950/40 rounded-lg">
              No historical revocations recorded for this document yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-800/80">
              {historicalGrants.map((grant) => (
                <div key={grant.id} className="py-3 flex items-center justify-between text-sm">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-slate-300">
                        {grant.user ? grant.user.full_name : 'User'}
                      </span>
                      <Badge variant="DENIED">REVOKED</Badge>
                      <span className="text-xs text-slate-500">
                        (Prior level: {grant.permission})
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Revoked at: {grant.revoked_at ? new Date(grant.revoked_at).toLocaleString() : 'N/A'}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
