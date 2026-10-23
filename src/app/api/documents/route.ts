import { NextRequest, NextResponse } from 'next/server';
import {
  getCurrentUser,
  DOCUMENTS_COOKIE_NAME,
  createDocumentsToken,
  verifyDocumentsToken,
} from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.trim().toLowerCase() || '';
  const ownerQuery = searchParams.get('owner')?.trim().toLowerCase() || '';
  const category = searchParams.get('category')?.trim() || '';
  const exactDate = searchParams.get('date')?.trim() || '';
  const startDate = searchParams.get('startDate')?.trim() || '';
  const endDate = searchParams.get('endDate')?.trim() || '';

  // Get strictly authorized documents
  let docs = dataStore.getVisibleDocuments(user);

  // 1. General search query (searches name, description, and owner)
  if (query) {
    docs = docs.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query)) ||
        (d.owner && d.owner.full_name && d.owner.full_name.toLowerCase().includes(query)) ||
        (d.owner && d.owner.email && d.owner.email.toLowerCase().includes(query))
    );
  }

  // 2. Specific Owner filter
  if (ownerQuery) {
    docs = docs.filter(
      (d) =>
        (d.owner && d.owner.full_name && d.owner.full_name.toLowerCase().includes(ownerQuery)) ||
        (d.owner && d.owner.email && d.owner.email.toLowerCase().includes(ownerQuery)) ||
        d.owner_id.toLowerCase().includes(ownerQuery)
    );
  }

  // 3. Category filter
  if (category && category !== 'All') {
    docs = docs.filter((d) => d.category.toLowerCase() === category.toLowerCase());
  }

  // 4. Exact Date filter (YYYY-MM-DD)
  if (exactDate) {
    docs = docs.filter((d) => d.created_at.startsWith(exactDate));
  }

  // 5. Start Date range filter (YYYY-MM-DD)
  if (startDate) {
    const startMs = new Date(startDate).getTime();
    if (!isNaN(startMs)) {
      docs = docs.filter((d) => new Date(d.created_at).getTime() >= startMs);
    }
  }

  // 6. End Date range filter (YYYY-MM-DD)
  if (endDate) {
    const endMs = new Date(endDate + 'T23:59:59.999Z').getTime();
    if (!isNaN(endMs)) {
      docs = docs.filter((d) => new Date(d.created_at).getTime() <= endMs);
    }
  }

  // Map to safe response, adding permission indicator
  const mapped = docs.map((doc) => {
    const isOwner = doc.owner_id === user.id;
    const grant = isOwner ? null : dataStore.getActivePermission(doc.id, user.id);

    return {
      id: doc.id,
      name: doc.name,
      description: doc.description,
      category: doc.category,
      mime_type: doc.mime_type,
      file_size: doc.file_size,
      owner_id: doc.owner_id,
      owner: doc.owner,
      status: doc.status,
      created_at: doc.created_at,
      updated_at: doc.updated_at,
      access_level: isOwner ? 'OWNER' : grant ? grant.permission : user.role === 'ADMIN' ? 'METADATA_ONLY' : 'NONE',
    };
  });

  return NextResponse.json({ documents: mapped, total: mapped.length });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  if (user.role === 'VIEWER') {
    return NextResponse.json(
      { error: 'Viewer role does not have permission to upload new documents. Only Owners and Administrators may upload.' },
      { status: 403 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const description = (formData.get('description') as string) || '';
    const category = (formData.get('category') as string) || 'General';

    if (!file) {
      return NextResponse.json({ error: 'No file provided in form data.' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { doc, error } = dataStore.insertDocument(
      user,
      buffer,
      file.name,
      description,
      category
    );

    if (error || !doc) {
      return NextResponse.json({ error: error || 'Failed to upload document.' }, { status: 400 });
    }

    // Read existing custom documents and append new upload
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(DOCUMENTS_COOKIE_NAME)?.value;
    const existingDocs = existingCookie ? verifyDocumentsToken(existingCookie) : [];
    const updatedDocs = [doc, ...existingDocs.filter((d) => d.id !== doc.id)].slice(0, 15);
    const docsToken = createDocumentsToken(updatedDocs);

    const response = NextResponse.json({ success: true, document: doc }, { status: 201 });
    response.cookies.set(DOCUMENTS_COOKIE_NAME, docsToken, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
