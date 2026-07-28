import type { Response } from 'express';
import type { RequestId } from '@modelcontextprotocol/sdk/types.js';

interface McpErrorData {
  loginUrl?: string;
  authorizationServer?: string;
  [key: string]: unknown;
}

export function mcpJsonRpcError(
  res: Response,
  status: number,
  message: string,
  code = -32000,
  id: RequestId | null = null,
  data?: McpErrorData,
  headers?: Record<string, string>,
): void {
  if (headers) {
    for (const [key, value] of Object.entries(headers)) {
      if (typeof res.setHeader === 'function') {
        res.setHeader(key, value);
      }
    }
  }

  const body: Record<string, unknown> = {
    jsonrpc: '2.0',
    error: {
      code,
      message,
      ...(data ? { data } : {}),
    },
    id,
  };

  res.status(status).json(body);
}

export function mcpUnauthorized(
  res: Response,
  message = 'Authentication required',
  data?: McpErrorData,
): void {
  const headers: Record<string, string> = {};
  if (data?.authorizationServer) {
    headers['WWW-Authenticate'] = 'Bearer';
    headers['Link'] = `<${data.authorizationServer}>; rel="authorization-server"`;
  }
  if (data?.loginUrl) {
    headers['Location'] = data.loginUrl;
  }
  mcpJsonRpcError(res, 401, message, -32000, null, data, headers);
}

export function mcpServiceUnavailable(res: Response, message: string): void {
  mcpJsonRpcError(res, 503, message);
}
