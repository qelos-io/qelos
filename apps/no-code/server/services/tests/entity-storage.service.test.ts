import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import BlueprintEntity from '../../models/blueprint-entity';
import { getAllEntityModels, getEntityModel } from '../entity-storage.service';

describe('entity-storage.service', () => {
  it('uses the legacy collection when the blueprint has no storage', () => {
    assert.equal(getEntityModel({} as any), BlueprintEntity);
    assert.equal(getEntityModel(null), BlueprintEntity);
    assert.equal(getEntityModel(undefined), BlueprintEntity);
  });

  it('resolves an explicitly assigned, registered collection', () => {
    assert.equal(getEntityModel({ storage: { collection: 'blueprintentities' } } as any), BlueprintEntity);
  });

  it('never resolves a collection outside the registered set', () => {
    assert.throws(() => getEntityModel({ storage: { collection: 'tenant_acme_orders' } } as any), /unknown entities collection/);
  });

  it('lists every registered model', () => {
    assert.deepEqual(getAllEntityModels(), [BlueprintEntity]);
  });
});
