import {
  UserProfile,
  DocumentRecord,
  DocumentPermissionRecord,
  AuditLogRecord,
  PermissionLevel,
  AccountStatus,
  UserRole,
} from '@/types';
import { canAccessDocument } from '@/lib/auth/authorization';
import { computeEventHash, verifyAuditTrailIntegrity, GENESIS_HASH } from '@/lib/audit/audit-logger';
import { validateUploadedFile } from '@/lib/storage/file-validator';
import { randomUUID } from 'crypto';
import {
  hashPassword,
  verifyPassword,
  validatePasswordStrength,
  isValidEmail,
} from '@/lib/auth/password';

// --------------------------------------------------------------------
// Deterministic Seed Data
// --------------------------------------------------------------------
export const SEED_PROFILES: UserProfile[] = [
  {
    id: '11111111-1111-4111-a111-111111111111',
    full_name: 'Alice Owner',
    email: 'alice@trustvault.local',
    role: 'OWNER',
    status: 'ACTIVE',
    created_at: '2026-10-22T08:00:00.000Z',
    updated_at: '2026-10-22T08:00:00.000Z',
  },
  {
    id: '22222222-2222-4222-a222-222222222222',
    full_name: 'Bob Viewer',
    email: 'bob@trustvault.local',
    role: 'VIEWER',
    status: 'ACTIVE',
    created_at: '2026-10-22T08:00:00.000Z',
    updated_at: '2026-10-22T08:00:00.000Z',
  },
  {
    id: '33333333-3333-4333-a333-333333333333',
    full_name: 'Charlie Viewer',
    email: 'charlie@trustvault.local',
    role: 'VIEWER',
    status: 'ACTIVE',
    created_at: '2026-10-22T08:00:00.000Z',
    updated_at: '2026-10-22T08:00:00.000Z',
  },
  {
    id: '44444444-4444-4444-a444-444444444444',
    full_name: 'Dave Administrator',
    email: 'admin@trustvault.local',
    role: 'ADMIN',
    status: 'ACTIVE',
    created_at: '2026-10-22T08:00:00.000Z',
    updated_at: '2026-10-22T08:00:00.000Z',
  },
  {
    id: '55555555-5555-4555-a555-555555555555',
    full_name: 'Eve Disabled',
    email: 'eve@trustvault.local',
    role: 'VIEWER',
    status: 'DISABLED',
    created_at: '2026-10-22T08:00:00.000Z',
    updated_at: '2026-10-22T08:00:00.000Z',
  },
];

export const SEED_DOCUMENTS: DocumentRecord[] = [
  {
    id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    name: 'Q3-Financial-Audit-Report.pdf',
    description: 'Confidential quarterly financial statements and audit findings.',
    category: 'Finance',
    storage_path: '11111111-1111-4111-a111-111111111111/aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa/q3-audit.pdf',
    mime_type: 'application/pdf',
    file_size: 1048576,
    owner_id: '11111111-1111-4111-a111-111111111111',
    status: 'ACTIVE',
    created_at: '2026-10-22T08:05:00.000Z',
    updated_at: '2026-10-22T08:05:00.000Z',
    owner: {
      id: '11111111-1111-4111-a111-111111111111',
      full_name: 'Alice Owner',
      email: 'alice@trustvault.local',
    },
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    name: 'Zero-Trust-Architecture-Plan.docx',
    description: 'Internal network segmentation and cryptographic access controls.',
    category: 'Engineering',
    storage_path: '11111111-1111-4111-a111-111111111111/bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb/zero-trust.docx',
    mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    file_size: 524288,
    owner_id: '11111111-1111-4111-a111-111111111111',
    status: 'ACTIVE',
    created_at: '2026-10-22T08:10:00.000Z',
    updated_at: '2026-10-22T08:10:00.000Z',
    owner: {
      id: '11111111-1111-4111-a111-111111111111',
      full_name: 'Alice Owner',
      email: 'alice@trustvault.local',
    },
  },
  {
    id: 'cccccccc-cccc-4ccc-cccc-cccccccccccc',
    name: 'Executive-Board-Minutes-Strictly-Private.pdf',
    description: 'Highly sensitive strategic acquisitions and board resolutions.',
    category: 'Executive',
    storage_path: '11111111-1111-4111-a111-111111111111/cccccccc-cccc-4ccc-cccc-cccccccccccc/board-minutes.pdf',
    mime_type: 'application/pdf',
    file_size: 2097152,
    owner_id: '11111111-1111-4111-a111-111111111111',
    status: 'ACTIVE',
    created_at: '2026-10-22T08:15:00.000Z',
    updated_at: '2026-10-22T08:15:00.000Z',
    owner: {
      id: '11111111-1111-4111-a111-111111111111',
      full_name: 'Alice Owner',
      email: 'alice@trustvault.local',
    },
  },
];

