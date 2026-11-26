import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createMockQelos, resolveMockConfig, type MockPersonaSeed, type MockQelos } from '../src/index.js';

const TOKEN = 'ql_a_made_up_token';

function folder(personas: MockPersonaSeed[]) {
  const dir = mkdtempSync(join(tmpdir(), 'qelos-personas-'));
  writePersonas(dir, personas);
  return dir;
}

const writePersonas = (dir: string, personas: MockPersonaSeed[]) =>
  writeFileSync(join(dir, 'personas.json'), JSON.stringify(personas));

const quiet = { logger: () => {} };

async function me(mock: MockQelos, headers: Record<string, string> = {}) {
  const res = await mock.fetch('/api/me', { headers });
  return { status: res.status, user: await res.json() };
}

const TWO: MockPersonaSeed[] = [
  { email: 'admin@example.com', roles: ['admin'], apiTokens: [TOKEN] },
  { email: 'user@example.com', roles: ['user'], default: true },
];

test('the default persona of personas.json is signed in without credentials', async () => {
  const mock = createMockQelos({ ...quiet, dataDir: folder(TWO), persist: false });
  const { status, user } = await me(mock);
  assert.equal(status, 200);
  assert.equal(user.email, 'user@example.com');
  assert.ok(!('default' in user) && !('apiTokens' in user));
  // another persona can still be chosen per request
  assert.equal((await me(mock, { 'x-qelos-mock-persona': 'admin@example.com' })).user.email, 'admin@example.com');
});

test('a default persona given in code wins over personas.json', async () => {
  const dataDir = folder(TWO);
  const byOption = createMockQelos({ ...quiet, dataDir, persist: false, defaultPersona: 'admin@example.com' });
  assert.equal((await me(byOption)).user.email, 'admin@example.com');

  const bySeed = createMockQelos({ ...quiet, dataDir, persist: false, seed: { personas: [{ email: 'ci@example.com', default: true }] } });
  assert.equal((await me(bySeed)).user.email, 'ci@example.com');

  // an integrator resolves its options first and creates the mock with the result
  const resolved = resolveMockConfig({ QELOS_MOCK: dataDir }, { persist: false });
  assert.equal((await me(createMockQelos({ ...resolved, ...quiet }))).user.email, 'user@example.com');
});

test('persona "default" and "apiTokens" are validated', () => {
  const seed = (personas: any[]) => () => createMockQelos({ ...quiet, seed: { personas } });
  assert.throws(seed([{ email: 'a@x.com', default: true }, { email: 'b@x.com', default: true }]), /only one persona/);
  assert.throws(seed([{ email: 'a@x.com', default: 'yes' }]), /"default" must be a boolean/);
  assert.throws(seed([{ email: 'a@x.com', apiTokens: 'ql_x' }]), /"apiTokens" must be an array/);
});

test('an API token of a persona acts as that persona, and is never written to the state', async () => {
  const dataDir = folder(TWO);
  const mock = createMockQelos({ ...quiet, dataDir });
  const asToken = { 'x-api-key': TOKEN };
  assert.equal((await me(mock, asToken)).user.email, 'admin@example.com');
  assert.equal((await me(mock, { 'x-api-key': 'ql_unknown' })).status, 401);

  mock.state.reset();
  assert.equal((await me(mock, asToken)).user.email, 'admin@example.com');

  await mock.state.flush();
  const state = join(dataDir, 'state');
  for (const file of readdirSync(state)) {
    assert.doesNotMatch(readFileSync(join(state, file), 'utf8'), /ql_a_made_up_token|"apiTokens"|"default"/, file);
  }
  assert.equal((await me(createMockQelos({ ...quiet, dataDir }), asToken)).user.email, 'admin@example.com');

  mock.state.seed({ personas: [{ email: 'late@example.com', apiTokens: ['ql_late'] }] });
  assert.equal((await me(mock, { 'x-api-key': 'ql_late' })).user.email, 'late@example.com');
});

test('personas.json settings are read again over a saved state, which keeps its users', async () => {
  const dataDir = folder(TWO);
  await createMockQelos({ ...quiet, dataDir }).state.flush();
  // first start with the state: run again so the state is complete on disk
  writePersonas(dataDir, [{ ...TWO[0], default: true, apiTokens: ['ql_new'] }, { ...TWO[1], default: false }]);
  const warnings: string[] = [];
  const again = createMockQelos({ dataDir, logger: (m) => warnings.push(m) });
  assert.equal((await me(again)).user.email, 'admin@example.com');
  assert.equal((await me(again, { 'x-api-key': 'ql_new' })).status, 200);
  assert.equal((await me(again, { 'x-api-key': TOKEN })).status, 401, 'a removed token stops working');
  assert.ok(!warnings.some((w) => w.includes('is not a user')));

  writePersonas(dataDir, [{ email: 'new@example.com', default: true }]);
  const added = createMockQelos({ dataDir, logger: (m) => warnings.push(m) });
  assert.equal((await me(added)).status, 401);
  assert.ok(warnings.some((w) => w.includes('"new@example.com" is not a user of the saved state') && w.includes('state')));
});

