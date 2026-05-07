const { describe, it, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

async function loadGenerateRulesModule() {
  const rulesPath = path.join(__dirname, '..', '..', 'services', 'generate', 'rules.mjs');
  return import(pathToFileURL(rulesPath).href);
}

describe('generate rules service', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qelos-gen-rules-'));
  });

  afterEach(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('generates qelos-resources.md with SDK documentation without pulled resources', async () => {
    const { generateRules } = await loadGenerateRulesModule();
    const result = await generateRules('windsurf', tmpDir);
    assert.strictEqual(result.success, true);
    const qelosPath = path.join(tmpDir, '.windsurf', 'rules', 'qelos-resources.md');
    assert.ok(fs.existsSync(qelosPath), 'qelos-resources.md should exist');
    const body = fs.readFileSync(qelosPath, 'utf-8');
    assert.ok(body.includes('@qelos/sdk'), 'documents SDK package');
    assert.ok(body.includes('sdk.entities'), 'documents entity entrypoint');
    assert.ok(body.includes('sdk.authentication'), 'documents authentication');
    assert.strictEqual(result.primaryRelativePath, '.windsurf/rules/qelos-resources.md');
    assert.ok(result.summary);
    assert.strictEqual(result.summary.components, 0);
    assert.strictEqual(result.summary.blocks, 0);
    assert.strictEqual(result.summary.blueprints, 0);
  });

  it('lists pulled blueprint identifiers in qelos-resources.md', async () => {
    const blueprintsDir = path.join(tmpDir, 'blueprints');
    fs.mkdirSync(blueprintsDir, { recursive: true });
    fs.writeFileSync(
      path.join(blueprintsDir, 'widget.blueprint.json'),
      JSON.stringify({
        identifier: 'widget',
        name: 'Widget',
        entityIdentifierMechanism: 'objectid',
        properties: {},
        relations: [],
        dispatchers: {},
      }),
      'utf-8',
    );

    const { generateRules } = await loadGenerateRulesModule();
    const result = await generateRules('windsurf', tmpDir);
    assert.strictEqual(result.success, true);
    const qelosPath = path.join(tmpDir, '.windsurf', 'rules', 'qelos-resources.md');
    const body = fs.readFileSync(qelosPath, 'utf-8');
    assert.ok(body.includes('widget'), 'mentions pulled blueprint identifier');
    assert.strictEqual(result.summary.blueprints, 1);
  });

  it('formatIncludesSummary lists only non-zero resource counts plus SDK reference', async () => {
    const { formatIncludesSummary } = await loadGenerateRulesModule();
    assert.strictEqual(
      formatIncludesSummary({ components: 3, blocks: 2, blueprints: 5 }),
      '3 components, 2 blocks, 5 blueprints, SDK reference',
    );
    assert.strictEqual(
      formatIncludesSummary({ components: 0, blocks: 0, blueprints: 1 }),
      '1 blueprint, SDK reference',
    );
    assert.strictEqual(formatIncludesSummary({ components: 0, blocks: 0, blueprints: 0 }), 'SDK reference');
  });
});
