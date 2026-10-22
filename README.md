# TrustVault — Secure Document Sharing with a Real Audit Trail

TrustVault is an enterprise-grade, zero-trust web application built for confidential document management. It addresses the critical flaw of traditional document sharing portals: **delayed access revocation caused by reusable pre-signed URLs, and silently alterable audit records.**

TrustVault guarantees **immediate access revocation** via server-mediated file delivery, enforces strict role separation (**OWNER**, **VIEWER**, **ADMIN**), and maintains an **append-only, tamper-evident audit trail** mathematically chained via SHA-256 cryptographic hashes.

---

## Key Features

1. **Centralized Authorization Engine (`canAccessDocument`):**
   - Single source of truth for authorization decisions across all routes.
   - Evaluates session identity, document ownership, active permissions, and account status.
   - **Administrator Least Privilege:** Administrators observe system metadata and audit events, but **cannot** download confidential file contents without explicit owner grants.

2. **Immediate Access Revocation:**
   - **Zero long-lived pre-signed URLs.**
   - All document views, previews, and downloads stream through server-mediated endpoints (`/api/documents/[id]/download`).
   - Every single file request queries fresh permission state (`revoked_at IS NULL`).
   - Revocation takes effect on the exact millisecond it is committed.

3. **Tamper-Evident SHA-256 Hash Chained Audit Trail:**
   - Every sensitive event (upload, download, view, grant, revoke, admin action, denied attempt) is cryptographically linked to its predecessor.
   - Immutability enforced via PostgreSQL triggers and RLS policies forbidding `UPDATE` and `DELETE`.
   - Real-time verification utility (`/api/audit/verify`) detects modified payloads, deleted records, or broken chronological order.

4. **Deep Server-Side File Validation:**
   - Validates file extensions, MIME types, and binary magic bytes (`%PDF-`, `PK\x03\x04`, `\x89PNG`, `\xFF\xD8\xFF`).
   - Rejects empty, oversized (>15MB), or disguised executable files.
   - Sanitizes filenames against path traversal attacks (`../`).
   - Serves files with `Content-Disposition: attachment`, `no-store` cache controls, and `nosniff`.

5. **Secure Sign-Out and Re-Authentication:**
   - Header displays current user identity and role badge.
   - Accessible confirmation modal prevents accidental session termination.
   - Invalidates Supabase sessions, deletes HTTP-only session cookies, and redirects to `/login?message=signed_out`.
   - Server-side Next.js middleware guards `/dashboard`, `/documents`, `/audit`, `/admin`, and `/security`.

6. **29 Real Automated Unit & Integration Tests:**
   - Comprehensive test suite covering all 24 required security scenarios with 100% pass rate.

---

## Technology Stack

- **Framework:** Next.js 16 (App Router) with TypeScript (Strict Mode)
- **Styling:** Tailwind CSS with enterprise dark navy and blue/teal palette
- **Authentication & Database:** Supabase Auth & Supabase PostgreSQL with strict Row Level Security (RLS)
- **Private Storage:** Supabase Storage Private Bucket (`documents`, public=false)
- **Icons:** Lucide React
- **Testing:** Vitest with isolated deterministic mock data store
- **Deployment Target:** Vercel

---

## Role & Permission Matrix

| Capability / Action | OWNER | VIEWER (with READ) | VIEWER (with EDIT) | ADMIN |
|---|:---:|:---:|:---:|:---:|
| **Upload Documents** | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **View Owned Documents** | ✅ Yes | N/A | N/A | N/A |
| **View Permitted Documents** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Metadata Only |
| **Download Document Content** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No (Requires Grant) |
| **Inline File Preview** | ✅ Yes | ✅ Yes | ✅ Yes | ❌ No (Requires Grant) |
| **Edit Metadata / Replace File** | ✅ Yes | ❌ No | ✅ Yes | ❌ No |
| **Grant READ / EDIT Access** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Revoke Access Immediately** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Delete Document** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **View Document Audit History** | ✅ Yes | ❌ No | ❌ No | ✅ Yes |
| **View System-Wide Audit Trail** | ❌ No | ❌ No | ❌ No | ✅ Yes |
| **Manage User Account Status** | ❌ No | ❌ No | ❌ No | ✅ Yes (ACTIVE/DISABLED) |

---

## Database Schema & Migrations

All migrations are version-controlled in `supabase/migrations/20261022000001_initial_schema.sql`:

1. **`profiles`:**
   - `id` (UUID, PK referencing `auth.users`)
   - `full_name` (TEXT)
   - `email` (TEXT UNIQUE)
   - `role` (ENUM: `ADMIN`, `OWNER`, `VIEWER`)
   - `status` (ENUM: `ACTIVE`, `DISABLED`)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

