import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';

export async function GET() {
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

  const profiles = dataStore.getAllProfiles();

  return NextResponse.json({
    users: profiles.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      email: p.email,
      role: p.role,
      status: p.status,
      created_at: p.created_at,
    })),
  });
}
