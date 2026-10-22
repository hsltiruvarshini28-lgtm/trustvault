# TrustVault — Comprehensive API Documentation (`API.md`)

This document specifies all application programming interfaces (APIs) provided by TrustVault, including authentication requirements, role authorization, parameter validations, response schemas, error responses, audit events generated, and automated test references.

---

## 1. Authentication & Session Management

### `POST /api/auth/login`
- **Purpose:** Authenticates user credentials, validates account status (rejects `DISABLED`), and establishes an HTTP-only secure session cookie.
- **Authentication:** Public (Unauthenticated).
- **Rate Limit:** 5 requests / minute per IP.
- **Request Body:**
  ```json
  {
    "email": "alice@trustvault.local",
    "password": "DemoPassword123!"
  }
  ```
- **Validation:**
  - `email`: Valid email format, required.
  - `password`: String, min 8 characters, required.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "user": {
      "id": "11111111-1111-4111-a111-111111111111",
      "full_name": "Alice Owner",
      "email": "alice@trustvault.local",
      "role": "OWNER",
      "status": "ACTIVE"
    },
    "message": "Signed in successfully."
  }
  ```
- **HTTP Errors:**
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid credentials.
  - `403 Forbidden`: Account is disabled (`status === 'DISABLED'`).
- **Audit Events:**
  - `USER_LOGIN` (`ALLOWED` on success, `DENIED` on invalid credentials or disabled account).
- **Automated Tests:** `tests/integration/revocation-and-scenarios.test.ts` (Case 17).

---

### `POST /api/auth/logout`
- **Purpose:** Invalidates active session tokens, clears session cookies, and logs the sign-out event.
- **Authentication:** Authenticated.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "You have signed out successfully."
  }
  ```
- **Audit Events:** `USER_LOGOUT` (`ALLOWED`).

---

### `GET /api/auth/me`
- **Purpose:** Returns the verified profile, role, and account status of the current session user.
- **Authentication:** Authenticated.
- **Response (200 OK):**
  ```json
  {
    "authenticated": true,
    "user": {
      "id": "11111111-1111-4111-a111-111111111111",
      "full_name": "Alice Owner",
      "email": "alice@trustvault.local",
      "role": "OWNER",
      "status": "ACTIVE",
      "created_at": "2026-10-22T08:00:00.000Z"
    }
  }
  ```
- **HTTP Errors:** `401 Unauthorized`: No active session found.

---

## 2. Document Operations

### `GET /api/documents`
- **Purpose:** Lists documents accessible to the authenticated user. Never leaks unauthorized metadata to non-permitted users.
- **Authentication:** Authenticated.
- **Allowed Roles:**
  - `ADMIN`: Observes system-wide document metadata (file contents remain confidential).
  - `OWNER`: Documents owned by the user.
  - `VIEWER`: Documents explicitly shared with active `READ` or `EDIT` grants.
- **Query Parameters:**
  - `q` (optional): Case-insensitive search string matching name or description.
  - `category` (optional): Filter by category (`Finance`, `Engineering`, `Executive`, `Legal`, `General`).
- **Response (200 OK):**
  ```json
  {
    "documents": [
      {
        "id": "aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa",
        "name": "Q3-Financial-Audit-Report.pdf",
        "description": "Confidential quarterly financial statements.",
        "category": "Finance",
        "mime_type": "application/pdf",
        "file_size": 1048576,
        "owner_id": "11111111-1111-4111-a111-111111111111",
        "status": "ACTIVE",
        "access_level": "OWNER"
      }
    ],
    "total": 1
  }
  ```
- **Automated Tests:** `tests/integration/revocation-and-scenarios.test.ts` (Case 23).

---

### `POST /api/documents`
- **Purpose:** Uploads a document to the private Supabase storage bucket, performs deep file signature (magic bytes) validation, creates the database record, and audits the event.
- **Authentication:** Authenticated.
- **Allowed Roles:** `OWNER`, `ADMIN`.
- **Request Format:** `multipart/form-data`:
  - `file`: Binary file (PDF, DOCX, XLSX, PPTX, TXT, PNG, JPG), max 15MB.
  - `description` (optional): String.
  - `category`: String (`Finance`, `Engineering`, etc.).
