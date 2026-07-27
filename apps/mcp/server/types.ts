import type { Request } from 'express';
import type { IMcpConfigurationMetadata } from '@qelos/global-types';

export interface McpWorkspaceContext {
  _id: string;
  name: string;
  roles: string[];
  labels?: string[];
}

export interface McpUserContext {
  sub: string;
  tenant: string;
  username?: string;
  email?: string;
  roles: string[];
  workspace?: McpWorkspaceContext | null;
  isApiToken?: boolean;
  isPrivileged?: boolean;
}

export interface McpRequest extends Request {
  user?: McpUserContext;
  workspace?: McpWorkspaceContext | null;
  mcpConfiguration?: IMcpConfigurationMetadata;
}
