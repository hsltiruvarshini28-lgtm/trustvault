# TrustVault — AI Usage Record (`PROMPTS.md`)

This log documents AI interactions, prompts, findings, vulnerabilities/limitations identified during development, verification steps, corrective actions taken, and reusable prompts and context files.

---

### Entry 1: Project Scaffold, Environment Setup, and Dependency Conflict Resolution
- **Date:** 2026-10-22
- **Prompt:**
  "Build TrustVault — Secure Document Sharing with a Real Audit Trail. Initialize repository, set up Next.js App Router, TypeScript strict mode, Tailwind CSS, Supabase SSR, and test runner. Implement secure sign-out and sign-in again requirements."
- **What the AI produced:**
  Attempted to run `create-next-app` directly in the project root directory, and installed Vitest and Supabase packages.
- **Specific error, weakness, or limitation discovered:**
  1. `create-next-app` failed due to npm naming restrictions because the workspace folder name `"snovasys project"` contained a space.
  2. Installing `vitest` failed with npm peer dependency conflict (`ERESOLVE`) against `@types/node@20.19.x` vs vitest's peer requirement.
  3. Windows PowerShell script execution policy blocked `npm.ps1`.
- **How I checked the issue:**
  Inspected the error logs in the terminal execution output (`npm error code ERESOLVE`, `Could not create a project called "snovasys project" because of npm naming restrictions`).
- **What I changed to fix it:**
  1. Used `npm.cmd` and `npx.cmd` to bypass PowerShell script execution restrictions.
  2. Scaffolded into a valid temporary package folder (`temp-app`) and migrated files into the workspace root.
  3. Renamed the package to `trustvault` in `package.json`.
  4. Installed `vitest` and `vite` with `--legacy-peer-deps` and configured `vitest.config.ts` with path aliasing.
  5. Established `.env.example` and verified `.gitignore` to prevent secret leakage.
- **Git commit:** [`155fce9`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/155fce9) *(feat(scaffold): initialize Next.js 16 App Router with TypeScript strict mode, Tailwind CSS, and Vitest)*

---

### Entry 2: Database Schema, Row-Level Security, and Tamper-Evident Hash Chain [Security/Audit]
- **Date:** 2026-10-22
- **Prompt:**
  "Design and implement SQL migrations for profiles, documents, document_permissions, and append-only tamper-evident audit_logs with SHA-256 cryptographic hash chaining and RLS policies."
- **What the AI produced:**
  Generated `20261022000001_initial_schema.sql`, `seed.sql`, and `src/lib/audit/audit-logger.ts`.
- **Specific error, weakness, or limitation discovered:**
  1. In `verifyAuditTrailIntegrity`, the verification utility sorted events by timestamp and used `a.id.localeCompare(b.id)` as a secondary tiebreaker. When two audit events were generated in rapid succession within the same millisecond (e.g. rapid grant and revoke in automated tests), random UUID sorting inverted the sequential chain order, causing an integrity check false positive (`Chronological violation at index 3`).
  2. Hardcoded seed log timestamps in the future caused subsequent real-time events to appear chronologically out-of-order.
- **How I checked the issue:**
  Executed Vitest test suite (`npm test`). The test `verifies audit trail remains cryptographically valid after multiple grant/revoke operations` failed with `AssertionError: expected false to be true`.
- **What I changed to fix it:**
  1. Refactored `verifyAuditTrailIntegrity` in `src/lib/audit/audit-logger.ts` to verify the array in its true sequential insertion order rather than arbitrary UUID sorting.
  2. Updated `buildSeedAuditLogs()` in `src/lib/data/store.ts` to use relative timestamps from the past (`Date.now() - 3600000`), ensuring strict chronological monotonicity.
- **Git commit:** [`745c10b`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/745c10b) and [`45e0d3a`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/45e0d3a) *(feat(database) & feat(security): schema, RLS, and cryptographic hash chain verification)*

---

### Entry 3: Centralized Authorization Engine and Immediate Access Revocation [Authorization/Security]
- **Date:** 2026-10-22
- **Prompt:**
  "Implement canAccessDocument() matrix, server-mediated file streaming, strict MIME & magic-byte verification, and immediate access revocation tests."
- **What the AI produced:**
  Created `src/lib/auth/authorization.ts`, `src/lib/storage/file-validator.ts`, and download route `/api/documents/[id]/download`.
- **Specific error, weakness, or limitation discovered:**
  1. Common implementations generate 60-minute pre-signed storage URLs, which allow revoked users to continue downloading files until the signed URL expires.
  2. Administrators are often granted global wildcard access, violating the principle of least privilege for confidential documents.
- **How I checked the issue:**
  Wrote unit tests in `tests/security/authorization.test.ts` asserting that `canAccessDocument(admin, doc, 'download')` must return 403 Forbidden unless granted an explicit permission.
