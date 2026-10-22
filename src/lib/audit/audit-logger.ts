import crypto from 'crypto';
import { AuditLogRecord } from '@/types';

export const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

/**
 * Deterministically serializes an object into canonical JSON with sorted keys.
 * Ensures identical SHA-256 hash output across different platforms and runtimes.
 */
export function canonicalJsonStringify(obj: unknown): string {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    return '[' + obj.map((item) => canonicalJsonStringify(item)).join(',') + ']';
  }

  const sortedKeys = Object.keys(obj as Record<string, unknown>).sort();
  const pairs = sortedKeys.map((key) => {
    const val = (obj as Record<string, unknown>)[key];
    return JSON.stringify(key) + ':' + canonicalJsonStringify(val);
  });

  return '{' + pairs.join(',') + '}';
}

/**
 * Computes the cryptographic SHA-256 hash for an audit log event
 * over its canonical payload concatenated with the previous hash in the chain.
 */
export function computeEventHash(params: {
  id: string;
  actor_user_id: string | null;
  document_id: string | null;
  action: string;
  result: string;
  timestamp: string;
  request_id: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  previous_hash: string;
}): string {
  const payloadToHash = {
    id: params.id,
    actor_user_id: params.actor_user_id,
    document_id: params.document_id,
    action: params.action,
    result: params.result,
    timestamp: params.timestamp,
    request_id: params.request_id,
    ip_address: params.ip_address,
    user_agent: params.user_agent,
    metadata: params.metadata,
    previous_hash: params.previous_hash,
  };

  const canonicalString = canonicalJsonStringify(payloadToHash);
  return crypto.createHash('sha256').update(canonicalString, 'utf8').digest('hex');
}

export interface AuditVerificationResult {
  valid: boolean;
  totalVerified: number;
  brokenAtIndex?: number;
  reason?: string;
  failedEventId?: string;
  lastHash?: string;
}

/**
 * Audits a sequential list of audit log records against the cryptographic hash chain.
 * Detects modified payloads, deleted records, inserted records, and broken order.
 *
 * NOTE ON TRUST MODEL:
 * A local cryptographic hash chain proves tamper-evidence against unprivileged actors
 * and opportunistic database manipulation. However, an attacker with direct SUPERUSER
 * or service-role write access could theoretically rewrite historical rows and recompute
 * the entire chain. In production, anchoring checkpoints to an external immutable ledger
 * (e.g., AWS S3 Object Lock, RFC 3161 Timestamp Authority, or external append-only log)
 * provides full non-repudiation.
 */
export function verifyAuditTrailIntegrity(
  records: AuditLogRecord[]
): AuditVerificationResult {
  if (!records || records.length === 0) {
    return { valid: true, totalVerified: 0, lastHash: GENESIS_HASH };
  }

  // Chain verification in sequential insertion order.
  // We do not re-sort by UUID because sub-millisecond events with identical timestamps
  // would be scrambled arbitrarily by UUID comparison, breaking chain integrity.
  const chain = [...records];

  let expectedPreviousHash = GENESIS_HASH;
  let previousTimestamp = 0;

  for (let i = 0; i < chain.length; i++) {
    const record = chain[i];
    const currentTimestamp = new Date(record.timestamp).getTime();

    // Verify chronological order (timestamps cannot move backwards in the chain)
    if (currentTimestamp < previousTimestamp) {
      return {
        valid: false,
        totalVerified: i,
        brokenAtIndex: i,
        failedEventId: record.id,
        reason: `Chronological violation at index ${i}. Event timestamp (${record.timestamp}) is earlier than preceding event timestamp.`,
      };
    }
    previousTimestamp = currentTimestamp;

    // Check that previous_hash matches the expected hash from the predecessor
    if (record.previous_hash !== expectedPreviousHash) {
      return {
        valid: false,
        totalVerified: i,
        brokenAtIndex: i,
        failedEventId: record.id,
        reason: `Hash chain linkage broken at index ${i}. Expected previous_hash "${expectedPreviousHash}" but found "${record.previous_hash}". This indicates record deletion, insertion, or reordering.`,
      };
    }

    // Recompute the event hash from raw fields
    const recomputedHash = computeEventHash({
      id: record.id,
      actor_user_id: record.actor_user_id,
      document_id: record.document_id,
      action: record.action,
      result: record.result,
      timestamp: record.timestamp,
      request_id: record.request_id,
      ip_address: record.ip_address,
      user_agent: record.user_agent,
      metadata: record.metadata || {},
      previous_hash: record.previous_hash,
    });

    if (recomputedHash !== record.event_hash) {
      return {
        valid: false,
        totalVerified: i,
        brokenAtIndex: i,
        failedEventId: record.id,
        reason: `Cryptographic signature mismatch at index ${i} (Event ID: ${record.id}). Stored hash "${record.event_hash}" does not match recomputed SHA-256 "${recomputedHash}". The record payload has been altered!`,
      };
    }

    expectedPreviousHash = record.event_hash;
  }

  return {
    valid: true,
    totalVerified: chain.length,
    lastHash: expectedPreviousHash,
  };
}
