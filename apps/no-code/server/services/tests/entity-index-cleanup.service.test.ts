import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { OBSOLETE_ENTITY_INDEXES, getDroppableIndexes } from '../entity-index-cleanup.service';

describe('getDroppableIndexes', () => {
  it('drops the obsolete index once its replacement exists', () => {
    assert.deepEqual(getDroppableIndexes(['_id_', 'tenant_1_indexes_1', 'tenant_1_blueprint_1_indexes_1']), ['tenant_1_indexes_1']);
  });

  it('keeps the obsolete index while its replacement is missing', () => {
    assert.deepEqual(getDroppableIndexes(['_id_', 'tenant_1_indexes_1']), []);
  });

  it('does nothing when the obsolete index is already gone', () => {
    assert.deepEqual(getDroppableIndexes(['_id_', 'tenant_1_blueprint_1_indexes_1']), []);
    assert.deepEqual(getDroppableIndexes([]), []);
  });

  it('never targets an index the schema still defines', () => {
    for (const { name } of OBSOLETE_ENTITY_INDEXES) {
      assert.ok(!['_id_', 'user_1', 'workspace_1', 'tenant_1_blueprint_1_created_1', 'tenant_1_blueprint_1_identifier_1', 'tenant_1_blueprint_1_indexes_1'].includes(name), name);
    }
  });
});