export const SEED_PERMISSIONS: DocumentPermissionRecord[] = [
  {
    id: 'p1111111-1111-4111-a111-111111111111',
    document_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
    user_id: '22222222-2222-4222-a222-222222222222', // Bob has READ to doc 1
    permission: 'READ',
    granted_by: '11111111-1111-4111-a111-111111111111',
    granted_at: '2026-10-22T08:20:00.000Z',
    revoked_at: null,
    created_at: '2026-10-22T08:20:00.000Z',
    updated_at: '2026-10-22T08:20:00.000Z',
    user: {
      id: '22222222-2222-4222-a222-222222222222',
      full_name: 'Bob Viewer',
      email: 'bob@trustvault.local',
    },
  },
  {
    id: 'p2222222-2222-4222-a222-222222222222',
    document_id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
    user_id: '22222222-2222-4222-a222-222222222222', // Bob has EDIT to doc 2
    permission: 'EDIT',
    granted_by: '11111111-1111-4111-a111-111111111111',
    granted_at: '2026-10-22T08:25:00.000Z',
    revoked_at: null,
    created_at: '2026-10-22T08:25:00.000Z',
    updated_at: '2026-10-22T08:25:00.000Z',
    user: {
      id: '22222222-2222-4222-a222-222222222222',
      full_name: 'Bob Viewer',
      email: 'bob@trustvault.local',
    },
  },
];