- **What I changed to fix it:**
  1. Built server-mediated file streaming via `GET /api/documents/[id]/download` which queries fresh permission state on every request and returns `Cache-Control: no-store`.
  2. Implemented strict role boundaries: Administrators can view metadata and audit logs, but cannot download confidential file contents without explicit owner grants.
  3. Added binary magic-byte validators for PDF (`%PDF-`), ZIP-based Office files (`PK\x03\x04`), and images, rejecting spoofed extensions.
- **Git commit:** [`45e0d3a`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/45e0d3a) and [`04e77ee`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/04e77ee) *(feat(security) & feat(api): centralized authorization and server-mediated file delivery)*

---

### Entry 4: Secure Sign Out, Session Invalidation, and Route Guards
- **Date:** 2026-10-22
- **Prompt:**
  "Implement accessible confirmation dialog for sign out, Supabase session invalidation, flash messages on /login, server-side route guards, and re-login verification."
- **What the AI produced:**
  Created `src/components/layout/Header.tsx`, `SignOutModal.tsx`, `src/middleware.ts`, and `/api/auth/logout`.
- **Specific error, weakness, or limitation discovered:**
  1. Relying only on client-side state clearing allows unauthenticated users to access protected pages by typing URLs directly.
  2. Standard sign-out buttons often trigger immediately without user confirmation, leading to accidental session loss.
- **How I checked the issue:**
  Inspected `src/middleware.ts` and tested route protection when session cookies are deleted.
- **What I changed to fix it:**
  1. Added Next.js middleware protecting `/dashboard`, `/documents`, `/audit`, `/admin`, and `/security`, redirecting unauthenticated visitors to `/login?message=session_required`.
  2. Created accessible `SignOutModal` with Cancel and Sign Out buttons and role badge display.
  3. Implemented `/api/auth/logout` which invalidates Supabase sessions, clears cookies, and logs the sign-out event in the audit trail.
- **Git commit:** [`5f0a05c`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/5f0a05c) *(feat(ui): build enterprise dashboard, secure sign-out confirmation dialog, and route guards)*

---

### Entry 5: Administrative Security Dashboard, Audit Verification & Production Build Resolution
- **Date:** 2026-10-22
- **Prompt:**
  "Build Admin and Security dashboards with live hash-chain verification, 24 automated security test cases, and comprehensive documentation."
- **What the AI produced:**
  Created `/admin`, `/security`, and ran `next build`.
- **Specific error, weakness, or limitation discovered:**
  1. In Next.js 16.4.2, `create-next-app` generated `cacheComponents: true` and `partialPrefetching: true` in `next.config.ts`, which caused Turbopack build failure when route segment configurations (`export const dynamic = 'force-dynamic'`) were used on dynamic cookie-accessing routes.
- **How I checked the issue:**
  Executed `npm run build` and examined the build logs: `Error: Turbopack build failed: Route segment config 'dynamic' is not compatible with nextConfig.cacheComponents`.
- **What I changed to fix it:**
  1. Removed the experimental `cacheComponents: true` and `partialPrefetching: true` from `next.config.ts`, restoring standard dynamic server-side rendering for secure cookie verification.
  2. Built the live Security Center (`/security`) with real-time SHA-256 hash chain verification and automated test matrix telemetry.
  3. Re-ran `npm run build`, completing compilation with zero errors across all 24 routes.
- **Git commit:** [`25a8d45`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/25a8d45) and [`485e866`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/485e866) *(test(security) & docs: automated tests, test matrix telemetry, and documentation)*

---

### Entry 6: Multi-Attribute Search & AI Access Recommendation Engine [AI/Authorization]
- **Date:** 2026-10-23
- **Prompt:**
  "Enhance document repository search to support name, owner, category, and date filtering as required by Requirement 7. Add an AI Access Advisor on document access screen where AI recommends recipients and least-privilege permissions, but where the machine never widens access automatically and human owner confirmation is required, generating dual audit events."
- **What the AI produced:**
  Created search parameters in `GET /api/documents` and `DocumentsPage`, and added `/api/documents/[id]/ai-suggest`.
- **Specific error, weakness, or limitation discovered:**
  1. The AI initially only searched `name` and `description`, ignoring document owners and date ranges. Searching for "Alice" returned zero results unless "Alice" was in the filename.
  2. In the AI suggestion flow, the AI initially attempted to directly execute the permission grant upon suggestion generation, which violates the strict rule that *"the machine must never widen access on its own"*.
- **How I checked the issue:**
  Wrote `tests/security/search-and-ai-suggest.test.ts`. Verified that `recordAiSuggestion` does not alter active permissions until the human owner explicitly invokes `grantPermission`.
