import { internalServicesSecret } from '../../config';
import { service } from '@qelos/api-kit';
import logger from './logger';

const noCodeService = service('NO_CODE', { port: process.env.NO_CODE_SERVICE_PORT || 9004 });

function flattenObject(obj: any, prefix = ''): Record<string, string> {
  const flattened: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key;
    
    if (value instanceof Array) {
      flattened[newKey] = value.join(',');
    } else if (value !== null && typeof value === 'object' && !(value instanceof Date)) {
      Object.assign(flattened, flattenObject(value, newKey));
    } else {
      flattened[newKey] = String(value);
    }
  }
  
  return flattened;
}

function callNoCodeService(url: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE', tenant: string, data?: any) {
  return noCodeService({
    headers: { internal_secret: internalServicesSecret, tenant },
    method,
    data,
    url,
    timeout: 30000, // 30 second timeout for no-code service calls
  })
    .then((axiosRes: any) => axiosRes.data)
    .catch((error: any) => {
      // Log the error for debugging
      logger.error(`No-code service call failed: ${method} ${url}`, {
        tenant,
        error: error.message,
        code: error.code,
        timeout: error.code === 'ECONNABORTED'
      });
      
      // Re-throw with more context
      if (error.code === 'ECONNABORTED') {
        throw new Error(`No-code service timeout: ${method} (tenant: ${tenant})`);
      }
      throw error;
    });
}

export function callPublicNoCodeService(url: string, {tenant, user, bypassAdmin}: {tenant: string, user: string, bypassAdmin?: boolean}, {data, method = 'GET'}: {data?: any, method: string}) {
  return noCodeService({
    headers: { internal_secret: internalServicesSecret, tenant, user },
    method,
    data,
    url,
    timeout: 30000, // 30 second timeout for no-code service calls
    params: {
      ...bypassAdmin ? { bypassAdmin: 'true' } : {},
    }
  })
    .then((axiosRes: any) => axiosRes.data)
    .catch((error: any) => {
      // Log the error for debugging
      logger.error(`Public no-code service call failed: ${method} ${url}`, {
        tenant,
        user,
        error: error.message,
        code: error.code,
        timeout: error.code === 'ECONNABORTED'
      });
      
      // Re-throw with more context
      if (error.code === 'ECONNABORTED') {
        throw new Error(`No-code service timeout: ${method} (tenant: ${tenant}, user: ${user})`);
      }
      throw error;
    });
}

export async function getAllBlueprints(tenant: string, query: any) {
  const flattened = flattenObject(query);
  const queryString = Object.entries(flattened)
    .map(([key, value]) => `${key}=${value}`).join('&');
  return callNoCodeService(`/internal-api/blueprints?${queryString}`, 'GET', tenant);
}

export function createBlueprint(tenant: string, payload: any) {
  return callNoCodeService(`/internal-api/blueprints`, 'POST', tenant, payload);
}

export function updateBlueprint(tenant: string, blueprintIdentifier: string, payload: any) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}`, 'PUT', tenant, payload);
}

export function getBlueprint(tenant: string, blueprintIdentifier: string) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}`, 'GET', tenant);
}

export function getBlueprintEntity(tenant: string, blueprintIdentifier: string, entityId: string) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities/${entityId}`, 'GET', tenant);
}

export function getBlueprintEntities(tenant: string, blueprintIdentifier: string, query: any) {
  const flattened = flattenObject(query);
  const queryString = Object.entries(flattened).map(([key, value]) => `${key}=${value}`).join('&');
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities?${queryString}`, 'GET', tenant);
}

export function createBlueprintEntity(tenant: string, blueprintIdentifier: string, payload: any) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities`, 'POST', tenant, payload);
}

export function updateBlueprintEntity(tenant: string, blueprintIdentifier: string, payload: any) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities`, 'PUT', tenant, payload);
}

export function deleteBlueprintEntity(tenant: string, blueprintIdentifier: string, entityId: string) {
  return callNoCodeService(`/internal-api/blueprints/${blueprintIdentifier}/entities/${entityId}`, 'DELETE', tenant);
}

export function createComponent(tenant: string, payload: {
  identifier: string;
  componentName: string;
  description?: string;
  content: string;
}) {
  return callNoCodeService(`/internal-api/components`, 'POST', tenant, payload);
}

export function getComponents(tenant: string) {
  return callNoCodeService(`/internal-api/components`, 'GET', tenant);
}

export function getComponent(tenant: string, componentIdentifier: string) {
  return callNoCodeService(`/internal-api/components/${componentIdentifier}`, 'GET', tenant);
}

export function updateComponent(tenant: string, componentIdentifier: string, payload: any) {
  return callNoCodeService(`/internal-api/components/${componentIdentifier}`, 'PUT', tenant, payload);
}