// Helper to construct seed audit log with real cryptographic hash chain
function buildSeedAuditLogs(): AuditLogRecord[] {
  const baseTime = Date.now() - 3600000; // 1 hour ago
  const events = [
    {
      id: 'log-auth-001',
      actor_user_id: '11111111-1111-4111-a111-111111111111',
      document_id: null,
      action: 'USER_LOGIN',
      result: 'ALLOWED' as const,
      timestamp: new Date(baseTime + 10000).toISOString(),
      request_id: 'req-auth-001',
      ip_address: '192.168.1.10',
      user_agent: 'TrustVaultWeb/1.0 (Windows NT 10.0)',
      metadata: { email: 'alice@trustvault.local', full_name: 'Alice Owner', role: 'OWNER', auth_method: 'Corporate Identity Verification' },
    },
    {
      id: 'log-001',
      actor_user_id: '11111111-1111-4111-a111-111111111111',
      document_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      action: 'DOCUMENT_UPLOAD',
      result: 'ALLOWED' as const,
      timestamp: new Date(baseTime + 60000).toISOString(),
      request_id: 'req-001',
      ip_address: '192.168.1.10',
      user_agent: 'TrustVaultClient/1.0',
      metadata: { name: 'Q3-Financial-Audit-Report.pdf', category: 'Finance' },
    },
    {
      id: 'log-002',
      actor_user_id: '11111111-1111-4111-a111-111111111111',
      document_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      action: 'PERMISSION_GRANT',
      result: 'ALLOWED' as const,
      timestamp: new Date(baseTime + 120000).toISOString(),
      request_id: 'req-002',
      ip_address: '192.168.1.10',
      user_agent: 'TrustVaultClient/1.0',
      metadata: { target_email: 'bob@trustvault.local', permission: 'READ' },
    },
    {
      id: 'log-auth-002',
      actor_user_id: '22222222-2222-4222-a222-222222222222',
      document_id: null,
      action: 'USER_LOGIN',
      result: 'ALLOWED' as const,
      timestamp: new Date(baseTime + 150000).toISOString(),
      request_id: 'req-auth-002',
      ip_address: '192.168.1.20',
      user_agent: 'TrustVaultWeb/1.0 (MacOS)',
      metadata: { email: 'bob@trustvault.local', full_name: 'Bob Viewer', role: 'VIEWER', auth_method: 'Corporate Identity Verification' },
    },
    {
      id: 'log-003',
      actor_user_id: '33333333-3333-4333-a333-333333333333',
      document_id: 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa',
      action: 'DOCUMENT_DOWNLOAD',
      result: 'DENIED' as const,
      timestamp: new Date(baseTime + 180000).toISOString(),
      request_id: 'req-003',
      ip_address: '192.168.1.50',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0)',
      metadata: { reason: 'No active permission found for requester', statusCode: 403 },
    },
    {
      id: 'log-auth-003',
      actor_user_id: '22222222-2222-4222-a222-222222222222',
      document_id: null,
      action: 'USER_LOGOUT',
      result: 'ALLOWED' as const,
      timestamp: new Date(baseTime + 240000).toISOString(),
      request_id: 'req-auth-003',
      ip_address: '192.168.1.20',
      user_agent: 'TrustVaultWeb/1.0 (MacOS)',
      metadata: { email: 'bob@trustvault.local', full_name: 'Bob Viewer', reason: 'User initiated secure sign out' },
    },
    {
      id: 'log-auth-004',
      actor_user_id: '55555555-5555-4555-a555-555555555555',
      document_id: null,
      action: 'USER_LOGIN',
      result: 'DENIED' as const,
      timestamp: new Date(baseTime + 300000).toISOString(),
      request_id: 'req-auth-004',
      ip_address: '192.168.1.99',
      user_agent: 'TrustVaultWeb/1.0',
      metadata: { email: 'eve@trustvault.local', full_name: 'Eve Disabled', reason: 'Account disabled by administrator' },
    },
    {
      id: 'log-auth-005',
      actor_user_id: '44444444-4444-4444-a444-444444444444',
      document_id: null,
      action: 'USER_LOGIN',
      result: 'ALLOWED' as const,
      timestamp: new Date(baseTime + 360000).toISOString(),
      request_id: 'req-auth-005',
      ip_address: '192.168.1.5',
      user_agent: 'TrustVaultWeb/1.0 (Security Console)',
      metadata: { email: 'admin@trustvault.local', full_name: 'Dave Administrator', role: 'ADMIN', auth_method: 'Corporate Admin SSO' },
    },
  ];

  const results: AuditLogRecord[] = [];
  let prevHash = GENESIS_HASH;

  for (const ev of events) {
    const hash = computeEventHash({
      id: ev.id,
      actor_user_id: ev.actor_user_id,
      document_id: ev.document_id,
      action: ev.action,
      result: ev.result,
      timestamp: ev.timestamp,
      request_id: ev.request_id,
      ip_address: ev.ip_address,
      user_agent: ev.user_agent,
      metadata: ev.metadata,
      previous_hash: prevHash,
    });

    const actor = SEED_PROFILES.find((p) => p.id === ev.actor_user_id);
    const doc = SEED_DOCUMENTS.find((d) => d.id === ev.document_id);

    results.push({
      ...ev,
      previous_hash: prevHash,
      event_hash: hash,
      actor: actor
        ? { id: actor.id, full_name: actor.full_name, email: actor.email, role: actor.role }
        : null,
      document: doc ? { id: doc.id, name: doc.name } : null,
    });

    prevHash = hash;
  }

  return results;
}

// --------------------------------------------------------------------
// Global in-memory state (resilient data store)
// --------------------------------------------------------------------
class TrustVaultDataStore {
  private profiles: Map<string, UserProfile> = new Map();
  private credentials: Map<string, string> = new Map();
  private documents: Map<string, DocumentRecord> = new Map();
  private permissions: Map<string, DocumentPermissionRecord> = new Map();
  private auditLogs: AuditLogRecord[] = [];
  private fileStorage: Map<string, Buffer> = new Map();

  constructor() {
    this.reset();
  }

  public reset() {
    this.profiles.clear();
    this.credentials.clear();
    this.documents.clear();
    this.permissions.clear();
    this.fileStorage.clear();

    const defaultDemoHash = hashPassword('DemoPassword123!');
    SEED_PROFILES.forEach((p) => {
      this.profiles.set(p.id, { ...p });
      this.credentials.set(p.id, defaultDemoHash);
    });
    SEED_DOCUMENTS.forEach((d) => this.documents.set(d.id, { ...d }));
    SEED_PERMISSIONS.forEach((p) => this.permissions.set(p.id, { ...p }));
    this.auditLogs = buildSeedAuditLogs();

    // Seed mock file buffers for downloadable documents
    SEED_DOCUMENTS.forEach((doc) => {
      const mockPdfBytes = Buffer.from(
        `%PDF-1.7\n1 0 obj\n<< /Title (${doc.name}) /Author (Alice) >>\nendobj\n%%EOF`
      );
      this.fileStorage.set(doc.storage_path, mockPdfBytes);
    });
  }

