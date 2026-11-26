import type { MockState } from '../state/mock-state.js';

/** Tenant settings the auth service reads, from the `configurations` of the mock. */

const settings = (state: MockState, key: string): Record<string, any> | undefined =>
  state.collection('configurations').findOne((c) => c.key === key)?.metadata;

/** The workspace rules: the seeded `workspace-configuration`, else everything is allowed. */
export function workspaceRules(state: MockState): Record<string, any> {
  return (
    settings(state, 'workspace-configuration') ?? {
      isActive: true,
      creationPrivilegedRoles: [],
      labels: [],
      allowNonLabeledWorkspaces: true,
    }
  );
}

/** Whether the tenant lets this caller create API tokens (`auth-configuration`). */
export function mayManageApiTokens(authConfig: Record<string, any>, roles: string[], workspaceRoles?: string[]): boolean {
  if (!authConfig.allowUserTokenAuthentication) return false;
  const permissions = authConfig.tokenAuthenticationPermissions;
  if (!permissions) return false;
  const matches = (allowed: string[] | undefined, actual: string[]) =>
    !!allowed?.length && (allowed.includes('*') || allowed.some((role) => actual.includes(role)));
  return matches(permissions.roles, roles) || (!!workspaceRoles && matches(permissions.wsRoles, workspaceRoles));
}

/** The seeded `auth-configuration`, or undefined when the mock has none. */
export const authSettings = (state: MockState) => settings(state, 'auth-configuration');
