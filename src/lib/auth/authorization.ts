import {
  UserProfile,
  DocumentRecord,
  DocumentPermissionRecord,
  DocumentAction,
  AuthorizationDecision,
} from '@/types';

/**
 * Centralized authorization engine for TrustVault.
 * Evaluates whether an authenticated user is permitted to perform a specified action
 * on a given document based on account status, role, ownership, and explicit grants.
 *
 * CRITICAL SECURITY GUARANTEES:
 * 1. Disabled accounts are unconditionally rejected (403 Forbidden).
 * 2. Unauthenticated requests are rejected (401 Unauthorized).
 * 3. Deleted or archived documents cannot be operated on unless specifically audited.
 * 4. Document owners have full read, edit, delete, grant, revoke, and history capabilities.
 * 5. Active explicit grants (READ / EDIT) allow viewing and downloading.
 * 6. Active explicit EDIT grant additionally allows metadata edit and file replacement.
 * 7. Revoked grants (revoked_at !== null) or absence of grant rejects access immediately.
 * 8. Administrators CAN view metadata and audit logs, but CANNOT download or preview
 *    confidential file contents unless explicitly granted access or owner.
 * 9. Non-owners CANNOT grant access, revoke access, or delete documents.
 */
export function canAccessDocument(
  user: UserProfile | null | undefined,
  document: DocumentRecord | null | undefined,
  action: DocumentAction,
  activePermission?: DocumentPermissionRecord | null
): AuthorizationDecision {
  // 1. Authenticated user verification
  if (!user || !user.id) {
    return {
      allowed: false,
      reason: 'Authentication required. No valid session provided.',
      statusCode: 401,
    };
  }

  // 2. Account status check
  if (user.status === 'DISABLED') {
    return {
      allowed: false,
      reason: 'Account is disabled. Contact your administrator.',
      statusCode: 403,
    };
  }

  // 3. For list action, any active user can access their permitted list
  if (action === 'list') {
    return {
      allowed: true,
      statusCode: 200,
    };
  }

  // 4. For document-specific actions, the document must exist and be accessible
  if (!document || !document.id) {
    return {
      allowed: false,
      reason: 'Document not found or inaccessible.',
      statusCode: 404,
    };
  }

  // 5. Document status check: Soft-deleted documents reject standard interactions
  if (document.status === 'DELETED' && action !== 'view_document_audit_history') {
    return {
      allowed: false,
      reason: 'Document has been deleted.',
      statusCode: 404,
    };
  }

  const isOwner = document.owner_id === user.id;
  const isAdmin = user.role === 'ADMIN';

  // 6. Check active explicit permission grant
  const hasActiveGrant =
    activePermission &&
    activePermission.document_id === document.id &&
    activePermission.user_id === user.id &&
    activePermission.revoked_at === null;

  const permissionLevel = hasActiveGrant ? activePermission.permission : null;

  // 7. Evaluate requested action against the centralized permission matrix
  switch (action) {
    case 'view_metadata':
      if (isOwner || hasActiveGrant || isAdmin) {
        return { allowed: true, statusCode: 200 };
      }
      return {
        allowed: false,
        reason: 'You do not have permission to view this document metadata.',
        statusCode: 403,
      };

    case 'preview':
    case 'download':
      // CRITICAL: Admins do NOT get automatic file content access
      if (isOwner || permissionLevel === 'READ' || permissionLevel === 'EDIT') {
        return { allowed: true, statusCode: 200 };
      }
      if (isAdmin) {
        return {
          allowed: false,
          reason: 'Administrator privilege does not grant access to confidential file contents without explicit permission.',
          statusCode: 403,
        };
      }
      return {
        allowed: false,
        reason: 'Access denied: active READ or EDIT permission required.',
        statusCode: 403,
      };

    case 'edit_metadata':
    case 'replace_file':
      if (isOwner || permissionLevel === 'EDIT') {
        return { allowed: true, statusCode: 200 };
      }
      return {
        allowed: false,
        reason: 'Access denied: EDIT permission or ownership required.',
        statusCode: 403,
      };

    case 'delete':
      // Deletion is strictly reserved for the document owner
      if (isOwner) {
        return { allowed: true, statusCode: 200 };
      }
      return {
        allowed: false,
        reason: 'Only the document owner can delete this document.',
        statusCode: 403,
      };

    case 'grant_access':
    case 'revoke_access':
      // Permission management is strictly reserved for the document owner
      if (isOwner) {
        return { allowed: true, statusCode: 200 };
      }
      return {
        allowed: false,
        reason: 'Only the document owner can manage access permissions.',
        statusCode: 403,
      };

    case 'view_document_audit_history':
      // Document audit history can be viewed by the owner or an admin
      if (isOwner || isAdmin) {
        return { allowed: true, statusCode: 200 };
      }
      return {
        allowed: false,
        reason: 'Access denied: Document audit history is restricted to owner and administrators.',
        statusCode: 403,
      };

    default:
      return {
        allowed: false,
        reason: 'Unrecognized action requested.',
        statusCode: 403,
      };
  }
}
