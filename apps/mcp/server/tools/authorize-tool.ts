import type { IMcpConfigurationMetadata, IMcpExposedTool } from '@qelos/global-types';
import type { McpUserContext } from '../types';
import { isPrivilegedMcpUser } from '../services/sdk-context';
import type { McpToolDefinition } from './types';
import { MCP_TOOL_REGISTRY } from './registry';

export function matchesRoleRequirement(
  requiredRoles: string[] | undefined,
  actualRoles: string[],
): boolean {
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

  return isPrivilegedMcpUser(user);
}

export function resolveExposedToolConfig(
  tool: McpToolDefinition,
  configuration: IMcpConfigurationMetadata,
): IMcpExposedTool | undefined {
  const exposedTools = configuration.exposedTools || [];
  return (
    exposedTools.find((entry) => entry.toolId === tool.id) ||
    exposedTools.find((entry) => entry.toolId === tool.category)
  );
}

export function isToolAuthorized(
  tool: McpToolDefinition,
  configuration: IMcpConfigurationMetadata,
  user: McpUserContext,
): boolean {
  if (!isUserAllowedForMcp(configuration, user)) {
    return false;
  }

  const exposedTool = resolveExposedToolConfig(tool, configuration);
  if (!exposedTool || !isToolAllowedForUser(exposedTool, user)) {
    return false;
  }

  if (tool.requiredPrivilege === 'admin' && !isPrivilegedMcpUser(user)) {
    return false;
  }

  return true;
}

export function getAuthorizedTools(
  configuration: IMcpConfigurationMetadata,
  user: McpUserContext,
): McpToolDefinition[] {
  if (!isUserAllowedForMcp(configuration, user)) {
    return [];
  }

  return MCP_TOOL_REGISTRY.filter((tool) => isToolAuthorized(tool, configuration, user));
}

export function getRegistryTool(toolId: string): McpToolDefinition | undefined {
  return MCP_TOOL_REGISTRY.find((tool) => tool.id === toolId);
}
