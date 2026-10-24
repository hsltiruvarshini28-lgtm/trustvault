-- ====================================================================
-- TrustVault Seed Data
-- Creates Demo Users (Alice, Bob, Charlie, Admin Dave) and Seed Documents
-- ====================================================================

-- 1. Insert auth.users entries (Demo mock IDs for local/hosted testing)
-- In production/hosted Supabase, users register or sign in via Supabase Auth,
-- which auto-generates auth.users rows and triggers profile creation.
-- Here we insert deterministic IDs for repeatable automated testing and seeding.

DO $$
DECLARE
    v_alice_id UUID := '11111111-1111-4111-a111-111111111111';
    v_bob_id   UUID := '22222222-2222-4222-a222-222222222222';
    v_charlie_id UUID := '33333333-3333-4333-a333-333333333333';
    v_admin_id UUID := '44444444-4444-4444-a444-444444444444';
    v_disabled_id UUID := '55555555-5555-4555-a555-555555555555';

    v_doc1_id UUID := 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
    v_doc2_id UUID := 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';
    v_doc3_id UUID := 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
BEGIN
    -- Insert auth.users entries to satisfy profiles foreign key constraint in hosted Supabase
    INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
    )
    VALUES 
        ('00000000-0000-0000-0000-000000000000', v_alice_id, 'authenticated', 'authenticated', 'alice@trustvault.local', crypt('DemoPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Alice Owner"}', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000000', v_bob_id, 'authenticated', 'authenticated', 'bob@trustvault.local', crypt('DemoPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Bob Viewer"}', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000000', v_charlie_id, 'authenticated', 'authenticated', 'charlie@trustvault.local', crypt('DemoPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Charlie Viewer"}', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000000', v_admin_id, 'authenticated', 'authenticated', 'admin@trustvault.local', crypt('DemoPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Dave Administrator"}', NOW(), NOW()),
        ('00000000-0000-0000-0000-000000000000', v_disabled_id, 'authenticated', 'authenticated', 'eve@trustvault.local', crypt('DemoPassword123!', gen_salt('bf')), NOW(), '{"provider":"email","providers":["email"]}', '{"full_name":"Eve Disabled"}', NOW(), NOW())
    ON CONFLICT (id) DO NOTHING;

    -- Insert profiles corresponding to auth.users records
    INSERT INTO profiles (id, full_name, email, role, status)
    VALUES 
        (v_alice_id, 'Alice Owner', 'alice@trustvault.local', 'OWNER', 'ACTIVE'),
        (v_bob_id, 'Bob Viewer', 'bob@trustvault.local', 'VIEWER', 'ACTIVE'),
        (v_charlie_id, 'Charlie Viewer', 'charlie@trustvault.local', 'VIEWER', 'ACTIVE'),
        (v_admin_id, 'Dave Administrator', 'admin@trustvault.local', 'ADMIN', 'ACTIVE'),
        (v_disabled_id, 'Eve Disabled', 'eve@trustvault.local', 'VIEWER', 'DISABLED')
    ON CONFLICT (id) DO UPDATE SET 
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        status = EXCLUDED.status;

    -- Insert seed documents owned by Alice
    INSERT INTO documents (id, name, description, category, storage_path, mime_type, file_size, owner_id, status)
    VALUES
        (
            v_doc1_id,
            'Q3-Financial-Audit-Report.pdf',
            'Confidential quarterly financial statements and audit findings.',
            'Finance',
            v_alice_id || '/' || v_doc1_id || '/q3-financial-audit.pdf',
            'application/pdf',
            1048576,
            v_alice_id,
            'ACTIVE'
        ),
        (
            v_doc2_id,
            'Zero-Trust-Architecture-Plan.docx',
            'Internal network zoning and access control specifications.',
            'Engineering',
            v_alice_id || '/' || v_doc2_id || '/zero-trust-plan.docx',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            524288,
            v_alice_id,
            'ACTIVE'
        ),
        (
            v_doc3_id,
            'Executive-Board-Minutes-Strictly-Private.pdf',
            'Highly sensitive board resolutions and executive discussions.',
            'Executive',
            v_alice_id || '/' || v_doc3_id || '/board-minutes.pdf',
            'application/pdf',
            2097152,
            v_alice_id,
            'ACTIVE'
        )
    ON CONFLICT (id) DO NOTHING;

    -- Grant Bob READ access to Q3-Financial-Audit-Report.pdf
    INSERT INTO document_permissions (document_id, user_id, permission, granted_by)
    VALUES (v_doc1_id, v_bob_id, 'READ', v_alice_id)
    ON CONFLICT DO NOTHING;

    -- Grant Bob EDIT access to Zero-Trust-Architecture-Plan.docx
    INSERT INTO document_permissions (document_id, user_id, permission, granted_by)
    VALUES (v_doc2_id, v_bob_id, 'EDIT', v_alice_id)
    ON CONFLICT DO NOTHING;

    -- Note: Charlie has NO permissions to any of Alice's documents.
    -- Note: Document 3 has NO permissions granted to anyone (strictly private to Alice).

    -- Log seed audit events via append_audit_event
    PERFORM append_audit_event(
        v_alice_id,
        v_doc1_id,
        'DOCUMENT_UPLOAD',
        'ALLOWED',
        'req-seed-001',
        '127.0.0.1',
        'TrustVault-Seeder/1.0',
        '{"fileName": "Q3-Financial-Audit-Report.pdf", "category": "Finance"}'::jsonb
    );

    PERFORM append_audit_event(
        v_alice_id,
        v_doc1_id,
        'PERMISSION_GRANT',
        'ALLOWED',
        'req-seed-002',
        '127.0.0.1',
        'TrustVault-Seeder/1.0',
        '{"grantedTo": "bob@trustvault.local", "permission": "READ"}'::jsonb
    );

    PERFORM append_audit_event(
        v_alice_id,
        v_doc2_id,
        'PERMISSION_GRANT',
        'ALLOWED',
        'req-seed-003',
        '127.0.0.1',
        'TrustVault-Seeder/1.0',
        '{"grantedTo": "bob@trustvault.local", "permission": "EDIT"}'::jsonb
    );

    PERFORM append_audit_event(
        v_charlie_id,
        v_doc1_id,
        'DOCUMENT_DOWNLOAD',
        'DENIED',
        'req-seed-004',
        '192.168.1.100',
        'TrustVault-Seeder/1.0',
        '{"reason": "INSUFFICIENT_PERMISSIONS", "attemptedAction": "download"}'::jsonb
    );
END;
$$;
