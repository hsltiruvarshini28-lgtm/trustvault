# TrustVault — Threat Model and Security Review (`THREATS.md`)

This threat model outlines system assets, trust boundaries, threat actors, attack vectors, implemented mitigations, automated test references, and consciously accepted residual risks.

---

## 1. System Assets & Trust Boundaries

### Critical Assets:
1. **Confidential File Storage:** Private documents (PDF, DOCX, etc.) stored in the private `documents` bucket.
2. **Access Permissions:** Records defining who holds `READ` or `EDIT` privileges to which documents.
3. **Audit Trail:** Append-only log of security events proving non-repudiation of allowed and denied actions.
4. **User Identities & Sessions:** Supabase Auth tokens, HTTP-only session cookies, and account status flags.
5. **Database Integrity:** PostgreSQL tables protected by Row Level Security (RLS) policies.

### Trust Boundaries:
- **Client (Browser) ↔ Edge Proxy / Next.js API:** Untrusted boundary. All client-supplied inputs, cookies, headers, and IDs are untrusted and strictly validated.
- **Next.js Server ↔ Supabase Database / Storage:** Trusted server boundary using RLS and server-side service keys.
- **Public Network ↔ Private Bucket:** No public access. Direct bucket access is blocked; all file interactions are server-mediated.

---

## 2. Threat Actor Personas

- **External Anonymous Attacker:** Attempts to access documents, tamper with routes, or brute-force sessions without credentials.
- **Malicious Insider / Disgruntled Viewer (Bob/Charlie):** Holds an active account; attempts to access files without permission, edit read-only files, or bypass revocation.
- **Privilege Escalator:** Attempts to manipulate request bodies or URL parameters to elevate role to `ADMIN` or claim ownership of documents.
- **Malicious Document Uploader:** Uploads malware executables disguised as PDFs, or uses path traversal names (`../../etc/passwd`).
- **Compromised Administrator:** Attempts to read confidential documents without being granted access by the document owner.

---

## 3. Threat Matrix & Implemented Mitigations

### 1. Insecure Direct Object References (IDOR / BOLA)
- **Attack Scenario:** Attacker replaces `document_id` in URL (`/api/documents/[id]/download`) with a private document ID belonging to another user.
- **Impact:** Unauthorized viewing or exfiltration of confidential document contents.
- **Implemented Mitigation:** Centralized authorization engine `canAccessDocument(user, document, action)` is executed server-side on every request. Document existence and user permissions are evaluated independently of client assertions.
- **Automated Test:** `tests/security/authorization.test.ts` (Case 3 & Case 8).
- **Residual Risk:** None for registered endpoints.

---

### 2. Immediate Access Revocation Bypass via Long-Lived URLs
- **Attack Scenario:** Owner revokes user's permission. User attempts to use a previously obtained signed URL or cached token to continue downloading the file.
- **Impact:** Exfiltration of files after access has been terminated.
- **Implemented Mitigation:**
  1. No long-lived signed storage URLs are generated.
  2. All downloads are server-mediated through `/api/documents/[id]/download`.
  3. Every request queries fresh permission state (`revoked_at IS NULL`).
  4. Responses return `Cache-Control: no-store, no-cache, must-revalidate`.
- **Automated Test:** `tests/integration/revocation-and-scenarios.test.ts` (Mandatory Revocation Test).
- **Residual Risk:** Revocation cannot erase a file copy that a user has already physically downloaded to their local disk prior to revocation.

---

### 3. Privilege Escalation via Request Body Manipulation
- **Attack Scenario:** User sends a POST or PATCH request attempting to set `"owner_id": "attacker-id"` or `"role": "ADMIN"`.
- **Impact:** Unauthorized takeover of document ownership or administrator privileges.
- **Implemented Mitigation:**
  1. Server routes never trust user IDs or roles supplied in request payloads.
  2. The authenticated user identity is derived strictly from the server-verified session (`getCurrentUser()`).
  3. `owner_id` is assigned server-side from `user.id`.
- **Automated Test:** `tests/integration/revocation-and-scenarios.test.ts` (Case 16).

---

