import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  PERMISSIONS_COOKIE_NAME,
  createPermissionsToken,
  verifyPermissionsToken,
} from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { cookies } from 'next/headers';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { id, userId } = await params;
  const result = dataStore.revokePermission(id, user, userId);

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(PERMISSIONS_COOKIE_NAME)?.value;
  const existingPerms = existingCookie ? verifyPermissionsToken(existingCookie) : [];
  const currentDocPerms = dataStore.getDocumentPermissions(id);
  const updatedPerms = [...currentDocPerms, ...existingPerms.filter((p) => !currentDocPerms.some((cp) => cp.id === p.id))].slice(0, 30);
  const permsToken = createPermissionsToken(updatedPerms);

  const response = NextResponse.json({
    success: true,
    message: 'Permission revoked successfully. Subsequent requests will be denied immediately.',
  });
  response.cookies.set(PERMISSIONS_COOKIE_NAME, permsToken, {
    path: '/',
    httpOnly: false,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}

