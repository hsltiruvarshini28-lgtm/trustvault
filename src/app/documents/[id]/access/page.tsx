import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ManageAccessClient } from './ManageAccessClient';

export const dynamic = 'force-dynamic';

export default async function ManageAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?message=session_required');
  }

  const { id } = await params;
  const doc = dataStore.getDocumentById(id);

  if (!doc) {
    redirect('/documents');
  }

  // Authorization check: Only the document owner or an administrator can manage access
  if (doc.owner_id !== user.id && user.role !== 'ADMIN') {
    redirect(`/documents/${doc.id}`);
  }

  const permissions = dataStore.getDocumentPermissions(doc.id);
  const activeGrants = permissions.filter((p) => p.revoked_at === null);
  const historicalGrants = permissions.filter((p) => p.revoked_at !== null);

  // Eligible users to grant access to (active users who are not the owner)
  const candidateUsers = dataStore
    .getAllProfiles()
    .filter((u) => u.id !== doc.owner_id && u.status === 'ACTIVE');

  return (
    <DashboardLayout user={user}>
      <ManageAccessClient
        user={user}
        doc={doc}
        initialActiveGrants={activeGrants}
        initialHistoricalGrants={historicalGrants}
        candidateUsers={candidateUsers}
      />
    </DashboardLayout>
  );
}
