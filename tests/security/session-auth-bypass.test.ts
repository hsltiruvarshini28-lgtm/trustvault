import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getCurrentUser,
  SESSION_COOKIE_NAME,
  createSessionToken,
} from '@/lib/auth/session';
import { dataStore, SEED_PROFILES } from '@/lib/data/store';

const { cookieMap } = vi.hoisted(() => {
  return { cookieMap: new Map<string, string>() };
});

vi.mock('next/headers', () => {
  return {
    cookies: async () => ({
      get: (name: string) => {
        const val = cookieMap.get(name);
        return val !== undefined ? { name, value: val } : undefined;
      },
    }),
  };
});

vi.mock('@/lib/supabase/server', () => {
  return {
    createServerSupabaseClient: async () => ({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
    }),
  };
});

describe('Session Authentication Bypass Regression Test', () => {
  const owner = SEED_PROFILES.find((p) => p.role === 'OWNER')!;
  const admin = SEED_PROFILES.find((p) => p.role === 'ADMIN')!;
  const alice = SEED_PROFILES.find((p) => p.email === 'alice@trustvault.local')!;

  beforeEach(() => {
    cookieMap.clear();
    dataStore.reset();
  });

  it('rejects authentication when session cookie is set to seed OWNER UUID', async () => {
    cookieMap.set(SESSION_COOKIE_NAME, owner.id);
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('rejects authentication when session cookie is set to seed ADMIN UUID', async () => {
    cookieMap.set(SESSION_COOKIE_NAME, admin.id);
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('rejects authentication when session cookie is an arbitrary non-token value', async () => {
    cookieMap.set(SESSION_COOKIE_NAME, 'arbitrary-non-token-value-12345');
    const user = await getCurrentUser();
    expect(user).toBeNull();
  });

  it('successfully authenticates with a valid signed token from createSessionToken(alice)', async () => {
    const token = createSessionToken(alice);
    cookieMap.set(SESSION_COOKIE_NAME, token);
    const user = await getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.id).toBe(alice.id);
    expect(user?.email).toBe(alice.email);
    expect(user?.role).toBe(alice.role);
  });
});