  // --- Profiles & Authentication ---
  public getProfileById(id: string): UserProfile | undefined {
    return this.profiles.get(id);
  }

  public getProfileByEmail(email: string): UserProfile | undefined {
    return Array.from(this.profiles.values()).find(
      (p) => p.email.toLowerCase() === email.toLowerCase()
    );
  }

  public getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  public updateProfileStatus(targetUserId: string, status: AccountStatus): UserProfile | null {
    const profile = this.profiles.get(targetUserId);
    if (!profile) return null;
    profile.status = status;
    profile.updated_at = new Date().toISOString();
    return profile;
  }

  public ensureProfile(profile: UserProfile): void {
    if (!this.profiles.has(profile.id)) {
      this.profiles.set(profile.id, { ...profile });
    }
  }

  public ensureCredential(userId: string, passwordHash: string): void {
    if (!this.credentials.has(userId)) {
      this.credentials.set(userId, passwordHash);
    }
  }

  public registerUser(params: {
    full_name: string;
    email: string;
    password: string;
    role?: UserRole;
    ip_address?: string;
    user_agent?: string;
  }): { success: boolean; user?: UserProfile; password_hash?: string; error?: string } {
    if (!params.full_name || !params.full_name.trim()) {
      return { success: false, error: 'Full name is required.' };
    }
    if (!params.email || !params.email.trim()) {
      return { success: false, error: 'Email address is required.' };
    }
    if (!params.password) {
      return { success: false, error: 'Password is required.' };
    }

    const cleanEmail = params.email.trim().toLowerCase();
    if (!isValidEmail(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address.' };
    }

    if (this.getProfileByEmail(cleanEmail)) {
      return {
        success: false,
        error: 'An account with this email address already exists. Please sign in or use another email.',
      };
    }

    const strength = validatePasswordStrength(params.password);
    if (!strength.valid) {
      return { success: false, error: strength.errors.join(' ') };
    }

    const id = randomUUID();
    const now = new Date().toISOString();
    const profile: UserProfile = {
      id,
      full_name: params.full_name.trim(),
      email: cleanEmail,
      role: params.role || 'VIEWER',
      status: 'ACTIVE',
      created_at: now,
      updated_at: now,
    };

    const passwordHash = hashPassword(params.password);
    this.profiles.set(id, profile);
    this.credentials.set(id, passwordHash);

    // Append cryptographic audit log for user registration
    this.appendAuditLog({
      actor_user_id: id,
      document_id: null,
      action: 'USER_REGISTER',
      result: 'ALLOWED',
      request_id: `req-reg-${Date.now()}`,
      ip_address: params.ip_address || '127.0.0.1',
      user_agent: params.user_agent || 'Browser',
      metadata: { email: cleanEmail, role: profile.role },
    });

    return { success: true, user: profile, password_hash: passwordHash };
  }

  public verifyCredentials(
    email: string,
    password: string
  ): { valid: boolean; user?: UserProfile; reason?: string } {
    if (!email || !password) {
      return { valid: false, reason: 'Email and password are required.' };
    }

    const cleanEmail = email.trim().toLowerCase();
    const profile = this.getProfileByEmail(cleanEmail);

    if (!profile) {
      return { valid: false, reason: 'Invalid user email or password.' };
    }

    if (profile.status === 'DISABLED') {
      return {
        valid: false,
        user: profile,
        reason: 'Your account has been disabled. Contact an administrator.',
      };
    }

    const storedHash = this.credentials.get(profile.id);
    if (!storedHash) {
      return { valid: false, reason: 'Invalid user email or password.' };
    }

    const matches = verifyPassword(password, storedHash);
    if (!matches) {
      return { valid: false, reason: 'Invalid user email or password.' };
    }

    return { valid: true, user: profile };
  }

  public updatePassword(userId: string, newPassword: string): { success: boolean; error?: string } {
    const profile = this.profiles.get(userId);
    if (!profile) {
      return { success: false, error: 'User profile not found.' };
    }

    const strength = validatePasswordStrength(newPassword);
    if (!strength.valid) {
      return { success: false, error: strength.errors.join(' ') };
    }

    const hash = hashPassword(newPassword);
    this.credentials.set(userId, hash);
    return { success: true };
  }

  // --- Documents ---
  public getAllDocuments(): DocumentRecord[] {
    return Array.from(this.documents.values());
  }

  public getDocumentById(id: string): DocumentRecord | undefined {
    return this.documents.get(id);
  }

  public getVisibleDocuments(user: UserProfile): DocumentRecord[] {
    if (user.status === 'DISABLED') return [];

    const all = Array.from(this.documents.values()).filter((d) => d.status !== 'DELETED');

    if (user.role === 'ADMIN') {
      return all; // Admins view system-wide document metadata
    }

    return all.filter((doc) => {
      if (doc.owner_id === user.id) return true;
      const grant = this.getActivePermission(doc.id, user.id);
      return grant !== null;
    });
  }

  public insertDocument(
    owner: UserProfile,
    fileBuffer: Buffer,
    originalFilename: string,
    description: string,
    category: string
  ): { doc: DocumentRecord; error?: string } {
    const valResult = validateUploadedFile(fileBuffer, originalFilename);
    if (!valResult.valid) {
      return { doc: null as unknown as DocumentRecord, error: valResult.error };
    }

    const docId = crypto.randomUUID();
    const safeName = valResult.sanitizedFilename;
    const storagePath = `${owner.id}/${docId}/${safeName}`;

    const newDoc: DocumentRecord = {
      id: docId,
      name: safeName,
      description: description || '',
      category: category || 'General',
      storage_path: storagePath,
      mime_type: valResult.detectedMimeType,
      file_size: fileBuffer.length,
      owner_id: owner.id,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      owner: {
        id: owner.id,
        full_name: owner.full_name,
        email: owner.email,
      },
    };

    this.documents.set(docId, newDoc);
    this.fileStorage.set(storagePath, fileBuffer);

    this.appendAuditLog({
      actor_user_id: owner.id,
      document_id: docId,
      action: 'DOCUMENT_UPLOAD',
      result: 'ALLOWED',
      request_id: `req-${Date.now()}`,
      ip_address: '127.0.0.1',
      user_agent: 'TrustVaultWeb/1.0',
      metadata: { name: safeName, mime: valResult.detectedMimeType, size: fileBuffer.length },
    });

    return { doc: newDoc };
  }

  public deleteDocument(docId: string, user: UserProfile): { success: boolean; error?: string } {
    const doc = this.documents.get(docId);
    if (!doc) return { success: false, error: 'Document not found' };

    const decision = canAccessDocument(user, doc, 'delete');
    if (!decision.allowed) {
      this.appendAuditLog({
        actor_user_id: user.id,
        document_id: docId,
        action: 'DOCUMENT_DELETE',
        result: 'DENIED',
        request_id: `req-${Date.now()}`,
        ip_address: '127.0.0.1',
        user_agent: 'TrustVaultWeb/1.0',
        metadata: { reason: decision.reason },
      });
      return { success: false, error: decision.reason };
    }

    doc.status = 'DELETED';
    doc.updated_at = new Date().toISOString();

    this.appendAuditLog({
      actor_user_id: user.id,
      document_id: docId,
      action: 'DOCUMENT_DELETE',
      result: 'ALLOWED',
      request_id: `req-${Date.now()}`,
      ip_address: '127.0.0.1',
      user_agent: 'TrustVaultWeb/1.0',
      metadata: { name: doc.name },
    });

    return { success: true };
  }

  public getFileBuffer(storagePath: string): Buffer | undefined {
    return this.fileStorage.get(storagePath);
  }

  // --- Permissions ---
  public getActivePermission(documentId: string, userId: string): DocumentPermissionRecord | null {
    for (const grant of this.permissions.values()) {
      if (grant.document_id === documentId && grant.user_id === userId && grant.revoked_at === null) {
        return grant;
      }
    }
    return null;
  }

  public getDocumentPermissions(documentId: string): DocumentPermissionRecord[] {
    return Array.from(this.permissions.values())
      .filter((p) => p.document_id === documentId)
      .map((p) => {
        const u = this.profiles.get(p.user_id);
        return {
          ...p,
          user: u ? { id: u.id, full_name: u.full_name, email: u.email } : undefined,
        };
      });
  }

  public grantPermission(
    documentId: string,
    granter: UserProfile,
    targetUserId: string,
    level: PermissionLevel
  ): { success: boolean; error?: string } {
    const doc = this.documents.get(documentId);
    if (!doc) return { success: false, error: 'Document not found' };

    const decision = canAccessDocument(granter, doc, 'grant_access');
    if (!decision.allowed) {
      this.appendAuditLog({
        actor_user_id: granter.id,
        document_id: documentId,
        action: 'PERMISSION_GRANT',
        result: 'DENIED',
        request_id: `req-${Date.now()}`,
        ip_address: '127.0.0.1',
        user_agent: 'TrustVaultWeb/1.0',
        metadata: { reason: decision.reason, targetUserId },
      });
      return { success: false, error: decision.reason };
    }

    if (granter.id === targetUserId) {
      return { success: false, error: 'Document owners already hold all access and cannot grant to themselves.' };
    }

    const targetUser = this.profiles.get(targetUserId);
    if (!targetUser) return { success: false, error: 'Target user does not exist.' };

    // Check if active grant already exists: revoke it first to record history
    const existingActive = this.getActivePermission(documentId, targetUserId);
    if (existingActive) {
      existingActive.revoked_at = new Date().toISOString();
      existingActive.updated_at = new Date().toISOString();
    }

    const grantId = crypto.randomUUID();
    const newGrant: DocumentPermissionRecord = {
      id: grantId,
      document_id: documentId,
      user_id: targetUserId,
      permission: level,
      granted_by: granter.id,
      granted_at: new Date().toISOString(),
      revoked_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: targetUser.id,
        full_name: targetUser.full_name,
        email: targetUser.email,
      },
    };

    this.permissions.set(grantId, newGrant);

    this.appendAuditLog({
      actor_user_id: granter.id,
      document_id: documentId,
      action: 'PERMISSION_GRANT',
      result: 'ALLOWED',
      request_id: `req-${Date.now()}`,
      ip_address: '127.0.0.1',
      user_agent: 'TrustVaultWeb/1.0',
      metadata: { target_email: targetUser.email, target_name: targetUser.full_name, permission: level },
    });

    return { success: true };
  }

