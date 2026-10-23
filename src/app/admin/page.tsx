import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { AdminConsoleClient } from './AdminConsoleClient';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?message=session_required');
  }

  if (user.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  const allUsers = dataStore.getAllProfiles();
  const allDocuments = dataStore.getVisibleDocuments(user);
  const auditLogs = dataStore.getAuditLogs(user);

  return (
    <DashboardLayout user={user}>
      <AdminConsoleClient
        currentUser={user}
        initialUsers={allUsers}
        initialDocuments={allDocuments}
        initialAuditLogs={auditLogs}
      />
    </DashboardLayout>
  );
}
