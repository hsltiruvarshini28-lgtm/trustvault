import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  DOCUMENTS_COOKIE_NAME,
  createDocumentsToken,
  verifyDocumentsToken,
} from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { cookies } from 'next/headers';
import { DocumentRecord } from '@/types';

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const incomingDoc: DocumentRecord = body.document;
    if (!incomingDoc || !incomingDoc.id || !incomingDoc.name) {
      return NextResponse.json({ error: 'Invalid document payload' }, { status: 400 });
    }

    // Ensure document exists in the current server instance
    dataStore.ensureDocument(incomingDoc);

    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(DOCUMENTS_COOKIE_NAME)?.value;
    const existingDocs = existingCookie ? verifyDocumentsToken(existingCookie) : [];
    const updatedDocs = [incomingDoc, ...existingDocs.filter((d) => d.id !== incomingDoc.id)].slice(0, 15);
    const docsToken = createDocumentsToken(updatedDocs);

    const response = NextResponse.json({ success: true, document: incomingDoc });
    response.cookies.set(DOCUMENTS_COOKIE_NAME, docsToken, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Sync failed';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
