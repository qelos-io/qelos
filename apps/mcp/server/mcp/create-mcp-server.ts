import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { IMcpConfigurationMetadata } from '@qelos/global-types';
import { createSdkContext, type McpSdkCredentials } from '../services/sdk-context';
import { getAuthorizedTools } from '../tools/authorize-tool';
import { getDynamicToolDefinitions } from '../tools/dynamic-tools';
import type { McpUserContext } from '../types';

function formatToolResult(result: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}

function formatToolError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Tool execution failed';
  return {
    content: [
      {
        type: 'text' as const,
        text: message,
      },
    ],
    isError: true as const,
  };
}

export async function createMcpServer(
  configuration: IMcpConfigurationMetadata,
  user: McpUserContext,
  credentials: McpSdkCredentials,
): Promise<McpServer> {
  const server = new McpServer({
    name: configuration.serverName || 'qelos-mcp',
    version: configuration.serverVersion || '1.0.0',
  });

  const dynamicTools = await getDynamicToolDefinitions(user.tenant).catch(() => []);
  const authorizedTools = getAuthorizedTools(configuration, user, dynamicTools);
  const sdkContext = createSdkContext({
    tenant: user.tenant,
    user,
    credentials,
  });

  for (const tool of authorizedTools) {
    server.registerTool(
      tool.name || tool.id,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      async (input) => {
        try {
          const result = await tool.handler({
            sdk: sdkContext.sdk,
            adminSdk: sdkContext.adminSdk,
            user,
            input: input as Record<string, unknown>,
          });
          return formatToolResult(result);
        } catch (error) {
          return formatToolError(error);
        }
      },
    );
  }

  return server;
}
