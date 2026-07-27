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
  category: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  requiredPrivilege: McpToolPrivilege;
  handler: (context: McpToolHandlerContext) => Promise<unknown>;
}
