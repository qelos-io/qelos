export const MCP_ADMIN_PATH = '/api/mcp/admin';

export const MCP_DOCS_BASE_URL = 'https://docs.qelos.io/mcp';

export const MCP_DOCS_CONFIGURATION_URL = `${MCP_DOCS_BASE_URL}/configuration.html`;

export const MCP_DOCS_CLIENTS_URL = `${MCP_DOCS_BASE_URL}/clients.html`;

export function buildMcpAdminEndpointUrl(origin: string): string {
  const trimmedOrigin = origin.replace(/\/+$/, '');
  return `${trimmedOrigin}${MCP_ADMIN_PATH}`;
}
