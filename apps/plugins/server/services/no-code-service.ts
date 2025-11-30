import { internalServicesSecret } from '../../config';
import { service } from '@qelos/api-kit';

const authService = service('NO_CODE', { port: process.env.NO_CODE_SERVICE_PORT || 9004 });

function callNoCodeService(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', tenant: string, data?: any) {
  return authService({
    headers: { internal_secret: internalServicesSecret, tenant },
    method,
    data,
    url,
  })
    .then((axiosRes: any) => axiosRes.data)
}

export function getAllBlueprints(tenant: string, query: any) {
  const queryString = Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&');
  return callNoCodeService(`/internal-api/blueprints?${queryString}`, 'GET', tenant);
}

export function createBlueprint(tenant: string, payload: any) {
  return callNoCodeService(`/internal-api/blueprints`, 'POST', tenant, payload);
}

export function getBlueprintEntity(tenant: string, blueprintIdentifier: string, entityId: string) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities/${entityId}`, 'GET', tenant);
}

export function getBlueprintEntities(tenant: string, blueprintIdentifier: string, query: any | string) {
  const queryString = typeof query === 'string' ? query : Object.entries(query).map(([key, value]) => `${key}=${value}`).join('&');
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities?${queryString}`, 'GET', tenant);
}

export function createBlueprintEntity(tenant: string, blueprintIdentifier: string, payload: any) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities`, 'POST', tenant, payload);
}

export function updateBlueprintEntity(tenant: string, blueprintIdentifier: string, payload: any) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities`, 'PUT', tenant, payload);
}