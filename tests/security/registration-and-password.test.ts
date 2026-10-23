import { describe, it, expect, beforeEach } from 'vitest';
import { dataStore } from '@/lib/data/store';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isValidEmail,
} from '@/lib/auth/password';

describe('User Registration & Password Security Suite', () => {
  beforeEach(() => {
    dataStore.reset();
  });

  // ------------------------------------------------------------------
  // 1. Password Strength Validation
  // ------------------------------------------------------------------
  describe('Password Strength Validation', () => {
    it('rejects passwords shorter than 8 characters', () => {
      const res = validatePasswordStrength('Short1!');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Password must be at least 8 characters long.');
    });

    it('rejects passwords without an uppercase letter', () => {
      const res = validatePasswordStrength('lowercase123!');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Password must include at least one uppercase letter (A-Z).');
    });

    it('rejects passwords without a lowercase letter', () => {
      const res = validatePasswordStrength('UPPERCASE123!');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Password must include at least one lowercase letter (a-z).');
    });

    it('rejects passwords without a numeric character', () => {
      const res = validatePasswordStrength('NoNumbersHere!');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain('Password must include at least one number (0-9).');
    });

    it('rejects passwords without a special character', () => {
      const res = validatePasswordStrength('NoSpecialChar123');
      expect(res.valid).toBe(false);
      expect(res.errors).toContain(
        'Password must include at least one special character (e.g. !@#$%^&*).'
      );
    });

    it('accepts compliant passwords meeting reasonable enterprise security rules', () => {
      const res = validatePasswordStrength('EnterpriseVault@2026');
      expect(res.valid).toBe(true);
      expect(res.errors.length).toBe(0);
    });
  });

  // ------------------------------------------------------------------
  // 2. Cryptographic Password Hashing & Timing-Safe Verification
  // ------------------------------------------------------------------
  describe('Cryptographic Hashing & Storage', () => {
    it('produces unique salt hashes for identical passwords', () => {
      const hash1 = hashPassword('IdenticalPass123!');
      const hash2 = hashPassword('IdenticalPass123!');

      expect(hash1).not.toBe(hash2);
      expect(hash1.startsWith('scrypt:')).toBe(true);
      expect(hash2.startsWith('scrypt:')).toBe(true);
      // Plaintext password must never appear in the hash output
      expect(hash1).not.toContain('IdenticalPass123!');
    });

    it('correctly verifies valid password against scrypt hash', () => {
      const hash = hashPassword('SecureVaultPass#99');
      const isValid = verifyPassword('SecureVaultPass#99', hash);
      expect(isValid).toBe(true);
    });

    it('rejects incorrect passwords against scrypt hash', () => {
      const hash = hashPassword('SecureVaultPass#99');
      const isInvalid = verifyPassword('WrongPassword#99', hash);
      expect(isInvalid).toBe(false);
    });

    it('fails safely when hash format is malformed or invalid', () => {
      expect(verifyPassword('pass', '')).toBe(false);
      expect(verifyPassword('pass', 'invalid-hash-string')).toBe(false);
      expect(verifyPassword('pass', 'md5:badhash:12345')).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // 3. Email Format Validation
  // ------------------------------------------------------------------
  describe('Email Format Validation', () => {
    it('validates standard email addresses', () => {
      expect(isValidEmail('sarah@trustvault.local')).toBe(true);
      expect(isValidEmail('user.name+tag@company.co.uk')).toBe(true);
    });

    it('rejects malformed email addresses', () => {
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user @domain.com')).toBe(false);
    });
  });

  // ------------------------------------------------------------------
  // 4. User Registration in Data Store
  // ------------------------------------------------------------------
  describe('User Registration Endpoint & Data Operations', () => {
    it('successfully registers a new user with valid credentials', () => {
      const result = dataStore.registerUser({
        full_name: 'Sarah Connor',
        email: 'sarah@cyberdyne.sec',
        password: 'ValidPassword123!',
      });

      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.full_name).toBe('Sarah Connor');
      expect(result.user?.email).toBe('sarah@cyberdyne.sec');
      expect(result.user?.role).toBe('VIEWER');
      expect(result.user?.status).toBe('ACTIVE');

      // Verify user is retrievable by ID and email
      const byEmail = dataStore.getProfileByEmail('sarah@cyberdyne.sec');
      expect(byEmail).toBeDefined();
      expect(byEmail?.id).toBe(result.user?.id);
    });

    it('rejects registration with missing required fields', () => {
      const noName = dataStore.registerUser({
        full_name: '',
        email: 'test@vault.sec',
        password: 'Password123!',
      });
      expect(noName.success).toBe(false);
      expect(noName.error).toContain('Full name is required');

      const noEmail = dataStore.registerUser({
        full_name: 'Test User',
        email: '',
        password: 'Password123!',
      });
      expect(noEmail.success).toBe(false);
      expect(noEmail.error).toContain('Email address is required');

      const noPass = dataStore.registerUser({
        full_name: 'Test User',
        email: 'test@vault.sec',
        password: '',
      });
      expect(noPass.success).toBe(false);
      expect(noPass.error).toContain('Password is required');
    });

    it('rejects duplicate email registrations', () => {
      // First registration succeeds
      const first = dataStore.registerUser({
        full_name: 'John Doe',
        email: 'duplicate@vault.sec',
        password: 'StrongPassword1!',
      });
      expect(first.success).toBe(true);

      // Second registration with same email (even with different case) fails
      const second = dataStore.registerUser({
        full_name: 'Johnathan Doe',
        email: 'DUPLICATE@vault.sec',
        password: 'AnotherStrongPassword2@',
      });
      expect(second.success).toBe(false);
      expect(second.error).toContain('already exists');
    });

    it('rejects duplicate registration against existing seeded users (Alice)', () => {
      const duplicate = dataStore.registerUser({
        full_name: 'Imposter Alice',
        email: 'alice@trustvault.local',
        password: 'NewPassword999!',
      });

      expect(duplicate.success).toBe(false);
      expect(duplicate.error).toContain('already exists');
    });

    it('appends a USER_REGISTER audit log maintaining cryptographic chain integrity', () => {
      const result = dataStore.registerUser({
        full_name: 'Audited Registrant',
        email: 'audited@vault.sec',
        password: 'SecureAudit123$',
      });
      expect(result.success).toBe(true);

      // Verify audit trail integrity remains intact
      const integrity = dataStore.verifyIntegrity();
      expect(integrity.valid).toBe(true);

      // Verify the USER_REGISTER event is recorded
      const logs = dataStore.getAuditLogs({
        id: result.user!.id,
        full_name: 'Audited Registrant',
        email: 'audited@vault.sec',
        role: 'VIEWER',
        status: 'ACTIVE',
        created_at: '',
        updated_at: '',
      });

      const regEvent = logs.find((l) => l.action === 'USER_REGISTER');
      expect(regEvent).toBeDefined();
      expect(regEvent?.result).toBe('ALLOWED');
    });
  });

  // ------------------------------------------------------------------
  // 5. Subsequent Authentication Flow
  // ------------------------------------------------------------------
  describe('Subsequent Login Verification', () => {
    it('authenticates newly registered user with their correct password', () => {
      dataStore.registerUser({
        full_name: 'Login Tester',
        email: 'login-test@vault.sec',
        password: 'MyPassword123#',
      });

      const auth = dataStore.verifyCredentials('login-test@vault.sec', 'MyPassword123#');
      expect(auth.valid).toBe(true);
      expect(auth.user?.email).toBe('login-test@vault.sec');
    });

    it('rejects newly registered user with an incorrect password', () => {
      dataStore.registerUser({
        full_name: 'Login Tester',
        email: 'login-test@vault.sec',
        password: 'MyPassword123#',
      });

      const auth = dataStore.verifyCredentials('login-test@vault.sec', 'WrongPassword123#');
      expect(auth.valid).toBe(false);
      expect(auth.reason).toContain('Invalid user email or password');
    });

    it('rejects login if newly registered account is disabled by admin', () => {
      const reg = dataStore.registerUser({
        full_name: 'Lockout Target',
        email: 'lockout@vault.sec',
        password: 'TargetPass123!',
      });

      // Administrator disables account
      dataStore.updateProfileStatus(reg.user!.id, 'DISABLED');

      const auth = dataStore.verifyCredentials('lockout@vault.sec', 'TargetPass123!');
      expect(auth.valid).toBe(false);
      expect(auth.reason).toContain('account has been disabled');
    });

    it('verifies existing seeded demo users authenticate correctly with default password', () => {
      const aliceAuth = dataStore.verifyCredentials('alice@trustvault.local', 'DemoPassword123!');
      expect(aliceAuth.valid).toBe(true);
      expect(aliceAuth.user?.role).toBe('OWNER');

      const bobAuth = dataStore.verifyCredentials('bob@trustvault.local', 'DemoPassword123!');
      expect(bobAuth.valid).toBe(true);
      expect(bobAuth.user?.role).toBe('VIEWER');

      // Wrong password fails for demo accounts
      const wrongAuth = dataStore.verifyCredentials('alice@trustvault.local', 'WrongPassword!');
      expect(wrongAuth.valid).toBe(false);
    });

    it('supports secure password updates with hash recomputation', () => {
      const reg = dataStore.registerUser({
        full_name: 'Password Updater',
        email: 'updater@vault.sec',
        password: 'OriginalPassword1!',
      });

      // Update password
      const updateResult = dataStore.updatePassword(reg.user!.id, 'NewStrongPassword2@');
      expect(updateResult.success).toBe(true);

      // Old password no longer works
      const oldCheck = dataStore.verifyCredentials('updater@vault.sec', 'OriginalPassword1!');
      expect(oldCheck.valid).toBe(false);

      // New password works
      const newCheck = dataStore.verifyCredentials('updater@vault.sec', 'NewStrongPassword2@');
      expect(newCheck.valid).toBe(true);
    });
  });
});
