import type { Response } from 'express';
import type { RequestId } from '@modelcontextprotocol/sdk/types.js';

export function mcpJsonRpcError(
  res: Response,
  status: number,
  message: string,
  code = -32000,
  id: RequestId | null = null,
): void {
  res.status(status).json({
    jsonrpc: '2.0',
    error: {
      code,
      message,
    },
    id,
  });
}

export function mcpUnauthorized(res: Response, message = 'Authentication required'): void {
  mcpJsonRpcError(res, 401, message);
}

export function mcpServiceUnavailable(res: Response, message: string): void {
  mcpJsonRpcError(res, 503, message);
}
