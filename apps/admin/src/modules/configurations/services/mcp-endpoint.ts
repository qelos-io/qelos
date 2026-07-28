import { buildMcpAdminEndpointUrl } from '@qelos/global-types';

export function getTenantOrigin(): string {
  // @ts-ignore
  const runAsSubdomain = !!import.meta.env.VITE_RUN_AS_SUBDOMAIN;

  if (runAsSubdomain) {
    return location.protocol + '//www' + location.hostname.substr(location.hostname.indexOf('.'));
  }

  return location.origin;
}

export function getMcpAdminEndpointUrl(): string {
  return buildMcpAdminEndpointUrl(getTenantOrigin());
}
