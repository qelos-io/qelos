import { service } from '@qelos/api-kit';
import type { IIntegration, IDataManipulationStep } from '@qelos/global-types';
import { internalServicesSecret, pluginsServicePort } from '../../config';

const callPluginsService = service('PLUGINS', { port: pluginsServicePort });

function internalHeaders(tenant: string) {
  return { internal_secret: internalServicesSecret, tenant };
}

export async function getMcpToolIntegrations(tenant: string): Promise<IIntegration[]> {
  const response = await callPluginsService({
    method: 'GET',
    url: '/internal-api/mcp-tool-integrations',
    headers: internalHeaders(tenant),
    validateStatus: () => true,
  });

  return response.status === 200 && Array.isArray(response.data) ? response.data : [];
}

export async function executeDataManipulation(tenant: string, payload: unknown, workflow?: IDataManipulationStep[]): Promise<any> {
  if (!workflow || workflow.length === 0) {
    return payload;
  }

  const response = await callPluginsService({
    method: 'POST',
    url: '/internal-api/data-manipulation',
    headers: internalHeaders(tenant),
    data: { payload, workflow },
    validateStatus: () => true,
  });

  if (response.status >= 400) {
    throw new Error(response.data?.message || 'Data manipulation failed');
  }

  return response.data;
}

export async function triggerIntegrationSource(
  tenant: string,
  sourceId: string,
  { payload, operation, details, targetManipulation }: { payload: unknown; operation: string; details: unknown; targetManipulation?: IDataManipulationStep[] },
): Promise<unknown> {
  const response = await callPluginsService({
    method: 'POST',
    url: `/internal-api/integration-sources/${sourceId}/trigger`,
    headers: internalHeaders(tenant),
    data: { payload, operation, details, targetManipulation },
    validateStatus: () => true,
  });

  if (response.status >= 400) {
    throw new Error(response.data?.message || 'Integration target call failed');
  }

  return response.data;
}
