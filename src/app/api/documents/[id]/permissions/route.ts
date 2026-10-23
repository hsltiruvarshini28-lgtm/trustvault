import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  PERMISSIONS_COOKIE_NAME,
  createPermissionsToken,
  verifyPermissionsToken,
} from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { cookies } from 'next/headers';

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

  // Only the document owner or an administrator can view permission grants
  if (doc.owner_id !== user.id && user.role !== 'ADMIN') {
    return NextResponse.json(
      { error: 'Only the document owner or an administrator can view permissions.' },
      { status: 403 }
    );
  }

  const permissions = dataStore.getDocumentPermissions(doc.id);
  const activePermissions = permissions.filter((p) => p.revoked_at === null);
  const historicalPermissions = permissions.filter((p) => p.revoked_at !== null);

  return NextResponse.json({
    documentId: doc.id,
    active: activePermissions,
    history: historicalPermissions,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { userId, permission, aiAssisted, rationale } = body;

  if (!userId || !permission || !['READ', 'EDIT'].includes(permission)) {
    return NextResponse.json(
      { error: 'Valid userId and permission ("READ" or "EDIT") are required.' },
      { status: 400 }
    );
  }

  const result = dataStore.grantPermission(id, user, userId, permission, {
    aiAssisted: Boolean(aiAssisted),
    rationale: typeof rationale === 'string' ? rationale : undefined,
  });

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(PERMISSIONS_COOKIE_NAME)?.value;
  const existingPerms = existingCookie ? verifyPermissionsToken(existingCookie) : [];
  const currentDocPerms = dataStore.getDocumentPermissions(id);
  const updatedPerms = [...currentDocPerms, ...existingPerms.filter((p) => !currentDocPerms.some((cp) => cp.id === p.id))].slice(0, 30);
  const permsToken = createPermissionsToken(updatedPerms);

  const response = NextResponse.json({ success: true, message: `Access granted: ${permission}` });
  response.cookies.set(PERMISSIONS_COOKIE_NAME, permsToken, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
