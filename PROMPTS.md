# TrustVault — AI Usage Record (`PROMPTS.md`)

This log documents AI interactions, prompts, findings, vulnerabilities/limitations identified during development, verification steps, and corrective actions taken.

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
- **Git commit:** `155fce9` (feat(scaffold): initialize Next.js 16 App Router with TypeScript strict mode, Tailwind CSS, and Vitest)

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
- **Git commit:** `745c10b` and `45e0d3a` (feat(database) & feat(security): schema, RLS, and cryptographic hash chain verification)

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
- **Git commit:** `45e0d3a` and `04e77ee` (feat(security) & feat(api): centralized authorization and server-mediated file delivery)

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
- **Git commit:** `5f0a05c` (feat(ui): build enterprise dashboard, secure sign-out confirmation dialog, and route guards)

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
- **Git commit:** `25a8d45` and `485e866` (test(security) & docs: 29 automated tests, test matrix telemetry, and documentation)
