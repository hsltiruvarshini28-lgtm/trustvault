export type UserRole = 'ADMIN' | 'OWNER' | 'VIEWER';
export type AccountStatus = 'ACTIVE' | 'DISABLED';
export type DocumentStatus = 'ACTIVE' | 'DELETED' | 'ARCHIVED';
export type PermissionLevel = 'READ' | 'EDIT';
export type AuditResult = 'ALLOWED' | 'DENIED';

export type DocumentAction =
  | 'list'
  | 'view_metadata'
  | 'preview'
  | 'download'
  | 'edit_metadata'
  | 'replace_file'
  | 'delete'
  | 'grant_access'
  | 'revoke_access'
  | 'view_document_audit_history';

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  status: AccountStatus;
  created_at: string;
  updated_at: string;
}

export interface DocumentRecord {
  id: string;
  name: string;
  description: string;
  category: string;
  storage_path: string;
  mime_type: string;
  file_size: number;
  owner_id: string;
  status: DocumentStatus;
  created_at: string;
  updated_at: string;
  owner?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface DocumentPermissionRecord {
  id: string;
  document_id: string;
  user_id: string;
  permission: PermissionLevel;
  granted_by: string;
  granted_at: string;
  revoked_at: string | null;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export interface AuditLogRecord {
  id: string;
  actor_user_id: string | null;
  document_id: string | null;
  action: string;
  result: AuditResult;
  timestamp: string;
  request_id: string;
  ip_address: string | null;
  user_agent: string | null;
  metadata: Record<string, unknown>;
  previous_hash: string;
  event_hash: string;
  actor?: {
    id: string;
    full_name: string;
    email: string;
    role: UserRole;
  } | null;
  document?: {
    id: string;
    name: string;
  } | null;
}

export interface AuthorizationContext {
  user: UserProfile;
  document?: DocumentRecord;
  permission?: DocumentPermissionRecord | null;
}

export interface AuthorizationDecision {
  allowed: boolean;
  reason?: string;
  statusCode: 200 | 401 | 403 | 404;
}
