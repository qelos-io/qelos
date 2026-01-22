import { IDataManipulationStep, IIntegration } from '@qelos/global-types';
import { internalServicesSecret } from '../../config';
import { service } from '@qelos/api-kit';
import logger from './logger';

const pluginsService = service('PLUGINS', { port: process.env.PLUGINS_SERVICE_PORT || 9006 });

export function calPublicPluginsService(url: string, {tenant, user}: {tenant: string, user: any}, {data, method = 'GET'}: {data?: any, method: string}) {
  return pluginsService({
    headers: { internal_secret: internalServicesSecret, tenant, user },
    method,
    data,
    url,
    timeout: 30000, // 30 second timeout for plugins service calls
  })
    .then((axiosRes: any) => axiosRes.data)
    .catch((error: any) => {
      // Log the error for debugging
      logger.error(`Public plugins service call failed: ${method} ${url}`, {
        tenant,
        user: user?._id || user,
        error: error.message,
        code: error.code,
        timeout: error.code === 'ECONNABORTED'
      });
      
      // Re-throw with more context
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Plugins service timeout: ${method} (tenant: ${tenant})`);
      }
      throw error;
    });
}

export function callPluginsService(url: string, tenant: string, data?: any, method: string = 'GET') {
  return pluginsService({
    headers: { internal_secret: internalServicesSecret, tenant },
    method,
    data,
    url,
    timeout: 30000, // 30 second timeout for plugins service calls
  })
    .then((axiosRes: any) => axiosRes.data)
    .catch((error: any) => {
      // Log the error for debugging
      logger.error(`Plugins service call failed: ${method} ${url}`, {
        tenant,
        error: error.message,
        code: error.code,
        timeout: error.code === 'ECONNABORTED'
      });
      
      // Re-throw with more context
      if (error.code === 'ECONNABORTED') {
        throw new Error(`Plugins service timeout: ${method} (tenant: ${tenant})`);
      }
      throw error;
    });
}

export function getIntegrations(tenant: string, params: Record<string, string | boolean>): Promise<IIntegration[]> {
  const qs = new URLSearchParams({});
  Object.entries(params).forEach(([key, value]) => {
    qs.set(key, value.toString());
  });
  return callPluginsService(`/internal-api/integrations?${qs.toString()}`, tenant);
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


// Helper functions for plugin and page operations
export async function getPluginAndPage(pluginId: string, pageId: string, headers: any) {
  if (!pluginId) {
    throw new Error('Plugin ID is required');
  }

  if (!pageId) {
    throw new Error('Page ID is required');
  }

  try {
    let plugin;
    
    // Check if pluginId is a valid ObjectId (24 hex characters)
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(pluginId);
    
    if (isValidObjectId) {
      // Try to get plugin by ID
      plugin = await calPublicPluginsService(
        `/api/plugins/${pluginId}`,
        { tenant: headers.tenant, user: headers.user },
        { data: {}, method: 'GET' }
      );
    } else {
      // If not a valid ObjectId, try to find plugin by name
      const allPlugins = await calPublicPluginsService(
        `/api/plugins`,
        { tenant: headers.tenant, user: headers.user },
        { data: {}, method: 'GET' }
      );
      
      plugin = allPlugins.find((p: any) => p.name === pluginId || p._id === pluginId);
      
      if (!plugin) {
        throw new Error(`Plugin with name or ID "${pluginId}" not found`);
      }
    }

    if (!plugin) {
      throw new Error(`Plugin with ID ${pluginId} not found`);
    }

    // Find the page to update
    const pageIndex = plugin.microFrontends?.findIndex(page => 
      page._id === pageId || 
      page.route?.path === pageId.replace(/^\//, '') || // Remove leading slash
      page.route?.path === pageId ||
      page.route?.name === pageId ||
      page.name === pageId
    );

    if (pageIndex === undefined || pageIndex === -1 || !plugin.microFrontends) {
      throw new Error(`Page with ID or path "${pageId}" not found in plugin ${pluginId}. Available pages: ${plugin.microFrontends?.map(p => `${p.name} (${p._id}, path: ${p.route?.path})`).join(', ') || 'none'}`);
    }

    return { plugin, pageIndex };
  } catch (error: any) {
    // If plugin not found, try to provide helpful guidance
    if (error.message?.includes('not found')) {
      // Check if it's a common mistake like "builtin-pages"
      if (pluginId === 'builtin-pages') {
        throw new Error(`Plugin "builtin-pages" is not a valid plugin. You need to use the actual plugin ID. 
To find the correct plugin ID:
1. Use getPages() to list all available plugins and their pages
2. Look for the plugin that contains your page
3. Use that plugin's ID (usually a 24-character hex string)

Example: If your page is in the "todos" plugin, the plugin ID might be something like "692ea08381d4bd06cfa41ede"`);
      }
      throw new Error(`Failed to get plugin or page: ${error?.message || 'Unknown error'}`);
    }
    throw new Error(`Failed to get plugin or page: ${error?.message || 'Unknown error'}`);
  }
}

export async function updatePluginPage(plugin: any, pageIndex: number, updatedPage: any, headers: any) {
  try {
    // Create a new microFrontends array with the updated page
    const updatedMicroFrontends = [...plugin.microFrontends];
    updatedMicroFrontends[pageIndex] = updatedPage;

    // Update the plugin with the new microFrontends array
    const updatedPlugin = await calPublicPluginsService(
      `/api/plugins/${plugin._id}`,
      { tenant: headers.tenant, user: headers.user },
      { data: { ...plugin, microFrontends: updatedMicroFrontends }, method: 'PUT' }
    );

    // Return the updated page
    return updatedPlugin.microFrontends[pageIndex];
  } catch (error: any) {
    throw new Error(`Failed to update page: ${error?.message || 'Unknown error'}`);
  }
}
