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
  const requestId = `req-dl-${Date.now()}`;

  // 1. Authenticated user check
  if (!user) {
    dataStore.appendAuditLog({
      actor_user_id: null,
      document_id: null,
      action: 'DOCUMENT_DOWNLOAD',
      result: 'DENIED',
      request_id: requestId,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: { reason: 'Unauthenticated download request' },
    });

    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const doc = dataStore.getDocumentById(id);

  if (!doc) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 });
  }

  // 2. Fetch FRESH active permission state (IMMEDIATE REVOCATION ENFORCEMENT)
  const activeGrant = dataStore.getActivePermission(doc.id, user.id);

  // 3. Centralized authorization check
  const decision = canAccessDocument(user, doc, 'download', activeGrant);

  if (!decision.allowed) {
    // Record DENIED audit event immediately
    dataStore.appendAuditLog({
      actor_user_id: user.id,
      document_id: doc.id,
      action: 'DOCUMENT_DOWNLOAD',
      result: 'DENIED',
      request_id: requestId,
      ip_address: clientIp,
      user_agent: userAgent,
      metadata: {
        reason: decision.reason,
        attemptedBy: user.email,
        userRole: user.role,
        hasRevokedGrant: !activeGrant,
      },
    });

    return NextResponse.json(
      { error: decision.reason || 'Access denied' },
      { status: decision.statusCode }
    );
  }

  // 4. Retrieve private file buffer
  const fileBuffer = dataStore.getFileBuffer(doc.storage_path);
  if (!fileBuffer) {
    return NextResponse.json({ error: 'Storage object not found' }, { status: 404 });
  }

  // 5. Record ALLOWED audit event
  dataStore.appendAuditLog({
    actor_user_id: user.id,
    document_id: doc.id,
    action: 'DOCUMENT_DOWNLOAD',
    result: 'ALLOWED',
    request_id: requestId,
    ip_address: clientIp,
    user_agent: userAgent,
    metadata: {
      fileName: doc.name,
      fileSize: doc.file_size,
      mimeType: doc.mime_type,
    },
  });

  // 6. Return server-mediated stream with strict security headers
  const sanitizedFilename = doc.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');

  return new NextResponse(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      'Content-Type': doc.mime_type || 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${sanitizedFilename}"`,
      'Content-Length': fileBuffer.length.toString(),
      // Defensive headers against origin execution and caching of revoked files
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'",
    },
  });
}
