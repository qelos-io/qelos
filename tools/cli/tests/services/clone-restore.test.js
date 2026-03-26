const { describe, it, beforeEach, afterEach, mock } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const jiti = require('jiti')(__filename);
const cloneRestore = jiti(path.join(__dirname, '../../services/blueprint/clone-restore.mjs'));

describe('Clone Restore', () => {
  let testDir;

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'clone-restore-test-'));
    // Suppress logger output during tests
    mock.method(console, 'log', () => {});
    mock.method(console, 'warn', () => {});
    mock.method(console, 'error', () => {});
  });

  afterEach(() => {
    if (testDir && fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    mock.restoreAll();
  });

  describe('buildDependencyOrder', () => {
    it('should return blueprints with no relations in input order', () => {
      const result = cloneRestore.buildDependencyOrder(
        ['alpha', 'beta', 'gamma'],
        { alpha: [], beta: [], gamma: [] }
      );
      assert.deepStrictEqual(result, ['alpha', 'beta', 'gamma']);
    });

    it('should put dependency before dependent', () => {
      const relationsMap = {
        product: [{ key: 'category', target: 'product_category' }],
        product_category: [],
      };
      const result = cloneRestore.buildDependencyOrder(
        ['product', 'product_category'],
        relationsMap
      );
      const catIdx = result.indexOf('product_category');
      const prodIdx = result.indexOf('product');
      assert.ok(catIdx < prodIdx, 'product_category should come before product');
    });

    it('should handle a chain of dependencies (A -> B -> C)', () => {
      const relationsMap = {
        a: [{ key: 'ref_b', target: 'b' }],
        b: [{ key: 'ref_c', target: 'c' }],
        c: [],
      };
      const result = cloneRestore.buildDependencyOrder(['a', 'b', 'c'], relationsMap);
      assert.strictEqual(result.indexOf('c'), 0);
      assert.ok(result.indexOf('b') < result.indexOf('a'));
    });

    it('should handle multiple dependencies for one blueprint', () => {
      const relationsMap = {
        order: [
          { key: 'customer', target: 'customer' },
          { key: 'product', target: 'product' },
        ],
        customer: [],
        product: [],
      };
      const result = cloneRestore.buildDependencyOrder(
        ['order', 'customer', 'product'],
        relationsMap
      );
      const orderIdx = result.indexOf('order');
      assert.ok(result.indexOf('customer') < orderIdx);
      assert.ok(result.indexOf('product') < orderIdx);
    });

    it('should ignore self-references', () => {
      const relationsMap = {
        category: [{ key: 'parent', target: 'category' }],
      };
      const result = cloneRestore.buildDependencyOrder(['category'], relationsMap);
      assert.deepStrictEqual(result, ['category']);
    });

    it('should ignore relations to blueprints not in the input list', () => {
      const relationsMap = {
        product: [{ key: 'brand', target: 'brand' }],
      };
      // 'brand' is not in the blueprintNames list
      const result = cloneRestore.buildDependencyOrder(['product'], relationsMap);
      assert.deepStrictEqual(result, ['product']);
    });

    it('should handle blueprints with no entry in relationsMap', () => {
      const result = cloneRestore.buildDependencyOrder(
        ['alpha', 'beta'],
        {} // empty relations map
      );
      assert.deepStrictEqual(result, ['alpha', 'beta']);
    });

    it('should handle circular dependencies by appending them at the end', () => {
      const relationsMap = {
        a: [{ key: 'ref_b', target: 'b' }],
        b: [{ key: 'ref_a', target: 'a' }],
        c: [],
      };
      const result = cloneRestore.buildDependencyOrder(['a', 'b', 'c'], relationsMap);
      // 'c' has no deps, should come first
      assert.strictEqual(result[0], 'c');
      // 'a' and 'b' are circular, should both be in result
      assert.strictEqual(result.length, 3);
      assert.ok(result.includes('a'));
      assert.ok(result.includes('b'));
    });

    it('should handle a diamond dependency (D -> B,C -> A)', () => {
      const relationsMap = {
        a: [],
        b: [{ key: 'ref_a', target: 'a' }],
        c: [{ key: 'ref_a', target: 'a' }],
        d: [{ key: 'ref_b', target: 'b' }, { key: 'ref_c', target: 'c' }],
      };
      const result = cloneRestore.buildDependencyOrder(['a', 'b', 'c', 'd'], relationsMap);
      assert.strictEqual(result[0], 'a');
      assert.strictEqual(result[result.length - 1], 'd');
    });
  });

  describe('readBlueprintEntities', () => {
    let entitiesPath;

    beforeEach(() => {
      entitiesPath = path.join(testDir, 'entities');
      fs.mkdirSync(entitiesPath, { recursive: true });
    });

    it('should return empty array if blueprint directory does not exist', () => {
      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'nonexistent', null, null);
      assert.deepStrictEqual(result, []);
    });

    it('should read entities from JSON files', () => {
      const bpDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(
        path.join(bpDir, 'page-1.json'),
        JSON.stringify([
          { _id: 'aaa', metadata: { name: 'Item 1' } },
          { _id: 'bbb', metadata: { name: 'Item 2' } },
        ])
      );

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'product', null, null);
      assert.strictEqual(result.length, 2);
      assert.strictEqual(result[0]._id, 'aaa');
      assert.strictEqual(result[1]._id, 'bbb');
    });

    it('should attach _sourceFile to each entity', () => {
      const bpDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(
        path.join(bpDir, 'page-1.json'),
        JSON.stringify([{ _id: 'aaa' }])
      );

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'product', null, null);
      assert.strictEqual(result[0]._sourceFile, 'page-1.json');
    });

    it('should read from multiple files', () => {
      const bpDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'page-1.json'), JSON.stringify([{ _id: '1' }]));
      fs.writeFileSync(path.join(bpDir, 'page-2.json'), JSON.stringify([{ _id: '2' }]));

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'product', null, null);
      assert.strictEqual(result.length, 2);
    });

    it('should apply include patterns', () => {
      const bpDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'active.page-1.json'), JSON.stringify([{ _id: '1' }]));
      fs.writeFileSync(path.join(bpDir, 'archived.page-1.json'), JSON.stringify([{ _id: '2' }]));

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'product', ['active'], null);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]._id, '1');
    });

    it('should apply exclude patterns', () => {
      const bpDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'active.page-1.json'), JSON.stringify([{ _id: '1' }]));
      fs.writeFileSync(path.join(bpDir, 'archived.page-1.json'), JSON.stringify([{ _id: '2' }]));

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'product', null, ['archived']);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]._id, '1');
    });

    it('should skip non-JSON files', () => {
      const bpDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'page-1.json'), JSON.stringify([{ _id: '1' }]));
      fs.writeFileSync(path.join(bpDir, 'readme.txt'), 'ignore me');

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'product', null, null);
      assert.strictEqual(result.length, 1);
    });

    it('should skip files with invalid JSON', () => {
      const bpDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'page-1.json'), JSON.stringify([{ _id: '1' }]));
      fs.writeFileSync(path.join(bpDir, 'bad.json'), 'not valid json');

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'product', null, null);
      assert.strictEqual(result.length, 1);
    });

    it('should skip files where content is not an array', () => {
      const bpDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'page-1.json'), JSON.stringify([{ _id: '1' }]));
      fs.writeFileSync(path.join(bpDir, 'object.json'), JSON.stringify({ _id: '2' }));

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'product', null, null);
      assert.strictEqual(result.length, 1);
    });
  });

  describe('remapRelations', () => {
    it('should return entity unchanged when no metadata', () => {
      const entity = { user: 'john' };
      const relations = [{ key: 'category', target: 'category_bp' }];
      const idMap = new Map();

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.deepStrictEqual(result, entity);
    });

    it('should return entity unchanged when no relations', () => {
      const entity = { metadata: { name: 'test' } };
      const result = cloneRestore.remapRelations(entity, [], new Map());
      assert.deepStrictEqual(result, entity);
    });

    it('should remap a single ObjectID relation', () => {
      const oldId = 'aabbccddeeff00112233aabb';
      const newId = '112233445566778899001122';
      const entity = { metadata: { category: oldId, name: 'Product' } };
      const relations = [{ key: 'category', target: 'product_category' }];
      const idMap = new Map([[oldId, newId]]);

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.category, newId);
      assert.strictEqual(result.metadata.name, 'Product');
    });

    it('should remap ObjectIDs in an array relation', () => {
      const oldId1 = 'aabbccddeeff00112233aabb';
      const oldId2 = 'ffeeddccbbaa99887766aabb';
      const newId1 = '112233445566778899001122';
      const newId2 = '998877665544332211001122';
      const entity = { metadata: { tags: [oldId1, oldId2] } };
      const relations = [{ key: 'tags', target: 'tag' }];
      const idMap = new Map([[oldId1, newId1], [oldId2, newId2]]);

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.deepStrictEqual(result.metadata.tags, [newId1, newId2]);
    });

    it('should keep values that are not in the idMap', () => {
      const unknownId = 'aabbccddeeff00112233aabb';
      const entity = { metadata: { category: unknownId } };
      const relations = [{ key: 'category', target: 'product_category' }];
      const idMap = new Map(); // empty

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.category, unknownId);
    });

    it('should keep non-ObjectID values unchanged', () => {
      const entity = { metadata: { category: 'some-slug-value' } };
      const relations = [{ key: 'category', target: 'product_category' }];
      const idMap = new Map([['some-slug-value', 'new-value']]);

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      // 'some-slug-value' is not an ObjectID, so should NOT be remapped
      assert.strictEqual(result.metadata.category, 'some-slug-value');
    });

    it('should handle null values in metadata gracefully', () => {
      const entity = { metadata: { category: null, name: 'test' } };
      const relations = [{ key: 'category', target: 'product_category' }];
      const idMap = new Map();

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.category, null);
    });

    it('should handle mixed array with some IDs mapped and some not', () => {
      const mappedId = 'aabbccddeeff00112233aabb';
      const unmappedId = 'ffeeddccbbaa99887766aabb';
      const newId = '112233445566778899001122';
      const entity = { metadata: { tags: [mappedId, unmappedId] } };
      const relations = [{ key: 'tags', target: 'tag' }];
      const idMap = new Map([[mappedId, newId]]);

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.tags[0], newId);
      assert.strictEqual(result.metadata.tags[1], unmappedId);
    });

    it('should not mutate the original entity', () => {
      const oldId = 'aabbccddeeff00112233aabb';
      const newId = '112233445566778899001122';
      const entity = { metadata: { category: oldId } };
      const relations = [{ key: 'category', target: 'product_category' }];
      const idMap = new Map([[oldId, newId]]);

      cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(entity.metadata.category, oldId);
    });

    it('should remap multiple relation keys on the same entity', () => {
      const catOld = 'aabbccddeeff00112233aabb';
      const catNew = '112233445566778899001122';
      const brandOld = 'ffeeddccbbaa99887766aabb';
      const brandNew = '998877665544332211001122';

      const entity = { metadata: { category: catOld, brand: brandOld, name: 'Test' } };
      const relations = [
        { key: 'category', target: 'category_bp' },
        { key: 'brand', target: 'brand_bp' },
      ];
      const idMap = new Map([[catOld, catNew], [brandOld, brandNew]]);

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.category, catNew);
      assert.strictEqual(result.metadata.brand, brandNew);
      assert.strictEqual(result.metadata.name, 'Test');
    });
  });

  describe('cloneRestoreBlueprints', () => {
    let dumpPath;
    let entitiesPath;

    function createMockSdk(blueprintDefs, createResults) {
      const createCallLog = [];
      return {
        manageBlueprints: {
          getList: mock.fn(() => Promise.resolve(
            Object.keys(blueprintDefs).map(id => ({ identifier: id }))
          )),
          getBlueprint: mock.fn((id) => Promise.resolve(blueprintDefs[id])),
        },
        blueprints: {
          entitiesOf: mock.fn((name) => ({
            create: mock.fn((data) => {
              createCallLog.push({ blueprint: name, data });
              const resultEntry = (createResults[name] || []).shift();
              if (resultEntry && resultEntry.error) {
                return Promise.reject(new Error(resultEntry.error));
              }
              return Promise.resolve(resultEntry || { _id: 'new_' + Math.random().toString(36).slice(2, 8) });
            }),
          })),
        },
        _createCallLog: createCallLog,
      };
    }

    beforeEach(() => {
      dumpPath = testDir;
      entitiesPath = path.join(testDir, 'entities');
      fs.mkdirSync(entitiesPath, { recursive: true });

      // Create required users.json and workspaces.json
      fs.writeFileSync(path.join(dumpPath, 'users.json'), JSON.stringify([
        { _id: 'u1', username: 'john' },
      ]));
      fs.writeFileSync(path.join(dumpPath, 'workspaces.json'), JSON.stringify([
        { _id: 'w1', name: 'default' },
      ]));
    });

    it('should restore entities in dependency order', async () => {
      // product depends on product_category
      const blueprintDefs = {
        product_category: {
          identifier: 'product_category',
          relations: [],
        },
        product: {
          identifier: 'product',
          relations: [{ key: 'category', target: 'product_category' }],
        },
      };

      const catDir = path.join(entitiesPath, 'product_category');
      const prodDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(catDir);
      fs.mkdirSync(prodDir);

      fs.writeFileSync(path.join(catDir, 'page-1.json'), JSON.stringify([
        { _id: 'cat_old_1', metadata: { name: 'Electronics' } },
      ]));
      fs.writeFileSync(path.join(prodDir, 'page-1.json'), JSON.stringify([
        { _id: 'prod_old_1', metadata: { name: 'Laptop', category: 'cat_old_1' } },
      ]));

      // Note: cat_old_1 is NOT a valid ObjectID (not 24 hex chars), so it won't be remapped.
      // Let's use proper ObjectIDs:
      const catOldId = 'aabbccddeeff00112233aa01';
      const catNewId = '112233445566778899001101';
      const prodOldId = 'aabbccddeeff00112233aa02';
      const prodNewId = '112233445566778899001102';

      fs.writeFileSync(path.join(catDir, 'page-1.json'), JSON.stringify([
        { _id: catOldId, metadata: { name: 'Electronics' } },
      ]));
      fs.writeFileSync(path.join(prodDir, 'page-1.json'), JSON.stringify([
        { _id: prodOldId, metadata: { name: 'Laptop', category: catOldId } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        product_category: [{ _id: catNewId }],
        product: [{ _id: prodNewId }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['product', 'product_category'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Verify product_category was created first
      assert.strictEqual(mockSdk._createCallLog[0].blueprint, 'product_category');
      assert.strictEqual(mockSdk._createCallLog[1].blueprint, 'product');

      // Verify the product entity had its category remapped
      assert.strictEqual(mockSdk._createCallLog[1].data.metadata.category, catNewId);
    });

    it('should strip _id and identifier from entities before creating', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', identifier: 'item-slug-1', metadata: { name: 'Test' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [{ _id: 'new_id_1' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      const createdData = mockSdk._createCallLog[0].data;
      assert.strictEqual(createdData._id, undefined);
      assert.strictEqual(createdData.identifier, undefined);
      assert.strictEqual(createdData.metadata.name, 'Test');
    });

    it('should apply override to every entity', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', metadata: { name: 'A' } },
        { _id: 'aabbccddeeff001122330002', metadata: { name: 'B' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [{ _id: 'n1' }, { _id: 'n2' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: { metadata: { status: 'draft' } },
        resolveEntity: null,
      });

      assert.strictEqual(mockSdk._createCallLog[0].data.metadata.status, 'draft');
      assert.strictEqual(mockSdk._createCallLog[0].data.metadata.name, 'A');
      assert.strictEqual(mockSdk._createCallLog[1].data.metadata.status, 'draft');
    });

    it('should call resolveEntity for each entity', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', user: 'john', metadata: { name: 'Test' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [{ _id: 'n1' }],
      });

      const resolveEntity = mock.fn(async (entity) => ({
        ...entity,
        user: 'resolved_user_id',
      }));

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity,
      });

      assert.strictEqual(resolveEntity.mock.callCount(), 1);
      assert.strictEqual(mockSdk._createCallLog[0].data.user, 'resolved_user_id');
    });

    it('should handle create failures gracefully and continue', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', metadata: { name: 'Fail' } },
        { _id: 'aabbccddeeff001122330002', metadata: { name: 'Succeed' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [
          { error: 'Validation failed' },
          { _id: 'new_ok' },
        ],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Both entities were attempted
      assert.strictEqual(mockSdk._createCallLog.length, 2);
    });

    it('should skip blueprints with no entity files', async () => {
      const blueprintDefs = {
        empty_bp: { identifier: 'empty_bp', relations: [] },
      };

      // Don't create the entity directory
      const mockSdk = createMockSdk(blueprintDefs, {});

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['empty_bp'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      assert.strictEqual(mockSdk._createCallLog.length, 0);
    });

    it('should build ID map across multiple blueprints for chained relations', async () => {
      // c -> b -> a (a has no deps, b depends on a, c depends on b)
      const aOld = 'aabbccddeeff001122330001';
      const aNew = '112233445566778899001101';
      const bOld = 'aabbccddeeff001122330002';
      const bNew = '112233445566778899001102';

      const blueprintDefs = {
        a: { identifier: 'a', relations: [] },
        b: { identifier: 'b', relations: [{ key: 'ref_a', target: 'a' }] },
        c: { identifier: 'c', relations: [{ key: 'ref_b', target: 'b' }] },
      };

      for (const [name, entities] of Object.entries({
        a: [{ _id: aOld, metadata: { name: 'A1' } }],
        b: [{ _id: bOld, metadata: { name: 'B1', ref_a: aOld } }],
        c: [{ _id: 'aabbccddeeff001122330003', metadata: { name: 'C1', ref_b: bOld } }],
      })) {
        const dir = path.join(entitiesPath, name);
        fs.mkdirSync(dir);
        fs.writeFileSync(path.join(dir, 'page-1.json'), JSON.stringify(entities));
      }

      const mockSdk = createMockSdk(blueprintDefs, {
        a: [{ _id: aNew }],
        b: [{ _id: bNew }],
        c: [{ _id: '112233445566778899001103' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['c', 'b', 'a'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Restore order: a, b, c
      assert.strictEqual(mockSdk._createCallLog[0].blueprint, 'a');
      assert.strictEqual(mockSdk._createCallLog[1].blueprint, 'b');
      assert.strictEqual(mockSdk._createCallLog[2].blueprint, 'c');

      // b's ref_a should be remapped from aOld to aNew
      assert.strictEqual(mockSdk._createCallLog[1].data.metadata.ref_a, aNew);

      // c's ref_b should be remapped from bOld to bNew
      assert.strictEqual(mockSdk._createCallLog[2].data.metadata.ref_b, bNew);
    });

    it('should remap array relations across blueprints', async () => {
      const tagOld1 = 'aabbccddeeff001122330001';
      const tagOld2 = 'aabbccddeeff001122330002';
      const tagNew1 = '112233445566778899001101';
      const tagNew2 = '112233445566778899001102';

      const blueprintDefs = {
        tag: { identifier: 'tag', relations: [] },
        article: { identifier: 'article', relations: [{ key: 'tags', target: 'tag' }] },
      };

      const tagDir = path.join(entitiesPath, 'tag');
      const articleDir = path.join(entitiesPath, 'article');
      fs.mkdirSync(tagDir);
      fs.mkdirSync(articleDir);

      fs.writeFileSync(path.join(tagDir, 'page-1.json'), JSON.stringify([
        { _id: tagOld1, metadata: { name: 'JS' } },
        { _id: tagOld2, metadata: { name: 'Node' } },
      ]));
      fs.writeFileSync(path.join(articleDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330003', metadata: { title: 'Post', tags: [tagOld1, tagOld2] } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        tag: [{ _id: tagNew1 }, { _id: tagNew2 }],
        article: [{ _id: '112233445566778899001103' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['article', 'tag'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Article's tags should be remapped
      const articleCreate = mockSdk._createCallLog.find(c => c.blueprint === 'article');
      assert.deepStrictEqual(articleCreate.data.metadata.tags, [tagNew1, tagNew2]);
    });

    it('should strip _id and identifier even if override re-introduces them', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', metadata: { name: 'Test' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [{ _id: 'new_1' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: { _id: 'injected_id', identifier: 'injected_slug' },
        resolveEntity: null,
      });

      const createdData = mockSdk._createCallLog[0].data;
      assert.strictEqual(createdData._id, undefined, '_id should be stripped even after override');
      assert.strictEqual(createdData.identifier, undefined, 'identifier should be stripped even after override');
    });

    it('should handle self-referencing blueprint with intra-blueprint ID remapping', async () => {
      // category has a parent relation to itself
      // parent comes first in the file, child references parent
      const parentOld = 'aabbccddeeff001122330001';
      const childOld = 'aabbccddeeff001122330002';
      const parentNew = '112233445566778899001101';
      const childNew = '112233445566778899001102';

      const blueprintDefs = {
        category: {
          identifier: 'category',
          relations: [{ key: 'parent', target: 'category' }],
        },
      };

      const catDir = path.join(entitiesPath, 'category');
      fs.mkdirSync(catDir);
      fs.writeFileSync(path.join(catDir, 'page-1.json'), JSON.stringify([
        { _id: parentOld, metadata: { name: 'Root', parent: null } },
        { _id: childOld, metadata: { name: 'Child', parent: parentOld } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        category: [{ _id: parentNew }, { _id: childNew }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['category'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Parent was created first — child should have parent remapped
      assert.strictEqual(mockSdk._createCallLog[0].data.metadata.parent, null);
      assert.strictEqual(mockSdk._createCallLog[1].data.metadata.parent, parentNew);
    });

    it('should leave relation unmapped when self-ref child comes BEFORE parent in dump', async () => {
      // child references parent, but child appears first in the file
      const parentOld = 'aabbccddeeff001122330001';
      const childOld = 'aabbccddeeff001122330002';
      const childNew = '112233445566778899001102';
      const parentNew = '112233445566778899001101';

      const blueprintDefs = {
        category: {
          identifier: 'category',
          relations: [{ key: 'parent', target: 'category' }],
        },
      };

      const catDir = path.join(entitiesPath, 'category');
      fs.mkdirSync(catDir);
      fs.writeFileSync(path.join(catDir, 'page-1.json'), JSON.stringify([
        { _id: childOld, metadata: { name: 'Child', parent: parentOld } },
        { _id: parentOld, metadata: { name: 'Root', parent: null } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        category: [{ _id: childNew }, { _id: parentNew }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['category'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Child was created first — parent ID not yet in map, so it stays as old ID
      assert.strictEqual(mockSdk._createCallLog[0].data.metadata.parent, parentOld);
      assert.strictEqual(mockSdk._createCallLog[1].data.metadata.parent, null);
    });

    it('should not record ID mapping when entity has no _id in dump', async () => {
      const blueprintDefs = {
        dep: { identifier: 'dep', relations: [] },
        main: { identifier: 'main', relations: [{ key: 'ref', target: 'dep' }] },
      };

      const depDir = path.join(entitiesPath, 'dep');
      const mainDir = path.join(entitiesPath, 'main');
      fs.mkdirSync(depDir);
      fs.mkdirSync(mainDir);

      // dep entity has no _id field
      fs.writeFileSync(path.join(depDir, 'page-1.json'), JSON.stringify([
        { metadata: { name: 'No ID entity' } },
      ]));
      fs.writeFileSync(path.join(mainDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330002', metadata: { name: 'Main', ref: null } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        dep: [{ _id: 'new_dep_id' }],
        main: [{ _id: 'new_main_id' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['main', 'dep'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // dep entity was still created
      assert.strictEqual(mockSdk._createCallLog[0].blueprint, 'dep');
      // but no mapping exists — downstream refs won't be remapped
      assert.strictEqual(mockSdk._createCallLog.length, 2);
    });

    it('should not record ID mapping when API response has no _id', async () => {
      const depOld = 'aabbccddeeff001122330001';

      const blueprintDefs = {
        dep: { identifier: 'dep', relations: [] },
        main: { identifier: 'main', relations: [{ key: 'ref', target: 'dep' }] },
      };

      const depDir = path.join(entitiesPath, 'dep');
      const mainDir = path.join(entitiesPath, 'main');
      fs.mkdirSync(depDir);
      fs.mkdirSync(mainDir);

      fs.writeFileSync(path.join(depDir, 'page-1.json'), JSON.stringify([
        { _id: depOld, metadata: { name: 'Dep' } },
      ]));
      fs.writeFileSync(path.join(mainDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330002', metadata: { name: 'Main', ref: depOld } },
      ]));

      // API returns response without _id for dep
      const mockSdk = createMockSdk(blueprintDefs, {
        dep: [{ status: 'created' }], // no _id in response
        main: [{ _id: 'new_main_id' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['main', 'dep'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // dep's old ID stays unmapped — main's ref should keep the old value
      const mainCreate = mockSdk._createCallLog.find(c => c.blueprint === 'main');
      assert.strictEqual(mainCreate.data.metadata.ref, depOld);
    });

    it('should handle blueprint in dump that has no definition in target env', async () => {
      // 'unknown_bp' is in the dump but not in target env blueprints
      const blueprintDefs = {
        // empty — no blueprints in target env
      };

      const bpDir = path.join(entitiesPath, 'unknown_bp');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', metadata: { name: 'Orphan' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        unknown_bp: [{ _id: 'new_1' }],
      });

      // Should not throw — just treats it as having no relations
      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['unknown_bp'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      assert.strictEqual(mockSdk._createCallLog.length, 1);
      assert.strictEqual(mockSdk._createCallLog[0].data.metadata.name, 'Orphan');
    });

    it('should leave downstream relations stale when all upstream entities fail', async () => {
      const depOld = 'aabbccddeeff001122330001';

      const blueprintDefs = {
        dep: { identifier: 'dep', relations: [] },
        main: { identifier: 'main', relations: [{ key: 'ref', target: 'dep' }] },
      };

      const depDir = path.join(entitiesPath, 'dep');
      const mainDir = path.join(entitiesPath, 'main');
      fs.mkdirSync(depDir);
      fs.mkdirSync(mainDir);

      fs.writeFileSync(path.join(depDir, 'page-1.json'), JSON.stringify([
        { _id: depOld, metadata: { name: 'Will Fail' } },
      ]));
      fs.writeFileSync(path.join(mainDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330002', metadata: { name: 'Main', ref: depOld } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        dep: [{ error: 'Server error' }],
        main: [{ _id: 'new_main' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['main', 'dep'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // dep failed, so its old ID is NOT in the map
      // main's ref should stay as the old unmapped ID
      const mainCreate = mockSdk._createCallLog.find(c => c.blueprint === 'main');
      assert.strictEqual(mainCreate.data.metadata.ref, depOld);
    });

    it('should handle 3-node circular dependency (A -> B -> C -> A)', async () => {
      const blueprintDefs = {
        a: { identifier: 'a', relations: [{ key: 'ref_c', target: 'c' }] },
        b: { identifier: 'b', relations: [{ key: 'ref_a', target: 'a' }] },
        c: { identifier: 'c', relations: [{ key: 'ref_b', target: 'b' }] },
      };

      for (const name of ['a', 'b', 'c']) {
        const dir = path.join(entitiesPath, name);
        fs.mkdirSync(dir);
        fs.writeFileSync(path.join(dir, 'page-1.json'), JSON.stringify([
          { _id: `aabbccddeeff00112233000${name.charCodeAt(0)}`, metadata: { name: name.toUpperCase() } },
        ]));
      }

      const mockSdk = createMockSdk(blueprintDefs, {
        a: [{ _id: 'new_a' }],
        b: [{ _id: 'new_b' }],
        c: [{ _id: 'new_c' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['a', 'b', 'c'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // All three should still be created despite circular deps
      assert.strictEqual(mockSdk._createCallLog.length, 3);
    });

    it('should exit when users.json is missing', async () => {
      fs.unlinkSync(path.join(dumpPath, 'users.json'));

      const exitMock = mock.method(process, 'exit', () => { throw new Error('EXIT'); });
      const mockSdk = createMockSdk({}, {});

      await assert.rejects(
        () => cloneRestore.cloneRestoreBlueprints(mockSdk, {
          blueprintNames: ['item'],
          entitiesBasePath: entitiesPath,
          dumpPath,
          includePatterns: null,
          excludePatterns: null,
          override: null,
          resolveEntity: null,
        }),
        { message: 'EXIT' }
      );

      assert.strictEqual(exitMock.mock.callCount(), 1);
      assert.strictEqual(exitMock.mock.calls[0].arguments[0], 1);
    });

    it('should exit when workspaces.json is missing and entities have workspace property', async () => {
      fs.unlinkSync(path.join(dumpPath, 'workspaces.json'));

      // Create entity with workspace property so the check triggers
      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir, { recursive: true });
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', workspace: 'default', metadata: { name: 'Test' } },
      ]));

      const exitMock = mock.method(process, 'exit', () => { throw new Error('EXIT'); });
      const mockSdk = createMockSdk({}, {});

      await assert.rejects(
        () => cloneRestore.cloneRestoreBlueprints(mockSdk, {
          blueprintNames: ['item'],
          entitiesBasePath: entitiesPath,
          dumpPath,
          includePatterns: null,
          excludePatterns: null,
          override: null,
          resolveEntity: null,
        }),
        { message: 'EXIT' }
      );

      assert.strictEqual(exitMock.mock.callCount(), 1);
      assert.strictEqual(exitMock.mock.calls[0].arguments[0], 1);
    });

    it('should not exit when workspaces.json is missing and entities have no workspace property', async () => {
      fs.unlinkSync(path.join(dumpPath, 'workspaces.json'));

      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir, { recursive: true });
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', user: 'john', metadata: { name: 'Test' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [{ _id: 'new_1' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Should have created the entity successfully
      assert.strictEqual(mockSdk._createCallLog.length, 1);
      assert.strictEqual(mockSdk._createCallLog[0].data.user, 'john');
    });

    it('should handle empty entity array in dump file', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([]));

      const mockSdk = createMockSdk(blueprintDefs, {});

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      assert.strictEqual(mockSdk._createCallLog.length, 0);
    });

    it('should apply include AND exclude patterns together', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'active.page-1.json'), JSON.stringify([{ _id: 'a1' }]));
      fs.writeFileSync(path.join(itemDir, 'active.page-2.json'), JSON.stringify([{ _id: 'a2' }]));
      fs.writeFileSync(path.join(itemDir, 'archived.page-1.json'), JSON.stringify([{ _id: 'a3' }]));
      fs.writeFileSync(path.join(itemDir, 'draft.page-1.json'), JSON.stringify([{ _id: 'a4' }]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [{ _id: 'n1' }, { _id: 'n2' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: ['active', 'draft'],  // includes active.page-1, active.page-2, draft.page-1
        excludePatterns: ['page-2'],            // excludes active.page-2
        override: null,
        resolveEntity: null,
      });

      // Should have active.page-1 and draft.page-1 = 2 entities
      assert.strictEqual(mockSdk._createCallLog.length, 2);
    });

    it('should not remap relation values that are objects instead of string IDs', async () => {
      const blueprintDefs = {
        dep: { identifier: 'dep', relations: [] },
        main: {
          identifier: 'main',
          relations: [{ key: 'ref', target: 'dep' }],
        },
      };

      const depDir = path.join(entitiesPath, 'dep');
      const mainDir = path.join(entitiesPath, 'main');
      fs.mkdirSync(depDir);
      fs.mkdirSync(mainDir);

      const expandedRef = { _id: 'aabbccddeeff001122330001', name: 'Expanded' };
      fs.writeFileSync(path.join(depDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', metadata: { name: 'Dep' } },
      ]));
      fs.writeFileSync(path.join(mainDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330002', metadata: { name: 'Main', ref: expandedRef } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        dep: [{ _id: 'new_dep' }],
        main: [{ _id: 'new_main' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['main', 'dep'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Expanded object refs are NOT remapped (not a string, not an ObjectID)
      const mainCreate = mockSdk._createCallLog.find(c => c.blueprint === 'main');
      assert.deepStrictEqual(mainCreate.data.metadata.ref, expandedRef);
    });

    it('should handle multiple blueprints sharing the same dependency', async () => {
      // Both 'order' and 'review' depend on 'customer'
      const custOld = 'aabbccddeeff001122330001';
      const custNew = '112233445566778899001101';

      const blueprintDefs = {
        customer: { identifier: 'customer', relations: [] },
        order: { identifier: 'order', relations: [{ key: 'customer', target: 'customer' }] },
        review: { identifier: 'review', relations: [{ key: 'customer', target: 'customer' }] },
      };

      for (const [name, entities] of Object.entries({
        customer: [{ _id: custOld, metadata: { name: 'John' } }],
        order: [{ _id: 'aabbccddeeff001122330002', metadata: { title: 'Order 1', customer: custOld } }],
        review: [{ _id: 'aabbccddeeff001122330003', metadata: { title: 'Review 1', customer: custOld } }],
      })) {
        const dir = path.join(entitiesPath, name);
        fs.mkdirSync(dir);
        fs.writeFileSync(path.join(dir, 'page-1.json'), JSON.stringify(entities));
      }

      const mockSdk = createMockSdk(blueprintDefs, {
        customer: [{ _id: custNew }],
        order: [{ _id: 'new_order' }],
        review: [{ _id: 'new_review' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['order', 'review', 'customer'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // Customer should be created first
      assert.strictEqual(mockSdk._createCallLog[0].blueprint, 'customer');

      // Both order and review should have customer remapped to new ID
      const orderCreate = mockSdk._createCallLog.find(c => c.blueprint === 'order');
      const reviewCreate = mockSdk._createCallLog.find(c => c.blueprint === 'review');
      assert.strictEqual(orderCreate.data.metadata.customer, custNew);
      assert.strictEqual(reviewCreate.data.metadata.customer, custNew);
    });

    it('should preserve non-relation metadata fields untouched', async () => {
      const blueprintDefs = {
        item: {
          identifier: 'item',
          relations: [{ key: 'category', target: 'category' }],
        },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        {
          _id: 'aabbccddeeff001122330001',
          user: 'john',
          workspace: 'default',
          metadata: {
            name: 'Test Item',
            description: 'A description',
            count: 42,
            active: true,
            tags_plain: ['foo', 'bar'],
            nested: { deep: 'value' },
            category: null,
          },
        },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [{ _id: 'new_1' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      const data = mockSdk._createCallLog[0].data;
      assert.strictEqual(data.user, 'john');
      assert.strictEqual(data.workspace, 'default');
      assert.strictEqual(data.metadata.name, 'Test Item');
      assert.strictEqual(data.metadata.description, 'A description');
      assert.strictEqual(data.metadata.count, 42);
      assert.strictEqual(data.metadata.active, true);
      assert.deepStrictEqual(data.metadata.tags_plain, ['foo', 'bar']);
      assert.deepStrictEqual(data.metadata.nested, { deep: 'value' });
    });

    it('should handle many entities across multiple pages for one blueprint', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);

      // 3 page files with different entities
      const page1 = Array.from({ length: 5 }, (_, i) => ({
        _id: `aabbccddeeff00112233${String(i).padStart(4, '0')}`,
        metadata: { name: `Item ${i}` },
      }));
      const page2 = Array.from({ length: 3 }, (_, i) => ({
        _id: `aabbccddeeff00112233${String(i + 5).padStart(4, '0')}`,
        metadata: { name: `Item ${i + 5}` },
      }));
      const page3 = Array.from({ length: 2 }, (_, i) => ({
        _id: `aabbccddeeff00112233${String(i + 8).padStart(4, '0')}`,
        metadata: { name: `Item ${i + 8}` },
      }));

      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify(page1));
      fs.writeFileSync(path.join(itemDir, 'page-2.json'), JSON.stringify(page2));
      fs.writeFileSync(path.join(itemDir, 'page-3.json'), JSON.stringify(page3));

      const createResults = { item: Array.from({ length: 10 }, (_, i) => ({ _id: `new_${i}` })) };
      const mockSdk = createMockSdk(blueprintDefs, createResults);

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      assert.strictEqual(mockSdk._createCallLog.length, 10);
    });

    it('should continue processing remaining entities when resolveEntity throws for one', async () => {
      const blueprintDefs = {
        item: { identifier: 'item', relations: [] },
      };

      const itemDir = path.join(entitiesPath, 'item');
      fs.mkdirSync(itemDir);
      fs.writeFileSync(path.join(itemDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', user: 'bad_user', metadata: { name: 'Fail resolve' } },
        { _id: 'aabbccddeeff001122330002', user: 'good_user', metadata: { name: 'Succeed' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        item: [{ _id: 'new_2' }],
      });

      let callCount = 0;
      const resolveEntity = async (entity) => {
        callCount++;
        if (entity.user === 'bad_user') {
          throw new Error('User lookup failed');
        }
        return entity;
      };

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['item'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity,
      });

      // resolveEntity was called for both
      assert.strictEqual(callCount, 2);
      // Only the second entity should have been created (first threw during resolve,
      // which propagates to the create try-catch)
      assert.strictEqual(mockSdk._createCallLog.length, 1);
      assert.strictEqual(mockSdk._createCallLog[0].data.metadata.name, 'Succeed');
    });

    it('should handle entity with undefined metadata relation key gracefully', async () => {
      // Blueprint declares a relation for key 'category', but entity metadata has no such key
      const blueprintDefs = {
        product: {
          identifier: 'product',
          relations: [{ key: 'category', target: 'cat' }],
        },
      };

      const prodDir = path.join(entitiesPath, 'product');
      fs.mkdirSync(prodDir);
      fs.writeFileSync(path.join(prodDir, 'page-1.json'), JSON.stringify([
        { _id: 'aabbccddeeff001122330001', metadata: { name: 'No category field' } },
      ]));

      const mockSdk = createMockSdk(blueprintDefs, {
        product: [{ _id: 'new_1' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['product'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      assert.strictEqual(mockSdk._createCallLog.length, 1);
      assert.strictEqual(mockSdk._createCallLog[0].data.metadata.category, undefined);
    });

    it('should handle partial circular deps with non-circular nodes sorted correctly', async () => {
      // independent has no deps, a <-> b are circular
      const blueprintDefs = {
        independent: { identifier: 'independent', relations: [] },
        a: { identifier: 'a', relations: [{ key: 'ref_b', target: 'b' }] },
        b: { identifier: 'b', relations: [{ key: 'ref_a', target: 'a' }] },
        depends_on_independent: {
          identifier: 'depends_on_independent',
          relations: [{ key: 'ref', target: 'independent' }],
        },
      };

      for (const name of ['independent', 'a', 'b', 'depends_on_independent']) {
        const dir = path.join(entitiesPath, name);
        fs.mkdirSync(dir);
        fs.writeFileSync(path.join(dir, 'page-1.json'), JSON.stringify([
          { _id: `aabbccddeeff00112233000${name.length}`, metadata: { name } },
        ]));
      }

      const mockSdk = createMockSdk(blueprintDefs, {
        independent: [{ _id: 'new_ind' }],
        a: [{ _id: 'new_a' }],
        b: [{ _id: 'new_b' }],
        depends_on_independent: [{ _id: 'new_doi' }],
      });

      await cloneRestore.cloneRestoreBlueprints(mockSdk, {
        blueprintNames: ['a', 'b', 'independent', 'depends_on_independent'],
        entitiesBasePath: entitiesPath,
        dumpPath,
        includePatterns: null,
        excludePatterns: null,
        override: null,
        resolveEntity: null,
      });

      // All 4 created
      assert.strictEqual(mockSdk._createCallLog.length, 4);

      // independent should come before depends_on_independent
      const names = mockSdk._createCallLog.map(c => c.blueprint);
      assert.ok(
        names.indexOf('independent') < names.indexOf('depends_on_independent'),
        'independent should be restored before depends_on_independent'
      );

      // a and b (circular) should come after non-circular nodes
      const indIdx = names.indexOf('independent');
      const doiIdx = names.indexOf('depends_on_independent');
      const aIdx = names.indexOf('a');
      const bIdx = names.indexOf('b');
      // The non-circular pair (independent, depends_on_independent) should be sorted before circular pair
      assert.ok(indIdx < aIdx || indIdx < bIdx, 'non-circular nodes should generally sort before circular ones');
    });
  });

  describe('remapRelations edge cases', () => {
    it('should handle empty array relation', () => {
      const entity = { metadata: { tags: [] } };
      const relations = [{ key: 'tags', target: 'tag' }];
      const idMap = new Map([['aabbccddeeff00112233aabb', 'new_id']]);

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.deepStrictEqual(result.metadata.tags, []);
    });

    it('should handle undefined metadata value for relation key', () => {
      const entity = { metadata: { name: 'test' } };
      const relations = [{ key: 'missing_key', target: 'bp' }];
      const idMap = new Map();

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.missing_key, undefined);
    });

    it('should handle array with non-string values', () => {
      const entity = { metadata: { refs: [123, null, true, 'aabbccddeeff00112233aabb'] } };
      const relations = [{ key: 'refs', target: 'other' }];
      const idMap = new Map([['aabbccddeeff00112233aabb', 'new_id']]);

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.refs[0], 123);
      assert.strictEqual(result.metadata.refs[1], null);
      assert.strictEqual(result.metadata.refs[2], true);
      assert.strictEqual(result.metadata.refs[3], 'new_id');
    });

    it('should not mutate the original array in array relations', () => {
      const oldId = 'aabbccddeeff00112233aabb';
      const original = [oldId];
      const entity = { metadata: { tags: original } };
      const relations = [{ key: 'tags', target: 'tag' }];
      const idMap = new Map([[oldId, 'new_id']]);

      cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(original[0], oldId, 'original array should not be mutated');
    });

    it('should handle relation value that is a number', () => {
      const entity = { metadata: { category: 12345 } };
      const relations = [{ key: 'category', target: 'cat' }];
      const idMap = new Map();

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.category, 12345);
    });

    it('should handle relation value that is a boolean', () => {
      const entity = { metadata: { ref: false } };
      const relations = [{ key: 'ref', target: 'other' }];
      const idMap = new Map();

      const result = cloneRestore.remapRelations(entity, relations, idMap);
      assert.strictEqual(result.metadata.ref, false);
    });
  });

  describe('readBlueprintEntities edge cases', () => {
    let entitiesPath;

    beforeEach(() => {
      entitiesPath = path.join(testDir, 'entities');
      fs.mkdirSync(entitiesPath, { recursive: true });
    });

    it('should apply both include and exclude patterns together', () => {
      const bpDir = path.join(entitiesPath, 'bp');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'active.page-1.json'), JSON.stringify([{ _id: '1' }]));
      fs.writeFileSync(path.join(bpDir, 'active.page-2.json'), JSON.stringify([{ _id: '2' }]));
      fs.writeFileSync(path.join(bpDir, 'archived.page-1.json'), JSON.stringify([{ _id: '3' }]));

      const result = cloneRestore.readBlueprintEntities(
        entitiesPath, 'bp',
        ['active'],       // include only 'active' files
        ['page-2']        // exclude 'page-2' files
      );
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]._id, '1');
    });

    it('should handle empty JSON array file', () => {
      const bpDir = path.join(entitiesPath, 'bp');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'page-1.json'), JSON.stringify([]));

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'bp', null, null);
      assert.strictEqual(result.length, 0);
    });

    it('should handle entity with no properties', () => {
      const bpDir = path.join(entitiesPath, 'bp');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'page-1.json'), JSON.stringify([{}]));

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'bp', null, null);
      assert.strictEqual(result.length, 1);
      assert.strictEqual(result[0]._sourceFile, 'page-1.json');
    });

    it('should handle directory with only non-JSON files', () => {
      const bpDir = path.join(entitiesPath, 'bp');
      fs.mkdirSync(bpDir);
      fs.writeFileSync(path.join(bpDir, 'notes.txt'), 'not json');
      fs.writeFileSync(path.join(bpDir, 'readme.md'), '# Hi');

      const result = cloneRestore.readBlueprintEntities(entitiesPath, 'bp', null, null);
      assert.strictEqual(result.length, 0);
    });
  });

  describe('buildDependencyOrder edge cases', () => {
    it('should handle single blueprint with no relations', () => {
      const result = cloneRestore.buildDependencyOrder(['solo'], {});
      assert.deepStrictEqual(result, ['solo']);
    });

    it('should handle empty blueprint list', () => {
      const result = cloneRestore.buildDependencyOrder([], {});
      assert.deepStrictEqual(result, []);
    });

    it('should handle duplicate relations to same target', () => {
      const relationsMap = {
        bp: [
          { key: 'ref1', target: 'dep' },
          { key: 'ref2', target: 'dep' },
        ],
        dep: [],
      };
      const result = cloneRestore.buildDependencyOrder(['bp', 'dep'], relationsMap);
      assert.strictEqual(result.indexOf('dep'), 0);
      assert.strictEqual(result.indexOf('bp'), 1);
    });

    it('should handle large graph with many levels', () => {
      // 10-level chain: l0 <- l1 <- l2 <- ... <- l9
      const names = Array.from({ length: 10 }, (_, i) => `l${i}`);
      const relationsMap = {};
      for (let i = 0; i < 10; i++) {
        relationsMap[`l${i}`] = i > 0 ? [{ key: 'ref', target: `l${i - 1}` }] : [];
      }

      const result = cloneRestore.buildDependencyOrder(names.reverse(), relationsMap);
      // l0 should come first, l9 should come last
      assert.strictEqual(result[0], 'l0');
      assert.strictEqual(result[9], 'l9');
      // Each level should come before the next
      for (let i = 0; i < 9; i++) {
        assert.ok(
          result.indexOf(`l${i}`) < result.indexOf(`l${i + 1}`),
          `l${i} should come before l${i + 1}`
        );
      }
    });
  });
});
