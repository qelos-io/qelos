import {internalServicesSecret, secretsToken} from '../../config';
import {service} from '@qelos/api-kit';

const contentService = service('CONTENT', {port: process.env.CONTENT_SERVICE_PORT || 9001});

function callContentService(url: string, tenant: string, data?: any) {
  return contentService({
    headers: {internal_secret: internalServicesSecret, tenant},
    method: 'GET',
    data,
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}

export async function getWorkspaceConfiguration(tenant: string): Promise<{
  isActive: boolean,
  creationPrivilegedRoles: string[],
  viewMembersPrivilegedWsRoles: string[]
}> {
  return callContentService('/api/configurations/workspace-configuration', tenant)
    .then(config => config.metadata)
    .catch(() => {
      return {
        isActive: false,
        creationPrivilegedRoles: [],
        viewMembersPrivilegedWsRoles: []
      }
    })
}