### 4. Malicious File Upload and Signature Mismatch
- **Attack Scenario:** Attacker renames an executable shell script or binary to `invoice.pdf` and uploads it.
- **Impact:** Execution of malicious binaries, XSS, or storage pollution.
- **Implemented Mitigation:**
  1. Deep file signature inspection: `validateUploadedFile()` checks magic bytes (`%PDF-`, `PK\x03\x04`, `\x89PNG`, `\xFF\xD8\xFF`).
  2. Strict MIME type and extension allowlist (PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG).
  3. Strict 15MB file size limit.
  4. Content is served with `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, and `Content-Security-Policy: default-src 'none'`.
- **Automated Test:** `tests/security/file-validation.test.ts` (Cases 18 & 19).
- **Residual Risk:** Advanced zero-day exploits embedded in valid PDF structures require integration with an external anti-malware scanner (e.g. ClamAV) in high-security production environments.

---

### 5. Path Traversal File Ingestion Attack
- **Attack Scenario:** Attacker uploads a file with filename `../../../../etc/passwd` or `..\\windows\\system32\\cmd.exe`.
- **Impact:** Overwriting system files or arbitrary file placement.
- **Implemented Mitigation:**
  1. `sanitizeFilename()` strips path traversal sequences (`../`, `..\\`), null bytes, and non-alphanumeric characters.
  2. Storage path is independently generated as `${owner_id}/${document_id}/${safeName}`.
- **Automated Test:** `tests/security/file-validation.test.ts` (Case 19).

---

### 6. Audit Trail Tampering
- **Attack Scenario:** Malicious insider with partial database access modifies or deletes audit log entries to conceal unauthorized downloads.
- **Impact:** Loss of non-repudiation and compromised forensic integrity.
- **Implemented Mitigation:**
  1. Cryptographic hash chain: each log record contains SHA-256 `previous_hash` and `event_hash` over canonicalized JSON.
  2. Database RLS and triggers (`BEFORE UPDATE OR DELETE ON audit_logs`) forbid updates and deletions.
  3. Real-time verification utility `verifyAuditTrailIntegrity()` immediately flags altered payloads, missing events, or reordered entries.
- **Automated Test:** `tests/security/audit-integrity.test.ts` (Case 20).
- **Residual Risk (Honest Trust Model):** An attacker with full database SUPERUSER or direct service-role privileges could theoretically rewrite rows and recompute the entire chain. Production enhancement: anchor hash-chain checkpoints to an external immutable ledger (e.g. AWS S3 Object Lock, RFC 3161 Timestamp Authority).

---

### 7. Excessive Administrator Privileges
- **Attack Scenario:** Administrator Dave attempts to download Alice's confidential board minutes without permission.
- **Impact:** Confidential data breach by trusted internal personnel.
- **Implemented Mitigation:**
  1. The centralized authorization engine explicitly disallows administrator content downloads unless granted an explicit `READ` or `EDIT` permission by the document owner.
  2. Administrators are granted metadata visibility only.
- **Automated Test:** `tests/security/authorization.test.ts` (Admin privilege check).

---

### 8. Disabled Account Stale Session Bypass
- **Attack Scenario:** Administrator disables an account (`status = 'DISABLED'`), but the user attempts to make requests with an existing session cookie.
- **Impact:** Continued unauthorized activity by terminated personnel.
- **Implemented Mitigation:**
  1. `requireAuth()` and `canAccessDocument()` actively re-query account status on every request.
  2. Any account with `status === 'DISABLED'` is unconditionally rejected (403 Forbidden).
- **Automated Test:** `tests/security/authorization.test.ts` (Case 17).

---

### 9. Metadata Leakage via Search or Listing
- **Attack Scenario:** Charlie queries `/api/documents?q=Financial` to learn whether sensitive financial documents exist.
- **Impact:** Information disclosure of confidential document titles, categories, or ownership.
- **Implemented Mitigation:**
  1. Search queries are applied strictly *after* the authorization filter `getVisibleDocuments(user)`.
  2. Documents that the user neither owns nor has active permissions for are excluded at the database/data boundary.
- **Automated Test:** `tests/integration/revocation-and-scenarios.test.ts` (Case 23).

---

### 10. Audit Write Failure Safety (Fail-Closed)
- **Attack Scenario:** An operation succeeds (e.g. file is downloaded or deleted), but the audit log write fails due to transient database error.
- **Impact:** Unaudited sensitive operations.
- **Implemented Mitigation:** Database operations and audit log entries are coupled atomically using database transactions or trusted stored procedures (`append_audit_event`). If audit recording fails, the transaction is aborted.
