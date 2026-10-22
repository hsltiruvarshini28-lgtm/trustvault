import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const documentId = searchParams.get('documentId') || undefined;
  const actorId = searchParams.get('actorId') || undefined;
  const result = searchParams.get('result') || undefined;

  const logs = dataStore.getAuditLogs(user, { documentId, actorId, result });

  return NextResponse.json({
    logs,
    total: logs.length,
    viewerRole: user.role,
  });
}
