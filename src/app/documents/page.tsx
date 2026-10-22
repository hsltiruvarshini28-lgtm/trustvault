import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/Badge';
import {
  Files,
  Download,
  Eye,
  KeyRound,
  UploadCloud,
  FileText,
  Search,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?message=session_required');
  }

  const { q, category } = await searchParams;

  let docs = dataStore.getVisibleDocuments(user);

  if (q) {
    const query = q.toLowerCase();
    docs = docs.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
    );
  }

  if (category && category !== 'All') {
    docs = docs.filter((d) => d.category.toLowerCase() === category.toLowerCase());
  }

  const categories = ['All', 'Finance', 'Engineering', 'Executive', 'Legal', 'General'];

  return (
    <DashboardLayout user={user}>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <Files className="w-6 h-6 text-teal-400" />
              <span>Document Repository</span>
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Encrypted private bucket storage with server-side authorization checks.
            </p>
          </div>

          {user.role !== 'VIEWER' && (
            <Link
              href="/documents/upload"
              className="px-4 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-500 text-white font-semibold text-sm shadow-md transition-colors flex items-center space-x-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Document</span>
            </Link>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex flex-col md:flex-row gap-4 items-center justify-between">
          <form method="GET" className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search documents by name or description..."
              className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-teal-500"
            />
          </form>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
            {categories.map((cat) => {
              const isSelected = (!category && cat === 'All') || category === cat;
              return (
                <Link
                  key={cat}
                  href={`/documents?category=${cat}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    isSelected
                      ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700/60'
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Document Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
          {docs.length === 0 ? (
            <div className="p-12 text-center space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto" />
              <h3 className="text-base font-bold text-slate-300">No documents found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                {q || category
                  ? 'No documents matched your search criteria.'
                  : 'You do not have access to any documents yet. Owners can upload files or grant you access.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-950/80 text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <tr>
                    <th scope="col" className="px-6 py-4">Document Name</th>
                    <th scope="col" className="px-6 py-4">Category</th>
                    <th scope="col" className="px-6 py-4">Access Level</th>
                    <th scope="col" className="px-6 py-4">Owner</th>
                    <th scope="col" className="px-6 py-4">Size</th>
                    <th scope="col" className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                  {docs.map((doc) => {
                    const isOwner = doc.owner_id === user.id;
                    const grant = isOwner ? null : dataStore.getActivePermission(doc.id, user.id);
                    const accessLevel = isOwner
                      ? 'OWNER'
                      : grant
                      ? grant.permission
                      : user.role === 'ADMIN'
                      ? 'METADATA_ONLY'
                      : 'NONE';

                    return (
                      <tr key={doc.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-6 py-4 font-semibold text-white">
                          <Link href={`/documents/${doc.id}`} className="hover:text-teal-400 flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                            <span className="truncate max-w-[240px] sm:max-w-xs">{doc.name}</span>
                          </Link>
                          {doc.description && (
                            <p className="text-xs text-slate-400 font-normal line-clamp-1 mt-0.5">
                              {doc.description}
                            </p>
                          )}
                        </td>

                        <td className="px-6 py-4">
                          <span className="text-xs px-2 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300">
                            {doc.category}
                          </span>
                        </td>

                        <td className="px-6 py-4">
                          <Badge variant={accessLevel} />
                        </td>

                        <td className="px-6 py-4 text-xs text-slate-300">
                          {doc.owner ? doc.owner.full_name : 'Unknown'}
                        </td>

                        <td className="px-6 py-4 text-xs font-mono text-slate-400">
                          {(doc.file_size / 1024).toFixed(0)} KB
                        </td>

                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <Link
                              href={`/documents/${doc.id}`}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                              title="View Document Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            {/* Server-Mediated Download Button */}
                            {accessLevel !== 'METADATA_ONLY' && (
                              <a
                                href={`/api/documents/${doc.id}/download`}
                                className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 hover:text-teal-300 border border-teal-500/30 transition-colors"
                                title="Download File (Server Mediated)"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            )}

                            {/* Owner Manage Access Button */}
                            {isOwner && (
                              <Link
                                href={`/documents/${doc.id}/access`}
                                className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/30 transition-colors"
                                title="Manage Sharing & Revocation"
                              >
                                <KeyRound className="w-4 h-4" />
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
