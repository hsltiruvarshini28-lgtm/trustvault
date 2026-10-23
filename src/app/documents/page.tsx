import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { DocumentsClientSync } from '@/components/documents/DocumentsClientSync';
import { Badge } from '@/components/ui/Badge';
import {
  Files,
  Download,
  Eye,
  KeyRound,
  UploadCloud,
  FileText,
  Search,
  Calendar,
  User as UserIcon,
  X,
  Filter,
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    owner?: string;
    category?: string;
    date?: string;
    startDate?: string;
    endDate?: string;
  }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?message=session_required');
  }

  const { q, owner, category, date, startDate, endDate } = await searchParams;

  let docs = dataStore.getVisibleDocuments(user);

  // 1. Unified search query (filename, description, or owner)
  if (q) {
    const query = q.toLowerCase();
    docs = docs.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query)) ||
        (d.owner && d.owner.full_name && d.owner.full_name.toLowerCase().includes(query)) ||
        (d.owner && d.owner.email && d.owner.email.toLowerCase().includes(query))
    );
  }

  // 2. Specific Owner filter
  if (owner) {
    const oQuery = owner.toLowerCase();
    docs = docs.filter(
      (d) =>
        (d.owner && d.owner.full_name && d.owner.full_name.toLowerCase().includes(oQuery)) ||
        (d.owner && d.owner.email && d.owner.email.toLowerCase().includes(oQuery)) ||
        d.owner_id.toLowerCase().includes(oQuery)
    );
  }

  // 3. Category filter
  if (category && category !== 'All') {
    docs = docs.filter((d) => d.category.toLowerCase() === category.toLowerCase());
  }

  // 4. Exact Date filter (YYYY-MM-DD)
  if (date) {
    docs = docs.filter((d) => d.created_at.startsWith(date));
  }

  // 5. Start Date range filter (YYYY-MM-DD)
  if (startDate) {
    const startMs = new Date(startDate).getTime();
    if (!isNaN(startMs)) {
      docs = docs.filter((d) => new Date(d.created_at).getTime() >= startMs);
    }
  }

  // 6. End Date range filter (YYYY-MM-DD)
  if (endDate) {
    const endMs = new Date(endDate + 'T23:59:59.999Z').getTime();
    if (!isNaN(endMs)) {
      docs = docs.filter((d) => new Date(d.created_at).getTime() <= endMs);
    }
  }

  const categories = ['All', 'Finance', 'Engineering', 'Executive', 'Legal', 'General'];
  const hasActiveFilters = Boolean(
    q || owner || (category && category !== 'All') || date || startDate || endDate
  );

  return (
    <DashboardLayout user={user}>
      <DocumentsClientSync />
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

        {/* Multi-Attribute Search & Filter Panel (Name, Owner, Category, Date) */}
        <div className="p-4 bg-white border border-[#D0D9DF] rounded shadow-xs space-y-3.5">
          <form method="GET" className="space-y-3">
            {/* Top row: Unified Search Bar + Owner Input */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-7 relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#677582]" />
                <input
                  type="text"
                  name="q"
                  defaultValue={q || ''}
                  placeholder="Search by filename, description, or owner..."
                  className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-[#D0D9DF] rounded text-xs text-[#263C50] placeholder-[#677582] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
                />
              </div>

              <div className="sm:col-span-5 relative">
                <UserIcon className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#677582]" />
                <input
                  type="text"
                  name="owner"
                  defaultValue={owner || ''}
                  placeholder="Filter by owner name or email..."
                  className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-[#D0D9DF] rounded text-xs text-[#263C50] placeholder-[#677582] focus:outline-hidden focus:border-[#527C78] focus:ring-1 focus:ring-[#527C78]"
                />
              </div>
            </div>

            {/* Bottom row: Date Filters + Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
              <div className="sm:col-span-3 flex items-center space-x-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#527C78] shrink-0" />
                <span className="text-[11px] font-semibold text-[#263C50] whitespace-nowrap">From:</span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={startDate || ''}
                  className="w-full px-2 py-1 bg-white border border-[#D0D9DF] rounded text-xs text-[#263C50] focus:outline-hidden focus:border-[#527C78]"
                />
              </div>

              <div className="sm:col-span-3 flex items-center space-x-1.5 text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#527C78] shrink-0" />
                <span className="text-[11px] font-semibold text-[#263C50] whitespace-nowrap">To:</span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={endDate || ''}
                  className="w-full px-2 py-1 bg-white border border-[#D0D9DF] rounded text-xs text-[#263C50] focus:outline-hidden focus:border-[#527C78]"
                />
              </div>

              <input type="hidden" name="category" value={category || 'All'} />

              <div className="sm:col-span-6 flex items-center justify-end space-x-2">
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-[#263C50] hover:bg-[#1A2836] text-white text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                >
                  <Filter className="w-3 h-3" />
                  <span>Apply Search</span>
                </button>

                {hasActiveFilters && (
                  <Link
                    href="/documents"
                    className="px-2.5 py-1 rounded bg-[#F4F7F9] hover:bg-[#E9EFF3] border border-[#D0D9DF] text-[#677582] text-xs font-medium transition-colors flex items-center space-x-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear</span>
                  </Link>
                )}
              </div>
            </div>
          </form>

          {/* Category Filter Pills - High Contrast */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full pt-1 border-t border-[#D0D9DF]/70">
            <span className="text-[10px] font-semibold uppercase text-[#677582] mr-1 shrink-0">
              Category:
            </span>
            {categories.map((cat) => {
              const isSelected = (!category && cat === 'All') || category === cat;
              const params = new URLSearchParams();
              if (cat !== 'All') params.set('category', cat);
              if (q) params.set('q', q);
              if (owner) params.set('owner', owner);
              if (startDate) params.set('startDate', startDate);
              if (endDate) params.set('endDate', endDate);
              const queryString = params.toString();

              return (
                <Link
                  key={cat}
                  href={`/documents${queryString ? `?${queryString}` : ''}`}
                  className={`px-3 py-1 rounded text-xs transition-colors whitespace-nowrap ${
                    isSelected
                      ? 'bg-[#527C78] text-white border border-[#527C78] font-semibold shadow-xs'
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
              <h3 className="text-sm font-bold text-[#263C50]">No documents match your criteria</h3>
              <p className="text-xs text-[#677582] max-w-sm mx-auto">
                {hasActiveFilters
                  ? 'No documents matched your search filter criteria. Try clearing filters or adjusting your date range.'
                  : 'You do not have access to any documents yet. Owners can upload files or grant you access.'}
              </p>
              {hasActiveFilters && (
                <div className="pt-2">
                  <Link
                    href="/documents"
                    className="inline-flex items-center space-x-1 px-3 py-1.5 rounded bg-[#F4F7F9] hover:bg-[#E9EFF3] border border-[#D0D9DF] text-xs text-[#263C50] font-medium transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </Link>
                </div>
              )}
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