  public revokePermission(
    documentId: string,
    revoker: UserProfile,
    targetUserId: string
  ): { success: boolean; error?: string } {
    const doc = this.documents.get(documentId);
    if (!doc) return { success: false, error: 'Document not found' };

    const decision = canAccessDocument(revoker, doc, 'revoke_access');
    if (!decision.allowed) {
      this.appendAuditLog({
        actor_user_id: revoker.id,
        document_id: documentId,
        action: 'PERMISSION_REVOKE',
        result: 'DENIED',
        request_id: `req-${Date.now()}`,
        ip_address: '127.0.0.1',
        user_agent: 'TrustVaultWeb/1.0',
        metadata: { reason: decision.reason, targetUserId },
      });
      return { success: false, error: decision.reason };
    }

    const activeGrant = this.getActivePermission(documentId, targetUserId);
    if (!activeGrant) {
      return { success: false, error: 'No active permission exists for this user.' };
    }

    // Immediate revocation: set revoked_at to current timestamp
    activeGrant.revoked_at = new Date().toISOString();
    activeGrant.updated_at = new Date().toISOString();

    const targetUser = this.profiles.get(targetUserId);

    this.appendAuditLog({
      actor_user_id: revoker.id,
      document_id: documentId,
      action: 'PERMISSION_REVOKE',
      result: 'ALLOWED',
      request_id: `req-${Date.now()}`,
      ip_address: '127.0.0.1',
      user_agent: 'TrustVaultWeb/1.0',
      metadata: {
        target_email: targetUser?.email,
        target_name: targetUser?.full_name,
        previous_permission: activeGrant.permission,
      },
    });

    return { success: true };
  }

