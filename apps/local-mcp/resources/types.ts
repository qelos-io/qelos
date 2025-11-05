import type QelosAdministratorSDK from '@qelos/sdk/src/administrator';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Context passed to each resource
 */
export interface ResourceContext {
  sdk: QelosAdministratorSDK;
  ensureAuthenticated: () => Promise<void>;
}

/**
 * Resource registration function type
 */
export type ResourceRegistration = (server: McpServer, context: ResourceContext) => void;