2. **`documents`:**
   - `id` (UUID, PK)
   - `name` (TEXT)
   - `description` (TEXT)
   - `category` (TEXT)
   - `storage_path` (TEXT UNIQUE)
   - `mime_type` (TEXT)
   - `file_size` (BIGINT)
   - `owner_id` (UUID, FK to `profiles`)
   - `status` (ENUM: `ACTIVE`, `DELETED`, `ARCHIVED`)
   - `created_at`, `updated_at` (TIMESTAMPTZ)

3. **`document_permissions`:**
   - `id` (UUID, PK)
   - `document_id` (UUID, FK to `documents`)
   - `user_id` (UUID, FK to `profiles`)
   - `permission` (ENUM: `READ`, `EDIT`)
   - `granted_by` (UUID, FK to `profiles`)
   - `granted_at` (TIMESTAMPTZ)
   - `revoked_at` (TIMESTAMPTZ, NULL while active)
   - *Partial Unique Index:* `(document_id, user_id) WHERE revoked_at IS NULL` prevents duplicate active grants while preserving full revocation history.

4. **`audit_logs`:**
   - `id` (UUID, PK)
   - `actor_user_id` (UUID, FK to `profiles`)
   - `document_id` (UUID, FK to `documents`)
   - `action` (TEXT)
   - `result` (ENUM: `ALLOWED`, `DENIED`)
   - `timestamp` (TIMESTAMPTZ)
   - `request_id` (TEXT)
   - `ip_address` (TEXT)
   - `user_agent` (TEXT)
   - `metadata` (JSONB)
   - `previous_hash` (TEXT)
   - `event_hash` (TEXT)
   - *Immutability Trigger:* `BEFORE UPDATE OR DELETE ON audit_logs FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();`

---

## Seed Demo Personas

When running locally or evaluating, you can authenticate instantly using the **1-Click Demo Personas** on `/login`:

| Name | Role | Email | Password | Initial Privileges / Purpose |
|---|:---:|---|---|---|
| **Alice Owner** | `OWNER` | `alice@trustvault.local` | `DemoPassword123!` | Owns Q3 Audit Report & Zero-Trust Plan. Can grant/revoke access. |
| **Bob Viewer** | `VIEWER` | `bob@trustvault.local` | `DemoPassword123!` | Has active `READ` grant on Doc 1 and `EDIT` grant on Doc 2. |
| **Charlie Viewer** | `VIEWER` | `charlie@trustvault.local` | `DemoPassword123!` | Has **no** permissions. Used to test `DENIED` access attempts. |
| **Dave Admin** | `ADMIN` | `admin@trustvault.local` | `DemoPassword123!` | System auditor & user manager. Cannot download confidential files. |
| **Eve Disabled** | `VIEWER` | `eve@trustvault.local` | `DemoPassword123!` | Account disabled by administrator. Tests account lockout defense. |

---

## Local Installation & Setup

### Prerequisites
- Node.js v18+ (tested on Node v24.20.0)
- npm v9+

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/trustvault.git
cd trustvault
npm install
```

### 2. Configure Environment Variables
Copy the template configuration:
```bash
cp .env.example .env.local
```
For local offline evaluation, the application includes a deterministic mock data store that runs immediately without live Supabase credentials.

To connect to a live Supabase project:
1. Create a new Supabase project at [https://supabase.com](https://supabase.com).
2. Run the SQL migration in `supabase/migrations/20261022000001_initial_schema.sql` in the Supabase SQL Editor.
3. (Optional) Run `supabase/seed.sql` to populate initial demo accounts.
4. Copy your **Project URL**, **Anon Key**, and **Service Role Key** into `.env.local`:
   ```ini
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

### 3. Run Automated Tests
Execute the full Vitest security test suite:
```bash
npm test
```
**Actual Test Results:**
```text
✓ tests/security/authorization.test.ts (12 tests)
✓ tests/security/file-validation.test.ts (6 tests)
✓ tests/security/audit-integrity.test.ts (4 tests)
✓ tests/integration/revocation-and-scenarios.test.ts (7 tests)

Test Files  4 passed (4)
     Tests  29 passed (29)
  Duration  566ms
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Vercel Deployment Instructions

1. Push your repository to GitHub.
2. Import the project into your Vercel Dashboard.
3. Configure the Environment Variables in Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL` (Set to your Vercel production domain, e.g. `https://trustvault.vercel.app`)
4. Click **Deploy**. Vercel will execute `npm run build` and launch the serverless App Router application.

---

## Project Documentation Index

- **`API.md`:** Complete endpoint documentation, request/response contracts, and error responses.
- **`THREATS.md`:** Threat model covering 24+ vulnerability scenarios, mitigations, and residual risks.
- **`PROMPTS.md`:** AI interaction log with five dated entries detailing actual work, findings, and fixes.
- **`DEMO_SCRIPT.md`:** Step-by-step 5-minute live demonstration script.
- **`PROJECT_WRITEUP.md`:** Technical reflection on authorization architecture, revocation mechanics, and design decisions.
