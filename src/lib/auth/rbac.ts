import type { UserRole } from '@/types';

/**
 * Role-Based Access Control definitions for SIAT.
 * 
 * CRITICAL RULE (CLAUDE.md Rule #4):
 * RBAC MUST be checked at the API layer, not just UI.
 * 
 * Roles:
 * - VIEWER: Read-only access. No mutation endpoints at all.
 * - INPUT: Can create/update own TestSession (DRAFT status), can submit.
 *          Cannot approve/reject. Cannot access master data mutations.
 * - QC: Quality Control. Can approve/reject submitted test sessions.
 *       Can view dashboard and export data. Cannot input data or manage master data.
 * - ADMIN: System administration only. Manages users, views audit logs.
 *          Cannot approve/reject test sessions. Cannot input data.
 */

export type Permission =
  | 'dashboard:read'
  | 'asset:read'
  | 'test-session:create'
  | 'test-session:update-own'
  | 'test-session:submit'
  | 'test-session:approve'
  | 'test-session:reject'
  | 'master-data:read'
  | 'master-data:write'
  | 'user:read'
  | 'user:write'
  | 'audit-log:read'
  | 'export:read'
  | 'report:read'
  | 'report:upload'
  | 'report:manage-folders';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  VIEWER: [
    'dashboard:read',
    'asset:read',
    'master-data:read',
    'export:read',
    'report:read',
  ],
  INPUT: [
    'dashboard:read',
    'asset:read',
    'master-data:read',
    'test-session:create',
    'test-session:update-own',
    'test-session:submit',
    'export:read',
    'report:read',
    'report:upload',
  ],
  QC: [
    'dashboard:read',
    'asset:read',
    'master-data:read',
    'test-session:approve',
    'test-session:reject',
    'export:read',
    'report:read',
    'report:upload',
  ],
  ADMIN: [
    'dashboard:read',
    'asset:read',
    'master-data:read',
    'master-data:write',
    'user:read',
    'user:write',
    'audit-log:read',
    'export:read',
    'report:read',
    'report:upload',
    'report:manage-folders',
  ],
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/**
 * Check if a role has any of the specified permissions.
 */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/**
 * Guard function for API routes. Throws if the user doesn't have the required permission.
 * Use this in every route handler.
 */
export function requirePermission(role: UserRole | undefined, permission: Permission): void {
  if (!role) {
    throw new Error('Authentication required');
  }
  if (!hasPermission(role, permission)) {
    throw new Error(`Forbidden: Role '${role}' does not have permission '${permission}'`);
  }
}

/**
 * Check if a user can modify a specific test session.
 * INPUT users can only modify their own sessions that are in DRAFT status.
 * QC and ADMIN users cannot modify test sessions directly.
 */
export function canModifySession(
  userRole: UserRole,
  userId: string,
  sessionCreatedById: string,
  sessionStatus: string,
): boolean {
  if (userRole === 'INPUT') {
    return userId === sessionCreatedById && (sessionStatus === 'DRAFT' || sessionStatus === 'REJECTED');
  }
  return false;
}
