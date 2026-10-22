import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { canAccessDocument } from '@/lib/auth/authorization';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const userAgent = req.headers.get('user-agent') || 'Browser';
  const requestId = `req-prev-${Date.now()}`;

  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const doc = dataStore.getDocumentById(id);

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  const activeGrant = dataStore.getActivePermission(doc.id, user.id);
  const decision = canAccessDocument(user, doc, 'preview', activeGrant);

  if (!decision.allowed) {
    dataStore.appendAuditLog({
      actor_user_id: user.id,
      document_id: doc.id,
      action: 'FILE_PREVIEW',
      result: 'DENIED',
      request_id: requestId,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: { reason: decision.reason },
    });

    return NextResponse.json({ error: decision.reason }, { status: decision.statusCode });
  }

  const fileBuffer = dataStore.getFileBuffer(doc.storage_path);
  if (!fileBuffer) {
    return NextResponse.json({ error: 'Storage object not found' }, { status: 404 });
  }

  dataStore.appendAuditLog({
    actor_user_id: user.id,
    document_id: doc.id,
    action: 'FILE_PREVIEW',
    result: 'ALLOWED',
    request_id: requestId,
    ip_address: clientIp,
    user_agent: userAgent,
    metadata: { fileName: doc.name },
  });

  const sanitizedFilename = doc.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `inline; filename="${sanitizedFilename}"`,
      'Content-Length': fileBuffer.length.toString(),
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
