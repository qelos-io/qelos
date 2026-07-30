import type * as z from 'zod/v4';
import type QelosSDK from '@qelos/sdk';
import type QelosAdministratorSDK from '@qelos/sdk/administrator';
import type { McpUserContext } from '../types';

export type McpToolPrivilege = 'admin' | 'user';

export interface McpToolHandlerContext {
  sdk: QelosSDK;
  adminSdk: QelosAdministratorSDK | null;
  user: McpUserContext;
  input: Record<string, unknown>;
}

export interface McpToolDefinition {
  id: string;
  /**
   * Name registered with the MCP client (what the LLM invokes). Falls back to `id` when unset.
   * Kept distinct from `id` so dynamic, admin-renameable tools keep a stable authorization key.
   */
  name?: string;
  category: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  requiredPrivilege: McpToolPrivilege;
  handler: (context: McpToolHandlerContext) => Promise<unknown>;
}
