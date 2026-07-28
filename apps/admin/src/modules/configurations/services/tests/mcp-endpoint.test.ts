import { afterEach, describe, expect, it, vi } from 'vitest';
import { getMcpAdminEndpointUrl, getTenantOrigin } from '../mcp-endpoint';

function stubLocation(location: Pick<Location, 'protocol' | 'hostname' | 'origin'>) {
  vi.stubGlobal('location', location);
}

describe('getTenantOrigin', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('returns location.origin by default', () => {
    stubLocation({
      protocol: 'https:',
      hostname: 'tenant.qelos.io',
      origin: 'https://tenant.qelos.io',
    });

    expect(getTenantOrigin()).toBe('https://tenant.qelos.io');
  });

  it('normalizes to www tenant origin when VITE_RUN_AS_SUBDOMAIN is set', () => {
    vi.stubEnv('VITE_RUN_AS_SUBDOMAIN', 'true');
    stubLocation({
      protocol: 'https:',
      hostname: 'admin.tenant.qelos.io',
      origin: 'https://admin.tenant.qelos.io',
    });

    expect(getTenantOrigin()).toBe('https://www.tenant.qelos.io');
  });
});

describe('getMcpAdminEndpointUrl', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('builds the MCP admin endpoint from the tenant origin', () => {
    stubLocation({
      protocol: 'https:',
      hostname: 'tenant.qelos.io',
      origin: 'https://tenant.qelos.io',
    });

    expect(getMcpAdminEndpointUrl()).toBe('https://tenant.qelos.io/api/mcp/admin');
  });

  it('strips trailing slashes from the origin before appending the path', () => {
    stubLocation({
      protocol: 'https:',
      hostname: 'tenant.qelos.io',
      origin: 'https://tenant.qelos.io/',
    });

    expect(getMcpAdminEndpointUrl()).toBe('https://tenant.qelos.io/api/mcp/admin');
  });
});