- **What I changed to fix it:**
  1. Updated `GET /api/documents` and `DocumentsPage` to support `q` (unified search across name, description, owner), `owner` filter, `category` filter, `date`, `startDate`, and `endDate`.
  2. Implemented the AI Access Advisor card in `ManageAccessClient.tsx` that generates advisory recommendations, records `AI_ACCESS_SUGGESTION` in the audit chain, and requires the owner to click `Confirm & Apply AI Grant` before permission is conferred.
- **Git commit:** [`69d78df`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/69d78df) *(feat: implement multi-attribute search, zero-trust AI access advisor, and full documentation compliance)*

---

### Entry 7: End-to-End Security Scenarios, Controlled Bypass Verification, and Form Hygiene
- **Date:** 2026-10-23
- **Prompt:**
  "Perform comprehensive end-to-end testing of TrustVault. Verify every visible button, form, upload, and permission state. Sanitize login, signup, and upload form placeholders (ensure empty defaults, hints only, demo accounts separated). Conduct a controlled authorization bypass test to prove security test suite failure and immediate recovery. Add a complete multi-user security lifecycle scenario test suite."
- **What the AI produced:**
  Updated form placeholders in `src/app/login/page.tsx`, `src/app/signup/page.tsx`, and `src/app/documents/upload/page.tsx`. Authored `tests/integration/trustvault-security-scenarios.test.ts`.
- **Specific error, weakness, or limitation discovered:**
  1. The login form had hardcoded placeholder `alice@trustvault.local` and masked bullets `••••••••••••`, which could mislead users into believing fields were pre-filled.
  2. The signup form had `e.g. Sarah Jenkins` instead of a generic instruction hint.
  3. Controlled test proved that bypassing authorization in `src/lib/auth/authorization.ts` immediately caused 6 security test assertions to fail, confirming test sensitivity.
  4. Initial scenario test had missing telemetry properties (`request_id`, `ip_address`, `user_agent`) on `appendAuditLog`, which `next build` detected during strict TypeScript compilation.
- **How I checked the issue:**
  1. Ran `cmd /c npm test` during the controlled authorization bypass, observing 6 failed assertions.
  2. Ran `cmd /c npm run build` to catch TypeScript compiler errors on audit log payloads.
  3. Ran live HTTP network verification scripts against `https://trustvaultsecure.vercel.app/` validating unauthenticated 401s, Bob's 403 download rejection, and Admin's 403 content denial.
- **What I changed to fix it:**
  1. Standardized all form placeholders to clean hints (`Enter your email address`, `Enter your password`, `Enter your full name`, `Confirm your password`).
  2. Added full telemetry metadata to all test audit log append calls.
  3. Restored authorization matrix and confirmed 73/73 passing tests across 8 test suites.
- **Git commit:** [`6a6f39c`](https://github.com/hsltiruvarshini28-lgtm/trustvault/commit/6a6f39c) *(fix(forms): sanitize placeholders on login, signup, and upload; add end-to-end security scenarios test suite)*

---

## Reusable Prompts, Instructions, and Context Files

The following context files and instruction sets were reused across the project to maintain consistency and defense-in-depth security:

### 1. Zero-Trust Security Invariants Context File (`SYSTEM_CONTEXT.md`)
```markdown
You are a Principal Security Architect building TrustVault.
Under no circumstances may you rely on client-side button hiding or route state for security.
Every endpoint must enforce:
1. Server-side session verification via HTTP-only cookie.
2. Account status check (reject DISABLED accounts with 403 Forbidden).
3. Authorization decision via centralized canAccessDocument() matrix.
4. Immediate access revocation: no pre-signed URLs; stream bytes with Cache-Control: no-store.
5. Append-only SHA-256 tamper-evident cryptographic hash chaining for all ALLOWED and DENIED events.
6. The machine must NEVER widen access automatically. AI suggestions are strictly advisory and require human confirmation.
```

### 2. File Ingestion & Anti-Traversal Directive
```markdown
When processing uploaded files:
- Inspect binary magic bytes directly from the Buffer (%PDF-, PK\x03\x04, \x89PNG, \xFF\xD8\xFF).
- Reject disguised shell scripts or executable files regardless of claimed extension.
- Strip all path traversal characters (../, ..\, null bytes).
- Enforce strict 15MB file size limit.
- Deliver with Content-Disposition: attachment, X-Content-Type-Options: nosniff, and CSP headers.
```

### 3. Cryptographic Audit Monotonicity Directive
```markdown
When building the SHA-256 audit hash chain:
- Calculate event_hash = SHA-256(canonicalJson({ id, actor_user_id, document_id, action, result, timestamp, request_id, ip_address, user_agent, metadata, previous_hash })).
- Ensure strict chronological monotonicity: timestamps must never move backwards.
- Maintain verifyAuditTrailIntegrity() in sequential order rather than arbitrary UUID sorting to prevent sub-millisecond tiebreaker race conditions.
```
