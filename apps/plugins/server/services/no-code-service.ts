import { internalServicesSecret } from '../../config';
import { service } from '@qelos/api-kit';

const authService = service('NO_CODE', { port: process.env.NO_CODE_SERVICE_PORT || 9004 });

function callNoCodeService(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', tenant: string, data?: any) {
  return authService({
    headers: { internal_secret: internalServicesSecret, tenant },
    method,
    data,
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}

export function getBlueprintEntity(tenant: string, blueprintIdentifier: string, entityId: string) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities/${entityId}`, 'GET', tenant);
}