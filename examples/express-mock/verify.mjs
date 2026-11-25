// End-to-end check with zero Qelos connectivity: sign up, sign in, switch persona, create/query entities,
// log out, restart the server and confirm the state survived in qelos-mock/state/*.json.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync, readdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('.', import.meta.url));
const stateDir = fileURLToPath(new URL('./qelos-mock/state', import.meta.url));
if (existsSync(stateDir)) for (const f of readdirSync(stateDir)) if (f.endsWith('.json')) rmSync(`${stateDir}/${f}`);

function start() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['--import', 'tsx', 'server.mjs'], {
      cwd: root,
      env: { ...process.env, PORT: '0', QELOS_APP_URL: '' },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    child.once('error', reject);
    child.stdout.on('data', (d) => {
      const m = /listening on (http:\/\/127\.0\.0\.1:\d+)/.exec(String(d));
      if (m) resolve({ base: m[1], stop: async () => {
        // state writes are debounced (50 ms); on Windows SIGINT is a hard kill, so let pending writes land first
        await new Promise((r) => setTimeout(r, 300));
        await new Promise((r) => { child.once('exit', r); child.kill('SIGINT'); });
      } });
    });
  });
}

const json = { 'content-type': 'application/json' };
const cookieOf = (res) => res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');

async function session(base, body) {
  const res = await fetch(`${base}/api/signin`, { method: 'POST', headers: json, body: JSON.stringify(body) });
  assert.equal(res.status, 200, `signin ${body.username}`);
  return cookieOf(res);
}

let app = await start();
try {
  // register a brand new user and use the new session
  const signup = await fetch(`${app.base}/api/signup`, {
    method: 'POST',
    headers: json,
    body: JSON.stringify({ email: 'new@example.com', password: 'new-pass-123', confirmPassword: 'new-pass-123', firstName: 'New', lastName: 'User' }),
  });
  assert.equal(signup.status, 200);
  assert.ok(!(await signup.clone().json()).errors, 'signup has no errors');

  // login as a seeded persona
  const admin = await session(app.base, { username: 'admin@example.com', password: 'admin-pass' });
  const me = await (await fetch(`${app.base}/api/me`, { headers: { cookie: admin } })).json();
  assert.equal(me.email, 'admin@example.com');
  assert.equal((await (await fetch(`${app.base}/whoami`, { headers: { cookie: admin } })).json()).user, 'admin@example.com');

  // switch persona (per-request header)
  const asGuest = await (await fetch(`${app.base}/api/me`, { headers: { cookie: admin, 'x-qelos-mock-persona': 'guest@example.com' } })).json();
  assert.equal(asGuest.email, 'guest@example.com');

  // entities: seeded from entities/todo/page-1.json, then create + query
  const list = () => fetch(`${app.base}/api/blueprints/todo/entities`, { headers: { cookie: admin } }).then((r) => r.json());
  assert.equal((await list()).length, 2);
  const created = await fetch(`${app.base}/api/blueprints/todo/entities`, {
    method: 'POST',
    headers: { ...json, cookie: admin },
    body: JSON.stringify({ title: 'Persist me', done: false }),
  });
  assert.equal(created.status, 200, 'create entity');
  const filtered = await (await fetch(`${app.base}/api/blueprints/todo/entities?done=false`, { headers: { cookie: admin } })).json();
  assert.deepEqual(filtered.map((t) => t.title).sort(), ['Persist me', 'Ship without a tenant']);

  // logout drops the session
  await fetch(`${app.base}/api/logout`, { method: 'POST', headers: { cookie: admin } });
  assert.equal((await fetch(`${app.base}/api/me`, { headers: { cookie: admin } })).status, 401, 'logged out');
} finally {
  await app.stop(); // flushes state/*.json
}

// restart: users, entities and the new account come from the JSON files, not from the seed
app = await start();
try {
  const again = await session(app.base, { username: 'new@example.com', password: 'new-pass-123' });
  assert.ok(again, 'registered user survived restart');
  const admin = await session(app.base, { username: 'admin@example.com', password: 'admin-pass' });
  const todos = await (await fetch(`${app.base}/api/blueprints/todo/entities`, { headers: { cookie: admin } })).json();
  assert.equal(todos.length, 3);
  assert.ok(todos.some((t) => t.title === 'Persist me'));
  console.log('OK: signup, signin, logout, persona switch, entities and restart persistence verified without a tenant');
} finally {
  await app.stop();
}
