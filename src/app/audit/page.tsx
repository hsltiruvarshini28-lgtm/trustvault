import { redirect } from 'next/navigation';
import Link from 'next/link';
import { FileCheck2, ShieldCheck, Filter, ShieldAlert, ArrowRight } from 'lucide-react';
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
      <div className="space-y-6">
        {/* Header and Live Verification Badge */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <FileCheck2 className="w-6 h-6 text-teal-400" />
              <span>Tamper-Evident Audit Trail</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Append-only cryptographic SHA-256 hash-chained sequence recording allowed and denied operations.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs text-slate-400 font-medium">Chain Status:</span>
                <Badge variant={integrity.valid ? 'INTACT' : 'TAMPERED'} />
              </div>
              <span className="text-xs font-mono text-slate-500">
                ({integrity.totalVerified} verified blocks)
              </span>
            </div>

            <Link
              href="/security"
              className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
            >
              <ShieldAlert className="w-4 h-4 text-teal-400" />
              <span>Verify Hashes</span>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-teal-400" />
            <span>Filter Result:</span>
          </span>

          <Link
            href="/audit"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              !result ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            All Results ({dataStore.getAuditLogs(user).length})
          </Link>

          <Link
            href="/audit?result=ALLOWED"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              result === 'ALLOWED'
                ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ALLOWED
          </Link>

          <Link
            href="/audit?result=DENIED"
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
              result === 'DENIED'
                ? 'bg-rose-950 text-rose-300 border border-rose-700'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            DENIED
          </Link>
        </div>

        {/* Audit Trail Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-950/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th scope="col" className="px-6 py-4">Timestamp (UTC)</th>
                  <th scope="col" className="px-6 py-4">Action</th>
                  <th scope="col" className="px-6 py-4">Outcome</th>
                  <th scope="col" className="px-6 py-4">Actor</th>
                  <th scope="col" className="px-6 py-4">Target Document</th>
                  <th scope="col" className="px-6 py-4">Cryptographic Hash Link</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      No audit records found matching the active filter.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="px-6 py-4 font-mono text-xs text-slate-400 whitespace-nowrap">
                        {new Date(log.timestamp).toISOString()}
                      </td>

                      <td className="px-6 py-4 font-semibold text-white">
                        {log.action}
                      </td>

                      <td className="px-6 py-4">
                        <Badge variant={log.result} />
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <div className="font-semibold text-slate-200">
                          {log.actor ? log.actor.full_name : 'System/Unauth'}
                        </div>
                        <div className="text-slate-400 font-mono text-[11px]">
                          {log.actor ? log.actor.email : log.ip_address || 'Unknown'}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-300">
                        {log.document ? (
                          <span className="font-semibold text-teal-300 truncate block max-w-[180px]">
                            {log.document.name}
                          </span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-mono text-[10px] space-y-0.5">
                          <div className="text-slate-400 truncate max-w-[200px]" title={`Event Hash: ${log.event_hash}`}>
                            <span className="text-teal-400">Curr:</span> {log.event_hash.substring(0, 16)}...
                          </div>
                          <div className="text-slate-500 truncate max-w-[200px]" title={`Previous Hash: ${log.previous_hash}`}>
                            <span className="text-slate-600">Prev:</span> {log.previous_hash.substring(0, 16)}...
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
