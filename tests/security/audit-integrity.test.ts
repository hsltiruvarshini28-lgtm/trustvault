import { describe, it, expect } from 'vitest';
import {
  computeEventHash,
  verifyAuditTrailIntegrity,
  GENESIS_HASH,
} from '@/lib/audit/audit-logger';
import { dataStore } from '@/lib/data/store';
import { AuditLogRecord } from '@/types';

describe('Audit Trail Cryptographic Hash Chain and Tamper-Evidence', () => {
  function createTestLog(
    id: string,
    action: string,
    result: 'ALLOWED' | 'DENIED',
    previousHash: string,
    timestamp: string,
    metadata: Record<string, unknown> = {}
  ): AuditLogRecord {
    const rawPayload = {
      id,
      actor_user_id: '11111111-1111-4111-a111-111111111111',
      document_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      action,
      result,
      timestamp,
      request_id: `req-${id}`,
      ip_address: '127.0.0.1',
      user_agent: 'VitestAgent/1.0',
      metadata,
      previous_hash: previousHash,
    };

    const eventHash = computeEventHash(rawPayload);

    return {
      ...rawPayload,
      event_hash: eventHash,
    };
  }

  it('verifies an unbroken, valid audit trail successfully', () => {
    const log1 = createTestLog('ev-1', 'DOCUMENT_UPLOAD', 'ALLOWED', GENESIS_HASH, '2026-10-22T08:00:00.000Z', {
      file: 'test.pdf',
    });
    const log2 = createTestLog('ev-2', 'PERMISSION_GRANT', 'ALLOWED', log1.event_hash, '2026-10-22T08:01:00.000Z', {
      grantedTo: 'bob',
    });
    const log3 = createTestLog('ev-3', 'DOCUMENT_DOWNLOAD', 'DENIED', log2.event_hash, '2026-10-22T08:02:00.000Z', {
      reason: 'FORBIDDEN',
    });

    const chain = [log1, log2, log3];
    const verification = verifyAuditTrailIntegrity(chain);

    expect(verification.valid).toBe(true);
    expect(verification.totalVerified).toBe(3);
    expect(verification.lastHash).toBe(log3.event_hash);
  });

  it('Case 20: detects an altered audit event payload (tamper-evidence)', () => {
    const log1 = createTestLog('ev-1', 'DOCUMENT_UPLOAD', 'ALLOWED', GENESIS_HASH, '2026-10-22T08:00:00.000Z');
    const log2 = createTestLog('ev-2', 'PERMISSION_GRANT', 'ALLOWED', log1.event_hash, '2026-10-22T08:01:00.000Z');

    // Attacker modifies log2 payload without valid cryptographic signature
    const tamperedLog2 = {
      ...log2,
      result: 'DENIED' as const, // Attacker flipped result from ALLOWED to DENIED
    };

    const verification = verifyAuditTrailIntegrity([log1, tamperedLog2]);

    expect(verification.valid).toBe(false);
    expect(verification.brokenAtIndex).toBe(1);
    expect(verification.failedEventId).toBe('ev-2');
    expect(verification.reason).toContain('Cryptographic signature mismatch');
  });

  it('detects a deleted event from the middle of the chain', () => {
    const log1 = createTestLog('ev-1', 'DOCUMENT_UPLOAD', 'ALLOWED', GENESIS_HASH, '2026-10-22T08:00:00.000Z');
    const log2 = createTestLog('ev-2', 'PERMISSION_GRANT', 'ALLOWED', log1.event_hash, '2026-10-22T08:01:00.000Z');
    const log3 = createTestLog('ev-3', 'DOCUMENT_DELETE', 'ALLOWED', log2.event_hash, '2026-10-22T08:02:00.000Z');

    // Attacker removes log2 to hide that access was granted
    const corruptedChain = [log1, log3];
    const verification = verifyAuditTrailIntegrity(corruptedChain);

    expect(verification.valid).toBe(false);
    expect(verification.brokenAtIndex).toBe(1);
    expect(verification.reason).toContain('Hash chain linkage broken');
  });

  it('detects reordered events', () => {
    const log1 = createTestLog('ev-1', 'DOCUMENT_UPLOAD', 'ALLOWED', GENESIS_HASH, '2026-10-22T08:00:00.000Z');
    const log2 = createTestLog('ev-2', 'PERMISSION_GRANT', 'ALLOWED', log1.event_hash, '2026-10-22T08:01:00.000Z');

    // Invert timestamps so chronological sorting fails or previous_hash mismatches
    const invertedLog2 = { ...log2, timestamp: '2026-10-22T07:59:00.000Z' };

    const verification = verifyAuditTrailIntegrity([log1, invertedLog2]);
    expect(verification.valid).toBe(false);
  });

  it('records USER_LOGIN and USER_LOGOUT events with actor identity in dataStore audit trail', () => {
    const adminUser = dataStore.getProfileByEmail('admin@trustvault.local');
    expect(adminUser).toBeDefined();

    // Fetch auth category logs
    const authLogs = dataStore.getAuditLogs(adminUser, { category: 'AUTH' });
    expect(authLogs.length).toBeGreaterThan(0);

    // Verify presence of USER_LOGIN events
    const loginLogs = authLogs.filter((l: any) => l.action === 'USER_LOGIN');
    expect(loginLogs.length).toBeGreaterThan(0);

    const allowedLogin = loginLogs.find((l: any) => l.result === 'ALLOWED');
    expect(allowedLogin).toBeDefined();
    expect(allowedLogin.actor).toBeDefined();
    expect(allowedLogin.actor.email).toBeDefined();
    expect(allowedLogin.actor.full_name).toBeDefined();

    // Verify presence of USER_LOGOUT events
    const logoutLogs = authLogs.filter((l: any) => l.action === 'USER_LOGOUT');
    expect(logoutLogs.length).toBeGreaterThan(0);

    const allowedLogout = logoutLogs.find((l: any) => l.result === 'ALLOWED');
    expect(allowedLogout).toBeDefined();
    expect(allowedLogout.actor).toBeDefined();
    expect(allowedLogout.actor.email).toBeDefined();

    // Verify action filtering
    const loginsOnly = dataStore.getAuditLogs(adminUser, { action: 'USER_LOGIN' });
    expect(loginsOnly.every((l: any) => l.action === 'USER_LOGIN')).toBe(true);

    const logoutsOnly = dataStore.getAuditLogs(adminUser, { action: 'USER_LOGOUT' });
    expect(logoutsOnly.every((l: any) => l.action === 'USER_LOGOUT')).toBe(true);

    // Verify overall integrity remains valid with auth logs included
    const verification = dataStore.verifyIntegrity();
    expect(verification.valid).toBe(true);
  });
});
