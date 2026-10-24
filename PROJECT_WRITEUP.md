# TrustVault — Engineering Reflection & Project Write-Up (`PROJECT_WRITEUP.md`)

This report provides a technical debrief on the architecture, authorization design, file-delivery mechanism, audit integrity safeguards, AI-assisted development learnings, and consciously accepted security boundaries of **TrustVault**.

---

## 1. What Was Built
TrustVault was engineered to solve the vulnerability of insecure document sharing platforms where access revocation is delayed or bypassed by reusable pre-signed URLs, and where audit logs can be quietly manipulated.

Key components constructed:
1. **Next.js App Router & TypeScript Application:** Strictly typed full-stack architecture with enterprise dashboard layout, accessible forms, and security telemetry.
2. **Centralized Authorization Engine (`canAccessDocument`):** Evaluates every action against session identity, document ownership, active permissions, and account status.
3. **Private File Delivery Engine:** Eliminates public bucket access and long-lived signed URLs. Files are streamed through server-mediated endpoints with strict cache-invalidation headers.
4. **Append-Only Tamper-Evident Audit Trail:** Powered by SHA-256 cryptographic hash chaining over canonical JSON payloads, accompanied by a verification utility that detects altered, missing, or reordered records.
5. **Multi-Attribute Search & AI Access Advisor:** Comprehensive search across name, owner, category, and date range, coupled with a zero-trust AI recommendation engine that generates advisory grants requiring mandatory owner confirmation and dual audit logging.
6. **Robust Automated Test Suite:** 80 automated tests (Vitest) across 9 suites verifying all security scenarios, including path traversal, signature spoofing, role escalation, immediate revocation, stateless session persistence, and search/AI isolation.
7. **Secure Sign-Out and Re-Authentication:** Complete session invalidation, accessible confirmation dialog, flash message handling, and server-side route guards.

---

## 2. The Permission Model in Plain Language
TrustVault defines three explicit personas:
- **OWNER:** Has full sovereignty over the documents they upload. Can view, download, edit metadata, delete, grant `READ` or `EDIT` access to named users, and revoke access at any moment.
- **VIEWER:** Restricted user. Can only discover documents that have been explicitly shared with them. With `READ` access, they may view and download; with `EDIT` access, they may also update metadata or replace file contents. Viewers cannot manage permissions, delete files, or access admin consoles.
- **ADMIN:** Corporate governance role. Administrators can view system-wide document counts, classifications, and audit logs, and can toggle user accounts between `ACTIVE` and `DISABLED`. **Crucially, administrators do NOT inherit automatic rights to download or inspect confidential file contents.** If an administrator needs to inspect a confidential file, the document owner must explicitly grant them permission.

---

## 3. Where the Authorization Decision Happens During Download
In traditional web apps, download buttons link to public URLs or 60-minute signed S3 URLs. In TrustVault, **the authorization decision happens on the server immediately prior to streaming the file bytes.**

When a user initiates a download:
1. The request hits `GET /api/documents/[id]/download`.
2. The server extracts the session cookie or Supabase token and resolves the user identity via `getCurrentUser()`. If unauthenticated or disabled, the request is terminated (401/403).
3. The server queries the database for the active permission state (`document_permissions` where `document_id = [id]`, `user_id = user.id`, and `revoked_at IS NULL`).
4. The server invokes `canAccessDocument(user, doc, 'download', activeGrant)`.
5. If denied, a `DENIED` audit event is committed to the hash chain, and a `403 Forbidden` response is returned.
6. If allowed, an `ALLOWED` audit event is committed, and the file buffer is retrieved from private storage and streamed with `Cache-Control: no-store` and `Content-Disposition: attachment`.

---

## 4. Why Frontend Checks Are Insufficient
Frontend route guards, conditional button rendering, and hidden menus are purely cosmetic user experience conveniences. They offer **zero security guarantees**:
- An attacker can inspect browser network calls, craft HTTP requests using `curl` or Postman, manipulate query parameters, change route paths, or tamper with client-side JavaScript state.
- If an API route relies on `if (req.body.role === 'ADMIN')`, an attacker can simply send `{ "role": "ADMIN" }`.
- In TrustVault, frontend visibility is strictly backed by server-side verification and database Row Level Security (RLS) policies. Every query filters out unauthorized documents at the database boundary.

---

