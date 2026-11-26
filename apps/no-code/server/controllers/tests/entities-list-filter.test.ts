import { describe, it, mock } from 'node:test';
import { strict as assert } from 'node:assert';
import BlueprintEntity from '../../models/blueprint-entity';
import { getAllBlueprintEntities } from '../entities';

const USER = 'a'.repeat(24);
const WORKSPACE = 'b'.repeat(24);

const properties = {
  title: { type: 'string' },
  user: { type: 'string' },
  workspace: { type: 'string' },
  tenant: { type: 'string' },
  blueprint: { type: 'string' },
};
const blueprint = (permissionScope: string) => ({
  identifier: 'order',
  permissionScope,
  properties,
  relations: [],
  permissions: [{ operation: 'read', scope: permissionScope, roleBased: ['user'] }],
});

/** the filter the controller hands to the database */
async function filterFor(queryString: string, { scope = 'user', roles = ['user'] } = {}) {
  let filter: any;
  const find = mock.method(BlueprintEntity as any, 'find', (query: any) => {
    filter = query;
    return { lean: () => ({ exec: async () => [] }) };
  });
  const res: any = { status: () => res, json: () => res, end: () => res, setHeader: () => res };
  const workspace = { _id: WORKSPACE, roles: [], labels: [] };
  await getAllBlueprintEntities(
    {
      blueprint: blueprint(scope),
      headers: { tenant: 'tenant-1' },
      user: { _id: USER, roles, workspace },
      workspace,
      query: Object.fromEntries(new URLSearchParams(queryString)),
      _parsedUrl: { query: queryString },
    } as any,
    res,
  );
  find.mock.restore();
  return filter;
}

describe('listing entities - filters and access', () => {
  it('should always filter by the tenant and the blueprint', async () => {
    const filter = await filterFor('', { roles: ['admin'] });
    assert.equal(filter.tenant, 'tenant-1');
    assert.equal(filter.blueprint, 'order');
    assert.equal('metadata.tenant' in filter || 'metadata.blueprint' in filter, false);
  });

  it('should limit a user to their own entities', async () => {
    const filter = await filterFor('');
    assert.equal(filter.user, USER);
    assert.equal('metadata.user' in filter, false);
  });

  it('should limit to the active workspace', async () => {
    const filter = await filterFor('', { scope: 'workspace' });
    assert.equal(String(filter.workspace), WORKSPACE);
    assert.equal('metadata.workspace' in filter, false);
  });

  it('should filter metadata by the properties the caller names', async () => {
    const filter = await filterFor('user=someone&tenant=other&title=a');
    assert.equal(filter.user, USER);
    assert.equal(filter.tenant, 'tenant-1');
    assert.deepEqual(
      [filter['metadata.user'], filter['metadata.tenant'], filter['metadata.title']],
      ['someone', 'other', 'a'],
    );
  });
});
