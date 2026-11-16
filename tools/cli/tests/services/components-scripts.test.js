const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

describe('components folder: vue + js/ts scripts', () => {
  let dir;
  let mod;
  let hardPush;

  beforeEach(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'components-scripts-test-'));
    mod = await import('../../services/resources/components.mjs');
    hardPush = await import('../../services/utils/hard-push.mjs');
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  const write = (rel, content = 'export const a = 1') => {
    const full = path.join(dir, rel);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  };

  const okBulk = (capture) => async items => {
    capture.items = items;
    return { total: items.length, succeeded: items.length, failed: 0, results: items.map(i => ({ identifier: i.identifier, success: true })) };
  };

  it('derives identifiers without the extension', () => {
    assert.strictEqual(mod.identifierFromFile('utils/demo.ts'), 'utils/demo');
    assert.strictEqual(mod.identifierFromFile('cards/Card.vue'), 'cards/Card');
    assert.strictEqual(mod.identifierFromFile('utils\\b.mts'), 'utils/b');
  });

  it('lists .vue and js/ts files recursively, skipping declarations, json and node_modules', () => {
    write('Card.vue', '<template><div/></template>');
    write('utils/demo.ts');
    write('utils/more.js');
    write('types.d.ts');
    write('components.json', '{}');
    write('node_modules/x/index.js');
    const found = mod.listVueFilesRecursively(dir).map(f => path.relative(dir, f)).sort();
    assert.deepStrictEqual(found, ['Card.vue', path.join('utils', 'demo.ts'), path.join('utils', 'more.js')]);
  });

  it('pushes components and scripts together through the unified api', async () => {
    write('Card.vue', '<template><div/></template>');
    write('utils/demo.ts');
    write('components.json', JSON.stringify({ 'utils/demo': { description: 'helpers' } }));
    const capture = {};
    await mod.pushComponents({ scripts: { bulkCreateOrUpdate: okBulk(capture) } }, dir);

    const byId = Object.fromEntries(capture.items.map(i => [i.identifier, i]));
    assert.strictEqual(byId['Card'].type, 'component');
    assert.strictEqual(byId['Card'].componentName, 'Card');
    assert.strictEqual(byId['utils/demo'].type, 'script');
    assert.strictEqual(byId['utils/demo'].description, 'helpers');
  });

  it('pushes a single script file with a target file', async () => {
    write('a.ts');
    write('b.ts');
    const capture = {};
    await mod.pushComponents({ scripts: { bulkCreateOrUpdate: okBulk(capture) } }, dir, { targetFile: 'b.ts' });
    assert.deepStrictEqual(capture.items.map(i => i.identifier), ['b']);
  });

  it('fails when the server reports failures', async () => {
    write('a.ts');
    const sdk = { scripts: { bulkCreateOrUpdate: async () => ({ total: 1, succeeded: 0, failed: 1, results: [{ identifier: 'a', success: false, error: 'bad' }] }) } };
    await assert.rejects(mod.pushComponents(sdk, dir), /Failed to push 1 file/);
  });

  it('with an older sdk, pushes components only and skips scripts', async () => {
    write('Card.vue', '<template><div/></template>');
    write('utils/demo.ts');
    const created = [];
    const sdk = { components: { getList: async () => [], create: async c => { created.push(c.identifier); } } };
    await mod.pushComponents(sdk, dir);
    assert.deepStrictEqual(created, ['Card']);
  });

  it('pulls components as .vue and scripts as nested .ts, keyed in components.json', async () => {
    const sdk = { scripts: {
      getList: async () => [
        { _id: '1', type: 'component', identifier: 'Card', componentName: 'Card' },
        { _id: '2', type: 'script', identifier: 'utils/demo' },
        { _id: '3', type: 'script', identifier: '../evil' },
      ],
      getScript: async id => ({ content: `// ${id}`, description: 'd' }),
    } };
    await mod.pullComponents(sdk, dir);
    assert.strictEqual(fs.readFileSync(path.join(dir, 'Card.vue'), 'utf-8'), '// 1');
    assert.strictEqual(fs.readFileSync(path.join(dir, 'utils/demo.ts'), 'utf-8'), '// 2');
    assert.ok(!fs.existsSync(path.join(dir, '..', 'evil.ts')));
    const meta = JSON.parse(fs.readFileSync(path.join(dir, 'components.json'), 'utf-8'));
    assert.deepStrictEqual(Object.keys(meta).sort(), ['Card', 'utils/demo']);
  });

  it('hard push sees nested files and scripts as local', () => {
    write('Card.vue', '<template><div/></template>');
    write('utils/demo.ts');
    const ids = hardPush.getLocalFiles(dir, 'components').map(f => hardPush.getIdentifierFromFile(f, 'components')).sort();
    assert.deepStrictEqual(ids, ['Card', 'utils/demo']);
  });

  it('hard push removes remote scripts by identifier through the unified api', async () => {
    const removed = [];
    const sdk = { scripts: { getList: async () => [{ _id: '9', identifier: 'utils/old', type: 'script' }], remove: async id => { removed.push(id); } } };
    await hardPush.removeResources(sdk, [{ type: 'components', identifier: 'utils/old' }]);
    assert.deepStrictEqual(removed, ['9']);
  });
});
