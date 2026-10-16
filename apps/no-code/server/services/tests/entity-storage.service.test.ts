import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import BlueprintEntity from '../../models/blueprint-entity';
import {
  ENTITY_BUCKETS,
  getAllEntityModels,
  getBucketCollectionName,
  getEntityModel,
  pickEntityCollection,
} from '../entity-storage.service';

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

  it('registers the legacy collection plus every bucket', () => {
    assert.equal(getAllEntityModels().length, ENTITY_BUCKETS + 1);
    for (let bucket = 0; bucket < ENTITY_BUCKETS; bucket++) {
      const name = getBucketCollectionName(bucket);
      const model = getEntityModel({ storage: { collection: name } } as any);
      assert.equal(model.collection.name, name);
    }
  });

  it('assigns a registered bucket deterministically', () => {
    const name = pickEntityCollection('tenant-1', 'orders');
    assert.equal(name, pickEntityCollection('tenant-1', 'orders'));
    assert.ok(getEntityModel({ storage: { collection: name } } as any));
  });

  it('never assigns the legacy collection to new blueprints', () => {
    for (let i = 0; i < 200; i++) {
      assert.notEqual(pickEntityCollection('t', `bp${i}`), 'blueprintentities');
    }
  });

  it('spreads blueprints across buckets', () => {
    const used = new Set<string>();
    for (let i = 0; i < 400; i++) {
      used.add(pickEntityCollection(`tenant-${i % 25}`, `orders${i}`));
    }
    assert.equal(used.size, ENTITY_BUCKETS);
  });

  it('separates the same blueprint name across tenants', () => {
    const used = new Set<string>();
    for (let i = 0; i < 100; i++) {
      used.add(pickEntityCollection(`tenant-${i}`, 'orders'));
    }
    assert.ok(used.size > ENTITY_BUCKETS / 2);
  });
});
