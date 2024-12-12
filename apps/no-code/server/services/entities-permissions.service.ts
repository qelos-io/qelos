import { CRUDOperation, PermissionScope } from '@qelos/global-types';
import { IBlueprint } from '../models/blueprint';

export function getUserPermittedScopes(user: any, blueprint: IBlueprint, operation: CRUDOperation, bypassAdmin?: boolean): PermissionScope[] | true {
  user ||= { roles: [] };
  if (!bypassAdmin && user.roles.includes('admin')) {
    return true;
  }
  return Array.from(new Set(
    blueprint.permissions
      .filter(p => {
        if (p.operation !== operation) {
          return false;
        }
        if (p.guest) {
          return true;
        }

        if (p.workspaceLabelsBased?.length) {
          const wsLabelsFound = p.workspaceLabelsBased.some(label => label === '*' || user.workspace?.labels?.includes(label));
          if (!wsLabelsFound) {
            return false;
          }
        }
        return p.roleBased?.some(role => role === '*' || user.roles.includes(role)) ||
          (user.workspace?.roles && p.workspaceRoleBased?.some(role => role === '*' || user.workspace.roles.includes(role)))
      })
      .map(p => p.scope || PermissionScope.USER)
      .filter(Boolean)
  )) as PermissionScope[];
}