test('a persona with the login of a dumped user is that user, and owns its records', async () => {
  const id = 'a'.repeat(24);
  const other = 'b'.repeat(24);
  const dataDir = folder([
    { email: 'Real@Example.com', default: true, apiTokens: [TOKEN], workspaces: [{ name: 'Local', roles: ['admin'] }] },
    { email: 'boss@example.com', roles: ['admin'] },
  ]);
  mkdirSync(join(dataDir, 'blueprints'));
  writeFileSync(join(dataDir, 'blueprints', 'note.blueprint.json'), JSON.stringify({ identifier: 'note', name: 'Note', properties: {} }));
  writeFileSync(
    join(dataDir, 'users.json'),
    JSON.stringify([
      { _id: id, username: 'real@example.com', firstName: 'Real', roles: ['editor'] },
      { _id: other, username: 'boss@example.com', firstName: 'Boss', roles: ['user'] },
    ]),
  );
  mkdirSync(join(dataDir, 'entities', 'note'), { recursive: true });
  // `qelos dump` writes usernames instead of ids when users were dumped first
  writeFileSync(
    join(dataDir, 'entities', 'note', 'page-1.json'),
    JSON.stringify([{ _id: 'c'.repeat(24), identifier: 'one', user: 'real@example.com', metadata: {} }]),
  );

  const mock = createMockQelos({ ...quiet, dataDir, persist: false });
  assert.equal(mock.state.users.size, 2, 'no second account for the same login');
  const { user } = await me(mock);
  assert.equal(user._id, id);
  assert.equal(user.firstName, 'Real');
  assert.deepEqual(user.roles, ['editor'], 'the dumped roles stay unless the persona sets them');
  assert.equal(mock.state.entities.list('note')[0].user, id);
  assert.equal((await me(mock, { 'x-api-key': TOKEN })).user._id, id);
  assert.equal((await me(mock, { 'x-qelos-mock-persona': 'real@example.com' })).user._id, id);
  assert.equal((await (await mock.fetch('/api/workspaces')).json())[0].name, 'Local');
  const boss = await me(mock, { 'x-qelos-mock-persona': 'boss@example.com' });
  assert.equal(boss.user._id, other);
  assert.deepEqual(boss.user.roles, ['admin'], 'what the persona sets wins');

  await createMockQelos({ ...quiet, dataDir }).state.flush();
  const reimported = createMockQelos({ ...quiet, dataDir, reimport: true });
  assert.equal(reimported.state.users.size, 2);
  const again = await me(reimported, { 'x-qelos-mock-persona': 'boss@example.com' });
  assert.deepEqual([again.user._id, again.user.email, again.user.roles], [other, 'boss@example.com', ['admin']]);
});

test('social login returns the browser to the app, also behind a dev proxy', async () => {
  const mock = createMockQelos({ ...quiet, seed: { personas: [{ email: 'user@example.com' }] } });
  const login = (returnUrl: string, origin = 'http://127.0.0.1:4555') =>
    mock.handle(
      new Request(`${origin}/api/auth/linkedin?persona=user@example.com&state=s1&returnUrl=${encodeURIComponent(returnUrl)}`),
    );
  const to = async (returnUrl: string) => (await login(returnUrl)).headers.get('location')!;

  assert.match(await to('/auth/callback'), /^\/auth\/callback\?rt=[^&]+&state=s1$/);
  assert.match(await to('http://127.0.0.1:4555/back'), /^\/back\?rt=/);
  assert.match(await to('http://localhost:3000/auth/callback'), /^http:\/\/localhost:3000\/auth\/callback\?rt=/);
  // a path starting with "//" would be read as another host
  assert.match(await to('/.//elsewhere.example/x'), /^http:\/\/127\.0\.0\.1:4555\/\/elsewhere\.example\/x\?rt=/);
  assert.equal((await login('https://elsewhere.example/x')).status, 400);
  assert.equal((await login('http://localhost:3000/x', 'https://app.example')).status, 400, 'only between local addresses');
});
