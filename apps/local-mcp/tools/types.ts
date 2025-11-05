import type QelosAdministratorSDK from '@qelos/sdk/src/administrator';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * Context passed to each tool
 */
export interface ToolContext {
  sdk: QelosAdministratorSDK;
  ensureAuthenticated: () => Promise<void>;
}

/**
 * Tool registration function type
 */
export type ToolRegistration = (server: McpServer, context: ToolContext) => void;
