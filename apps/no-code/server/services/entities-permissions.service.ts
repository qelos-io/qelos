import { CRUDOperation, PermissionScope } from '@qelos/global-types';
import { IBlueprint } from '../models/blueprint';

export function getUserPermittedScopes(user: any, blueprint: IBlueprint, operation: CRUDOperation, bypassAdmin?: boolean): PermissionScope[] | true {
  if (!bypassAdmin && user.roles.includes('admin')) {
    return true;
  }
  return Array.from(new Set(
    blueprint.permissions
      .filter(p =>
        p.operation === operation &&
        (
          p.roleBased?.some(role => role === '*' || user.roles.includes(role)) ||
          (user.workspace?.roles && p.workspaceRoleBased?.some(role => role === '*' || user.workspace.roles.includes(role))) ||
          (user.workspace?.labels && p.workspaceLabelsBased?.some(label => label === '*' || user.workspace.labels.includes(label)))
        )
      )
      .map(p => p.scope)
      .filter(Boolean)
  )) as PermissionScope[];
}