  // --- Audit Trail ---
  public getAuditLogs(
    user: UserProfile,
    filters?: {
      documentId?: string;
      actorId?: string;
      result?: string;
      action?: string;
      category?: string;
    }
  ): AuditLogRecord[] {
    if (user.status === 'DISABLED') return [];

    let logs = [...this.auditLogs];

    // Filter by role visibility
    if (user.role === 'ADMIN') {
      // Admins view system-wide logs
    } else if (user.role === 'OWNER') {
      // Owners view logs for documents they own, their own action records, and authentication access events
      logs = logs.filter((log) => {
        if (log.actor_user_id === user.id) return true;
        if (log.action === 'USER_LOGIN' || log.action === 'USER_LOGOUT' || log.action === 'USER_REGISTER') return true;
        if (log.document_id) {
          const doc = this.documents.get(log.document_id);
          if (doc && doc.owner_id === user.id) return true;
        }
        return false;
      });
    } else {
      // Viewers view their own action records and system authentication access logs
      logs = logs.filter((log) => {
        if (log.actor_user_id === user.id) return true;
        if (log.action === 'USER_LOGIN' || log.action === 'USER_LOGOUT') return true;
        return false;
      });
    }

    // Apply explicit query filters
    if (filters?.documentId) {
      logs = logs.filter((l) => l.document_id === filters.documentId);
    }
    if (filters?.actorId) {
      logs = logs.filter((l) => l.actor_user_id === filters.actorId);
    }
    if (filters?.result) {
      logs = logs.filter((l) => l.result === filters.result);
    }
    if (filters?.category === 'AUTH') {
      logs = logs.filter(
        (l) => l.action === 'USER_LOGIN' || l.action === 'USER_LOGOUT' || l.action === 'USER_REGISTER'
      );
    } else if (filters?.category === 'DOCS') {
      logs = logs.filter((l) => l.action.startsWith('DOCUMENT_'));
    } else if (filters?.category === 'PERMS') {
      logs = logs.filter((l) => l.action.startsWith('PERMISSION_'));
    }

    if (filters?.action && filters.action !== 'ALL') {
      logs = logs.filter((l) => l.action.toUpperCase() === filters.action!.toUpperCase());
    }

    // Return in reverse chronological order
    return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public appendAuditLog(params: {
    actor_user_id: string | null;
    document_id: string | null;
    action: string;
    result: 'ALLOWED' | 'DENIED';
    request_id: string;
    ip_address: string | null;
    user_agent: string | null;
    metadata: Record<string, unknown>;
  }): AuditLogRecord {
    const lastEvent = this.auditLogs[this.auditLogs.length - 1];
    const prevHash = lastEvent ? lastEvent.event_hash : GENESIS_HASH;

    const id = crypto.randomUUID();
    const timestamp = new Date().toISOString();

    const eventHash = computeEventHash({
      id,
      actor_user_id: params.actor_user_id,
      document_id: params.document_id,
      action: params.action,
      result: params.result,
      timestamp,
      request_id: params.request_id,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      metadata: params.metadata,
      previous_hash: prevHash,
    });

    const actor = params.actor_user_id ? this.profiles.get(params.actor_user_id) : null;
    const doc = params.document_id ? this.documents.get(params.document_id) : null;

    const resolvedActor = actor
      ? { id: actor.id, full_name: actor.full_name, email: actor.email, role: actor.role }
      : params.metadata?.email
      ? {
          id: params.actor_user_id || 'unauthenticated',
          full_name: (params.metadata.full_name as string) || (params.metadata.email as string),
          email: params.metadata.email as string,
          role: (params.metadata.role as UserRole) || 'VIEWER',
        }
      : null;

    const newRecord: AuditLogRecord = {
      id,
      actor_user_id: params.actor_user_id,
      document_id: params.document_id,
      action: params.action,
      result: params.result,
      timestamp,
      request_id: params.request_id,
      ip_address: params.ip_address,
      user_agent: params.user_agent,
      metadata: params.metadata,
      previous_hash: prevHash,
      event_hash: eventHash,
      actor: resolvedActor,
      document: doc ? { id: doc.id, name: doc.name } : null,
    };

    this.auditLogs.push(newRecord);
    return newRecord;
  }

  public verifyIntegrity() {
    return verifyAuditTrailIntegrity(this.auditLogs);
  }
}

// Export singleton instance for the app
export const dataStore = new TrustVaultDataStore();
