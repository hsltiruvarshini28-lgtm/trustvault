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
      <div className="space-y-5">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-[#263C50] tracking-tight flex items-center gap-2">
              <Files className="w-5 h-5 text-[#527C78]" />
              <span>Document Repository</span>
            </h1>
            <p className="text-xs text-[#677582] mt-0.5">
              Encrypted private bucket storage with strict server-side authorization enforcement.
            </p>
          </div>

          {user.role !== 'VIEWER' && (
            <Link
              href="/documents/upload"
              className="px-3.5 py-1.5 rounded bg-[#527C78] hover:bg-[#416863] text-white font-medium text-xs transition-colors flex items-center space-x-1.5 shadow-xs cursor-pointer"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Upload Document</span>
            </Link>
          )}
        </div>

        {/* Filters and Search Bar */}
        <div className="p-3 bg-white border border-[#D0D9DF] rounded shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
          <form method="GET" className="relative w-full md:w-80">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#677582]" />
            <input
              type="text"
              name="q"
              defaultValue={q || ''}
              placeholder="Search by filename or description..."
              className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-[#D0D9DF] rounded text-xs text-[#263C50] placeholder-[#677582] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
            />
          </form>

          {/* Category Filter Pills - High Contrast */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {categories.map((cat) => {
              const isSelected = (!category && cat === 'All') || category === cat;
              return (
                <Link
                  key={cat}
                  href={`/documents?category=${cat}${q ? `&q=${encodeURIComponent(q)}` : ''}`}
                  className={`px-3 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#263C50] text-white border border-[#263C50] font-semibold shadow-xs'
                      : 'bg-[#F4F7F9] text-[#677582] hover:text-[#263C50] hover:bg-[#E9EFF3] border border-[#D0D9DF]'
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Document Table */}
        <div className="bg-white border border-[#D0D9DF] rounded shadow-xs overflow-hidden">
          {docs.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <FileText className="w-10 h-10 text-[#677582] mx-auto opacity-60" />
              <h3 className="text-sm font-bold text-[#263C50]">No documents found</h3>
              <p className="text-xs text-[#677582] max-w-sm mx-auto">
                {q || category
                  ? 'No documents matched your search filter criteria.'
                  : 'You do not have access to any documents yet. Owners can upload files or grant you access.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#343A40]">
                <thead className="bg-[#F0F4F7] text-[11px] font-bold uppercase tracking-wider text-[#263C50] border-b border-[#D0D9DF]">
                  <tr>
                    <th scope="col" className="px-5 py-3">Document Name</th>
                    <th scope="col" className="px-5 py-3">Category</th>
                    <th scope="col" className="px-5 py-3">Access Level</th>
                    <th scope="col" className="px-5 py-3">Owner</th>
                    <th scope="col" className="px-5 py-3">Size</th>
                    <th scope="col" className="px-5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#D0D9DF]">
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
                      <tr key={doc.id} className="hover:bg-[#F6F9FA] transition-colors">
                        <td className="px-5 py-3">
                          <Link href={`/documents/${doc.id}`} className="hover:text-[#527C78] flex items-center space-x-2">
                            <FileText className="w-3.5 h-3.5 text-[#527C78] shrink-0" />
                            <span className="font-semibold text-[#263C50] truncate max-w-[240px] sm:max-w-xs">{doc.name}</span>
                          </Link>
                          {doc.description && (
                            <p className="text-[11px] text-[#677582] font-normal line-clamp-1 mt-0.5">
                              {doc.description}
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-3">
                          <span className="text-[11px] px-2 py-0.5 bg-[#F4F7F9] border border-[#D0D9DF] rounded text-[#263C50] font-medium">
                            {doc.category}
                          </span>
                        </td>

                        <td className="px-5 py-3">
                          <Badge variant={accessLevel} />
                        </td>

                        <td className="px-5 py-3 text-xs text-[#263C50] font-medium">
                          {doc.owner ? doc.owner.full_name : 'Unknown'}
                        </td>

                        <td className="px-5 py-3 text-xs font-mono text-[#677582]">
                          {(doc.file_size / 1024).toFixed(0)} KB
                        </td>

                        <td className="px-5 py-3 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Link
                              href={`/documents/${doc.id}`}
                              className="p-1.5 rounded bg-white hover:bg-[#F4F7F9] text-[#263C50] border border-[#D0D9DF] transition-colors"
                              title="View Document Details"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Link>

                            {/* Server-Mediated Download Button */}
                            {accessLevel !== 'METADATA_ONLY' && (
                              <a
                                href={`/api/documents/${doc.id}/download`}
                                className="p-1.5 rounded bg-[#EAF3EE] hover:bg-[#DBEDE1] text-[#46785C] border border-[#BCD5C7] transition-colors"
                                title="Download File (Server-Mediated)"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}

                            {/* Owner Manage Access Button */}
                            {isOwner && (
                              <Link
                                href={`/documents/${doc.id}/access`}
                                className="p-1.5 rounded bg-[#FAF3E8] hover:bg-[#F5E8D3] text-[#A87532] border border-[#E8D3B2] transition-colors"
                                title="Manage Sharing & Revocation"
                              >
                                <KeyRound className="w-3.5 h-3.5" />
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
