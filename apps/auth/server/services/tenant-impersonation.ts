import { Response } from 'express';
import { AuthRequest } from '../../types';

type ImpersonationRequest = Pick<AuthRequest, 'get' | 'query' | 'headers' | 'userPayload'>;

export function getImpersonatedTenant(req: ImpersonationRequest): string | undefined {
  const header = req.get('x-impersonate-tenant');
  const query = req.query?.impersonateTenant?.toString();
  return header || query || undefined;
}

export function resolveAuthTenant(
  requestTenant: string | undefined,
  basicTenant: string,
  impersonatedTenant?: string
): string {
  if (impersonatedTenant) {
    return basicTenant;
  }
  return requestTenant || basicTenant;
}

export function shouldApplyTenantImpersonation(
  authenticatedTenant: string,
  basicTenant: string,
  isPrivileged: boolean,
  impersonatedTenant?: string
): boolean {
  return authenticatedTenant === basicTenant && isPrivileged && !!impersonatedTenant;
}

export function applyTenantImpersonation(
  req: AuthRequest,
  res: Response,
  impersonatedTenant: string
): void {
  req.headers.tenant = impersonatedTenant;
  res.set('x-qelos-tenant', impersonatedTenant);
  req.userPayload.tenant = impersonatedTenant;
}
