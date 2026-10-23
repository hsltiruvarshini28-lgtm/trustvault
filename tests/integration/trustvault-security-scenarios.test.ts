import { describe, it, expect, beforeEach } from 'vitest';
import { dataStore, SEED_PROFILES } from '@/lib/data/store';
import { canAccessDocument } from '@/lib/auth/authorization';
import {
  validateUploadedFile,
  sanitizeFilename,
  MAX_FILE_SIZE_BYTES,
} from '@/lib/storage/file-validator';
import { verifyAuditTrailIntegrity } from '@/lib/audit/audit-logger';

describe('TrustVault Complete Security & Access Control Lifecycle', () => {
  beforeEach(() => {
    dataStore.reset();
  });

  const userA = SEED_PROFILES.find((p) => p.email === 'alice@trustvault.local')!;
  const userB = SEED_PROFILES.find((p) => p.email === 'bob@trustvault.local')!;
  const userC = SEED_PROFILES.find((p) => p.email === 'charlie@trustvault.local')!;
  const admin = SEED_PROFILES.find((p) => p.email === 'admin@trustvault.local')!;

  it('executes full end-to-end multi-user document lifecycle according to security specification', () => {
    // -------------------------------------------------------------
    // Step 1: User A uploads a dummy confidential document
    // -------------------------------------------------------------
    const dummyPdfContent = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<< /Title (Dummy Test Contract) >>\nendobj\ntrailer\n<< /Root 1 0 R >>\n%%EOF'
    );
    const validation = validateUploadedFile(dummyPdfContent, 'vendor-contract-2026.pdf');
    expect(validation.valid).toBe(true);
    expect(validation.detectedMimeType).toBe('application/pdf');

    const insertResult = dataStore.insertDocument(
      userA,
      dummyPdfContent,
      'vendor-contract-2026.pdf',
      'Confidential dummy contract for security validation',
      'Legal'
    );
    expect(insertResult.error).toBeUndefined();
    const uploadedDoc = insertResult.doc;
    expect(uploadedDoc).toBeDefined();
    expect(uploadedDoc.owner_id).toBe(userA.id);

    // -------------------------------------------------------------
    // Step 2: User B attempts to access/download without permission
    // -------------------------------------------------------------
    const initialPermB = dataStore.getActivePermission(uploadedDoc.id, userB.id);
    expect(initialPermB).toBeNull();

    const unauthorizedDecision = canAccessDocument(userB, uploadedDoc, 'download', initialPermB);
    expect(unauthorizedDecision.allowed).toBe(false);
    expect(unauthorizedDecision.statusCode).toBe(403);
    expect(unauthorizedDecision.reason).toContain('Access denied');

    // Record the denied access attempt in the audit log
    dataStore.appendAuditLog({
      action: 'DOCUMENT_DOWNLOAD',
      result: 'DENIED',
      actor_user_id: userB.id,
      document_id: uploadedDoc.id,
      request_id: 'req-test-denied',
      ip_address: '127.0.0.1',
      user_agent: 'VitestSecurityRunner/1.0',
      metadata: { reason: unauthorizedDecision.reason, attemptedAction: 'download' },
    });

    // -------------------------------------------------------------
    // Step 3: User A grants User B READ access
    // -------------------------------------------------------------
    const grantResult = dataStore.grantPermission(uploadedDoc.id, userA, userB.id, 'READ');
    expect(grantResult.success).toBe(true);

    const activePermB = dataStore.getActivePermission(uploadedDoc.id, userB.id);
    expect(activePermB).not.toBeNull();
    expect(activePermB?.permission).toBe('READ');

    // -------------------------------------------------------------
    // Step 4: Verify User B can access ONLY the specifically authorised document
    // -------------------------------------------------------------
    const authorizedDownload = canAccessDocument(userB, uploadedDoc, 'download', activePermB);
    expect(authorizedDownload.allowed).toBe(true);
    expect(authorizedDownload.statusCode).toBe(200);

    // Verify User B cannot access User A's other private document (e.g. Doc 3 - Board Minutes)
    const privateDoc3 = dataStore.getDocumentById('cccccccc-cccc-4ccc-cccc-cccccccccccc')!;
    const permBDoc3 = dataStore.getActivePermission(privateDoc3.id, userB.id);
    const unauthorizedOtherDoc = canAccessDocument(userB, privateDoc3, 'download', permBDoc3);
    expect(unauthorizedOtherDoc.allowed).toBe(false);
    expect(unauthorizedOtherDoc.statusCode).toBe(403);

    // -------------------------------------------------------------
    // Step 5: Verify User B cannot edit or delete with read-only permission
    // -------------------------------------------------------------
    const editDecision = canAccessDocument(userB, uploadedDoc, 'edit_metadata', activePermB);
    expect(editDecision.allowed).toBe(false);
    expect(editDecision.statusCode).toBe(403);
    expect(editDecision.reason).toContain('EDIT permission or ownership required');

    const deleteDecision = canAccessDocument(userB, uploadedDoc, 'delete', activePermB);
    expect(deleteDecision.allowed).toBe(false);
    expect(deleteDecision.statusCode).toBe(403);
    expect(deleteDecision.reason).toContain('Only the document owner can delete this document');

    // -------------------------------------------------------------
    // Step 6: User A revokes User B's access -> Immediate denial
    // -------------------------------------------------------------
    const revokeResult = dataStore.revokePermission(uploadedDoc.id, userA, userB.id);
    expect(revokeResult.success).toBe(true);

    const revokedPermB = dataStore.getActivePermission(uploadedDoc.id, userB.id);
    expect(revokedPermB).toBeNull();

    const postRevokeDecision = canAccessDocument(userB, uploadedDoc, 'download', revokedPermB);
    expect(postRevokeDecision.allowed).toBe(false);
    expect(postRevokeDecision.statusCode).toBe(403);
    expect(postRevokeDecision.reason).toContain('Access denied');

    // -------------------------------------------------------------
    // Step 7: Direct document access with modified/nonexistent document IDs
    // -------------------------------------------------------------
    const nonExistentDoc = dataStore.getDocumentById('doc-tampered-id-999');
    expect(nonExistentDoc).toBeUndefined();
    const missingDecision = canAccessDocument(userB, nonExistentDoc, 'download');
    expect(missingDecision.allowed).toBe(false);
    expect(missingDecision.statusCode).toBe(404);

    // -------------------------------------------------------------
    // Step 8: Document searches do not leak unauthorized documents
    // -------------------------------------------------------------
    // User C has no permissions to uploadedDoc
    const userCVisible = dataStore.getVisibleDocuments(userC);
    const userCSearch = userCVisible.filter((d) => d.name.toLowerCase().includes('vendor-contract'));
    expect(userCSearch.length).toBe(0);

    // User A (the owner) searches and finds it
    const userAVisible = dataStore.getVisibleDocuments(userA);
    const userASearch = userAVisible.filter((d) => d.name.toLowerCase().includes('vendor-contract'));
    expect(userASearch.length).toBe(1);
    expect(userASearch[0].id).toBe(uploadedDoc.id);

    // -------------------------------------------------------------
    // Step 9: Audit events exist for all operations and are queryable
    // -------------------------------------------------------------
    const docLogs = dataStore.getAuditLogs(admin, { documentId: uploadedDoc.id });
    const actions = docLogs.map((l) => l.action);
    expect(actions).toContain('DOCUMENT_UPLOAD');
    expect(actions).toContain('DOCUMENT_DOWNLOAD');
    expect(actions).toContain('PERMISSION_GRANT');
    expect(actions).toContain('PERMISSION_REVOKE');

    // -------------------------------------------------------------
    // Step 10: Cryptographic Audit Integrity is verified intact
    // -------------------------------------------------------------
    const integrityCheck = dataStore.verifyIntegrity();
    expect(integrityCheck.valid).toBe(true);
    expect(integrityCheck.totalVerified).toBeGreaterThanOrEqual(docLogs.length);
  });

  it('Administrator role cannot download confidential files without explicit grant', () => {
    const doc3 = dataStore.getDocumentById('cccccccc-cccc-4ccc-cccc-cccccccccccc')!;
    const adminPerm = dataStore.getActivePermission(doc3.id, admin.id);
    expect(adminPerm).toBeNull();

    // Admin can view metadata
    const metaCheck = canAccessDocument(admin, doc3, 'view_metadata', adminPerm);
    expect(metaCheck.allowed).toBe(true);

    // Admin CANNOT download confidential file contents
    const downloadCheck = canAccessDocument(admin, doc3, 'download', adminPerm);
    expect(downloadCheck.allowed).toBe(false);
    expect(downloadCheck.statusCode).toBe(403);
    expect(downloadCheck.reason).toContain('Administrator privilege does not grant access');
  });

  it('Detects tampering in the cryptographic audit trail if any log entry is modified', () => {
    const logs = dataStore.getAuditLogs(admin);
    expect(logs.length).toBeGreaterThan(0);

    // Initial check is valid
    const initialCheck = dataStore.verifyIntegrity();
    expect(initialCheck.valid).toBe(true);

    // Create a tampered copy of logs (oldest first for chain verification)
    const chronologicalLogs = [...logs].reverse();
    const tamperedLogs = JSON.parse(JSON.stringify(chronologicalLogs));

    // Tamper with action or timestamp in an intermediate block
    tamperedLogs[1].action = 'UNAUTHORIZED_TAMPERED_ACTION';

    const tamperResult = verifyAuditTrailIntegrity(tamperedLogs);
    expect(tamperResult.valid).toBe(false);
    expect(tamperResult.brokenAtIndex).toBe(1);
    expect(tamperResult.reason).toContain('Cryptographic signature mismatch');
  });

  it('Rejects malicious file uploads: spoofed extensions, executables, path traversal', () => {
    // 1. Executable with disguised PDF extension
    const exeBuffer = Buffer.from('MZ\x90\x00\x03\x00\x00\x00malicious executable code');
    const exeValidation = validateUploadedFile(exeBuffer, 'report.pdf');
    expect(exeValidation.valid).toBe(false);
    expect(exeValidation.error).toContain('File signature mismatch');

    // 2. Directory traversal in filename
    const traversalSanitized = sanitizeFilename('../../../../etc/passwd.pdf');
    expect(traversalSanitized).not.toContain('../');
    expect(traversalSanitized).toBe('passwd.pdf');

    // 3. Oversized file (exceeds MAX_FILE_SIZE_BYTES)
    const largeBuffer = Buffer.alloc(MAX_FILE_SIZE_BYTES + 1024);
    const oversizedValidation = validateUploadedFile(largeBuffer, 'large-file.pdf');
    expect(oversizedValidation.valid).toBe(false);
    expect(oversizedValidation.error).toContain('exceeds the maximum allowed limit');
  });
});
