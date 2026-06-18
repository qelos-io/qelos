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

  it('generates pricing-plans.md for windsurf when pricing-plan files are present', async () => {
    const plansDir = path.join(tmpDir, 'pricing-plans');
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(
      path.join(plansDir, 'pro.pricing-plan.json'),
      JSON.stringify({ _id: 'plan-id-1', name: 'Pro', monthlyPrice: 29, yearlyPrice: 290, currency: 'USD', isActive: true, dynamic: false }),
      'utf-8',
    );

    const { generateRules } = await loadGenerateRulesModule();
    const result = await generateRules('windsurf', tmpDir);
    assert.strictEqual(result.success, true);

    const pricingPlansPath = path.join(tmpDir, '.windsurf', 'rules', 'pricing-plans.md');
    assert.ok(fs.existsSync(pricingPlansPath), 'pricing-plans.md should be created');

    const body = fs.readFileSync(pricingPlansPath, 'utf-8');
    assert.ok(body.includes('Pricing Plans'), 'mentions Pricing Plans heading');
    assert.ok(body.includes('pricing-plans/**/*.pricing-plan.json'), 'includes glob pattern');
    assert.ok(body.includes('IPlan'), 'includes TypeScript interface');
    assert.ok(body.includes('qelos pull pricing-plans'), 'includes pull CLI example');
    assert.ok(body.includes('qelos push pricing-plans'), 'includes push CLI example');
    assert.ok(body.includes('sdk.managePayments'), 'includes SDK usage');
    assert.ok(body.includes('Pro'), 'includes pulled plan name');
  });

  it('includes pulled pricing plan data in the plans table', async () => {
    const plansDir = path.join(tmpDir, 'pricing-plans');
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(
      path.join(plansDir, 'starter.pricing-plan.json'),
      JSON.stringify({ _id: 'plan-id-2', name: 'Starter', monthlyPrice: 9, yearlyPrice: 90, currency: 'USD', isActive: true, dynamic: false }),
      'utf-8',
    );
    fs.writeFileSync(
      path.join(plansDir, 'enterprise.pricing-plan.json'),
      JSON.stringify({ _id: 'plan-id-3', name: 'Enterprise', dynamic: true }),
      'utf-8',
    );

    const { generateRules } = await loadGenerateRulesModule();
    await generateRules('windsurf', tmpDir);

    const body = fs.readFileSync(path.join(tmpDir, '.windsurf', 'rules', 'pricing-plans.md'), 'utf-8');
    assert.ok(body.includes('Starter'), 'table includes Starter plan');
    assert.ok(body.includes('Enterprise'), 'table includes Enterprise plan');
    assert.ok(body.includes('| 9 |'), 'table includes monthly price');
    assert.ok(body.includes('true'), 'table includes dynamic flag');
  });

  it('does not generate pricing-plans.md when no pricing-plan files are present', async () => {
    const { generateRules } = await loadGenerateRulesModule();
    await generateRules('windsurf', tmpDir);

    const pricingPlansPath = path.join(tmpDir, '.windsurf', 'rules', 'pricing-plans.md');
    assert.ok(!fs.existsSync(pricingPlansPath), 'pricing-plans.md should not be created when no plans exist');
  });

  it('includes pricing-plans content in combined cursor .cursorrules when plans exist', async () => {
    const plansDir = path.join(tmpDir, 'pricing-plans');
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(
      path.join(plansDir, 'pro.pricing-plan.json'),
      JSON.stringify({ _id: 'plan-id-1', name: 'Pro' }),
      'utf-8',
    );

    const { generateRules } = await loadGenerateRulesModule();
    const result = await generateRules('cursor', tmpDir);
    assert.strictEqual(result.success, true);

    const cursorPath = path.join(tmpDir, '.cursorrules');
    assert.ok(fs.existsSync(cursorPath), '.cursorrules should exist');

    const body = fs.readFileSync(cursorPath, 'utf-8');
    assert.ok(body.includes('Pricing Plans'), 'combined cursor rules include pricing-plans section');
    assert.ok(body.includes('sdk.managePayments'), 'combined cursor rules include SDK usage');
  });
});
