import { describe, it, expect, beforeEach } from 'vitest';
import { dataStore, SEED_PROFILES, SEED_DOCUMENTS } from '@/lib/data/store';
import { canAccessDocument } from '@/lib/auth/authorization';

describe('Immediate Access Revocation and Security Scenarios', () => {
  beforeEach(() => {
    dataStore.reset();
  });

  const alice = SEED_PROFILES.find((p) => p.email === 'alice@trustvault.local')!;
  const bob = SEED_PROFILES.find((p) => p.email === 'bob@trustvault.local')!;
  const charlie = SEED_PROFILES.find((p) => p.email === 'charlie@trustvault.local')!;
  const admin = SEED_PROFILES.find((p) => p.email === 'admin@trustvault.local')!;
  const disabledEve = SEED_PROFILES.find((p) => p.email === 'eve@trustvault.local')!;

  const doc1 = SEED_DOCUMENTS[0]; // Q3-Financial-Audit-Report.pdf (shared with Bob READ)
  const doc2 = SEED_DOCUMENTS[1]; // Zero-Trust-Architecture-Plan.docx (shared with Bob EDIT)
  const doc3 = SEED_DOCUMENTS[2]; // Board Minutes (Strictly Private to Alice)

  it('verifies Bob has initial READ access to Document 1', () => {
    const grant = dataStore.getActivePermission(doc1.id, bob.id);
    expect(grant).not.toBeNull();
    expect(grant?.permission).toBe('READ');

    const decision = canAccessDocument(bob, doc1, 'download', grant);
    expect(decision.allowed).toBe(true);
  });

  it('Case 17: verifies disabled account (Eve) is denied access immediately', () => {
    const decision = canAccessDocument(disabledEve, doc1, 'download');
    expect(decision.allowed).toBe(false);
    expect(decision.reason).toContain('Account is disabled');
  });

  it('MANDATORY REQUIREMENT: Alice revokes Bob access -> Bob next request immediately DENIED', () => {
    // 1. Initial request succeeds
    const grantBefore = dataStore.getActivePermission(doc1.id, bob.id);
    expect(canAccessDocument(bob, doc1, 'download', grantBefore).allowed).toBe(true);

    // 2. Alice revokes Bob's permission
    const revokeResult = dataStore.revokePermission(doc1.id, alice, bob.id);
    expect(revokeResult.success).toBe(true);

    // 3. Bob's IMMEDIATE NEXT request fails
    const grantAfter = dataStore.getActivePermission(doc1.id, bob.id);
    expect(grantAfter).toBeNull(); // No active permission

    const decisionAfter = canAccessDocument(bob, doc1, 'download', grantAfter);
    expect(decisionAfter.allowed).toBe(false);
    expect(decisionAfter.statusCode).toBe(403);
    expect(decisionAfter.reason).toContain('Access denied');

    // 4. Verify an audit event for PERMISSION_REVOKE was appended
    const logs = dataStore.getAuditLogs(admin, { documentId: doc1.id });
    const revokeLog = logs.find((l) => l.action === 'PERMISSION_REVOKE');
    expect(revokeLog).toBeDefined();
    expect(revokeLog?.result).toBe('ALLOWED');
    expect(revokeLog?.actor_user_id).toBe(alice.id);
  });

  it('Case 8: Charlie attempts to download Document 1 without permission -> DENIED', () => {
    const grant = dataStore.getActivePermission(doc1.id, charlie.id);
    expect(grant).toBeNull();

    const decision = canAccessDocument(charlie, doc1, 'download', grant);
    expect(decision.allowed).toBe(false);
    expect(decision.statusCode).toBe(403);
  });

  it('Case 16: User attempts to grant themselves access -> REJECTED', () => {
    const result = dataStore.grantPermission(doc3.id, bob, bob.id, 'READ');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Only the document owner can manage access permissions');
  });

  it('Case 21: Failed authorization creates a DENIED audit event', () => {
    // Charlie tries to delete Alice's document
    const delResult = dataStore.deleteDocument(doc1.id, charlie);
    expect(delResult.success).toBe(false);

    const logs = dataStore.getAuditLogs(admin, { documentId: doc1.id });
    const deniedDelLog = logs.find((l) => l.action === 'DOCUMENT_DELETE' && l.result === 'DENIED');
    expect(deniedDelLog).toBeDefined();
    expect(deniedDelLog?.actor_user_id).toBe(charlie.id);
  });

  it('Case 23: Document listing does not reveal unauthorized metadata to Charlie', () => {
    const charlieVisible = dataStore.getVisibleDocuments(charlie);
    // Charlie has no owned documents and no shared documents
    expect(charlieVisible.length).toBe(0);

    const bobVisible = dataStore.getVisibleDocuments(bob);
    // Bob should see Doc 1 and Doc 2 (shared), but NOT Doc 3 (strictly private to Alice)
    const bobDocIds = bobVisible.map((d) => d.id);
    expect(bobDocIds).toContain(doc1.id);
    expect(bobDocIds).toContain(doc2.id);
    expect(bobDocIds).not.toContain(doc3.id);
  });

  it('verifies audit trail remains cryptographically valid after multiple grant/revoke operations', () => {
    // Perform operations
    dataStore.grantPermission(doc3.id, alice, bob.id, 'READ');
    dataStore.revokePermission(doc3.id, alice, bob.id);

    // Check integrity
    const integrity = dataStore.verifyIntegrity();
    if (!integrity.valid) {
      console.error('Integrity failure:', integrity);
    }
    expect(integrity.valid).toBe(true);
    expect(integrity.totalVerified).toBeGreaterThan(3);
  });
});
