import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q')?.toLowerCase() || '';
  const category = searchParams.get('category') || '';

  // Get strictly authorized documents
  let docs = dataStore.getVisibleDocuments(user);

  if (query) {
    docs = docs.filter(
      (d) =>
        d.name.toLowerCase().includes(query) ||
        (d.description && d.description.toLowerCase().includes(query))
    );
  }

  if (category && category !== 'All') {
    docs = docs.filter((d) => d.category.toLowerCase() === category.toLowerCase());
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

    return NextResponse.json({ success: true, document: doc }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Upload failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
