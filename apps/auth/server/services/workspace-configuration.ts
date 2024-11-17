import { callContentService } from './content-service-api';
import { cacheManager } from './cache-manager';
import { WorkspaceConfigurationMetadata } from '@qelos/global-types'

export async function getWorkspaceConfiguration(tenant: string): Promise<WorkspaceConfigurationMetadata> {
  return cacheManager.wrap('ws-configuration:' + tenant, () => {
    return callContentService('/api/configurations/workspace-configuration', tenant)
      .then(config => config.metadata)
      .catch(() => {
        return {
          isActive: false,
          creationPrivilegedRoles: [],
          viewMembersPrivilegedWsRoles: [],
          labels: [],
          allowNonLabeledWorkspaces: true
        }
      }).then(JSON.stringify);
  }).then(JSON.parse)
    .catch(() => {
      return {
        isActive: false,
        creationPrivilegedRoles: [],
        viewMembersPrivilegedWsRoles: [],
        labels: [],
        allowNonLabeledWorkspaces: true
      }
    })
}

