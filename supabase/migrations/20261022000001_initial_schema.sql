-- ====================================================================
-- TrustVault Initial Database Schema & Security Migration
-- Version: 20261022000001
-- Tables: profiles, documents, document_permissions, audit_logs
-- Policies: Strict RLS with Tamper-Evident Hash-Chained Audit Trail
-- ====================================================================

-- 1. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create custom types / check constraints
CREATE TYPE user_role AS ENUM ('ADMIN', 'OWNER', 'VIEWER');
CREATE TYPE account_status AS ENUM ('ACTIVE', 'DISABLED');
CREATE TYPE document_status AS ENUM ('ACTIVE', 'DELETED', 'ARCHIVED');
CREATE TYPE permission_level AS ENUM ('READ', 'EDIT');
CREATE TYPE audit_result AS ENUM ('ALLOWED', 'DENIED');

-- ====================================================================
-- TABLE: profiles
-- Stores user identity, role, and active/disabled account status
-- ====================================================================
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'VIEWER',
    status account_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_profiles_status ON profiles(status);

-- ====================================================================
-- TABLE: documents
-- Stores private document metadata and reference to private storage
-- ====================================================================
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    category TEXT NOT NULL DEFAULT 'General',
    storage_path TEXT NOT NULL UNIQUE,
    mime_type TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    status document_status NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_documents_owner ON documents(owner_id);
CREATE INDEX idx_documents_category ON documents(category);
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_created ON documents(created_at DESC);

-- ====================================================================
-- TABLE: document_permissions
-- Stores per-document explicit access grants (READ, EDIT) and history
-- ====================================================================
CREATE TABLE document_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    permission permission_level NOT NULL,
    granted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_at TIMESTAMPTZ DEFAULT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_permissions_document ON document_permissions(document_id);
CREATE INDEX idx_permissions_user ON document_permissions(user_id);
CREATE INDEX idx_permissions_active ON document_permissions(document_id, user_id) WHERE revoked_at IS NULL;

-- Prevent duplicate ACTIVE grants for the same document and user
CREATE UNIQUE INDEX uq_active_document_user_grant 
ON document_permissions(document_id, user_id) 
WHERE revoked_at IS NULL;

-- ====================================================================
-- TABLE: audit_logs
-- Append-only tamper-evident audit trail with SHA-256 hash chaining
-- ====================================================================
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    result audit_result NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    request_id TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    previous_hash TEXT NOT NULL,
    event_hash TEXT NOT NULL
);

CREATE INDEX idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX idx_audit_document ON audit_logs(document_id);
CREATE INDEX idx_audit_action ON audit_logs(action);
CREATE INDEX idx_audit_result ON audit_logs(result);
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp DESC);

-- ====================================================================
-- IMMUTABILITY TRIGGER FOR AUDIT LOGS
-- Normal users and applications MUST NOT modify or delete audit events
-- ====================================================================
CREATE OR REPLACE FUNCTION prevent_audit_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit log records are strictly immutable and cannot be updated or deleted.';
END;
$$;

CREATE TRIGGER trg_audit_tamper_defense
BEFORE UPDATE OR DELETE ON audit_logs
FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

-- ====================================================================
-- FUNCTION: append_audit_event
-- Serializes concurrent audit inserts using an advisory lock to maintain
-- a strict, unbroken cryptographic hash chain.
-- ====================================================================
CREATE OR REPLACE FUNCTION append_audit_event(
    p_actor_user_id UUID,
    p_document_id UUID,
    p_action TEXT,
    p_result audit_result,
    p_request_id TEXT,
    p_ip_address TEXT,
    p_user_agent TEXT,
    p_metadata JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_last_hash TEXT;
    v_event_id UUID;
    v_timestamp TIMESTAMPTZ;
    v_raw_payload TEXT;
    v_event_hash TEXT;
    GENESIS_HASH CONSTANT TEXT := '0000000000000000000000000000000000000000000000000000000000000000';
BEGIN
    -- Acquire exclusive advisory lock for audit log serialization
    PERFORM pg_advisory_xact_lock(42424242);

    -- Retrieve the most recent event's hash
    SELECT event_hash INTO v_last_hash
    FROM audit_logs
    ORDER BY timestamp DESC, id DESC
    LIMIT 1;

    IF v_last_hash IS NULL THEN
        v_last_hash := GENESIS_HASH;
    END IF;

    v_event_id := gen_random_uuid();
    v_timestamp := clock_timestamp();

    -- Canonical JSON payload for SHA-256 calculation
    v_raw_payload := json_build_object(
        'id', v_event_id,
        'actor_user_id', p_actor_user_id,
        'document_id', p_document_id,
        'action', p_action,
        'result', p_result,
        'timestamp', to_char(v_timestamp AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
        'request_id', p_request_id,
        'ip_address', p_ip_address,
        'user_agent', p_user_agent,
        'metadata', p_metadata,
        'previous_hash', v_last_hash
    )::text;

    v_event_hash := encode(digest(v_raw_payload, 'sha256'), 'hex');

    INSERT INTO audit_logs (
        id,
        actor_user_id,
        document_id,
        action,
        result,
        timestamp,
        request_id,
        ip_address,
        user_agent,
        metadata,
        previous_hash,
        event_hash
    ) VALUES (
        v_event_id,
        p_actor_user_id,
        p_document_id,
        p_action,
        p_result,
        v_timestamp,
        p_request_id,
        p_ip_address,
        p_user_agent,
        p_metadata,
        v_last_hash,
        v_event_hash
    );

    RETURN v_event_id;
END;
$$;

-- Revoke public execution of append_audit_event; only authenticated or service_role
REVOKE ALL ON FUNCTION append_audit_event FROM PUBLIC;
GRANT EXECUTE ON FUNCTION append_audit_event TO service_role;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Enforce strict database-level separation of privileges
-- ====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- --------------------------------------------------------------------
-- PROFILES POLICIES
-- --------------------------------------------------------------------
-- Any authenticated user can view their own profile
CREATE POLICY "Users can view own profile"
ON profiles FOR SELECT
TO authenticated
USING (id = auth.uid());

-- Authenticated users can search other active users by email/name for sharing
CREATE POLICY "Users can search active profiles for sharing"
ON profiles FOR SELECT
TO authenticated
USING (status = 'ACTIVE');

-- Users can update their own display name only
CREATE POLICY "Users can update own profile name"
ON profiles FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (
    id = auth.uid() AND
    role = (SELECT role FROM profiles WHERE id = auth.uid()) AND
    status = (SELECT status FROM profiles WHERE id = auth.uid())
);

-- Admin users can view and update all profiles (status, role)
CREATE POLICY "Admins full access to profiles"
ON profiles FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
);

-- --------------------------------------------------------------------
-- DOCUMENTS POLICIES
-- --------------------------------------------------------------------
-- Owner can view, insert, update, and delete their own documents
CREATE POLICY "Owners have full control of their documents"
ON documents FOR ALL
TO authenticated
USING (
    owner_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'ACTIVE')
)
WITH CHECK (
    owner_id = auth.uid() AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'ACTIVE')
);

