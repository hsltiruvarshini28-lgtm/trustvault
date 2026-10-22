import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { canAccessDocument } from '@/lib/auth/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const doc = dataStore.getDocumentById(id);

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const grant = dataStore.getActivePermission(doc.id, user.id);
  const decision = canAccessDocument(user, doc, 'view_metadata', grant);

  if (!decision.allowed) {
    dataStore.appendAuditLog({
      actor_user_id: user.id,
      document_id: doc.id,
      action: 'METADATA_VIEW',
      result: 'DENIED',
      request_id: `req-meta-${Date.now()}`,
      ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
      user_agent: req.headers.get('user-agent') || 'Browser',
      metadata: { reason: decision.reason },
    });

    return NextResponse.json({ error: decision.reason }, { status: decision.statusCode });
  }

  dataStore.appendAuditLog({
    actor_user_id: user.id,
    document_id: doc.id,
    action: 'METADATA_VIEW',
    result: 'ALLOWED',
    request_id: `req-meta-${Date.now()}`,
    ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
    user_agent: req.headers.get('user-agent') || 'Browser',
    metadata: { name: doc.name },
  });

  const isOwner = doc.owner_id === user.id;

  return NextResponse.json({
    document: {
      ...doc,
      access_level: isOwner
        ? 'OWNER'
        : grant
        ? grant.permission
        : user.role === 'ADMIN'
        ? 'METADATA_ONLY'
        : 'NONE',
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const { success, error } = dataStore.deleteDocument(id, user);

  if (!success) {
    return NextResponse.json({ error: error || 'Failed to delete document' }, { status: 403 });
  }

  return NextResponse.json({ success: true, message: 'Document deleted successfully.' });
}
