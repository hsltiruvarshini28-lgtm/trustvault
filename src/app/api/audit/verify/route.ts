import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
  }

  // Cryptographic audit verification can be performed by any authenticated user for transparency
  const verification = dataStore.verifyIntegrity();

  return NextResponse.json({
    status: verification.valid ? 'INTACT' : 'TAMPERED',
    ...verification,
    verifiedAt: new Date().toISOString(),
  });
}
