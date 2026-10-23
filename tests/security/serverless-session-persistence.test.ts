import { describe, it, expect, beforeEach } from 'vitest';
import {
  createSessionToken,
  verifySessionToken,
  createAccountRecordToken,
  verifyAccountRecordToken,
} from '@/lib/auth/session';
import { dataStore } from '@/lib/data/store';
import { UserProfile } from '@/types';
import { hashPassword } from '@/lib/auth/password';

describe('Serverless Stateless Session & Account Persistence', () => {
  const mockUser: UserProfile = {
    id: 'test-uuid-9999-4999-a999-999999999999',
    email: 'newuser@trustvault.local',
    full_name: 'New Registered User',
    role: 'VIEWER',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    dataStore.reset();
  });

  describe('Session Token Cryptography', () => {
    it('creates and verifies a valid HMAC-SHA256 session token', () => {
      const token = createSessionToken(mockUser);
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);

      const payload = verifySessionToken(token);
      expect(payload).not.toBeNull();
      expect(payload?.id).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.role).toBe('VIEWER');
      expect(payload?.status).toBe('ACTIVE');
    });

    it('rejects a tampered session token when payload is altered', () => {
      const token = createSessionToken(mockUser);
      const [header, body, sig] = token.split('.');

      // Decode, tamper role from VIEWER to ADMIN, re-encode without correct key
      const decoded = JSON.parse(Buffer.from(body, 'base64').toString('utf8'));
      decoded.role = 'ADMIN';
      const tamperedBody = Buffer.from(JSON.stringify(decoded)).toString('base64').replace(/=/g, '');
      const tamperedToken = `${header}.${tamperedBody}.${sig}`;

      const verified = verifySessionToken(tamperedToken);
      expect(verified).toBeNull();
    });

    it('rejects a token if status is DISABLED', () => {
      const disabledUser: UserProfile = {
        ...mockUser,
        status: 'DISABLED',
      };
      const token = createSessionToken(disabledUser);
      const verified = verifySessionToken(token);
      expect(verified).toBeNull();
    });

    it('rejects malformed or empty tokens', () => {
      expect(verifySessionToken('')).toBeNull();
      expect(verifySessionToken('invalid.token')).toBeNull();
      expect(verifySessionToken('a.b.c.d')).toBeNull();
    });
  });

  describe('Account Registry Token Cryptography', () => {
    it('creates and verifies a signed account record', () => {
      const passwordHash = hashPassword('MySecurePass123!');
      const accountToken = createAccountRecordToken({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.full_name,
        role: mockUser.role,
        status: mockUser.status,
        password_hash: passwordHash,
        created_at: mockUser.created_at,
      });

      expect(typeof accountToken).toBe('string');
      const verified = verifyAccountRecordToken(accountToken);
      expect(verified).not.toBeNull();
      expect(verified?.email).toBe(mockUser.email);
      expect(verified?.password_hash).toBe(passwordHash);
    });

    it('rejects a tampered account record token', () => {
      const passwordHash = hashPassword('MySecurePass123!');
      const accountToken = createAccountRecordToken({
        id: mockUser.id,
        email: mockUser.email,
        full_name: mockUser.full_name,
        role: mockUser.role,
        status: mockUser.status,
        password_hash: passwordHash,
        created_at: mockUser.created_at,
      });

      const [header, body] = accountToken.split('.');
      const fakeSig = 'invalidsignature123';
      const tampered = `${header}.${body}.${fakeSig}`;

      expect(verifyAccountRecordToken(tampered)).toBeNull();
    });
  });

  describe('Cross-Container Cold Start Simulation', () => {
    it('simulates user signup on Container A, and dashboard data load on fresh Container B', () => {
      // Container A: user registers
      const reg = dataStore.registerUser({
        full_name: 'Dr. Jane Smith',
        email: 'jane@trustvault.local',
        password: 'ValidPassword123!',
      });
      expect(reg.success).toBe(true);
      expect(reg.user).toBeDefined();

      const sessionToken = createSessionToken(reg.user!);
      expect(sessionToken).toBeDefined();

      // Simulate Container B cold start: reset dataStore memory to clean state (only seed profiles)
      dataStore.reset();
      expect(dataStore.getProfileById(reg.user!.id)).toBeUndefined();

      // Container B receives GET /dashboard with sessionToken
      const verified = verifySessionToken(sessionToken);
      expect(verified).not.toBeNull();

      // Container B restores profile into local instance
      dataStore.ensureProfile({
        id: verified!.id,
        email: verified!.email,
        full_name: verified!.full_name,
        role: verified!.role,
        status: verified!.status,
        created_at: verified!.created_at,
        updated_at: verified!.created_at,
      });

      // Verification: Container B now has the user and can execute all dashboard operations
      const userOnB = dataStore.getProfileById(verified!.id);
      expect(userOnB).toBeDefined();
      expect(userOnB?.email).toBe('jane@trustvault.local');

      // Dashboard operations
      const visibleDocs = dataStore.getVisibleDocuments(userOnB!);
      expect(Array.isArray(visibleDocs)).toBe(true);

      const auditLogs = dataStore.getAuditLogs(userOnB!);
      expect(Array.isArray(auditLogs)).toBe(true);

      const integrity = dataStore.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });

    it('simulates logout on Container B and re-login on fresh Container C', () => {
      // 1. Initial signup on Container A
      const reg = dataStore.registerUser({
        full_name: 'Dr. John Doe',
        email: 'john@trustvault.local',
        password: 'CorporatePassword123!',
      });
      const accountToken = createAccountRecordToken({
        id: reg.user!.id,
        email: reg.user!.email,
        full_name: reg.user!.full_name,
        role: reg.user!.role,
        status: reg.user!.status,
        password_hash: reg.password_hash!,
        created_at: reg.user!.created_at,
      });

      // 2. Container C cold start: dataStore has NO record of John Doe
      dataStore.reset();
      expect(dataStore.getProfileByEmail('john@trustvault.local')).toBeUndefined();

      // 3. User attempts login on Container C with credentials + accountToken cookie
      const storedAccount = verifyAccountRecordToken(accountToken);
      expect(storedAccount).not.toBeNull();
      expect(storedAccount?.email).toBe('john@trustvault.local');

      // Restore onto Container C
      dataStore.ensureProfile({
        id: storedAccount!.id,
        email: storedAccount!.email,
        full_name: storedAccount!.full_name,
        role: storedAccount!.role,
        status: storedAccount!.status,
        created_at: storedAccount!.created_at,
        updated_at: storedAccount!.created_at,
      });
      dataStore.ensureCredential(storedAccount!.id, storedAccount!.password_hash);

      // 4. Verify login credentials against restored state
      const loginCheck = dataStore.verifyCredentials('john@trustvault.local', 'CorporatePassword123!');
      expect(loginCheck.valid).toBe(true);
      expect(loginCheck.user?.email).toBe('john@trustvault.local');

      // 5. Wrong password fails
      const badCheck = dataStore.verifyCredentials('john@trustvault.local', 'WrongPassword!');
      expect(badCheck.valid).toBe(false);
    });
  });
});