- **Validation:**
  - Inspects initial byte signatures (`%PDF-`, `PK\x03\x04`, `\x89PNG`, `\xFF\xD8\xFF`).
  - Rejects empty files and files exceeding 15,728,640 bytes.
  - Sanitizes filename against path traversal (`../`).
- **Response (201 Created):**
  ```json
  {
    "success": true,
    "document": {
      "id": "doc-uuid",
      "name": "financial_report.pdf",
      "storage_path": "owner-id/doc-uuid/financial_report.pdf",
      "mime_type": "application/pdf",
      "file_size": 1048576,
      "status": "ACTIVE"
    }
  }
  ```
- **HTTP Errors:**
  - `400 Bad Request`: File empty, oversized, unsupported type, or magic-byte mismatch.
  - `403 Forbidden`: User has `VIEWER` role.
- **Audit Events:** `DOCUMENT_UPLOAD` (`ALLOWED`).
- **Automated Tests:** `tests/security/file-validation.test.ts` (Cases 18 & 19).

---

### `GET /api/documents/[id]`
- **Purpose:** Retrieves document metadata if the user is owner, holds an active grant, or is administrator.
- **Authentication:** Authenticated.
- **HTTP Errors:**
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: User lacks permission.
  - `404 Not Found`: Document does not exist or has been deleted.
- **Audit Events:** `METADATA_VIEW` (`ALLOWED` or `DENIED`).

---

### `GET /api/documents/[id]/download` (CRITICAL IMMEDIATE REVOCATION ENDPOINT)
- **Purpose:** Server-mediated file delivery. Authenticates the requester, performs a fresh check against current permissions, records audit event, and streams file bytes. **Does not issue long-lived signed URLs.**
- **Authentication:** Authenticated.
- **Authorization:** `canAccessDocument(user, doc, 'download')`.
  - Permitted: Document owner, or user with active `READ` or `EDIT` grant.
  - Forbidden: Administrator (without explicit grant), unpermitted users, revoked users.
- **Headers Returned:**
  - `Content-Type`: Validated MIME type.
  - `Content-Disposition`: `attachment; filename="sanitized_filename.ext"`
  - `Cache-Control`: `no-store, no-cache, must-revalidate` (prevents caching of revoked files)
  - `X-Content-Type-Options`: `nosniff`
  - `Content-Security-Policy`: `default-src 'none'`
- **HTTP Errors:**
  - `401 Unauthorized`: Unauthenticated request.
  - `403 Forbidden`: No active grant or permission was revoked.
  - `404 Not Found`: Document or file object missing.
- **Audit Events:** `DOCUMENT_DOWNLOAD` (`ALLOWED` on success, `DENIED` on authorization failure).
- **Automated Tests:** `tests/security/authorization.test.ts` & `tests/integration/revocation-and-scenarios.test.ts` (Cases 1, 4, 8, 9, 10).

---

### `DELETE /api/documents/[id]`
- **Purpose:** Soft-deletes a document. Strictly restricted to the document owner.
- **Authentication:** Authenticated.
- **Authorization:** Owner only (`document.owner_id === user.id`).
- **Response (200 OK):**
  ```json
  { "success": true, "message": "Document deleted successfully." }
  ```
- **HTTP Errors:** `403 Forbidden`: Non-owner attempts deletion.
- **Audit Events:** `DOCUMENT_DELETE` (`ALLOWED` or `DENIED`).
- **Automated Tests:** `tests/security/authorization.test.ts` (Case 7).

---

## 3. Access Sharing & Revocation

### `GET /api/documents/[id]/permissions`
- **Purpose:** Retrieves active and historical permission grants for a document.
- **Authorization:** Owner of the document or Administrator.
- **Response (200 OK):**
  ```json
  {
    "documentId": "doc-uuid",
    "active": [
      {
        "id": "perm-uuid",
        "user_id": "bob-uuid",
        "permission": "READ",
        "granted_at": "2026-10-22T08:20:00.000Z",
        "revoked_at": null,
        "user": { "full_name": "Bob Viewer", "email": "bob@trustvault.local" }
      }
    ],
    "history": []
  }
  ```

