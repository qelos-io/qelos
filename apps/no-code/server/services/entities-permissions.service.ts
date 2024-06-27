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
        (p.roleBased?.includes(user.role) || (user.workspace?.roles && p.workspaceRoleBased?.includes(user.workspace.roles)))
      )
      .map(p => p.scope)
      .filter(Boolean)
  )) as PermissionScope[];
}