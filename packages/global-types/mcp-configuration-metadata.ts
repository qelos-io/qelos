/** Tool categories that must never be exposed via MCP (e.g. secrets vault). */
export const MCP_FORBIDDEN_TOOL_IDS = ['secrets'] as const;

export interface IMcpExposedTool {
  toolId: string;
  enabled: boolean;
  roles: string[];
  wsRoles: string[];
  wsLabels: string[];
}

export interface IMcpConfigurationMetadata {
  enabled: boolean;
  permittedCallbackUrls: string[];
  exposedTools: IMcpExposedTool[];
  adminOnly: boolean;
  serverName?: string;
  serverVersion?: string;
  loginUrl?: string;
}

export function sanitizeMcpConfigurationMetadata(
  configuration: IMcpConfigurationMetadata,
): IMcpConfigurationMetadata {
  const forbidden = new Set<string>(MCP_FORBIDDEN_TOOL_IDS);

  return {
    ...configuration,
    exposedTools: (configuration.exposedTools || []).filter(
      (tool) => !forbidden.has(tool.toolId),
    ),
  };
}
