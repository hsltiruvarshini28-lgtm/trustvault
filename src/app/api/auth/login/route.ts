import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dataStore } from '@/lib/data/store';
import { SESSION_COOKIE_NAME } from '@/lib/auth/session';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required.' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cookieStore = await cookies();

    // 1. Verify credentials against local secure store
    const localCheck = dataStore.verifyCredentials(cleanEmail, password);

    if (localCheck.valid && localCheck.user) {
      // Set secure session cookie
      cookieStore.set(SESSION_COOKIE_NAME, localCheck.user.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
      });

      dataStore.appendAuditLog({
        actor_user_id: localCheck.user.id,
        document_id: null,
        action: 'USER_LOGIN',
        result: 'ALLOWED',
        request_id: `req-auth-${Date.now()}`,
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser',
        metadata: { email: cleanEmail, role: localCheck.user.role },
      });

      return NextResponse.json({
        success: true,
        user: localCheck.user,
        message: 'Signed in successfully.',
      });
    }

    if (localCheck.user && localCheck.user.status === 'DISABLED') {
      dataStore.appendAuditLog({
        actor_user_id: localCheck.user.id,
        document_id: null,
        action: 'USER_LOGIN',
        result: 'DENIED',
        request_id: `req-auth-${Date.now()}`,
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser',
        metadata: { email: cleanEmail, reason: 'Account disabled' },
      });

      return NextResponse.json(
        { error: localCheck.reason || 'Your account has been disabled. Contact an administrator.' },
        { status: 403 }
      );
    }

    // 2. Try Supabase Auth if credentials are configured
    try {
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

      if (error || !data.user) {
        const friendlyError =
          error?.message && error.message !== 'fetch failed'
            ? error.message
            : 'Invalid user email or password.';

        dataStore.appendAuditLog({
          actor_user_id: null,
          document_id: null,
          action: 'USER_LOGIN',
          result: 'DENIED',
          request_id: `req-auth-${Date.now()}`,
          ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
          user_agent: req.headers.get('user-agent') || 'Browser',
          metadata: { email: cleanEmail, reason: friendlyError },
        });

        return NextResponse.json({ error: friendlyError }, { status: 401 });
      }

      const userProfile =
        dataStore.getProfileById(data.user.id) ||
        dataStore.getProfileByEmail(data.user.email || '');

      if (userProfile?.status === 'DISABLED') {
        await supabase.auth.signOut();
        return NextResponse.json({ error: 'Your account is disabled.' }, { status: 403 });
      }

      dataStore.appendAuditLog({
        actor_user_id: data.user.id,
        document_id: null,
        action: 'USER_LOGIN',
        result: 'ALLOWED',
        request_id: `req-auth-${Date.now()}`,
        ip_address: req.headers.get('x-forwarded-for') || '127.0.0.1',
        user_agent: req.headers.get('user-agent') || 'Browser',
        metadata: { email: cleanEmail },
      });

      return NextResponse.json({
        success: true,
        user: userProfile || {
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.user_metadata?.full_name || 'User',
          role: 'VIEWER',
          status: 'ACTIVE',
        },
      });
    } catch {
      return NextResponse.json({ error: 'Invalid user email or password.' }, { status: 401 });
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Login failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
