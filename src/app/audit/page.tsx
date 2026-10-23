import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  FileCheck2,
  Filter,
  ShieldAlert,
  LogIn,
  LogOut,
  UserPlus,
  FileText,
  KeyRound,
  Shield,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import { AuditLogRecord } from '@/types';

export const dynamic = 'force-dynamic';

function getActionPresentation(log: AuditLogRecord) {
  switch (log.action) {
    case 'USER_LOGIN':
      return {
        label: 'User Sign In',
        badge: 'USER_LOGIN',
        icon: LogIn,
        iconColor: 'text-[#46785C]',
        bgIcon: 'bg-[#EDF4F0]',
      };
    case 'USER_LOGOUT':
      return {
        label: 'User Sign Out',
        badge: 'USER_LOGOUT',
        icon: LogOut,
        iconColor: 'text-[#263C50]',
        bgIcon: 'bg-[#EEF3F7]',
      };
    case 'USER_REGISTER':
      return {
        label: 'User Registered',
        badge: 'USER_REGISTER',
        icon: UserPlus,
        iconColor: 'text-[#A87532]',
        bgIcon: 'bg-[#FAF4EC]',
      };
    case 'DOCUMENT_READ':
    case 'DOCUMENT_DOWNLOAD':
      return {
        label: log.action.replace('_', ' '),
        badge: 'READ',
        icon: FileText,
        iconColor: 'text-[#527C78]',
        bgIcon: 'bg-[#EDF2F4]',
      };
    case 'DOCUMENT_UPLOAD':
    case 'DOCUMENT_EDIT':
      return {
        label: log.action.replace('_', ' '),
        badge: 'EDIT',
        icon: FileText,
        iconColor: 'text-[#A87532]',
        bgIcon: 'bg-[#FAF4EC]',
      };
    case 'DOCUMENT_DELETE':
      return {
        label: 'DOCUMENT DELETE',
        badge: 'DENIED',
        icon: FileText,
        iconColor: 'text-[#B64B4B]',
        bgIcon: 'bg-[#FAF0F0]',
      };
    case 'PERMISSION_GRANT':
      return {
        label: 'Permission Grant',
        badge: 'EDIT',
        icon: KeyRound,
        iconColor: 'text-[#527C78]',
        bgIcon: 'bg-[#EDF2F4]',
      };
    case 'PERMISSION_REVOKE':
      return {
        label: 'Permission Revoke',
        badge: 'DENIED',
        icon: KeyRound,
        iconColor: 'text-[#B64B4B]',
        bgIcon: 'bg-[#FAF0F0]',
      };
    default:
      return {
        label: log.action,
        badge: log.result,
        icon: Shield,
        iconColor: 'text-[#677582]',
        bgIcon: 'bg-[#F4F7F9]',
      };
  }
}

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; action?: string; category?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?message=session_required');
  }

  const { result, action, category } = await searchParams;

  // Retrieve base logs for user
  const allUserLogs = dataStore.getAuditLogs(user);
  const loginLogs = allUserLogs.filter((l) => l.action === 'USER_LOGIN');
  const allowedLogins = loginLogs.filter((l) => l.result === 'ALLOWED').length;
  const deniedLogins = loginLogs.filter((l) => l.result === 'DENIED').length;
  const logoutLogs = allUserLogs.filter((l) => l.action === 'USER_LOGOUT').length;
  const authEventsTotal = allUserLogs.filter(
    (l) => l.action === 'USER_LOGIN' || l.action === 'USER_LOGOUT' || l.action === 'USER_REGISTER'
  ).length;
  const docEventsTotal = allUserLogs.filter((l) => l.action.startsWith('DOCUMENT_')).length;
  const permEventsTotal = allUserLogs.filter((l) => l.action.startsWith('PERMISSION_')).length;

  // Retrieve filtered logs
  const logs = dataStore.getAuditLogs(user, {
    result: result || undefined,
    action: action || undefined,
    category: category || undefined,
  });

  const integrity = dataStore.verifyIntegrity();

  return (
    <DashboardLayout user={user}>
      <div className="space-y-5">
        {/* Header and Live Verification Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-[#263C50] tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#527C78]" />
              <span>Tamper-Evident Security Audit Trail</span>
            </h1>
            <p className="text-xs text-[#677582] mt-0.5">
              Cryptographic SHA-256 hash-chained ledger logging user logins, logouts, session states, and document operations.
            </p>
          </div>

          <div className="flex items-center space-x-2.5">
            <div className="px-3 py-1.5 bg-white border border-[#D0D9DF] rounded shadow-xs flex items-center space-x-2">
              <span className="text-[11px] text-[#677582] font-semibold">Chain Status:</span>
              <Badge variant={integrity.valid ? 'INTACT' : 'TAMPERED'} />
              <span className="text-[11px] font-mono font-medium text-[#263C50]">
                ({integrity.totalVerified} blocks)
              </span>
            </div>

            <Link
              href="/security"
              className="px-3 py-1.5 rounded bg-white hover:bg-[#F4F7F9] border border-[#D0D9DF] text-[#263C50] text-xs font-semibold flex items-center space-x-1.5 transition-colors shadow-xs"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-[#527C78]" />
              <span>Verify Ledger</span>
            </Link>
          </div>
        </div>

        {/* Real-time Authentication & Activity Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white border border-[#D0D9DF] rounded p-4 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded bg-[#EDF4F0] border border-[#BCD5C7] flex items-center justify-center shrink-0">
              <LogIn className="w-5 h-5 text-[#46785C]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#677582]">
                User Logins
              </div>
              <div className="text-xl font-bold text-[#263C50] flex items-center gap-2">
                <span>{allowedLogins}</span>
                {deniedLogins > 0 && (
                  <span className="text-xs font-semibold text-[#B64B4B] bg-[#FAF0F0] px-1.5 py-0.5 rounded border border-[#EFCACA]">
                    +{deniedLogins} Denied
                  </span>
                )}
              </div>
              <div className="text-[10px] text-[#677582] truncate">
                Sign-ins across all client nodes
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#D0D9DF] rounded p-4 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded bg-[#EEF3F7] border border-[#CFDBE5] flex items-center justify-center shrink-0">
              <LogOut className="w-5 h-5 text-[#263C50]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#677582]">
                User Logouts
              </div>
              <div className="text-xl font-bold text-[#263C50]">{logoutLogs}</div>
              <div className="text-[10px] text-[#677582] truncate">
                Explicit session terminations
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#D0D9DF] rounded p-4 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded bg-[#FAF4EC] border border-[#EEDBBE] flex items-center justify-center shrink-0">
              <FileText className="w-5 h-5 text-[#A87532]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#677582]">
                Document Operations
              </div>
              <div className="text-xl font-bold text-[#263C50]">{docEventsTotal}</div>
              <div className="text-[10px] text-[#677582] truncate">
                Uploads, reads, and revisions
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#D0D9DF] rounded p-4 shadow-xs flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded bg-[#EDF2F4] border border-[#D0D9DF] flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-[#527C78]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#677582]">
                Ledger Chain
              </div>
              <div className="text-xl font-bold text-[#263C50] flex items-center gap-1.5">
                <span>INTACT</span>
              </div>
              <div className="text-[10px] text-[#677582] truncate font-mono">
                {integrity.totalVerified} SHA-256 blocks validated
              </div>
            </div>
          </div>
        </div>

        {/* Primary Category Filter Bar */}
        <div className="p-3 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            {/* Category tabs */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#263C50] flex items-center gap-1.5 mr-1">
                <Layers className="w-3.5 h-3.5 text-[#527C78]" />
                <span>Scope:</span>
              </span>

              <Link
                href="/audit"
                className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 ${!category && !action
                  ? 'bg-[#263C50] text-white font-bold shadow-xs'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] hover:bg-[#E9EFF3] border border-[#D0D9DF]'
                  }`}
              >
                <span>All Activities</span>
                <span className="text-[10px] opacity-80">({allUserLogs.length})</span>
              </Link>

              <Link
                href="/audit?category=AUTH"
                className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 ${category === 'AUTH'
                  ? 'bg-[#527C78] text-white font-bold shadow-xs'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] hover:bg-[#E9EFF3] border border-[#D0D9DF]'
                  }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Logins & Logouts</span>
                <span className="text-[10px] opacity-80">({authEventsTotal})</span>
              </Link>

              <Link
                href="/audit?category=DOCS"
                className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 ${category === 'DOCS'
                  ? 'bg-[#527C78] text-white font-bold shadow-xs'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] hover:bg-[#E9EFF3] border border-[#D0D9DF]'
                  }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Documents</span>
                <span className="text-[10px] opacity-80">({docEventsTotal})</span>
              </Link>

              <Link
                href="/audit?category=PERMS"
                className={`px-3 py-1.5 rounded text-xs transition-colors flex items-center space-x-1.5 ${category === 'PERMS'
                  ? 'bg-[#527C78] text-white font-bold shadow-xs'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] hover:bg-[#E9EFF3] border border-[#D0D9DF]'
                  }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>Permissions</span>
                <span className="text-[10px] opacity-80">({permEventsTotal})</span>
              </Link>
            </div>

            {/* Outcome Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#263C50] flex items-center gap-1.5 mr-1">
                <Filter className="w-3.5 h-3.5 text-[#527C78]" />
                <span>Outcome:</span>
              </span>

              <Link
                href={`/audit${category ? `?category=${category}` : ''}${action ? `${category ? '&' : '?'}action=${action}` : ''
                  }`}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${!result
                  ? 'bg-[#263C50] text-white font-bold shadow-xs'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] border border-[#D0D9DF]'
                  }`}
              >
                All
              </Link>

              <Link
                href={`/audit?${new URLSearchParams({
                  ...(category ? { category } : {}),
                  ...(action ? { action } : {}),
                  result: 'ALLOWED',
                }).toString()}`}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${result === 'ALLOWED'
                  ? 'bg-[#EAF3EE] text-[#46785C] border border-[#BCD5C7] font-bold shadow-xs'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] border border-[#D0D9DF]'
                  }`}
              >
                ALLOWED
              </Link>

              <Link
                href={`/audit?${new URLSearchParams({
                  ...(category ? { category } : {}),
                  ...(action ? { action } : {}),
                  result: 'DENIED',
                }).toString()}`}
                className={`px-2.5 py-1 rounded text-xs transition-colors ${result === 'DENIED'
                  ? 'bg-[#FBEBEB] text-[#B64B4B] border border-[#ECC7C7] font-bold shadow-xs'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] border border-[#D0D9DF]'
                  }`}
              >
                DENIED
              </Link>
            </div>
          </div>

          {/* Sub-Filter for Authentication Events */}
          {category === 'AUTH' && (
            <div className="pt-2 border-t border-[#D0D9DF] flex items-center gap-2 text-xs">
              <span className="text-[11px] font-semibold text-[#677582]">Auth Actions:</span>

              <Link
                href={`/audit?category=AUTH${result ? `&result=${result}` : ''}`}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors ${!action
                  ? 'bg-[#527C78] text-white font-semibold'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] border border-[#D0D9DF]'
                  }`}
              >
                All Auth Events
              </Link>

              <Link
                href={`/audit?category=AUTH&action=USER_LOGIN${result ? `&result=${result}` : ''}`}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors flex items-center space-x-1 ${action === 'USER_LOGIN'
                  ? 'bg-[#EDF4F0] text-[#46785C] border border-[#BCD5C7] font-bold'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] border border-[#D0D9DF]'
                  }`}
              >
                <LogIn className="w-3 h-3" />
                <span>Logins Only ({loginLogs.length})</span>
              </Link>

              <Link
                href={`/audit?category=AUTH&action=USER_LOGOUT${result ? `&result=${result}` : ''}`}
                className={`px-2.5 py-0.5 rounded text-xs transition-colors flex items-center space-x-1 ${action === 'USER_LOGOUT'
                  ? 'bg-[#EEF3F7] text-[#263C50] border border-[#CFDBE5] font-bold'
                  : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] border border-[#D0D9DF]'
                  }`}
              >
                <LogOut className="w-3 h-3" />
                <span>Logouts Only ({logoutLogs})</span>
              </Link>
            </div>
          )}
        </div>

        {/* Audit Trail Table */}
        <div className="bg-white border border-[#D0D9DF] rounded shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#343A40]">
              <thead className="bg-[#F0F4F7] text-[11px] font-bold uppercase tracking-wider text-[#263C50] border-b border-[#D0D9DF]">
                <tr>
                  <th scope="col" className="px-5 py-3">Timestamp (UTC)</th>
                  <th scope="col" className="px-5 py-3">Security Action</th>
                  <th scope="col" className="px-5 py-3">Outcome</th>
                  <th scope="col" className="px-5 py-3">Actor (Identity)</th>
                  <th scope="col" className="px-5 py-3">Target Resource / Context</th>
                  <th scope="col" className="px-5 py-3">Cryptographic Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0D9DF]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-xs text-[#677582]">
                      <div className="max-w-sm mx-auto space-y-2">
                        <FileCheck2 className="w-8 h-8 text-[#7990A3] mx-auto opacity-70" />
                        <div className="font-semibold text-[#263C50]">No Audit Records Found</div>
                        <p className="text-[11px] text-[#677582]">
                          There are no audit records matching the specified category and outcome filters.
                        </p>
                        <Link
                          href="/audit"
                          className="inline-block mt-1 text-xs font-semibold text-[#527C78] hover:underline"
                        >
                          Clear Filters & View All
                        </Link>
                      </div>
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const pres = getActionPresentation(log);
                    const ActionIcon = pres.icon;

                    return (
                      <tr key={log.id} className="hover:bg-[#F6F9FA] transition-colors">
                        {/* Timestamp */}
                        <td className="px-5 py-3 font-mono text-[11px] text-[#677582] whitespace-nowrap">
                          <div>{new Date(log.timestamp).toISOString().replace('T', ' ').slice(0, 19)}</div>
                          <div className="text-[10px] text-[#7990A3]">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-5 py-3">
                          <div className="flex items-center space-x-2">
                            <div
                              className={`w-6 h-6 rounded flex items-center justify-center shrink-0 ${pres.bgIcon}`}
                            >
                              <ActionIcon className={`w-3.5 h-3.5 ${pres.iconColor}`} />
                            </div>
                            <div>
                              <div className="font-bold text-[#263C50] text-xs">
                                {pres.label}
                              </div>
                              <div className="font-mono text-[10px] text-[#677582]">
                                {log.action}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Outcome */}
                        <td className="px-5 py-3">
                          <Badge variant={log.result} />
                        </td>

                        {/* Actor Identity */}
                        <td className="px-5 py-3">
                          <div className="space-y-0.5">
                            <div className="font-bold text-[#263C50] flex items-center gap-1.5">
                              <span>
                                {log.actor
                                  ? log.actor.full_name
                                  : (log.metadata?.full_name as string) || 'Unauthenticated User'}
                              </span>
                              {log.actor && (
                                <Badge variant={log.actor.role} size="sm" />
                              )}
                            </div>
                            <div className="text-[#677582] font-mono text-[11px]">
                              {log.actor
                                ? log.actor.email
                                : (log.metadata?.email as string) || 'External IP: ' + (log.ip_address || 'Unknown')}
                            </div>
                            <div className="text-[10px] text-[#7990A3] font-mono">
                              IP: {log.ip_address || '127.0.0.1'}
                            </div>
                          </div>
                        </td>

                        {/* Target Resource / Session Details */}
                        <td className="px-5 py-3 text-xs">
                          {log.action === 'USER_LOGIN' && (
                            <div className="space-y-0.5">
                              {log.result === 'ALLOWED' ? (
                                <>
                                  <div className="font-semibold text-[#263C50] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#46785C]"></span>
                                    <span>Auth Gateway (Sign In Successful)</span>
                                  </div>
                                  <div className="text-[11px] text-[#527C78]">
                                    Active session cookie established
                                  </div>
                                </>
                              ) : (
                                <>
                                  <div className="font-semibold text-[#B64B4B] flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-[#B64B4B]"></span>
                                    <span>Sign In Denied</span>
                                  </div>
                                  <div className="text-[11px] text-[#B64B4B]">
                                    Reason: {(log.metadata?.reason as string) || 'Invalid credentials or disabled'}
                                  </div>
                                </>
                              )}
                            </div>
                          )}

                          {log.action === 'USER_LOGOUT' && (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-[#263C50] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#527C78]"></span>
                                <span>Session Terminated (Sign Out)</span>
                              </div>
                              <div className="text-[11px] text-[#677582]">
                                TrustVault session token revoked
                              </div>
                            </div>
                          )}

                          {log.action === 'USER_REGISTER' && (
                            <div className="space-y-0.5">
                              <div className="font-semibold text-[#263C50]">
                                User Account Provisioned
                              </div>
                              <div className="text-[11px] text-[#A87532]">
                                Standard VIEWER role initialized
                              </div>
                            </div>
                          )}

                          {log.document && (
                            <div className="space-y-0.5">
                              <span className="font-semibold text-[#263C50] truncate block max-w-[200px]">
                                {log.document.name}
                              </span>
                              <span className="text-[10px] text-[#677582] font-mono">
                                Doc ID: {log.document.id.substring(0, 8)}...
                              </span>
                            </div>
                          )}

                          {!log.document &&
                            log.action !== 'USER_LOGIN' &&
                            log.action !== 'USER_LOGOUT' &&
                            log.action !== 'USER_REGISTER' && (
                              <div className="text-[#677582] font-mono text-[11px]">
                                {log.metadata?.target_email ? (
                                  <span>Target: {String(log.metadata.target_email)}</span>
                                ) : (
                                  '—'
                                )}
                              </div>
                            )}
                        </td>

                        {/* Hash link */}
                        <td className="px-5 py-3">
                          <div className="font-mono text-[10px] space-y-0.5">
                            <div
                              className="text-[#263C50] truncate max-w-[190px]"
                              title={`Current Block Hash: ${log.event_hash}`}
                            >
                              <span className="text-[#527C78] font-bold">Curr:</span>{' '}
                              {log.event_hash.substring(0, 16)}...
                            </div>
                            <div
                              className="text-[#677582] truncate max-w-[190px]"
                              title={`Previous Block Hash: ${log.previous_hash}`}
                            >
                              <span className="text-[#677582]">Prev:</span>{' '}
                              {log.previous_hash.substring(0, 16)}...
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
