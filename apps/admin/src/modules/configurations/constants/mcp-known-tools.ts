export type KnownMcpToolDefinition = {
  toolId: string;
  labelKey: string;
  descriptionKey: string;
};

export const KNOWN_MCP_TOOLS: KnownMcpToolDefinition[] = [
  {
    toolId: 'blueprints',
    labelKey: 'MCP tool blueprints',
    descriptionKey: 'MCP tool blueprints description',
  },
  {
    toolId: 'users',
    labelKey: 'MCP tool users',
    descriptionKey: 'MCP tool users description',
  },
  {
    toolId: 'configurations',
    labelKey: 'MCP tool configurations',
    descriptionKey: 'MCP tool configurations description',
  },
  {
    toolId: 'workspaces',
    labelKey: 'MCP tool workspaces',
    descriptionKey: 'MCP tool workspaces description',
  },
  {
    toolId: 'events',
    labelKey: 'MCP tool events',
    descriptionKey: 'MCP tool events description',
  },
  {
    toolId: 'plugins',
    labelKey: 'MCP tool plugins',
    descriptionKey: 'MCP tool plugins description',
  },
  {
    toolId: 'agents',
    labelKey: 'MCP tool agents',
    descriptionKey: 'MCP tool agents description',
  },
  {
    toolId: 'integrations',
    labelKey: 'MCP tool integrations',
    descriptionKey: 'MCP tool integrations description',
  },
  {
    toolId: 'secrets',
    labelKey: 'MCP tool secrets',
    descriptionKey: 'MCP tool secrets description',
  },
  {
    toolId: 'permissions',
    labelKey: 'MCP tool permissions',
    descriptionKey: 'MCP tool permissions description',
  },
  {
    toolId: 'content',
    labelKey: 'MCP tool content',
    descriptionKey: 'MCP tool content description',
  },
  {
    toolId: 'storage',
    labelKey: 'MCP tool storage',
    descriptionKey: 'MCP tool storage description',
  },
];
