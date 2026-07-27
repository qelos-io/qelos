import * as z from 'zod/v4';
import type { McpToolDefinition } from './types';

const emptyInputSchema = {};

export const MCP_TOOL_REGISTRY: McpToolDefinition[] = [
  {
    id: 'list-workspaces',
    category: 'workspaces',
    title: 'List workspaces',
    description: 'List workspaces available to the authenticated user.',
    inputSchema: emptyInputSchema,
    requiredPrivilege: 'user',
    handler: async ({ sdk, adminSdk }) => {
      if (adminSdk) {
        return adminSdk.adminWorkspaces.getList();
      }
      return sdk.workspaces.getList();
    },
  },
  {
    id: 'get-app-config',
    category: 'configurations',
    title: 'Get app configuration',
    description: 'Fetch the tenant app configuration metadata.',
    inputSchema: emptyInputSchema,
    requiredPrivilege: 'user',
    handler: async ({ sdk }) => sdk.appConfigurations.getAppConfiguration(),
  },
  {
    id: 'list-blueprints',
    category: 'blueprints',
    title: 'List blueprints',
    description: 'List blueprint definitions for the tenant.',
    inputSchema: emptyInputSchema,
    requiredPrivilege: 'user',
    handler: async ({ sdk, adminSdk }) => {
      if (adminSdk) {
        return adminSdk.manageBlueprints.getList();
      }
      return sdk.blueprints.getList();
    },
  },
  {
    id: 'get-blueprint-entities',
    category: 'blueprints',
    title: 'Get blueprint entities',
    description: 'List entities for a blueprint with optional query filters.',
    inputSchema: {
      blueprintKey: z.string().describe('Blueprint key'),
      limit: z.number().int().positive().optional().describe('Maximum number of entities to return'),
      skip: z.number().int().min(0).optional().describe('Number of entities to skip'),
      sort: z.string().optional().describe('Sort expression'),
    },
    requiredPrivilege: 'user',
    handler: async ({ sdk, input }) => {
      const blueprintKey = String(input.blueprintKey);
      const query: Record<string, unknown> = {};

      if (input.limit !== undefined) {
        query.$limit = input.limit;
      }
      if (input.skip !== undefined) {
        query.$skip = input.skip;
      }
      if (input.sort !== undefined) {
        query.$sort = input.sort;
      }

      return sdk.blueprints.entitiesOf(blueprintKey).getList(query);
    },
  },
  {
    id: 'create-blueprint-entity',
    category: 'blueprints',
    title: 'Create blueprint entity',
    description: 'Create a new entity in the given blueprint.',
    inputSchema: {
      blueprintKey: z.string().describe('Blueprint key'),
      metadata: z.record(z.string(), z.unknown()).describe('Entity metadata payload'),
    },
    requiredPrivilege: 'user',
    handler: async ({ sdk, input }) => {
      const blueprintKey = String(input.blueprintKey);
      const metadata = input.metadata as Record<string, unknown>;
      return sdk.blueprints.entitiesOf(blueprintKey).create({ metadata } as never);
    },
  },
  {
    id: 'list-users',
    category: 'users',
    title: 'List users',
    description: 'List tenant users (admin only).',
    inputSchema: {
      username: z.string().optional().describe('Filter by username'),
      roles: z.array(z.string()).optional().describe('Filter by roles'),
    },
    requiredPrivilege: 'admin',
    handler: async ({ adminSdk, input }) => {
      if (!adminSdk) {
        throw new Error('Administrator SDK is required for this tool');
      }

      return adminSdk.users.getList({
        username: input.username ? String(input.username) : undefined,
        roles: Array.isArray(input.roles) ? input.roles.map(String) : undefined,
      });
    },
  },
  {
    id: 'list-configurations',
    category: 'configurations',
    title: 'List configurations',
    description: 'List tenant configuration documents (admin only).',
    inputSchema: emptyInputSchema,
    requiredPrivilege: 'admin',
    handler: async ({ adminSdk }) => {
      if (!adminSdk) {
        throw new Error('Administrator SDK is required for this tool');
      }

      return adminSdk.manageConfigurations.getList('');
    },
  },
  {
    id: 'list-events',
    category: 'events',
    title: 'List events',
    description: 'List tenant events (admin only).',
    inputSchema: {
      page: z.number().int().min(1).optional().describe('Page number'),
      limit: z.number().int().positive().optional().describe('Page size'),
      kind: z.string().optional().describe('Event kind filter'),
      eventName: z.string().optional().describe('Event name filter'),
      source: z.string().optional().describe('Event source filter'),
      search: z.string().optional().describe('Free-text search'),
    },
    requiredPrivilege: 'admin',
    handler: async ({ adminSdk, input }) => {
      if (!adminSdk) {
        throw new Error('Administrator SDK is required for this tool');
      }

      return adminSdk.events.getList({
        page: typeof input.page === 'number' ? input.page : undefined,
        limit: typeof input.limit === 'number' ? input.limit : undefined,
        kind: input.kind ? String(input.kind) : undefined,
        eventName: input.eventName ? String(input.eventName) : undefined,
        source: input.source ? String(input.source) : undefined,
        search: input.search ? String(input.search) : undefined,
      });
    },
  },
  {
    id: 'list-integration-sources',
    category: 'integrations',
    title: 'List integration sources',
    description: 'List integration sources configured for the tenant (admin only).',
    inputSchema: {
      kind: z.string().optional().describe('Integration source kind filter'),
    },
    requiredPrivilege: 'admin',
    handler: async ({ adminSdk, input }) => {
      if (!adminSdk) {
        throw new Error('Administrator SDK is required for this tool');
      }

      return adminSdk.integrationSources.getList(
        input.kind ? { kind: String(input.kind) } : undefined,
      );
    },
  },
];
