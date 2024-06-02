import { callContentService } from './content-service-api';
import { cacheManager } from './cache-manager';

export async function getWorkspaceConfiguration(tenant: string): Promise<{
  isActive: boolean,
  creationPrivilegedRoles: string[],
  viewMembersPrivilegedWsRoles: string[]
}> {
  return cacheManager.wrap('ws-configuration:' + tenant, () => {
    return callContentService('/api/configurations/workspace-configuration', tenant)
      .then(config => config.metadata)
      .catch(() => {
        return {
          isActive: false,
          creationPrivilegedRoles: [],
          viewMembersPrivilegedWsRoles: []
        }
      }).then(JSON.stringify);
  }).then(JSON.parse);
}

