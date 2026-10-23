import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';
import { UserProfile, UserRole, AccountStatus } from '@/types';
import { dataStore } from '@/lib/data/store';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const SESSION_COOKIE_NAME = 'trustvault_session_id';
export const ACCOUNT_COOKIE_NAME = 'trustvault_account_record';

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'trustvault_zero_trust_enterprise_secure_token_secret_2026';

export interface SessionPayload {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  iat: number;
  exp: number;
}

export interface StoredAccount {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  status: AccountStatus;
  password_hash: string;
  created_at: string;
}

function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

function hmacSha256(data: string, secret: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(data);
  return hmac
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function safeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}

/**
 * Creates a cryptographically signed HMAC-SHA256 session token.
 * Valid across all serverless lambda containers.
 */
export function createSessionToken(user: UserProfile): string {
  const payload: SessionPayload = {
    id: user.id,
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    status: user.status,
    created_at: user.created_at,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24, // 24 hours
  };

  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(payload));
  const sig = hmacSha256(`${header}.${body}`, SESSION_SECRET);
  return `${header}.${body}.${sig}`;
}

/**
 * Cryptographically verifies an HMAC-SHA256 session token.
 */
export function verifySessionToken(token: string): SessionPayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, bodyB64, sig] = parts;
  const expectedSig = hmacSha256(`${headerB64}.${bodyB64}`, SESSION_SECRET);

  if (!safeCompare(sig, expectedSig)) {
    return null; // Tamper detected or invalid signature
  }

  try {
    const payload = JSON.parse(base64UrlDecode(bodyB64)) as SessionPayload;
    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp < nowSec) {
      return null; // Session expired
    }
    if (payload.status === 'DISABLED') {
      return null; // Account disabled
    }
    return payload;
  } catch {
    return null;
  }
}

/**
 * Creates an HMAC-signed account registry token for persistent re-authentication.
 */
export function createAccountRecordToken(account: StoredAccount): string {
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'ACCOUNT' }));
  const body = base64UrlEncode(JSON.stringify(account));
  const sig = hmacSha256(`${header}.${body}`, SESSION_SECRET);
  return `${header}.${body}.${sig}`;
}

/**
 * Verifies an HMAC-signed account registry token.
 */
export function verifyAccountRecordToken(token: string): StoredAccount | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  const [headerB64, bodyB64, sig] = parts;
  const expectedSig = hmacSha256(`${headerB64}.${bodyB64}`, SESSION_SECRET);

  if (!safeCompare(sig, expectedSig)) {
    return null;
  }

  try {
    return JSON.parse(base64UrlDecode(bodyB64)) as StoredAccount;
  } catch {
    return null;
  }
}

/**
 * Resolves the authenticated user from server-side cookies or verified Supabase session.
 * Enforces account status checks (rejects DISABLED accounts) and restores profiles across
 * serverless lambda instances.
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const cookieStore = await cookies();

  // 1. Check Supabase Auth session first
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (authUser) {
      // Look up profile in database/store
      const profile =
        dataStore.getProfileById(authUser.id) ||
        dataStore.getProfileByEmail(authUser.email || '');
      if (profile) {
        if (profile.status === 'DISABLED') {
          return null; // Disabled accounts cannot access protected resources
        }
        return profile;
      }
    }
  } catch {
    // Fall back to session token if Supabase credentials are not configured
  }

  // 2. Check TrustVault active session token
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionToken) {
    // A. Verify signed HMAC token
    const payload = verifySessionToken(sessionToken);
    if (payload) {
      // Ensure profile exists in dataStore on this serverless instance
      let profile = dataStore.getProfileById(payload.id);
      if (!profile) {
        profile = {
          id: payload.id,
          email: payload.email,
          full_name: payload.full_name,
          role: payload.role,
          status: payload.status,
          created_at: payload.created_at || new Date().toISOString(),
          updated_at: payload.created_at || new Date().toISOString(),
        };
        dataStore.ensureProfile(profile);
      }

      if (profile.status === 'DISABLED') {
        return null;
      }
      return profile;
    }

    // B. Backward compatibility for legacy UUID session cookies (e.g. seeded demo accounts)
    const seedProfile = dataStore.getProfileById(sessionToken);
    if (seedProfile && seedProfile.status === 'ACTIVE') {
      return seedProfile;
    }
  }

  return null;
}

/**
 * Throws or returns 401/403 if the session is absent or disabled.
 */
export async function requireAuth(): Promise<{ user: UserProfile } | { error: string; status: number }> {
  const user = await getCurrentUser();
  if (!user) {
    return { error: 'Authentication required. Please sign in.', status: 401 };
  }
  if (user.status === 'DISABLED') {
    return { error: 'Your account has been disabled by an administrator.', status: 403 };
  }
  return { user };
}
