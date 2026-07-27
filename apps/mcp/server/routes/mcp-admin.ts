import { randomUUID } from 'node:crypto';
import type { Response } from 'express';
import { getRouter } from '@qelos/api-kit';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { IMcpConfigurationMetadata } from '@qelos/global-types';
import authenticateMcpRequest, {
  extractApiKey,
  extractBearerAuthorization,
} from '../middleware/authenticate-mcp-request';
import type { McpSdkCredentials } from '../services/sdk-context';
import requireMcpEnabled from '../middleware/require-mcp-enabled';
import { createMcpServer } from '../mcp/create-mcp-server';
import type { McpRequest, McpUserContext } from '../types';

interface McpSessionEntry {
  transport: StreamableHTTPServerTransport;
  user: McpUserContext;
  mcpConfiguration: IMcpConfigurationMetadata;
  credentials: McpSdkCredentials;
}

const sessions = new Map<string, McpSessionEntry>();

const MCP_MIDDLEWARES = [authenticateMcpRequest, requireMcpEnabled];

async function handleMcpRequest(req: McpRequest, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;

  try {
    if (sessionId && sessions.has(sessionId)) {
      await sessions.get(sessionId)!.transport.handleRequest(req, res, req.body);
      return;
    }

    if (!sessionId && isInitializeRequest(req.body)) {
      let sessionEntry: McpSessionEntry | undefined;

      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id) => {
          if (sessionEntry) {
            sessions.set(id, sessionEntry);
          }
        },
      });

      transport.onclose = () => {
        const activeSessionId = transport.sessionId;
        if (activeSessionId) {
          sessions.delete(activeSessionId);
        }
      };

      const credentials: McpSdkCredentials = {
        authorization: extractBearerAuthorization(req),
        apiKey: extractApiKey(req),
      };

      const server = createMcpServer(req.mcpConfiguration!, req.user!, credentials);
      sessionEntry = {
        transport,
        user: req.user!,
        mcpConfiguration: req.mcpConfiguration!,
        credentials,
      };

      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
      return;
    }

    res.status(400).json({
      jsonrpc: '2.0',
      error: {
        code: -32000,
        message: 'Bad Request: No valid session ID provided',
      },
      id: null,
    });
  } catch (error) {
    console.error('MCP request failed', error);
    if (!res.headersSent) {
      res.status(500).json({
        jsonrpc: '2.0',
        error: {
          code: -32603,
          message: 'Internal server error',
        },
        id: null,
      });
    }
  }
}

async function handleMcpStreamRequest(req: McpRequest, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  await sessions.get(sessionId)!.transport.handleRequest(req, res);
}

async function handleMcpSessionTermination(req: McpRequest, res: Response): Promise<void> {
  const sessionId = req.headers['mcp-session-id'] as string | undefined;
  if (!sessionId || !sessions.has(sessionId)) {
    res.status(400).send('Invalid or missing session ID');
    return;
  }

  await sessions.get(sessionId)!.transport.handleRequest(req, res);
}

export function mcpAdminRouter() {
  const router = getRouter();

  router.post('/api/mcp/admin', MCP_MIDDLEWARES, handleMcpRequest);
  router.get('/api/mcp/admin', MCP_MIDDLEWARES, handleMcpStreamRequest);
  router.delete('/api/mcp/admin', MCP_MIDDLEWARES, handleMcpSessionTermination);

  return router;
}

export function __resetMcpSessionsForTests(): void {
  sessions.clear();
}
