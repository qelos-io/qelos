import { callContentService } from './content-service-api';
import { cacheManager } from './cache-manager';
import {
  type IMcpConfigurationMetadata,
  sanitizeMcpConfigurationMetadata,
} from '@qelos/global-types';

const MCP_CONFIGURATION_KEY = 'mcp-configuration';

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
    return record as unknown as IMcpConfigurationMetadata;
  }

  return null;
}

export async function getMcpConfiguration(tenant: string): Promise<IMcpConfigurationMetadata> {
  return cacheManager.wrap(`mcp:configuration:${tenant}`, async () => {
    try {
      const config = await callContentService(
        `/internal-api/configurations/${MCP_CONFIGURATION_KEY}`,
        tenant,
      );
      const metadata = extractConfigurationMetadata(config);
      return JSON.stringify(
        sanitizeMcpConfigurationMetadata(metadata || defaultMcpConfiguration),
      );
    } catch {
      return JSON.stringify(defaultMcpConfiguration);
    }
  }, { ttl: 60 * 5 }).then(JSON.parse);
}