## 5. How Immediate Revocation Works
When an owner clicks "Revoke Access" for Bob on Document 1:
1. `DELETE /api/documents/[id]/permissions/[userId]` executes.
2. The server sets `revoked_at = NOW()` on the permission row and appends a `PERMISSION_REVOKE` audit event.
3. Because TrustVault never issues reusable, long-lived signed URLs, Bob cannot reuse an old link.
4. When Bob makes his very next request to view or download the file, step 3 of the download flow queries for `revoked_at IS NULL`. Finding none, `canAccessDocument` immediately returns `false` (403 Forbidden).
5. The revocation takes effect on the millisecond it is committed—no logout, cache expiration, or server restart required.

---

## 6. How the Audit Trail is Protected
The audit trail is protected through layered defense-in-depth:
1. **Append-Only Database Constraints:** PostgreSQL triggers and RLS policies forbid any `UPDATE` or `DELETE` statements on the `audit_logs` table.
2. **Cryptographic SHA-256 Hash Chaining:** Every log entry computes `event_hash = SHA256(previous_hash + canonical_json(event_payload))`. Each block is mathematically bound to its predecessor.
3. **Deterministic Canonical Serialization:** Key sorting ensures consistent hash output across runtimes.
4. **Serialization via Advisory Locks:** Concurrent audit writes are serialized using PostgreSQL transaction advisory locks (`pg_advisory_xact_lock`) to prevent chain forks.
5. **Real-Time Verification:** Any modified field, deleted row, or reordered record breaks the hash chain linkage and is detected by `verifyAuditTrailIntegrity()`.

---

## 7. How AI Helped and Where Its Output Was Wrong
During development, AI accelerated scaffolding and automated test authoring, but human engineering was required to catch several critical limitations:
1. **Directory Naming Collision:** The AI initially attempted to run `create-next-app ./`, which failed because the workspace directory `"snovasys project"` contained a space, violating npm package naming rules. Resolved by scaffolding into a clean temporary directory and migrating files.
2. **Vitest Peer Dependency Conflict:** npm ERESOLVE failed when installing vitest alongside `@types/node@20`. Resolved using legacy peer resolution.
3. **Sub-Millisecond Hash Chain Ordering Bug:** In initial test runs, `verifyAuditTrailIntegrity` sorted events using `new Date(timestamp).getTime()`, and broke ties using `a.id.localeCompare(b.id)`. When two seed events were generated within the same millisecond, the random UUID comparison inverted the sequential chain order, causing an integrity false-positive. Resolved by preserving sequential insertion order and validating monotonic timestamps.
4. **Next.js 16 Experimental Turbopack Conflict:** `create-next-app` generated `cacheComponents: true` in `next.config.ts`, which broke Next.js route segment configs during production build. Resolved by removing the experimental flag to restore standard dynamic route support.
5. **Autonomous AI Access Grants vs. Zero-Trust Enforcement:** When generating AI permission suggestions, the AI initially attempted to directly execute grants upon suggestion creation. We rejected this pattern because the machine must never widen access on its own. We designed a two-stage zero-trust pattern: the AI generates an advisory recommendation logged as `AI_ACCESS_SUGGESTION`, but the grant takes effect only when the human owner confirms it, generating a verified `PERMISSION_GRANT` in the SHA-256 hash chain.

---

## 8. What Was Deliberately Not Implemented
1. **In-Browser Document Editing:** Building an embedded full-featured Word/Excel web editor was out of scope. Document editing is supported via metadata editing and authorized file replacement.
2. **Client-Side Encryption (Zero-Knowledge):** While investigated, client-side encryption of files before upload would prevent server-side format verification (magic bytes) and server-mediated search indexing.
3. **Multi-Factor Authentication (MFA):** In production, Supabase Auth MFA (TOTP) should be enabled. For the hackathon/demo challenge, 1-click persona logins were prioritized to enable frictionless evaluation.
4. **Autonomous Access Escalation by AI:** The platform deliberately forbids automated widening of access by AI or background processes. All permission grants require human sovereign confirmation.

---

## 9. Remaining Risks & Unfinished Work
1. **Local Hash Chain vs. Privileged Superuser:** An attacker with root database access (service role key or postgres superuser) could theoretically alter a row and rewrite all subsequent hashes. Production enhancement: periodic anchoring of hash checkpoints to an external immutable ledger (e.g. AWS S3 Object Lock or RFC 3161 Timestamp Authority).
2. **Advanced Malware Scanning:** The current file validator verifies extensions, MIME types, and binary magic bytes. In production, an external anti-malware pipeline (e.g. ClamAV or VirusTotal API) should scan files asynchronously upon upload.
3. **Offline Document Copies:** Revocation terminates online viewing and downloading immediately. It cannot physically delete a copy of a PDF that a user already saved to their local computer before their access was revoked.
