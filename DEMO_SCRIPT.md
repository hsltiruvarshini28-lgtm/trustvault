# TrustVault — Five-Minute Live Demonstration Script (`DEMO_SCRIPT.md`)

This script guides an evaluator or engineer through a complete five-minute live demonstration of TrustVault's core security capabilities: zero-trust authorization, private file delivery, immediate access revocation, tamper-evident audit logging, and secure sign-out.

---

## Prerequisites
1. Ensure the development server is running:
   ```bash
   npm run dev
   ```
2. Open your web browser to `http://localhost:3000`.

---

## Step 1: Alice Logs In (OWNER Role)
- **Action:**
  1. Navigate to `/login`.
  2. Click the **"Alice Owner"** 1-Click Demo Persona button (or enter `alice@trustvault.local` / `DemoPassword123!`).
- **Observation:**
  - Notice the header displays: **Alice Owner**, with the purple **`OWNER`** badge.
  - The dashboard reveals Alice's owned files and quick actions.

---

## Step 2: Alice Uploads a Confidential Document
- **Action:**
  1. Click **"Upload Document"** in the navigation sidebar or top banner.
  2. Select category **"Finance"**.
  3. Enter description: *"Confidential Q3 financial audit report for executive review."*
  4. Choose any sample PDF file (e.g. `sample.pdf`).
  5. Click **"Upload to Secure Vault"**.
- **Observation:**
  - File signature is validated via binary magic bytes (`%PDF-`).
  - File is deposited into the isolated private storage bucket.
  - A green confirmation appears, and Alice is redirected to the document details page.

---

## Step 3: Alice Grants Bob READ Access
- **Action:**
  1. On the document details page, click **"Manage Access"** (or navigate to `/documents/[id]/access`).
  2. Under **"Grant New Document Access"**, select **"Bob Viewer (bob@trustvault.local)"**.
  3. Set permission level to **`READ`**.
  4. Click **"Grant Access"**.
- **Observation:**
  - Bob Viewer appears under **Active Grants** with the sky-blue **`READ`** badge.
  - An audit record for `PERMISSION_GRANT` is appended to the SHA-256 hash chain.

---

## Step 4: Bob Opens and Downloads the Document
- **Action:**
  1. Click the **Sign Out** button in the top right header.
  2. The accessible confirmation modal appears. Click **"Sign Out"**.
  3. You are redirected to `/login` with the alert: *"You have signed out successfully."*
  4. Click the **"Bob Viewer"** 1-Click Persona.
  5. Navigate to `/documents`. Open the document Alice shared.
  6. Click **"Download File"**.
- **Observation:**
  - The file downloads successfully via server-mediated stream (`/api/documents/[id]/download`).
  - Notice the download request generated an `ALLOWED` audit record in the background.

---

## Step 5: Charlie Tries to Access the Document and is Denied
- **Action:**
  1. Sign out as Bob.
  2. Sign in as **"Charlie Viewer"** (`charlie@trustvault.local`).
  3. Go to `/documents`.
  4. Note that Alice's document is **not visible** in Charlie's repository list (no metadata leakage).
  5. Manually paste the document URL in the browser bar (`/documents/<alice-doc-id>`) or make a download request to `/api/documents/<alice-doc-id>/download`.
- **Observation:**
  - The screen displays **`403 Forbidden: Access Denied`**.
  - Charlie cannot download or view the file.

---

## Step 6: The Denied Attempt Appears in the Audit Trail
- **Action:**
  1. Sign out as Charlie.
  2. Sign in as **"Dave Admin"** (`admin@trustvault.local`).
  3. Click **"Audit Trail"** in the sidebar.
  4. Click the **`DENIED`** filter pill.
- **Observation:**
  - Charlie's blocked attempt is recorded with red **`DENIED`** badge, exact UTC timestamp, actor IP address, and denial reason: *"No active permission found for requester"*.

---

## Step 7: Alice Revokes Bob's Access
- **Action:**
  1. Sign in as **Alice Owner**.
  2. Open the document and navigate to **"Manage Access"** (`/documents/[id]/access`).
  3. Locate Bob Viewer under **Active Grants**.
  4. Click the red **"Revoke Access"** button and confirm the browser prompt.
- **Observation:**
  - Bob Viewer immediately moves from **Active Grants** to **Historical Grants** marked **`REVOKED`**.

---

## Step 8: Bob's Next Download Attempt is Blocked Immediately
- **Action:**
  1. Sign out as Alice and sign in as **Bob Viewer**.
  2. Navigate directly to Alice's document or click download.
- **Observation:**
  - Bob's request is **immediately blocked with 403 Forbidden**.
  - **Immediate Revocation Guaranteed:** Because TrustVault uses server-mediated delivery with zero long-lived signed URLs, Bob cannot download the document even a single second after revocation.

---

## Step 9: Security Operations Center & Cryptographic Hash Verification
- **Action:**
  1. Navigate to **"Security Center"** (`/security`).
  2. View the **Cryptographic Audit Trail Integrity** card.
  3. Click **"Re-Verify SHA-256 Hash Chain"**.
- **Observation:**
  - All sequential blocks are verified in real time, displaying the green **`INTACT`** badge.
  - The 24 automated security test cases matrix is displayed with 100% passing status.

---

## Step 10: Run the Real Automated Test Suite
- **Action:**
  In your terminal, execute:
  ```bash
  npm test
  ```
- **Observation:**
  - Vitest executes 29 unit and integration tests across 4 test suites in under 1 second.
  - All tests pass, proving authorization, magic byte validation, hash-chain tamper detection, and immediate access revocation.
