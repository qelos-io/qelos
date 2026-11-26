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

/**
 * Whether a user who is not privileged may create a workspace with these labels: when labels are required, an option
 * the user's roles may choose; otherwise anything but a label kept for options of other roles.
 */
export function mayUseWorkspaceLabels(rules: Record<string, any>, labels: string[], roles: string[]): boolean {
  const options: Array<{ value?: string[]; allowedRolesForCreation?: string[] }> = rules.labels || [];
  const mayChoose = ({ allowedRolesForCreation: allowed }: (typeof options)[number]) =>
    !allowed || allowed.includes('*') || allowed.some((role) => roles.includes(role));
  const open = options.filter(mayChoose);
  if (!rules.allowNonLabeledWorkspaces) {
    return open.some(
      ({ value = [] }) => value.length === labels.length && value.every((l) => labels.includes(l)) && labels.every((l) => value.includes(l)),
    );
  }
  const openLabels = new Set(open.flatMap((option) => option.value || []));
  const reserved = options.filter((option) => !mayChoose(option)).flatMap((option) => option.value || []);
  return !labels.some((label) => reserved.includes(label) && !openLabels.has(label));
}

/** The seeded `auth-configuration`, or undefined when the mock has none. */
export const authSettings = (state: MockState) => settings(state, 'auth-configuration');
