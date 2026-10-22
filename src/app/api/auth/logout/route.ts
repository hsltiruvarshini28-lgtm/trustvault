import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getCurrentUser, SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const cookieStore = await cookies();

    // 1. Invalidate Supabase session if active
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signOut();
    } catch {
      // Ignored if using cookie session
    }

    // 2. Clear TrustVault session cookie
    cookieStore.delete(SESSION_COOKIE_NAME);

    // 3. Log audit event if user was identified
    if (user) {
      dataStore.appendAuditLog({
        actor_user_id: user.id,
        document_id: null,
        action: 'USER_LOGOUT',
        result: 'ALLOWED',
        request_id: `req-logout-${Date.now()}`,
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser',
        metadata: { email: user.email },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'You have signed out successfully.',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sign out failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
