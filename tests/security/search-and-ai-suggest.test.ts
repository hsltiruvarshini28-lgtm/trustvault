import { describe, it, expect, beforeEach } from 'vitest';
import { dataStore } from '@/lib/data/store';
import { UserProfile, DocumentRecord } from '@/types';
import { verifyAuditTrailIntegrity } from '@/lib/audit/audit-logger';

describe('Multi-Attribute Search & AI Access Suggestion Suite', () => {
  let aliceOwner: UserProfile;
  let bobViewer: UserProfile;
  let charlieViewer: UserProfile;
  let adminDave: UserProfile;

  beforeEach(() => {
    dataStore.reset();
    const profiles = dataStore.getAllProfiles();
    aliceOwner = profiles.find((p) => p.email === 'alice@trustvault.local')!;
    bobViewer = profiles.find((p) => p.email === 'bob@trustvault.local')!;
    charlieViewer = profiles.find((p) => p.email === 'charlie@trustvault.local')!;
    adminDave = profiles.find((p) => p.email === 'admin@trustvault.local')!;
  });

  describe('Multi-Attribute Search Engine (Name, Owner, Category, Date)', () => {
    it('searches documents by document name', () => {
      const visible = dataStore.getVisibleDocuments(aliceOwner);
      const query = 'Financial'.toLowerCase();
      const matched = visible.filter((d) => d.name.toLowerCase().includes(query));

      expect(matched.length).toBeGreaterThan(0);
      expect(matched[0].name).toContain('Financial');
    });

    it('searches documents by owner name and email', () => {
      const visible = dataStore.getVisibleDocuments(aliceOwner);
      const ownerQuery = 'Alice'.toLowerCase();
      const matched = visible.filter(
        (d) =>
          d.owner?.full_name?.toLowerCase().includes(ownerQuery) ||
          d.owner?.email?.toLowerCase().includes(ownerQuery)
      );

      expect(matched.length).toBe(visible.length);
      expect(matched.every((d) => d.owner?.full_name === 'Alice Owner')).toBe(true);
    });

    it('filters documents by category', () => {
      const visible = dataStore.getVisibleDocuments(aliceOwner);
      const financeDocs = visible.filter((d) => d.category.toLowerCase() === 'finance');
      const engineeringDocs = visible.filter((d) => d.category.toLowerCase() === 'engineering');

      expect(financeDocs.length).toBeGreaterThan(0);
      expect(financeDocs.every((d) => d.category === 'Finance')).toBe(true);
      expect(engineeringDocs.every((d) => d.category === 'Engineering')).toBe(true);
    });

    it('filters documents by date and date ranges', () => {
      const visible = dataStore.getVisibleDocuments(aliceOwner);
      expect(visible.length).toBeGreaterThan(0);

      const targetDoc = visible[0];
      const docDateStr = targetDoc.created_at.slice(0, 10); // YYYY-MM-DD

      // Exact date match
      const exactMatches = visible.filter((d) => d.created_at.startsWith(docDateStr));
      expect(exactMatches.length).toBeGreaterThan(0);

      // Date range match
      const yesterday = new Date(Date.now() - 86400000 * 30).toISOString().slice(0, 10);
      const tomorrow = new Date(Date.now() + 86400000 * 30).toISOString().slice(0, 10);

      const startMs = new Date(yesterday).getTime();
      const endMs = new Date(tomorrow + 'T23:59:59.999Z').getTime();

      const rangeMatches = visible.filter((d) => {
        const time = new Date(d.created_at).getTime();
        return time >= startMs && time <= endMs;
      });

      expect(rangeMatches.length).toBe(visible.length);
    });

    it('guarantees search isolation: non-permitted users cannot discover matching documents', () => {
      // Charlie has no permissions on Alice's private documents
      const charlieDocs = dataStore.getVisibleDocuments(charlieViewer);
      expect(charlieDocs.length).toBe(0);

      // Even if Charlie searches for 'Financial' or 'Alice', 0 documents are returned
      const query = 'financial';
      const charlieMatches = charlieDocs.filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          d.owner?.full_name?.toLowerCase().includes('alice')
      );
      expect(charlieMatches.length).toBe(0);
    });
  });

  describe('AI Access Suggestion & Zero-Trust Human Confirmation', () => {
    it('records AI access recommendation in audit trail without widening access automatically', () => {
      const visible = dataStore.getVisibleDocuments(aliceOwner);
      const doc = visible[0];

      // Charlie currently has no access
      expect(dataStore.getActivePermission(doc.id, charlieViewer.id)).toBeNull();

      // Owner requests AI suggestion for Charlie
      const recordResult = dataStore.recordAiSuggestion(
        aliceOwner,
        doc.id,
        charlieViewer.id,
        'READ',
        'Classified as Finance. Recommending least-privilege READ access.'
      );

      expect(recordResult.success).toBe(true);

      // Crucial zero-trust guarantee: Generating an AI suggestion must NEVER widen access on its own!
      expect(dataStore.getActivePermission(doc.id, charlieViewer.id)).toBeNull();
      const charlieVisibleAfterAi = dataStore.getVisibleDocuments(charlieViewer);
      expect(charlieVisibleAfterAi.length).toBe(0);

      // Verify AI suggestion event was cryptographically recorded in audit trail
      const logs = dataStore.getAuditLogs(adminDave);
      const aiLog = logs.find((l) => l.action === 'AI_ACCESS_SUGGESTION');
      expect(aiLog).toBeDefined();
      expect(aiLog?.metadata?.suggested_email).toBe(charlieViewer.email);
      expect(aiLog?.metadata?.suggested_permission).toBe('READ');
      expect(aiLog?.metadata?.confirmed_by_human).toBe(false);

      // Verify audit trail integrity remains valid
      const integrity = dataStore.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });

    it('requires human owner confirmation to grant access, generating dual audit trail entries', () => {
      const visible = dataStore.getVisibleDocuments(aliceOwner);
      const doc = visible[0];

      // 1. AI Suggestion event
      dataStore.recordAiSuggestion(
        aliceOwner,
        doc.id,
        charlieViewer.id,
        'READ',
        'Audit review recommendation.'
      );

      // 2. Human owner confirms and executes grant
      const grantResult = dataStore.grantPermission(
        doc.id,
        aliceOwner,
        charlieViewer.id,
        'READ',
        { aiAssisted: true, rationale: 'Audit review recommendation.' }
      );
      expect(grantResult.success).toBe(true);

      // 3. User now has active grant
      const activeGrant = dataStore.getActivePermission(doc.id, charlieViewer.id);
      expect(activeGrant).not.toBeNull();
      expect(activeGrant?.permission).toBe('READ');

      // 4. Verify dual audit telemetry in the hash chain
      const logs = dataStore.getAuditLogs(adminDave);
      const aiEvent = logs.find((l) => l.action === 'AI_ACCESS_SUGGESTION');
      const grantEvent = logs.find(
        (l) => l.action === 'PERMISSION_GRANT' && l.metadata?.ai_assisted === true
      );

      expect(aiEvent).toBeDefined();
      expect(grantEvent).toBeDefined();
      expect(grantEvent?.metadata?.confirmed_by_owner).toBe(true);

      // 5. Verify cryptographic hash chain integrity across both events
      const integrity = dataStore.verifyIntegrity();
      expect(integrity.valid).toBe(true);
    });

    it('rejects AI suggestions and grants from non-owners', () => {
      const visible = dataStore.getVisibleDocuments(aliceOwner);
      const doc = visible[0];

      // Bob Viewer attempts to record AI suggestion on Alice's document
      const unauthorizedResult = dataStore.recordAiSuggestion(
        bobViewer,
        doc.id,
        charlieViewer.id,
        'READ',
        'Unauthorized AI attempt.'
      );

      expect(unauthorizedResult.success).toBe(false);
      expect(unauthorizedResult.error).toContain('Only the document owner');
    });
  });
});
