import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { dataStore } from '@/lib/data/store';
import {
  SESSION_COOKIE_NAME,
  ACCOUNT_COOKIE_NAME,
  createSessionToken,
  createAccountRecordToken,
} from '@/lib/auth/session';
import { validatePasswordStrength, isValidEmail } from '@/lib/auth/password';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { full_name, email, password, confirmPassword } = body;

    // 1. Required field checks
    if (!full_name || typeof full_name !== 'string' || !full_name.trim()) {
      return NextResponse.json(
        { error: 'Full name is required.' },
        { status: 400 }
      );
    }

    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: 'Email address is required.' },
        { status: 400 }
      );
    }

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Password is required.' },
        { status: 400 }
      );
    }

    if (!confirmPassword || typeof confirmPassword !== 'string') {
      return NextResponse.json(
        { error: 'Please confirm your password.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = full_name.trim();

    // 2. Email format validation
    if (!isValidEmail(cleanEmail)) {
      return NextResponse.json(
        { error: 'Please provide a valid email address (e.g. name@company.com).' },
        { status: 400 }
      );
    }

    // 3. Password confirmation equality check
    if (password !== confirmPassword) {
      return NextResponse.json(
        { error: 'Passwords do not match. Please verify your password confirmation.' },
        { status: 400 }
      );
    }

    // 4. Password strength validation
    const strength = validatePasswordStrength(password);
    if (!strength.valid) {
      return NextResponse.json(
        { error: strength.errors[0] || 'Password does not meet security requirements.' },
        { status: 400 }
      );
    }

    // 5. Register in resilient secure store
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = req.headers.get('user-agent') || 'Browser';

    const regResult = dataStore.registerUser({
      full_name: cleanName,
      email: cleanEmail,
      password,
      role: 'VIEWER',
      ip_address: clientIp,
      user_agent: userAgent,
    });

    if (!regResult.success || !regResult.user) {
      const isDuplicate = regResult.error?.includes('already exists');
      return NextResponse.json(
        { error: regResult.error || 'Failed to register account.' },
        { status: isDuplicate ? 409 : 400 }
      );
    }

    // 6. Best-effort Supabase Auth synchronization if configured
    try {
      const supabase = await createServerSupabaseClient();
      await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
          },
        },
      });
    } catch {
      // Local cryptographic store handles primary persistence
    }

    // 7. Auto-authenticate newly registered user with signed HMAC session token
    const cookieStore = await cookies();
    const sessionToken = createSessionToken(regResult.user);
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // 8. Set signed account record for persistent re-authentication across serverless instances
    if (regResult.password_hash) {
      const accountToken = createAccountRecordToken({
        id: regResult.user.id,
        email: regResult.user.email,
        full_name: regResult.user.full_name,
        role: regResult.user.role,
        status: regResult.user.status,
        password_hash: regResult.password_hash,
        created_at: regResult.user.created_at,
      });

      cookieStore.set(ACCOUNT_COOKIE_NAME, accountToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    return NextResponse.json(
      {
        success: true,
        user: regResult.user,
        message: 'Account registered successfully. Welcome to TrustVault.',
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed unexpectedly.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
