import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Strictly enforce ADMIN role
  if (user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Access denied: Administrator privileges required.' },
      { status: 403 }
    );
  }

  const { id } = await params;
  const body = await req.json();
  const { status } = body;

  if (!status || !['ACTIVE', 'DISABLED'].includes(status)) {
    return NextResponse.json(
      { error: 'Invalid status. Must be "ACTIVE" or "DISABLED".' },
      { status: 400 }
    );
  }

  // Admin cannot disable their own account to prevent lockout
  if (id === user.id && status === 'DISABLED') {
    return NextResponse.json(
      { error: 'Administrators cannot disable their own account.' },
      { status: 400 }
    );
  }

  const updatedProfile = dataStore.updateProfileStatus(id, status);
  if (!updatedProfile) {
    return NextResponse.json({ error: 'User profile not found.' }, { status: 404 });
  }

  // Record administrative audit event
  dataStore.appendAuditLog({
    actor_user_id: user.id,
    document_id: null,
    action: status === 'DISABLED' ? 'USER_DISABLE' : 'USER_ENABLE',
    result: 'ALLOWED',
    request_id: `req-admin-${Date.now()}`,
    ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
    user_agent: req.headers.get('user-agent') || 'Browser',
    metadata: {
      targetUserId: id,
      targetEmail: updatedProfile.email,
      newStatus: status,
    },
  });

  return NextResponse.json({
    success: true,
    user: updatedProfile,
    message: `Account status updated to ${status}.`,
  });
}
