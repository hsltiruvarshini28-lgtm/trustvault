import { describe, it, expect } from 'vitest';
import { canAccessDocument } from '@/lib/auth/authorization';
import { UserProfile, DocumentRecord, DocumentPermissionRecord } from '@/types';

describe('Centralized Authorization Engine (canAccessDocument)', () => {
  // Test fixture users
  const aliceOwner: UserProfile = {
    id: '11111111-1111-4111-a111-111111111111',
    full_name: 'Alice Owner',
    email: 'alice@trustvault.local',
    role: 'OWNER',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const bobViewer: UserProfile = {
    id: '22222222-2222-4222-a222-222222222222',
    full_name: 'Bob Viewer',
    email: 'bob@trustvault.local',
    role: 'VIEWER',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const charlieViewer: UserProfile = {
    id: '33333333-3333-4333-a333-333333333333',
    full_name: 'Charlie Viewer',
    email: 'charlie@trustvault.local',
    role: 'VIEWER',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const adminDave: UserProfile = {
    id: '44444444-4444-4444-a444-444444444444',
    full_name: 'Dave Admin',
    email: 'admin@trustvault.local',
    role: 'ADMIN',
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const disabledEve: UserProfile = {
    id: '55555555-5555-4555-a555-555555555555',
    full_name: 'Eve Disabled',
    email: 'eve@trustvault.local',
    role: 'VIEWER',
    status: 'DISABLED',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Test fixture document
  const sampleDoc: DocumentRecord = {
    id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    name: 'Confidential-Audit.pdf',
    description: 'Internal financial audit report',
    category: 'Finance',
    storage_path: '11111111-1111-4111-a111-111111111111/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/doc.pdf',
    mime_type: 'application/pdf',
    file_size: 1048576,
    owner_id: aliceOwner.id,
    status: 'ACTIVE',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Active READ permission grant for Bob
  const bobReadGrant: DocumentPermissionRecord = {
    id: 'p1111111-1111-4111-a111-111111111111',
    document_id: sampleDoc.id,
    user_id: bobViewer.id,
    permission: 'READ',
    granted_by: aliceOwner.id,
    granted_at: new Date().toISOString(),
    revoked_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  // Active EDIT permission grant for Bob
  const bobEditGrant: DocumentPermissionRecord = {
    ...bobReadGrant,
    permission: 'EDIT',
  };

  // Revoked permission grant for Bob
  const bobRevokedGrant: DocumentPermissionRecord = {
    ...bobReadGrant,
    revoked_at: new Date().toISOString(),
  };

  // -------------------------------------------------------------
  // Test Cases
  // -------------------------------------------------------------

  it('Case 1: Unauthenticated user requests a protected document -> 401', () => {
    const decision = canAccessDocument(null, sampleDoc, 'download');
    expect(decision.allowed).toBe(false);
    expect(decision.statusCode).toBe(401);
  });

  it("Case 2: Alice accesses her own document -> ALLOWED (200)", () => {
    const viewDec = canAccessDocument(aliceOwner, sampleDoc, 'view_metadata');
    const dlDec = canAccessDocument(aliceOwner, sampleDoc, 'download');
    const editDec = canAccessDocument(aliceOwner, sampleDoc, 'edit_metadata');
    const delDec = canAccessDocument(aliceOwner, sampleDoc, 'delete');

    expect(viewDec.allowed).toBe(true);
    expect(dlDec.allowed).toBe(true);
    expect(editDec.allowed).toBe(true);
    expect(delDec.allowed).toBe(true);
  });

  it("Case 3: Bob attempts to access Alice's private document without permission -> DENIED (403)", () => {
    const decision = canAccessDocument(bobViewer, sampleDoc, 'download', null);
    expect(decision.allowed).toBe(false);
    expect(decision.statusCode).toBe(403);
  });

  it('Case 4: Bob accesses a document shared with READ permission -> ALLOWED (200)', () => {
    const viewDec = canAccessDocument(bobViewer, sampleDoc, 'view_metadata', bobReadGrant);
    const dlDec = canAccessDocument(bobViewer, sampleDoc, 'download', bobReadGrant);

    expect(viewDec.allowed).toBe(true);
    expect(dlDec.allowed).toBe(true);
  });

  it('Case 5: Bob attempts to edit a READ-only document -> DENIED (403)', () => {
    const editMetaDec = canAccessDocument(bobViewer, sampleDoc, 'edit_metadata', bobReadGrant);
    const replaceFileDec = canAccessDocument(bobViewer, sampleDoc, 'replace_file', bobReadGrant);

    expect(editMetaDec.allowed).toBe(false);
    expect(editMetaDec.statusCode).toBe(403);
    expect(replaceFileDec.allowed).toBe(false);
    expect(replaceFileDec.statusCode).toBe(403);
  });

  it('Case 6: Bob edits a document shared with EDIT permission -> ALLOWED (200)', () => {
    const editMetaDec = canAccessDocument(bobViewer, sampleDoc, 'edit_metadata', bobEditGrant);
    const replaceFileDec = canAccessDocument(bobViewer, sampleDoc, 'replace_file', bobEditGrant);

    expect(editMetaDec.allowed).toBe(true);
    expect(replaceFileDec.allowed).toBe(true);
  });

  it("Case 7: Bob attempts to delete Alice's document even with EDIT permission -> DENIED (403)", () => {
    const decision = canAccessDocument(bobViewer, sampleDoc, 'delete', bobEditGrant);
    expect(decision.allowed).toBe(false);
    expect(decision.statusCode).toBe(403);
  });

  it('Case 8: Charlie attempts to download a document without permission -> DENIED (403)', () => {
    const decision = canAccessDocument(charlieViewer, sampleDoc, 'download', null);
    expect(decision.allowed).toBe(false);
    expect(decision.statusCode).toBe(403);
  });

  it('Case 9 & 10: Immediate Revocation - Bob with revoked grant is denied immediately on next request -> DENIED (403)', () => {
    const decision = canAccessDocument(bobViewer, sampleDoc, 'download', bobRevokedGrant);
    expect(decision.allowed).toBe(false);
    expect(decision.statusCode).toBe(403);
  });

  it('Case 14: Viewer attempts to manage permissions -> DENIED (403)', () => {
    const grantDec = canAccessDocument(bobViewer, sampleDoc, 'grant_access', bobEditGrant);
    const revokeDec = canAccessDocument(bobViewer, sampleDoc, 'revoke_access', bobEditGrant);

    expect(grantDec.allowed).toBe(false);
    expect(grantDec.statusCode).toBe(403);
    expect(revokeDec.allowed).toBe(false);
    expect(revokeDec.statusCode).toBe(403);
  });

  it('Case 17: Disabled account attempts document access -> DENIED (403)', () => {
    const decision = canAccessDocument(disabledEve, sampleDoc, 'view_metadata', null);
    expect(decision.allowed).toBe(false);
    expect(decision.statusCode).toBe(403);
    expect(decision.reason).toContain('disabled');
  });

  it('Requirement Check: Administrator can view metadata but CANNOT download confidential contents without explicit grant', () => {
    const metaDec = canAccessDocument(adminDave, sampleDoc, 'view_metadata', null);
    const dlDec = canAccessDocument(adminDave, sampleDoc, 'download', null);
    const previewDec = canAccessDocument(adminDave, sampleDoc, 'preview', null);

    expect(metaDec.allowed).toBe(true);
    expect(dlDec.allowed).toBe(false);
    expect(dlDec.statusCode).toBe(403);
    expect(dlDec.reason).toContain('Administrator privilege does not grant access to confidential file contents');
    expect(previewDec.allowed).toBe(false);
    expect(previewDec.statusCode).toBe(403);
  });
});
