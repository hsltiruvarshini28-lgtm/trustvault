import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SecurityCenterClient } from './SecurityCenterClient';

export const dynamic = 'force-dynamic';

export default async function SecurityPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?message=session_required');
  }

  const deniedLogs = dataStore.getAuditLogs(user, { result: 'DENIED' });
  const verification = dataStore.verifyIntegrity();
  const initialVerification = {
    status: verification.valid ? 'INTACT' : 'TAMPERED',
    ...verification,
    verifiedAt: new Date().toISOString(),
  };

  return (
    <DashboardLayout user={user}>
      <SecurityCenterClient
        initialDeniedLogs={deniedLogs}
        initialVerification={initialVerification}
      />
    </DashboardLayout>
  );
}