---

### `POST /api/documents/[id]/permissions`
- **Purpose:** Grants `READ` or `EDIT` access to a named user.
- **Authorization:** Owner of the document only.
- **Request Body:**
  ```json
  {
    "userId": "22222222-2222-4222-a222-222222222222",
    "permission": "READ"
  }
  ```
- **Validation:**
  - `userId`: Valid target user ID; user cannot grant access to themselves.
  - `permission`: Must be `'READ'` or `'EDIT'`.
- **Response (200 OK):**
  ```json
  { "success": true, "message": "Access granted: READ" }
  ```
- **Audit Events:** `PERMISSION_GRANT` (`ALLOWED` or `DENIED`).
- **Automated Tests:** `tests/security/authorization.test.ts` (Cases 4, 16).

---

### `DELETE /api/documents/[id]/permissions/[userId]` (IMMEDIATE ACCESS REVOCATION)
- **Purpose:** Immediately revokes access for the target user by setting `revoked_at = NOW()`. Subsequent download/view requests are blocked instantly.
- **Authorization:** Owner of the document only.
- **Response (200 OK):**
  ```json
  {
    "success": true,
    "message": "Permission revoked successfully. Subsequent requests will be denied immediately."
  }
  ```
- **Audit Events:** `PERMISSION_REVOKE` (`ALLOWED` or `DENIED`).
- **Automated Tests:** `tests/integration/revocation-and-scenarios.test.ts` (Cases 9 & 10).

---

## 4. Tamper-Evident Audit & Verification

### `GET /api/audit`
- **Purpose:** Retrieves audit log events scoped to the user's role:
  - `ADMIN`: System-wide audit trail.
  - `OWNER`: Events for owned documents and own actions.
  - `VIEWER`: Events where user is the actor.
- **Query Parameters:**
  - `result` (optional): `'ALLOWED'` or `'DENIED'`.
  - `documentId` (optional): Filter by document.
  - `actorId` (optional): Filter by actor.
- **Response (200 OK):**
  ```json
  {
    "logs": [
      {
        "id": "log-uuid",
        "action": "DOCUMENT_DOWNLOAD",
        "result": "DENIED",
        "timestamp": "2026-10-22T08:30:00.000Z",
        "previous_hash": "...",
        "event_hash": "...",
        "metadata": { "reason": "Access denied" }
      }
    ],
    "total": 1,
    "viewerRole": "ADMIN"
  }
  ```

---

### `GET /api/audit/verify`
- **Purpose:** Cryptographically verifies the SHA-256 hash chain across all chronological audit records. Detects altered, missing, or reordered entries.
- **Authentication:** Authenticated.
- **Response (200 OK):**
  ```json
  {
    "status": "INTACT",
    "valid": true,
    "totalVerified": 24,
    "lastHash": "6f2a...39b0",
    "verifiedAt": "2026-10-22T10:30:00.000Z"
  }
  ```
- **Failure Response (when tampered):**
  ```json
  {
    "status": "TAMPERED",
    "valid": false,
    "totalVerified": 8,
    "brokenAtIndex": 8,
    "failedEventId": "ev-uuid",
    "reason": "Cryptographic signature mismatch at index 8. Payload has been altered!"
  }
  ```
- **Automated Tests:** `tests/security/audit-integrity.test.ts` (Case 20).

---

## 5. Administrative Identity Governance

### `GET /api/admin/users`
- **Purpose:** Lists all corporate accounts and statuses. Restricted strictly to `ADMIN`.
- **Response (200 OK):** Array of user profiles.
- **HTTP Errors:** `403 Forbidden` if role is not `ADMIN`.

---

### `PATCH /api/admin/users/[id]`
- **Purpose:** Updates account status to `ACTIVE` or `DISABLED`.
- **Authorization:** `ADMIN` role only.
- **Request Body:**
  ```json
  { "status": "DISABLED" }
  ```
- **Audit Events:** `USER_DISABLE` / `USER_ENABLE` (`ALLOWED`).
- **Automated Tests:** `tests/security/authorization.test.ts` (Case 17).
