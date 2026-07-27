import { service } from '@qelos/api-kit';
import {
  type IMcpConfigurationMetadata,
  sanitizeMcpConfigurationMetadata,
} from '@qelos/global-types';
import { cacheManager } from './cache-manager';
import { isMcpConfigurationEnabled } from './mcp-configuration-guards';
import { contentServicePort, internalServicesSecret } from '../../config';

export { isMcpConfigurationEnabled } from './mcp-configuration-guards';

const callContentService = service('CONTENT', { port: contentServicePort });
const MCP_CONFIGURATION_KEY = 'mcp-configuration';

function internalHeaders(tenant: string) {
  return { tenant, internal_secret: internalServicesSecret };
}

const defaultMcpConfiguration: IMcpConfigurationMetadata = {
  enabled: false,
  permittedCallbackUrls: [],
  exposedTools: [],
  adminOnly: false,
};

function extractConfigurationMetadata(responseData: unknown): IMcpConfigurationMetadata | null {
  if (!responseData || typeof responseData !== 'object') {
    return null;
  }

  const record = responseData as Record<string, unknown>;
  if (record.metadata && typeof record.metadata === 'object') {
    return record.metadata as IMcpConfigurationMetadata;
  }

  if (!record.key) {
    return record as IMcpConfigurationMetadata;
  }

  return null;
}

export async function getMcpConfiguration(tenant: string): Promise<IMcpConfigurationMetadata> {
  return cacheManager.wrap(`mcp:configuration:${tenant}`, async () => {
    try {
      const response = await callContentService({
        method: 'GET',
        url: `/internal-api/configurations/${MCP_CONFIGURATION_KEY}`,
        headers: internalHeaders(tenant),
        validateStatus: () => true,
      });

      if (response.status !== 200) {
        return JSON.stringify(defaultMcpConfiguration);
      }

      const metadata = extractConfigurationMetadata(response.data);
      return JSON.stringify(
        sanitizeMcpConfigurationMetadata(metadata || defaultMcpConfiguration),
      );
    } catch {
      return JSON.stringify(defaultMcpConfiguration);
    }
  }, { ttl: 60 * 5 }).then(JSON.parse);
}
