import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getImpersonatedTenant,
  resolveAuthTenant,
  shouldApplyTenantImpersonation,
} from '../tenant-impersonation';

describe('tenant impersonation helpers', () => {
  it('reads x-impersonate-tenant header', () => {
    const tenant = getImpersonatedTenant({
      get: ((name: string) => (name === 'x-impersonate-tenant' ? 'tenant-b' : undefined)) as any,
      query: {},
      headers: { tenant: '0' },
      userPayload: undefined as any,
    });
    assert.equal(tenant, 'tenant-b');
  });

  it('falls back to impersonateTenant query param', () => {
    const tenant = getImpersonatedTenant({
      get: (() => undefined) as any,
      query: { impersonateTenant: 'tenant-b' },
      headers: { tenant: '0' },
      userPayload: undefined as any,
    });
    assert.equal(tenant, 'tenant-b');
  });

  it('authenticates against the base tenant when impersonating', () => {
    assert.equal(resolveAuthTenant('tenant-b', '0', 'tenant-b'), '0');
    assert.equal(resolveAuthTenant('tenant-b', '0'), 'tenant-b');
  });

  it('applies tenant impersonation from authenticated tenant, not request tenant header', () => {
    assert.equal(
      shouldApplyTenantImpersonation('0', '0', true, 'tenant-b'),
      true
    );
    assert.equal(
      shouldApplyTenantImpersonation('tenant-b', '0', true, 'tenant-b'),
      false
    );
    assert.equal(
      shouldApplyTenantImpersonation('0', '0', false, 'tenant-b'),
      false
    );
  });
});
