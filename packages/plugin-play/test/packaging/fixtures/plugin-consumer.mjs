// Starts a real plugin (Fastify) against a fake Qelos tenant, in its own process, and prints what happened as JSON.
//   PLUGIN_ENTRY   what to load: a bare specifier (clean project) or an absolute path (inside the repo)
//   BUILD=cjs|esm  load it with require() or with import (named exports)
// The fake tenant lives in this process, so the plugin's startup sign-in goes over real HTTP.
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { isAbsolute } from 'node:path';
import { pathToFileURL } from 'node:url';

const require = createRequire(process.cwd() + '/');
const { PLUGIN_ENTRY, BUILD = 'cjs', PORT, INTERNAL_PORT } = process.env;
const tenantLog = [];

const tenant = createServer((req, res) => {
  req.resume();
  req.on('end', () => {
    tenantLog.push(`${req.method} ${req.url}`);
    res.setHeader('content-type', 'application/json');
    if (req.url === '/api/signin') return res.end(JSON.stringify({ payload: { token: 'tok', refreshToken: 'ref', user: { _id: 'u1', email: 'a@x.com' } } }));
    res.end('{}');
  });
});
await new Promise((r) => tenant.listen(0, '127.0.0.1', r));

process.env.QELOS_URL = `http://127.0.0.1:${tenant.address().port}`;
process.env.QELOS_USERNAME = 'plugin';
process.env.QELOS_PASSWORD = 'secret';
process.env.ACCESS_TOKEN_SECRET = 'component-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'component-refresh-secret';
process.env.USER_PAYLOAD_SECRET = 'component-user-secret';
process.env.HOST = '127.0.0.1';
process.env.NODE_ENV = 'production';
process.env.APP_URL = `http://127.0.0.1:${PORT}`;

const play =
  BUILD === 'esm'
    ? await import(isAbsolute(PLUGIN_ENTRY) ? pathToFileURL(PLUGIN_ENTRY).href : PLUGIN_ENTRY)
    : require(PLUGIN_ENTRY);

const out = { api: Object.keys(play).filter((k) => k !== 'default').sort() };

play.addEndpoint('/hello', { verifyToken: false, handler: async () => ({ hello: 'world' }) });
play.addEndpoint('/protected', { verifyToken: true, handler: async (req) => ({ email: req.user?.email, tenant: req.tenantPayload?.sub }) });
play.addInternalEndpoint('/internal/ping', { handler: async () => ({ pong: true }) });
await play.start({ manifest: { name: 'demo-plugin', description: 'demo', appUrl: `http://127.0.0.1:${PORT}` } });

const get = async (port, path) => {
  const res = await fetch(`http://127.0.0.1:${port}${path}`);
  return { status: res.status, body: await res.json() };
};
out.hello = await get(PORT, '/hello');
out.manifest = await get(PORT, '/api/play-manifest');
out.internal = await get(INTERNAL_PORT, '/internal/ping');
out.missing = (await fetch(`http://127.0.0.1:${PORT}/nope`)).status;
// the frontend handshake over real HTTP: gateway callback -> authorize -> protected endpoint (cookie) -> un-authorize
// jsonwebtoken is a dependency of the plugin runtime: resolve it from the runtime's own location
const jwt = createRequire(isAbsolute(PLUGIN_ENTRY) ? PLUGIN_ENTRY : require.resolve(PLUGIN_ENTRY))('jsonwebtoken');
const user = { _id: 'u9', username: 'ada@example.com', email: 'ada@example.com', roles: ['user'] };
const gateway = { authorization: `Bearer ${jwt.sign({ sub: 'tenant-1', identifier: 'x' }, process.env.ACCESS_TOKEN_SECRET)}`, user: JSON.stringify(user) };
const page = 'http://front.test/page';
const cb = await fetch(`http://127.0.0.1:${PORT}/api/callback?returnUrl=${encodeURIComponent(Buffer.from(page).toString('base64'))}`, { headers: gateway });
const handshake = await cb.json();
const authorize = await fetch(`http://127.0.0.1:${PORT}/api/authorize`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ returnUrl: page, token: handshake.token }) });
const cookie = authorize.headers.getSetCookie().map((c) => c.split(';')[0]).find((c) => c.startsWith('token_'));
const protectedRes = await fetch(`http://127.0.0.1:${PORT}/protected`, { headers: { code: handshake.code, cookie } });
const unauthorize = await fetch(`http://127.0.0.1:${PORT}/api/un-authorize`, { method: 'POST', headers: { code: handshake.code, cookie } });
const withoutCookie = await fetch(`http://127.0.0.1:${PORT}/protected`, { headers: { code: handshake.code } });
out.handshake = {
  callback: cb.status,
  authorize: authorize.status,
  cookieName: cookie?.split('=')[0] === `token_${handshake.code}`,
  protected: { status: protectedRes.status, body: await protectedRes.json() },
  unauthorize: { status: unauthorize.status, body: await unauthorize.text() },
  withoutCookieRejected: withoutCookie.status !== 200,
};
out.tenantLog = tenantLog;
console.log(JSON.stringify(out));
process.exit(0);
