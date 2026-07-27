import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import * as z from 'zod/v4';
import type { IMcpConfigurationMetadata, IMcpExposedTool } from '@qelos/global-types';
import type { McpUserContext } from '../types';

function matchesRoleRequirement(requiredRoles: string[] | undefined, actualRoles: string[]): boolean {
  if (!requiredRoles?.length) {
    return true;
  }

  if (requiredRoles.includes('*')) {
    return true;
  }

  return requiredRoles.some((role) => actualRoles.includes(role));
}

export function isToolAllowedForUser(tool: IMcpExposedTool, user: McpUserContext): boolean {
  if (!tool.enabled) {
    return false;
  }

  const userRoles = user.roles || [];
  const workspaceRoles = user.workspace?.roles || [];
  const workspaceLabels = user.workspace?.labels || [];

  if (!matchesRoleRequirement(tool.roles, userRoles)) {
    return false;
  }

  if (!matchesRoleRequirement(tool.wsRoles, workspaceRoles)) {
    return false;
  }

  if (tool.wsLabels?.length) {
    const hasLabel = tool.wsLabels.some((label) => workspaceLabels.includes(label));
    if (!hasLabel) {
      return false;
    }
  }

  return true;
}

export function isUserAllowedForMcp(
  configuration: IMcpConfigurationMetadata,
  user: McpUserContext,
): boolean {
  if (!configuration.adminOnly) {
    return true;
  }

  return user.roles.includes('admin') || user.isPrivileged === true;
}

export function createMcpServer(
  configuration: IMcpConfigurationMetadata,
  user: McpUserContext,
): McpServer {
  const server = new McpServer({
    name: configuration.serverName || 'qelos-mcp',
    version: configuration.serverVersion || '1.0.0',
  });

  if (!isUserAllowedForMcp(configuration, user)) {
    return server;
  }

  for (const tool of configuration.exposedTools || []) {
    if (!isToolAllowedForUser(tool, user)) {
      continue;
    }

    server.registerTool(
      tool.toolId,
      {
        description: `Qelos MCP tool: ${tool.toolId}`,
        inputSchema: {
          input: z.string().optional().describe('Optional tool input payload'),
        },
      },
      async ({ input }) => ({
        content: [
          {
            type: 'text',
            text: input
              ? `Tool "${tool.toolId}" executed for tenant ${user.tenant}.`
              : `Tool "${tool.toolId}" executed successfully.`,
          },
        ],
      }),
    );
  }

  return server;
}
