import type { Request } from 'express';

/**
 * Reads bypassAdmin from request body, query, or header (x-bypass-admin).
 * When true, privileged users (e.g. admin) are treated as regular users for scope filtering.
 */
export function getBypassAdmin(req: Request): boolean {
  if (typeof (req as any).body?.bypassAdmin !== 'undefined') {
    return !!(req as any).body.bypassAdmin;
  }
  if ((req as any).query?.bypassAdmin === 'true') {
    return true;
  }
  const h = req.headers?.['x-bypass-admin'];
  return h === 'true' || h === '1';
}
