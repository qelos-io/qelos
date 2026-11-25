import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { MockState, createMockQelos, importQelosArtifacts } from '../src/index.js';

const fixtures = (name: string) => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const lf = (s: string) => s.replace(/\r\n/g, '\n');
const run = (dir: string, state: MockState, opts = {}) => {
  const warnings: string[] = [];
  const debug: string[] = [];
  const report = importQelosArtifacts(dir, state, { ...opts, warn: (m) => warnings.push(m), debug: (m) => debug.push(m) });
  return { report, warnings, debug };
};

test('imports a pull folder into state collections', () => {
  const state = new MockState();
  const { report, warnings } = run(fixtures('pull'), state);
  assert.equal(report.kind, 'pull');
  assert.deepEqual(warnings, []);
  assert.equal(state.blueprints.size, 2);
  const bp = state.blueprints.findOne((b) => b.identifier === 'product')!;
  assert.equal(bp.permissionScope, 'workspace');
  assert.ok(bp.properties.title);
  assert.match(bp._id, /^[0-9a-f]{24}$/);
  assert.equal(state.configurations.size, 2);
  assert.equal(lf(state.configurations.findOne((c) => c.key === 'users-header')!.metadata.html),'<header>Hi</header>\n');
  const card = state.components.get('64b0000000000000000000c1')!;
  assert.equal(card.type, 'component');
  assert.match(card.content, /card/);
  assert.equal(state.components.get('64b0000000000000000000c2')!.type, 'script');
  assert.equal(lf(state.blocks.get('64b0000000000000000000b1')!.content), '<section>hero</section>\n');
  const plugin = state.plugins.findOne((p) => p.apiPath === 'demo')!;
  assert.equal(lf(plugin.microFrontends[0].structure), '<div>home</div>\n');
  assert.equal(state.connections.get('64b0000000000000000000d1')!.authentication.$var, 'OPENAI_API_KEY');
  const integ = state.integrations.get('64b0000000000000000000e1')!;
  assert.equal(integ.trigger.source, '64b0000000000000000000d1');
  assert.equal(lf(integ.target.details.pre_messages[0].content), 'You are helpful.\n');
  assert.equal(state.pricingPlans.size, 1);
});

test('imports a dump folder; entities attach to known blueprints and unknown ones are skipped', () => {
  const state = new MockState();
  importQelosArtifacts(fixtures('pull'), state);
  const { report, warnings, debug } = run(fixtures('dump'), state);
  assert.equal(report.kind, 'dump');
  assert.equal(state.users.size, 2);
  const jane = state.users.get('64b0000000000000000000a1')!;
  assert.equal(jane.password, undefined);
  assert.equal(jane.token, undefined);
  assert.equal(jane.email, 'jane@example.com');
  assert.equal(state.workspaces.size, 1);
  const products = state.entities.list('product');
  assert.equal(products.length, 2);
  // usernames / workspace names written by `dump` are mapped back to ids
  assert.equal(products[0].user, '64b0000000000000000000a1');
  assert.equal(products[0].workspace, '64b0000000000000000000a3');
  assert.equal(products[1].user, '64b0000000000000000000a2');
  assert.deepEqual(state.entities.blueprints(), ['product']);
  assert.ok(warnings.some((w) => w.includes('unknown blueprint "ghost"')));
  assert.ok(debug.includes('ignored README.txt'));
});

test('mixed folder is detected and imported in one pass', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qelos-mix-'));
  cpSync(fixtures('pull'), dir, { recursive: true });
  cpSync(fixtures('dump'), dir, { recursive: true });
  const state = new MockState();
  const { report } = run(dir, state);
  assert.equal(report.kind, 'mixed');
  assert.equal(state.blueprints.size, 2);
  assert.equal(state.entities.list('product').length, 2);
});

test('flat single-type pull folders are recognised', () => {
  const state = new MockState();
  const { report } = run(join(fixtures('pull'), 'blueprints'), state);
  assert.equal(report.kind, 'pull');
  assert.equal(state.blueprints.size, 2);
});

test('is idempotent and honours onConflict', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qelos-idem-'));
  cpSync(fixtures('pull'), dir, { recursive: true });
  cpSync(fixtures('dump'), dir, { recursive: true });
  const state = new MockState();
  run(dir, state);
  const sizes = () => [state.blueprints.size, state.configurations.size, state.components.size, state.integrations.size, state.users.size, state.entities.list('product').length];
  const first = sizes();
  const bpId = state.blueprints.findOne((b) => b.identifier === 'product')!._id;

  state.blueprints.update(bpId, { name: 'Edited' });
  state.entities.update('product', '64b000000000000000000101', { title: 'Edited' });
  const skipped = run(dir, state, { onConflict: 'skip' });
  assert.deepEqual(sizes(), first);
  assert.equal(state.blueprints.get(bpId)!.name, 'Edited');
  assert.equal(state.entities.get('product', '64b000000000000000000101')!.title, 'Edited');
  assert.equal(skipped.report.counts.blueprints.skipped, 2);
  assert.equal(skipped.report.counts['entities:product'].skipped, 2);

  const replaced = run(dir, state, { onConflict: 'replace' });
  assert.deepEqual(sizes(), first);
  assert.equal(state.blueprints.get(bpId)!.name, 'Product');
  assert.equal(state.entities.get('product', '64b000000000000000000101')!.title, 'Pen');
  assert.equal(replaced.report.counts.blueprints.replaced, 2);
});

test('warnings never contain file contents', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qelos-bad-'));
  writeFileSync(join(dir, 'users.json'), '{"password":"s3cret" oops');
  const state = new MockState();
  const { warnings } = run(dir, state);
  assert.equal(warnings.length, 1);
  assert.ok(!warnings.join().includes('s3cret'));
});

test('createMockQelos imports at first start only; persisted state wins afterwards', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'qelos-start-'));
  cpSync(fixtures('pull'), dir, { recursive: true });
  const opts = { dataDir: dir, logger: () => {}, persistDebounceMs: 1 };
  const a = createMockQelos(opts);
  assert.equal(a.state.blueprints.size, 2);
  const id = a.state.blueprints.findOne((b) => b.identifier === 'product')!._id;
  a.state.blueprints.update(id, { name: 'Edited' });
  await a.state.close();

  const b = createMockQelos(opts);
  assert.equal(b.state.blueprints.get(id)!.name, 'Edited');
  const c = createMockQelos({ ...opts, reimport: true });
  assert.equal(c.state.blueprints.get(id)!.name, 'Product');
  const d = createMockQelos({ ...opts, reimport: true, onConflict: 'skip' });
  assert.equal(d.state.blueprints.size, 2);
});

test('imported workspaces without members/invites (hand-written workspaces.json) get empty arrays', () => {
  const dir = mkdtempSync(join(tmpdir(), 'qelos-import-ws-'));
  try {
    writeFileSync(join(dir, 'workspaces.json'), JSON.stringify([{ name: 'Acme', labels: ['company'] }]));
    const state = new MockState();
    importQelosArtifacts(dir, state);
    const ws = state.workspaces.findOne((w) => w.name === 'Acme')!;
    assert.deepEqual(ws.members, []);
    assert.deepEqual(ws.invites, []);
    assert.deepEqual(ws.labels, ['company']);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
