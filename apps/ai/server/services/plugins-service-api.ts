import { IDataManipulationStep, IIntegration } from '@qelos/global-types';
import { internalServicesSecret } from '../../config';
import { service } from '@qelos/api-kit';

const pluginsService = service('PLUGINS', { port: process.env.PLUGINS_SERVICE_PORT || 9006 });

export function calPublicPluginsService(url: string, {tenant, user}: {tenant: string, user: any}, {data, method = 'GET'}: {data?: any, method: string}) {
  return pluginsService({
    headers: { internal_secret: internalServicesSecret, tenant, user },
    method,
    data,
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}

export function callPluginsService(url: string, tenant: string, data?: any, method: string = 'GET') {
  return pluginsService({
    headers: { internal_secret: internalServicesSecret, tenant },
    method,
    data,
    url
  })
    .then((axiosRes: any) => axiosRes.data)
}

export function getIntegration(tenant: string, integrationId: string, populate: boolean = false): Promise<IIntegration> {
  return callPluginsService(`/internal-api/integrations/${integrationId}?$populate=${populate}`, tenant);
}

export function getToolsIntegrations(tenant: string, sourceKind: string, integrationId: string) {
  return callPluginsService(`/internal-api/integration-tools?sourceKind=${sourceKind}&integrationId=${integrationId}`, tenant);
}

export function executeDataManipulation(tenant: string, payload: any, workflow: IDataManipulationStep[]) {
  if (!workflow || workflow.length === 0) {
    return payload;
  }
  return callPluginsService(`/internal-api/data-manipulation`, tenant, { payload, workflow }, 'POST');
}

export function callIntegrationTarget(tenant: string, data: any, target: any) {
  return callPluginsService(`/internal-api/integration-target`, tenant, {
    data,
    target
  }, 'POST');
}

/**
 * Get authentication details for an integration source
 * Uses the internal API endpoint: /internal-api/integration-sources/:sourceId
 * 
 * @param sourceId - The ID of the integration source
 * @param tenant - The tenant identifier
 * @returns The integration source with authentication data
 */
export function getSourceAuthentication(tenant: string, sourceId: string): Promise<any> {
  return callPluginsService(`/internal-api/integration-sources/${sourceId}`, tenant);
}

export function triggerIntegrationSource(tenant: string, sourceId: string, { payload, operation, details }: { payload: any, operation: string, details: any }) {
  return callPluginsService(`/internal-api/integration-sources/${sourceId}/trigger`, tenant, {
    payload,
    operation,
    details
  }, 'POST');
}

export function createPlugin(tenant: string, tenanthost: string, payload: any) {
  return pluginsService({
    headers: { internal_secret: internalServicesSecret, tenant, tenanthost },
    method: 'POST',
    data: payload,
    url: `/internal-api/plugins`
  })
    .then((axiosRes: any) => axiosRes.data);
}