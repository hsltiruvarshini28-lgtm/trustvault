'use client';

import React, { useState } from 'react';
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
  Sparkles,
  Bot,
  ShieldAlert,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { UserProfile, DocumentRecord, DocumentPermissionRecord, PermissionLevel } from '@/types';

interface ManageAccessClientProps {
  user: UserProfile;
  doc: DocumentRecord;
  initialActiveGrants: DocumentPermissionRecord[];
  initialHistoricalGrants: DocumentPermissionRecord[];
  candidateUsers: UserProfile[];
}

export function ManageAccessClient({
  doc,
  initialActiveGrants,
  initialHistoricalGrants,
  candidateUsers,
}: ManageAccessClientProps) {
  const [activeGrants, setActiveGrants] = useState<DocumentPermissionRecord[]>(initialActiveGrants);
  const [historicalGrants, setHistoricalGrants] = useState<DocumentPermissionRecord[]>(initialHistoricalGrants);
  const [selectedUserId, setSelectedUserId] = useState(candidateUsers[0]?.id || '');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('READ');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // AI Access Suggestion State
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    candidate: { id: string; full_name: string; email: string };
    suggestedPermission: PermissionLevel;
    rationale: string;
    policyNotice: string;
  } | null>(null);

  const handleRequestAiSuggestion = async () => {
    try {
      setAiLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/documents/${doc.id}/ai-suggest`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate AI suggestion');
      }

      setAiSuggestion(data.suggestion);
      setSuccessMsg('AI Access Recommendation generated and recorded in audit trail.');
      setAiLoading(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'AI suggestion failed');
      setAiLoading(false);
    }
  };

  const handleApplyAiSuggestion = async () => {
    if (!aiSuggestion) return;
    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/documents/${doc.id}/permissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: aiSuggestion.candidate.id,
          permission: aiSuggestion.suggestedPermission,
          aiAssisted: true,
          rationale: aiSuggestion.rationale,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to grant permission');
      }

      setSuccessMsg(
        `Access granted to ${aiSuggestion.candidate.full_name} (${aiSuggestion.suggestedPermission}) following confirmed AI suggestion.`
      );
      setAiSuggestion(null);
      await refreshPermissions();
      setLoading(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to apply AI suggestion');
      setLoading(false);
    }
  };

  const refreshPermissions = async () => {
    try {
      const res = await fetch(`/api/documents/${doc.id}/permissions`);
      if (res.ok) {
        const data = await res.json();
        setActiveGrants(data.active || []);
        setHistoricalGrants(data.history || []);
      }
    } catch {
      // If background refresh fails, keep current state
    }
  };

  const handleGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return;

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/documents/${doc.id}/permissions`, {
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
      await refreshPermissions();
      setLoading(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to grant permission');
      setLoading(false);
    }
  };

  const handleRevoke = async (targetUserId: string, targetName?: string) => {
    if (
      !confirm(
        `Are you sure you want to revoke access for ${
          targetName || 'this user'
        }? Their next document request will be blocked immediately.`
      )
    ) {
      return;
    }

    try {
      setLoading(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const res = await fetch(`/api/documents/${doc.id}/permissions/${targetUserId}`, {
        method: 'DELETE',
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to revoke permission');
      }

      setSuccessMsg('Access revoked immediately. Subsequent download/view attempts by this user are now blocked.');
      await refreshPermissions();
      setLoading(false);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Failed to revoke permission');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Navigation & Header */}
      <div className="flex items-center space-x-3">
        <Link
          href={`/documents/${doc.id}`}
          className="p-1.5 rounded bg-white hover:bg-[#F4F7F9] border border-[#D0D9DF] text-[#263C50] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-[#263C50] tracking-tight flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#A87532]" />
            <span>Manage Access Permissions</span>
          </h1>
          <p className="text-xs text-[#677582] mt-0.5">
            Document: <span className="font-semibold text-[#263C50]">{doc.name}</span>
          </p>
        </div>
      </div>

      {/* Feedback Alerts */}
      {errorMsg && (
        <div className="p-3 bg-[#FBEBEB] border border-[#ECC7C7] rounded flex items-center space-x-2 text-[#B64B4B] text-xs">
          <AlertTriangle className="w-4 h-4 text-[#B64B4B] shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 bg-[#EAF3EE] border border-[#BCD5C7] rounded flex items-center space-x-2 text-[#46785C] text-xs">
          <CheckCircle2 className="w-4 h-4 text-[#46785C] shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* AI Access Suggestion Advisor (Zero-Trust Compliant) */}
      <div className="p-4 bg-gradient-to-r from-[#1A2836] to-[#25394B] rounded border border-[#374E63] text-white space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pb-2 border-b border-[#374E63]/70">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded bg-[#527C78] flex items-center justify-center text-white">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>TrustVault AI Access Advisor</span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 bg-[#527C78]/40 text-[#A4D4CF] rounded border border-[#527C78]/60">
                  ADVISORY ONLY
                </span>
              </div>
              <p className="text-[11px] text-[#CBD5E1]">
                Category-aware least-privilege permission recommendation engine.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRequestAiSuggestion}
            disabled={aiLoading}
            className="px-3 py-1.5 rounded bg-[#527C78] hover:bg-[#416863] text-white text-xs font-medium transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{aiLoading ? 'Analyzing Vault...' : 'Ask AI Recommendation'}</span>
          </button>
        </div>

        {aiSuggestion ? (
          <div className="p-3 bg-[#131F2B] rounded border border-[#43627E] space-y-2.5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div>
                <span className="text-[#94A3B8]">Suggested Recipient: </span>
                <span className="font-semibold text-white">
                  {aiSuggestion.candidate.full_name} ({aiSuggestion.candidate.email})
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[#94A3B8]">Recommended Access: </span>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    aiSuggestion.suggestedPermission === 'EDIT'
                      ? 'bg-[#A87532] text-white'
                      : 'bg-[#527C78] text-white'
                  }`}
                >
                  {aiSuggestion.suggestedPermission}
                </span>
              </div>
            </div>

            <div className="text-xs text-[#E2E8F0] bg-[#1E2E3E] p-2.5 rounded border border-[#2D455B] space-y-1">
              <div className="text-[10px] uppercase font-bold text-[#A4D4CF] tracking-wide">
                Security Rationale &amp; Least-Privilege Assessment:
              </div>
              <p className="text-[11px] leading-relaxed text-[#CBD5E1]">{aiSuggestion.rationale}</p>
            </div>

            <div className="p-2 rounded bg-[#B64B4B]/10 border border-[#B64B4B]/30 flex items-start space-x-2 text-[10px] text-[#FCA5A5]">
              <ShieldAlert className="w-3.5 h-3.5 text-[#FCA5A5] shrink-0 mt-0.5" />
              <span>
                <strong>Zero-Trust Safeguard:</strong> The machine never widens access automatically. Both this recommendation and your confirmation decision are permanently recorded in the SHA-256 tamper-evident audit trail.
              </span>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-1">
              <button
                type="button"
                onClick={() => setAiSuggestion(null)}
                className="px-2.5 py-1 text-xs text-[#CBD5E1] hover:text-white cursor-pointer"
              >
                Dismiss
              </button>
              <button
                type="button"
                onClick={handleApplyAiSuggestion}
                disabled={loading}
                className="px-3.5 py-1.5 rounded bg-[#46785C] hover:bg-[#37614A] text-white text-xs font-semibold transition-colors flex items-center space-x-1.5 cursor-pointer shadow-xs disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm &amp; Apply AI Grant</span>
              </button>
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-[#94A3B8] italic">
            Click &quot;Ask AI Recommendation&quot; to inspect document metadata ({doc.category}) and receive an audited, least-privilege access suggestion.
          </p>
        )}
      </div>

      {/* Grant New Permission Card */}
      <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#D0D9DF]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#263C50] flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-[#527C78]" />
            <span>Grant New Document Access</span>
          </h2>
          <span className="text-[10px] text-[#677582]">Owner authorization required</span>
        </div>

        <form onSubmit={handleGrant} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div>
            <label className="block text-[11px] font-semibold text-[#263C50] uppercase mb-1">
              Target User
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-white border border-[#D0D9DF] text-xs text-[#263C50] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
            >
              {candidateUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.full_name} ({u.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-[#263C50] uppercase mb-1">
              Permission Level
            </label>
            <select
              value={permissionLevel}
              onChange={(e) => setPermissionLevel(e.target.value as PermissionLevel)}
              className="w-full px-3 py-1.5 rounded bg-white border border-[#D0D9DF] text-xs text-[#263C50] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
            >
              <option value="READ">READ (View and Download)</option>
              <option value="EDIT">EDIT (View, Download, and Replace Content)</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading || !selectedUserId}
              className="w-full py-1.5 px-3 rounded bg-[#527C78] hover:bg-[#416863] text-white font-medium text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Grant Access</span>
            </button>
          </div>
        </form>
      </div>

      {/* Active Grants Table */}
      <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#D0D9DF]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#263C50] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#46785C]" />
              <span>Active Grants</span>
            </h2>
            <p className="text-[11px] text-[#677582]">Users with currently authorized access rights</p>
          </div>
          <span className="text-[11px] font-mono font-semibold text-[#263C50]">
            {activeGrants.length} active grant{activeGrants.length !== 1 ? 's' : ''}
          </span>
        </div>

        {activeGrants.length === 0 ? (
          <div className="p-5 text-center text-xs text-[#677582] bg-[#F6F9FA] rounded border border-[#D0D9DF]">
            No external users have active grants. Only the document owner can access this document.
          </div>
        ) : (
          <div className="divide-y divide-[#D0D9DF]">
            {activeGrants.map((grant) => (
              <div key={grant.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-[#263C50]">
                      {grant.user ? grant.user.full_name : 'Named User'}
                    </span>
                    <span className="text-[11px] text-[#677582] font-mono">
                      ({grant.user ? grant.user.email : grant.user_id})
                    </span>
                    <Badge variant={grant.permission} />
                  </div>
                  <div className="text-[11px] text-[#677582] flex items-center space-x-1.5">
                    <Clock className="w-3 h-3" />
                    <span>Granted on {new Date(grant.granted_at).toLocaleString()}</span>
                  </div>
                </div>

                <button
                  onClick={() => handleRevoke(grant.user_id, grant.user?.full_name)}
                  disabled={loading}
                  className="px-2.5 py-1 rounded bg-[#FBEBEB] hover:bg-[#F8DADA] border border-[#ECC7C7] text-xs font-semibold text-[#B64B4B] transition-colors flex items-center space-x-1 cursor-pointer disabled:opacity-50"
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
      <div className="p-5 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#D0D9DF]">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#263C50] flex items-center gap-1.5">
              <History className="w-4 h-4 text-[#677582]" />
              <span>Historical Grants & Revocations</span>
            </h2>
            <p className="text-[11px] text-[#677582]">
              Preserved historical record of revoked access permissions
            </p>
          </div>
          <span className="text-[11px] font-mono text-[#677582]">
            {historicalGrants.length} record{historicalGrants.length !== 1 ? 's' : ''}
          </span>
        </div>

        {historicalGrants.length === 0 ? (
          <div className="p-5 text-center text-xs text-[#677582] bg-[#F6F9FA] rounded border border-[#D0D9DF]">
            No historical revocations recorded for this document yet.
          </div>
        ) : (
          <div className="divide-y divide-[#D0D9DF]">
            {historicalGrants.map((grant) => (
              <div key={grant.id} className="py-2.5 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[#263C50] font-medium">
                      {grant.user ? grant.user.full_name : 'User'}
                    </span>
                    <Badge variant="DENIED">REVOKED</Badge>
                    <span className="text-[11px] text-[#677582]">
                      (Prior level: {grant.permission})
                    </span>
                  </div>
                  <div className="text-[11px] text-[#677582]">
                    Revoked at: {grant.revoked_at ? new Date(grant.revoked_at).toLocaleString() : 'N/A'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
