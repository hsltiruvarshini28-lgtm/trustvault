import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileCheck2, Filter, ShieldAlert } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';

export const dynamic = 'force-dynamic';

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ result?: string; action?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?message=session_required');
  }

  const { result, action } = await searchParams;

  let logs = dataStore.getAuditLogs(user, { result, documentId: undefined });

  if (action && action !== 'ALL') {
    logs = logs.filter((l) => l.action.toLowerCase() === action.toLowerCase());
  }

  const integrity = dataStore.verifyIntegrity();

  return (
    <DashboardLayout user={user}>
      <div className="space-y-5">
        {/* Header and Live Verification Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-[#263C50] tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-[#527C78]" />
              <span>Tamper-Evident Audit Trail</span>
            </h1>
            <p className="text-xs text-[#677582] mt-0.5">
              Append-only cryptographic SHA-256 hash-chained sequence recording allowed and denied operations.
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
              <span>Verify Hashes</span>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 bg-white border border-[#D0D9DF] rounded shadow-xs flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#263C50] flex items-center gap-1.5 mr-1">
            <Filter className="w-3.5 h-3.5 text-[#527C78]" />
            <span>Filter Result:</span>
          </span>

          <Link
            href="/audit"
            className={`px-3 py-1 rounded text-xs transition-colors ${
              !result
                ? 'bg-[#263C50] text-white border border-[#263C50] font-semibold shadow-xs'
                : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] hover:bg-[#E9EFF3] border border-[#D0D9DF]'
            }`}
          >
            All Results ({dataStore.getAuditLogs(user).length})
          </Link>

          <Link
            href="/audit?result=ALLOWED"
            className={`px-3 py-1 rounded text-xs transition-colors ${
              result === 'ALLOWED'
                ? 'bg-[#EAF3EE] text-[#46785C] border border-[#BCD5C7] font-bold shadow-xs'
                : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] hover:bg-[#E9EFF3] border border-[#D0D9DF]'
            }`}
          >
            ALLOWED
          </Link>

          <Link
            href="/audit?result=DENIED"
            className={`px-3 py-1 rounded text-xs transition-colors ${
              result === 'DENIED'
                ? 'bg-[#FBEBEB] text-[#B64B4B] border border-[#ECC7C7] font-bold shadow-xs'
                : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] hover:bg-[#E9EFF3] border border-[#D0D9DF]'
            }`}
          >
            DENIED
          </Link>
        </div>

        {/* Audit Trail Table */}
        <div className="bg-white border border-[#D0D9DF] rounded shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#343A40]">
              <thead className="bg-[#F0F4F7] text-[11px] font-bold uppercase tracking-wider text-[#263C50] border-b border-[#D0D9DF]">
                <tr>
                  <th scope="col" className="px-5 py-3">Timestamp (UTC)</th>
                  <th scope="col" className="px-5 py-3">Action</th>
                  <th scope="col" className="px-5 py-3">Outcome</th>
                  <th scope="col" className="px-5 py-3">Actor</th>
                  <th scope="col" className="px-5 py-3">Target Resource</th>
                  <th scope="col" className="px-5 py-3">Cryptographic Hash Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#D0D9DF]">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-xs text-[#677582]">
                      No audit records found matching the active filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#F6F9FA] transition-colors">
                      <td className="px-5 py-3 font-mono text-[11px] text-[#677582] whitespace-nowrap">
                        {new Date(log.timestamp).toISOString()}
                      </td>

                      <td className="px-5 py-3 font-bold text-[#263C50]">
                        {log.action}
                      </td>

                      <td className="px-5 py-3">
                        <Badge variant={log.result} />
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-semibold text-[#263C50]">
                          {log.actor ? log.actor.full_name : 'System/Unauth'}
                        </div>
                        <div className="text-[#677582] font-mono text-[10px]">
                          {log.actor ? log.actor.email : log.ip_address || 'Unknown'}
                        </div>
                      </td>

                      <td className="px-5 py-3 text-xs">
                        {log.document ? (
                          <span className="font-semibold text-[#263C50] truncate block max-w-[180px]">
                            {log.document.name}
                          </span>
                        ) : (
                          <span className="text-[#677582]">—</span>
                        )}
                      </td>

                      <td className="px-5 py-3">
                        <div className="font-mono text-[10px] space-y-0.5">
                          <div className="text-[#263C50] truncate max-w-[200px]" title={`Event Hash: ${log.event_hash}`}>
                            <span className="text-[#527C78] font-bold">Curr:</span> {log.event_hash.substring(0, 16)}...
                          </div>
                          <div className="text-[#677582] truncate max-w-[200px]" title={`Previous Hash: ${log.previous_hash}`}>
                            <span className="text-[#677582]">Prev:</span> {log.previous_hash.substring(0, 16)}...
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
