import type { Doc, MockState } from '../state/mock-state.js';
import type { AuthContext } from './authenticate.js';

export type PermissionScope = 'user' | 'workspace' | 'tenant';
export type CrudOperation = 'create' | 'read' | 'update' | 'delete';

/** `*` grants everything, `prefix:*` (or `prefix*`) grants every permission starting with the prefix. */
export function permissionMatches(granted: string, wanted: string): boolean {
  if (granted === '*' || granted === wanted) return true;
  return granted.endsWith('*') && wanted.startsWith(granted.slice(0, -1));
}

/** Union of the permissions of the given roles (unknown roles grant nothing). */
export function permissionsForRoles(state: MockState, roles: string[]): string[] {
  const result = new Set<string>();
  for (const role of roles) for (const p of state.settings.roles[role] || []) result.add(p);
  return [...result].sort();
}

/** Global user roles plus the roles held in the active workspace. */
export function rolesOf(auth: AuthContext): string[] {
  return [...new Set([...(auth.user.roles || []), ...(auth.workspace?.roles || [])])];
}

/** Equivalent of `sdk.permissions.getUserPermissions()`, computed from roles. */
export function getUserPermissions(auth: AuthContext, state: MockState): string[] {
  return permissionsForRoles(state, rolesOf(auth));
}

/** Equivalent of `sdk.permissions.check()`: true when every requested permission is granted. */
export function checkPermission(auth: AuthContext | null, state: MockState, permission: string | string[]): boolean {
  if (!auth) return false;
  const granted = getUserPermissions(auth, state);
  return [permission].flat().every((wanted) => granted.some((g) => permissionMatches(g, wanted)));
}

const intersects = (a: string[] | undefined, b: string[]) => !!a?.some((x) => x === '*' || b.includes(x));

/**
 * Evaluate a blueprint's `permissions` descriptors for one operation.
 * Returns the effective scope when allowed (`user` | `workspace` | `tenant`),
 * otherwise null. Callers then filter entities with {@link scopeMatches}.
 */
export function checkBlueprintPermission(
  auth: AuthContext | null,
  state: MockState,
  blueprint: { permissions?: Array<Record<string, any>>; permissionScope?: string },
  operation: CrudOperation,
): PermissionScope | null {
  const defaultScope = (blueprint.permissionScope as PermissionScope) || 'workspace';
  const superUser = !!auth && checkPermission(auth, state, '*');
  for (const descriptor of blueprint.permissions || []) {
    if (descriptor.operation !== operation) continue;
    const scope = (descriptor.scope as PermissionScope) || defaultScope;
    if (descriptor.guest) return scope;
    if (!auth) continue;
    if (
      superUser ||
      intersects(descriptor.roleBased, auth.user.roles || []) ||
      intersects(descriptor.workspaceRoleBased, auth.workspace?.roles || []) ||
      intersects(descriptor.workspaceLabelsBased, auth.workspace?.labels || [])
    ) {
      return scope;
    }
  }
  return null;
}

/** Does the entity belong to the caller within the permission scope? Entities keep `user` / `workspace` owners. */
export function scopeMatches(auth: AuthContext | null, scope: PermissionScope, entity: Record<string, any>): boolean {
  if (scope === 'tenant') return true;
  if (!auth) return false;
  if (scope === 'user') return String(entity.user ?? '') === auth.user._id;
  return !!auth.workspace && String(entity.workspace ?? '') === auth.workspace._id;
}
