import { cookies } from 'next/headers';
import { UserProfile } from '@/types';
import { dataStore } from '@/lib/data/store';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export const SESSION_COOKIE_NAME = 'trustvault_session_id';

/**
 * Resolves the authenticated user from server-side cookies or verified Supabase session.
 * Enforces account status checks (rejects DISABLED accounts).
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
      const profile = dataStore.getProfileById(authUser.id) || dataStore.getProfileByEmail(authUser.email || '');
      if (profile) {
        if (profile.status === 'DISABLED') {
          return null; // Disabled accounts cannot access protected resources
        }
        return profile;
      }
    }
  } catch {
    // Fall back to session cookie if Supabase credentials are not yet configured
  }

  // 2. Check TrustVault active session cookie
  const sessionUserId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (sessionUserId) {
    const profile = dataStore.getProfileById(sessionUserId);
    if (profile && profile.status === 'ACTIVE') {
      return profile;
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
