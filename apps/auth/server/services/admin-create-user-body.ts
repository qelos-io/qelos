export type AdminCreateUserBodySplit = {
  name?: unknown;
  internalMetadata?: unknown;
  metadata?: unknown;
  requestedRoles: unknown;
  userData: Record<string, unknown>;
};

export function splitAdminCreateUserBody(body: Record<string, unknown> | undefined): AdminCreateUserBodySplit {
  const { tenant: _bodyTenant, name, internalMetadata, metadata, roles: requestedRoles, ...userData } = body || {};
  return { name, internalMetadata, metadata, requestedRoles, userData };
}
