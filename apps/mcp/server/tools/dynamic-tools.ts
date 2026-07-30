import type { IIntegration } from '@qelos/global-types';
import type { McpToolDefinition } from './types';
import { jsonSchemaToZodShape } from './json-schema-to-zod';
import { getMcpToolIntegrations, triggerIntegrationSource } from '../services/plugins-service-api';

function sanitizeToolName(raw: string): string {
  const sanitized = raw.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 128);
  return sanitized || 'tool';
}

export function mapIntegrationToToolDefinition(
  integration: IIntegration,
  usedNames: Set<string>,
): McpToolDefinition | null {
  const details = integration.trigger?.details as { name?: string; description?: string; parameters?: any } | undefined;
  if (!details?.name) {
    return null;
  }
  if (!integration.target?.source || !integration.target?.operation) {
    return null;
  }

  let name = sanitizeToolName(details.name);
  if (usedNames.has(name)) {
    name = `${name}_${String(integration._id).slice(-6)}`;
  }
  usedNames.add(name);

  return {
    id: `integration:${integration._id}`,
    name,
    category: 'integrations',
    title: details.name,
    description: details.description || details.name,
    inputSchema: jsonSchemaToZodShape(details.parameters),
    requiredPrivilege: 'user',
    handler: async ({ user, input }) => {
      return triggerIntegrationSource(user.tenant, String(integration.target.source), {
        payload: input,
        operation: integration.target.operation,
        details: integration.target.details,
      });
    },
  };
}

export async function getDynamicToolDefinitions(tenant: string): Promise<McpToolDefinition[]> {
  const integrations = await getMcpToolIntegrations(tenant).catch(() => []);
  const usedNames = new Set<string>();
  return integrations
    .map((integration) => mapIntegrationToToolDefinition(integration, usedNames))
    .filter((tool): tool is McpToolDefinition => tool !== null);
}