-- Users with active explicit READ or EDIT permission can view document metadata
CREATE POLICY "Shared users can view permitted documents"
ON documents FOR SELECT
TO authenticated
USING (
    status = 'ACTIVE' AND
    EXISTS (
        SELECT 1 FROM document_permissions
        WHERE document_permissions.document_id = documents.id
          AND document_permissions.user_id = auth.uid()
          AND document_permissions.revoked_at IS NULL
    ) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'ACTIVE')
);

-- Users with active EDIT permission can update document metadata
CREATE POLICY "Editors can update document metadata"
ON documents FOR UPDATE
TO authenticated
USING (
    status = 'ACTIVE' AND
    EXISTS (
        SELECT 1 FROM document_permissions
        WHERE document_permissions.document_id = documents.id
          AND document_permissions.user_id = auth.uid()
          AND document_permissions.permission = 'EDIT'
          AND document_permissions.revoked_at IS NULL
    ) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'ACTIVE')
)
WITH CHECK (
    owner_id = (SELECT owner_id FROM documents d2 WHERE d2.id = documents.id)
);

-- Admins can view system-wide document metadata (NOT contents)
CREATE POLICY "Admins can view all document metadata"
ON documents FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
);

-- --------------------------------------------------------------------
-- DOCUMENT PERMISSIONS POLICIES
-- --------------------------------------------------------------------
-- Document owners can view all permissions for documents they own
CREATE POLICY "Owners can view permissions for their documents"
ON document_permissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_permissions.document_id
          AND documents.owner_id = auth.uid()
    )
);

-- Users can view their own permissions
CREATE POLICY "Users can view their own permissions"
ON document_permissions FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Document owners can grant permissions for their own documents
CREATE POLICY "Owners can grant permissions"
ON document_permissions FOR INSERT
TO authenticated
WITH CHECK (
    granted_by = auth.uid() AND
    user_id != auth.uid() AND
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_permissions.document_id
          AND documents.owner_id = auth.uid()
    ) AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND status = 'ACTIVE')
);

-- Document owners can revoke permissions (soft revoke by setting revoked_at)
CREATE POLICY "Owners can revoke permissions"
ON document_permissions FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_permissions.document_id
          AND documents.owner_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = document_permissions.document_id
          AND documents.owner_id = auth.uid()
    )
);

-- Hard deletes on permissions are prohibited to maintain audit trail
-- (No DELETE policy granted on document_permissions)

-- Admins can view all permissions for security auditing
CREATE POLICY "Admins can view all permissions"
ON document_permissions FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
);

-- --------------------------------------------------------------------
-- AUDIT LOGS POLICIES
-- --------------------------------------------------------------------
-- Admins can view all audit logs
CREATE POLICY "Admins can view all audit logs"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles 
        WHERE id = auth.uid() AND role = 'ADMIN' AND status = 'ACTIVE'
    )
);

-- Document owners can view audit logs pertaining to their documents
CREATE POLICY "Owners can view audit logs for their documents"
ON audit_logs FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM documents
        WHERE documents.id = audit_logs.document_id
          AND documents.owner_id = auth.uid()
    )
);

-- Users can view audit logs where they are the actor
CREATE POLICY "Users can view their own audit events"
ON audit_logs FOR SELECT
TO authenticated
USING (actor_user_id = auth.uid());

-- Direct INSERT, UPDATE, DELETE on audit_logs by users is prohibited.
-- All insertions occur via the server-side append_audit_event SECURITY DEFINER function or service_role.

-- ====================================================================
-- SUPABASE STORAGE BUCKET CONFIGURATION (documents)
-- Bucket must be private; file access mediated by server authorization
-- ====================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents', 
    'documents', 
    false, 
    15728640, -- 15 MB limit
    ARRAY[
        'application/pdf', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', 
        'text/plain', 
        'image/png', 
        'image/jpeg'
    ]
)
ON CONFLICT (id) DO UPDATE SET 
    public = false,
    file_size_limit = 15728640;

-- Storage RLS: Prohibit direct client downloads or uploads.
-- Everything is mediated by server-side authorization checks.
CREATE POLICY "Storage service role access only"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'documents')
WITH CHECK (bucket_id = 'documents');
