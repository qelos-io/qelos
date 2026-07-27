
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
}
