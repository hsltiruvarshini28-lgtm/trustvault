import crypto from 'crypto';

/**
 * Password validation rules for TrustVault:
 * - Minimum 8 characters, maximum 128 characters
 * - At least one uppercase letter (A-Z)
 * - At least one lowercase letter (a-z)
 * - At least one digit (0-9)
 * - At least one special character (!@#$%^&*()_+-=[]{};':"|,.<>/?)
 */
export interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePasswordStrength(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required.'] };
  }

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long.');
  }

  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters.');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must include at least one uppercase letter (A-Z).');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must include at least one lowercase letter (a-z).');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must include at least one number (0-9).');
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must include at least one special character (e.g. !@#$%^&*).');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Cryptographically hashes a plaintext password using scrypt with a random 16-byte salt.
 * Output format: scrypt:<salt_hex>:<derived_key_hex>
 */
export function hashPassword(password: string): string {
  if (!password) {
    throw new Error('Cannot hash empty password.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);

  return `scrypt:${salt}:${derivedKey.toString('hex')}`;
}

/**
 * Verifies a plaintext password against a stored scrypt hash using timing-safe comparison.
 */
export function verifyPassword(password: string, storedHash: string): boolean {
  if (!password || !storedHash) {
    return false;
  }

  const parts = storedHash.split(':');
  if (parts.length !== 3 || parts[0] !== 'scrypt') {
    return false;
  }

  const salt = parts[1];
  const originalDerivedKeyHex = parts[2];

  try {
    const keyBuffer = Buffer.from(originalDerivedKeyHex, 'hex');
    const computedKeyBuffer = crypto.scryptSync(password, salt, keyBuffer.length);

    if (keyBuffer.length !== computedKeyBuffer.length) {
      return false;
    }

    return crypto.timingSafeEqual(keyBuffer, computedKeyBuffer);
  } catch {
    return false;
  }
}

/**
 * RFC 5322 compliant basic email format validation.
 */
export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return emailRegex.test(trimmed);
}
