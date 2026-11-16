import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  buildIdentifier,
  filterItems,
  findItem,
  importPathOf,
  isValidIdentifier,
  normalizeIdentifier,
  summarizeItem,
  typeOf,
  type ScriptItem,
} from '../scripts-tools.service';

const items: ScriptItem[] = [
  { _id: '1', type: 'component', identifier: 'hero', componentName: 'Hero', description: 'Landing hero' },
  { _id: '2', type: 'component', identifier: 'products/ProductCard', componentName: 'ProductCard', description: 'Shows a product', requiredProps: [{ prop: 'product', type: 'object' }] },
  { _id: '3', type: 'script', identifier: 'utils/format-price', description: 'Formats prices' },
  { _id: '4', type: 'script', identifier: 'products/helpers', description: 'Product helpers' },
];

describe('scripts tools helpers', () => {
  it('normalizes identifiers: no extension and no surrounding slashes', () => {
    assert.strictEqual(normalizeIdentifier('/utils//Demo.ts'), 'utils/Demo');
    assert.strictEqual(normalizeIdentifier('./utils/demo.mjs'), 'utils/demo');
    assert.strictEqual(normalizeIdentifier('products/Card.vue'), 'products/Card');
    assert.strictEqual(normalizeIdentifier('utils\\demo'), 'utils/demo');
  });

  it('validates identifiers as paths', () => {
    assert.ok(isValidIdentifier('products/ProductCard'));
    assert.ok(!isValidIdentifier(''));
    assert.ok(!isValidIdentifier('a b'));
    assert.ok(!isValidIdentifier('../x'));
  });

  it('builds identifiers from an optional folder and a name', () => {
    assert.strictEqual(buildIdentifier('Card', 'products'), 'products/Card');
    assert.strictEqual(buildIdentifier('Card'), 'Card');
    assert.strictEqual(buildIdentifier('format-price', '/utils/'), 'utils/format-price');
  });

  it('gives the import path of a script', () => {
    assert.strictEqual(importPathOf('utils/format-price'), './utils/format-price.ts');
  });

  it('infers the type of legacy items without one', () => {
    assert.strictEqual(typeOf({ identifier: 'a', componentName: 'A' }), 'component');
    assert.strictEqual(typeOf({ identifier: 'a' }), 'script');
  });

  it('summarizes scripts with an import path and components with props, without source', () => {
    assert.deepStrictEqual(summarizeItem({ ...items[2], content: 'secret' }), {
      id: '3', type: 'script', identifier: 'utils/format-price', name: 'utils/format-price', description: 'Formats prices', import: './utils/format-price.ts',
    });
    const component = summarizeItem(items[1]) as any;
    assert.strictEqual(component.type, 'component');
    assert.deepStrictEqual(component.props, [{ prop: 'product', type: 'object' }]);
    assert.ok(!('content' in component));
  });

  it('filters by type, folder and query', () => {
    assert.deepStrictEqual(filterItems(items, { type: 'script' }).map(i => i._id), ['3', '4']);
    assert.deepStrictEqual(filterItems(items, { folder: 'products' }).map(i => i._id), ['2', '4']);
    assert.deepStrictEqual(filterItems(items, { folder: 'prod' }).map(i => i._id), [], 'a folder matches whole segments only');
    assert.deepStrictEqual(filterItems(items, { query: 'price' }).map(i => i._id), ['3']);
    assert.deepStrictEqual(filterItems(items, { query: 'product card' }).map(i => i._id), ['2', '4'], 'camelCase names split into words');
    assert.strictEqual(filterItems(items, {}).length, 4);
  });

  it('finds an item by identifier, extension-less or not, by name, or by a unique file name', () => {
    assert.strictEqual(findItem(items, 'utils/format-price.ts')?._id, '3');
    assert.strictEqual(findItem(items, '/products/ProductCard.vue')?._id, '2');
    assert.strictEqual(findItem(items, 'productcard')?._id, '2');
    assert.strictEqual(findItem(items, 'format-price')?._id, '3');
    assert.strictEqual(findItem(items, 'missing'), undefined);
    assert.strictEqual(findItem(items, ''), undefined);
  });

  it('does not guess between files with the same name in different folders', () => {
    const dupes: ScriptItem[] = [
      { _id: 'a', identifier: 'a/utils' },
      { _id: 'b', identifier: 'b/utils' },
    ];
    assert.strictEqual(findItem(dupes, 'utils'), undefined);
    assert.strictEqual(findItem(dupes, 'b/utils')?._id, 'b');
  });
});

describe('no-code tools', () => {
  it('exposes well-formed tool schemas for components and scripts', async () => {
    const calling = await import('../function-callings/no-code.calling');
    const tools = [
      calling.getComponentsCalling,
      calling.searchComponentsCalling,
      calling.getScriptCalling,
      calling.createScriptCalling,
      calling.createComponentCalling,
      calling.editComponentCalling,
    ];
    assert.deepStrictEqual(
      tools.map(tool => tool.name),
      ['getComponents', 'searchComponents', 'getScript', 'createScript', 'createComponent', 'editComponent'],
    );
    for (const tool of tools) {
      assert.strictEqual(tool.function.name, tool.name);
      assert.deepStrictEqual(tool.function.parameters, tool.parameters);
      assert.strictEqual(typeof tool.handler, 'function');
      for (const key of Object.keys(tool.parameters.properties)) {
        assert.match(key, /^[a-zA-Z0-9_.-]{1,64}$/, `"${key}" in ${tool.name}`);
      }
      for (const required of tool.parameters.required) {
        assert.ok(required in tool.parameters.properties, `${tool.name} requires unknown "${required}"`);
      }
    }
  });
});
